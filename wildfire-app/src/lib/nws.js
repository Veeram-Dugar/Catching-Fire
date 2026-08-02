// Live fire-weather alerts from the National Weather Service (api.weather.gov).
// Free, keyless, public API with open CORS (Access-Control-Allow-Origin: *) —
// no signup, no backend proxy needed. US-only coverage; a point outside NWS
// coverage (or a transient outage) is treated as "no alerts" rather than an
// error, since this is supplementary safety info, not core functionality.

const NWS_BASE = 'https://api.weather.gov';

// The exact fire-relevant event names from NWS's authoritative event list
// (GET /alerts/types). Notably, the single most common fire-danger alert,
// "Red Flag Warning", does NOT contain the word "fire" — a naive /fire/i
// regex against the event name misses it entirely, which was caught by
// testing against a real active Red Flag Warning that turned up nothing.
const FIRE_RELATED_EVENTS = new Set([
  'Red Flag Warning',
  'Fire Weather Watch',
  'Fire Warning',
  'Extreme Fire Danger',
  'Dense Smoke Advisory',
]);

/**
 * Fetches active NWS alerts for a point and returns only fire-related ones.
 *
 * NWS's own `/alerts/active?point=` query does not reliably match
 * fire-weather-zone alerts (verified empirically — a live Red Flag Warning
 * didn't show up even for a point at the exact centroid of its zone).
 * Instead this follows NWS's documented point->zone resolution: look up
 * the point's fire weather zone and county via `/points/{lat},{lng}`, then
 * query alerts for those zones directly, which does work reliably.
 */
export async function fetchFireWeatherAlerts(lat, lng) {
  try {
    const pointRes = await fetch(`${NWS_BASE}/points/${lat},${lng}`);
    if (!pointRes.ok) return [];
    const point = await pointRes.json();

    const zoneUrls = [point.properties?.fireWeatherZone, point.properties?.county].filter(
      Boolean
    );
    if (zoneUrls.length === 0) return [];

    const alertLists = await Promise.all(
      zoneUrls.map(async (zoneUrl) => {
        const zoneId = zoneUrl.split('/').pop();
        const res = await fetch(`${NWS_BASE}/alerts/active?zone=${zoneId}`, {
          headers: { Accept: 'application/geo+json' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.features.map((feature) => feature.properties);
      })
    );

    const byId = new Map();
    for (const p of alertLists.flat()) {
      if (!FIRE_RELATED_EVENTS.has(p.event) || byId.has(p.id)) continue;
      byId.set(p.id, {
        id: p.id,
        event: p.event,
        severity: p.severity,
        headline: p.headline,
        areaDesc: p.areaDesc,
        expires: p.expires,
        instruction: p.instruction,
      });
    }
    return Array.from(byId.values());
  } catch {
    return [];
  }
}

export const ALERT_SEVERITY_COLOR = {
  Extreme: '#7f1d1d',
  Severe: '#dc2626',
  Moderate: '#f97316',
  Minor: '#eab308',
  Unknown: '#64748b',
};
