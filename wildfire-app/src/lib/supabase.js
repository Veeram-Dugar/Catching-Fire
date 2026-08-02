import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isConfigured) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project URL and anon key.'
  );
}

// createClient() throws synchronously if the URL is empty, which would crash
// the whole app at import time (before React even renders) whenever env vars
// are entirely unset — e.g. a fresh deploy with no environment variables
// configured yet. Only construct it when we actually have values, so a
// missing config degrades to the friendly assertConfigured() error below
// instead of a blank white screen.
export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : null;

function assertConfigured() {
  if (!isConfigured) {
    throw new Error(
      'Supabase is not configured — copy .env.example to .env and fill in your project URL and anon key.'
    );
  }
}

// Severity levels used across the app
export const SEVERITY = {
  SMOKE: 'smoke',
  SMALL_FIRE: 'small_flame',
  LARGE_FIRE: 'large_fire',
};

export const SEVERITY_COLOR = {
  [SEVERITY.SMOKE]: '#eab308', // yellow
  [SEVERITY.SMALL_FIRE]: '#f97316', // orange
  [SEVERITY.LARGE_FIRE]: '#dc2626', // red
};

/** Rounds a coordinate to ~100m precision for reporter anonymity. */
export function roundForAnonymity(coord) {
  return Math.round(coord * 1000) / 1000;
}

// Reports are fully anonymous (no accounts), so there's no safe way to let
// anyone edit or delete someone ELSE's report — that would just hand bad
// actors a button to take down real fires. You CAN delete your own,
// though: submitting a report returns a one-time secret `delete_token`
// (see MY_REPORTS_KEY below), which is required to delete it and is never
// exposed through any read path, so nobody else can ever obtain it for
// your report. Absent that, reports still auto-expire on a severity-based
// timer — a spot that keeps getting reported naturally stays visible,
// since expiry is measured from the most recent report there.
export const SEVERITY_EXPIRY_HOURS = {
  [SEVERITY.SMOKE]: 4,
  [SEVERITY.SMALL_FIRE]: 10,
  [SEVERITY.LARGE_FIRE]: 24,
};

const SEVERITY_RANK = {
  [SEVERITY.SMOKE]: 0,
  [SEVERITY.SMALL_FIRE]: 1,
  [SEVERITY.LARGE_FIRE]: 2,
};

const MAX_EXPIRY_HOURS = Math.max(...Object.values(SEVERITY_EXPIRY_HOURS));

function isExpired(report, now) {
  const hours = SEVERITY_EXPIRY_HOURS[report.severity] ?? SEVERITY_EXPIRY_HOURS[SEVERITY.SMOKE];
  const ageMs = now - new Date(report.last_confirmed_at).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

/** Great-circle distance between two points, in km (Haversine formula). */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Insert a new anonymous wildfire report via the insert_report() database
 * function (not a raw table insert — see schema.sql) so it can return the
 * delete_token, which is otherwise hidden from every other read path.
 * Remembers the token locally so this browser can delete the report later.
 */
export async function submitReport({ lat, lng, severity }) {
  assertConfigured();
  const { data, error } = await supabase.rpc('insert_report', {
    p_lat: roundForAnonymity(lat),
    p_lng: roundForAnonymity(lng),
    p_severity: severity,
  });

  if (error) throw error;
  const row = data?.[0];
  if (row) rememberMyReport(row.id, row.delete_token);
  return row;
}

/**
 * Delete one of your own reports by id + the secret token you were given
 * at submission time (see rememberMyReport). Returns true if it actually
 * deleted something — false if the token was wrong or it already expired
 * off the server naturally.
 */
export async function deleteReport(id, token) {
  assertConfigured();
  const { data, error } = await supabase.rpc('delete_report', {
    p_id: id,
    p_token: token,
  });
  if (error) throw error;
  if (data) forgetMyReport(id);
  return Boolean(data);
}

/**
 * "Confirms" any report is still active — no delete_token needed, unlike
 * deleteReport. This is corroboration, not a destructive action, so
 * anyone can do it for anyone's report (see confirm_report in schema.sql
 * for why that's an acceptable, much weaker check than delete).
 */
export async function confirmReport(id) {
  assertConfigured();
  const { data, error } = await supabase.rpc('confirm_report', { p_id: id });
  if (error) throw error;
  return Boolean(data);
}

/** Fetch raw reports from the last `windowHours`, most recent first. */
export async function fetchRecentReports(limit = 200, windowHours = MAX_EXPIRY_HOURS + 2) {
  assertConfigured();
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('reports')
    .select('id, lat, lng, severity, created_at, last_confirmed_at') // never delete_token
    .gte('last_confirmed_at', cutoff)
    .order('last_confirmed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Subscribes to new reports live via Supabase Realtime — new pins appear
 * on everyone's map without a manual refresh. Returns an unsubscribe
 * function; safe to call even when Supabase isn't configured (a no-op).
 */
export function subscribeToReports(onInsert) {
  if (!isConfigured) return () => {};

  const channel = supabase
    .channel('reports-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) =>
      onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Fetches reports and collapses them into active fire markers — one per
 * rounded location, carrying the highest severity and most recent
 * timestamp seen there, plus how many times it's been reported. Expired
 * reports (see SEVERITY_EXPIRY_HOURS) are dropped, so a fire that's been
 * dealt with just fades off the map on its own.
 */
export async function fetchActiveReports() {
  const raw = await fetchRecentReports();
  const now = Date.now();
  const clusters = new Map();

  for (const report of raw) {
    if (isExpired(report, now)) continue;

    const key = `${report.lat},${report.lng}`;
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        id: report.id,
        reportIds: [report.id], // every individual report merged into this marker
        lat: report.lat,
        lng: report.lng,
        severity: report.severity,
        count: 1,
        last_confirmed_at: report.last_confirmed_at,
      });
      continue;
    }

    existing.count += 1;
    existing.reportIds.push(report.id);
    if (new Date(report.last_confirmed_at) > new Date(existing.last_confirmed_at)) {
      existing.last_confirmed_at = report.last_confirmed_at;
    }
    if (SEVERITY_RANK[report.severity] > SEVERITY_RANK[existing.severity]) {
      existing.severity = report.severity;
    }
  }

  return Array.from(clusters.values()).sort(
    (a, b) => new Date(b.last_confirmed_at) - new Date(a.last_confirmed_at)
  );
}

// ---------- Tracking your own reports locally ----------
//
// There are no accounts, so "which reports are mine" only exists in this
// browser's localStorage: a map of report id -> its secret delete_token.
// Losing this (clearing site data, a different device/browser) means
// losing the ability to delete that report — there's no recovery path,
// same tradeoff as any anonymous "keep this link/token" flow.

const MY_REPORTS_KEY = 'catching-fire:my-reports';

function readMyReports() {
  try {
    const raw = window.localStorage.getItem(MY_REPORTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMyReports(map) {
  try {
    window.localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable (e.g. private mode) — the report still
    // submitted fine, you just won't be able to delete it later.
  }
}

function rememberMyReport(id, deleteToken) {
  const map = readMyReports();
  map[id] = deleteToken;
  writeMyReports(map);
}

function forgetMyReport(id) {
  const map = readMyReports();
  delete map[id];
  writeMyReports(map);
}

/** Returns this browser's delete token for a report id, or undefined. */
export function getMyReportToken(id) {
  return readMyReports()[id];
}

/** True if this browser submitted (and still holds the token for) this report. */
export function isMyReport(id) {
  return Boolean(getMyReportToken(id));
}
