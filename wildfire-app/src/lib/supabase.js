import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isConfigured) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project URL and anon key.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

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

// Reports have no owner (fully anonymous, no accounts), so there's no safe
// way to let anyone edit or delete someone else's report — that would just
// hand bad actors a button to take down real fires. Instead, reports
// auto-expire on a severity-based timer: nothing to abuse because there's
// nothing to click. A spot that keeps getting reported naturally stays
// visible, since expiry is measured from the most recent report there.
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
  const ageMs = now - new Date(report.created_at).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

/** Insert a new anonymous wildfire report. */
export async function submitReport({ lat, lng, severity }) {
  assertConfigured();
  const { data, error } = await supabase
    .from('reports')
    .insert([
      {
        lat: roundForAnonymity(lat),
        lng: roundForAnonymity(lng),
        severity,
      },
    ])
    .select();

  if (error) throw error;
  return data?.[0];
}

/** Fetch raw reports from the last `windowHours`, most recent first. */
export async function fetchRecentReports(limit = 200, windowHours = MAX_EXPIRY_HOURS + 2) {
  assertConfigured();
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
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
        lat: report.lat,
        lng: report.lng,
        severity: report.severity,
        count: 1,
        created_at: report.created_at,
      });
      continue;
    }

    existing.count += 1;
    if (new Date(report.created_at) > new Date(existing.created_at)) {
      existing.created_at = report.created_at;
    }
    if (SEVERITY_RANK[report.severity] > SEVERITY_RANK[existing.severity]) {
      existing.severity = report.severity;
    }
  }

  return Array.from(clusters.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}
