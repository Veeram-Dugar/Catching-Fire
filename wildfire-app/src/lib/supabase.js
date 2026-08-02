import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project URL and anon key.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

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

/** Insert a new anonymous wildfire report. */
export async function submitReport({ lat, lng, severity }) {
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

/** Fetch recent reports, most recent first. */
export async function fetchRecentReports(limit = 100) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
