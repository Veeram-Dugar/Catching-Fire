import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchActiveReports,
  submitReport,
  deleteReport,
  getMyReportToken,
  isMyReport,
  SEVERITY,
  SEVERITY_COLOR,
} from '../lib/supabase.js';
import { fetchFireWeatherAlerts, ALERT_SEVERITY_COLOR } from '../lib/nws.js';

// Leaflet's default marker icons don't bundle correctly with Vite; build
// colored circle markers manually instead of fighting the asset pipeline.
function coloredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const pendingIcon = coloredIcon('#38bdf8');
const FALLBACK_CENTER = [37.7749, -122.4194]; // SF

function ClickToPlacePin({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function ReportMap() {
  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [pin, setPin] = useState(null);
  const [severity, setSeverity] = useState(SEVERITY.SMOKE);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Load alerts for the fallback center right away so something shows up
    // fast, then upgrade to the real position once geolocation resolves
    // (which can take a few seconds, or fail/be denied entirely).
    loadAlerts(FALLBACK_CENTER[0], FALLBACK_CENTER[1]);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = [pos.coords.latitude, pos.coords.longitude];
          setCenter(next);
          loadAlerts(next[0], next[1]);
        },
        () => {
          /* keep fallback center if permission denied */
        }
      );
    }
    loadReports();
  }, []);

  function loadReports() {
    fetchActiveReports()
      .then(setReports)
      .catch((err) => setErrorMsg(err.message));
  }

  function loadAlerts(lat, lng) {
    // Supplementary official data — a fetch failure here shouldn't block
    // reporting, so this deliberately doesn't surface into errorMsg.
    fetchFireWeatherAlerts(lat, lng).then(setAlerts);
  }

  async function handleSubmit() {
    if (!pin) return;
    setStatus('submitting');
    try {
      await submitReport({ lat: pin.lat, lng: pin.lng, severity });
      setStatus('done');
      setPin(null);
      loadReports();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  /** Deletes every report in this browser's history that's part of the
   *  given cluster — a marker can merge more than one of your own reports
   *  at the same spot, so this clears all of them, not just one. */
  async function handleDelete(reportIds) {
    const mine = reportIds.filter(isMyReport);
    try {
      await Promise.all(mine.map((id) => deleteReport(id, getMyReportToken(id))));
      loadReports();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-orange-300">Report a Fire</h1>
        <p className="text-sm text-slate-400">
          Tap the map where you see smoke or flames. Reports are anonymous and
          locations are rounded for privacy. Pins fade out on their own a
          few hours after the last report there. You can delete a report
          you submitted from this browser (click its pin), but no one else
          can — so a fire that's still burning just keeps getting reported
          instead. Official fire-weather alerts from the National Weather
          Service for your area, when active, show up below.
        </p>
      </div>

      <div className="rounded border border-amber-700/40 bg-amber-900/20 p-3 text-xs text-amber-200">
        ⚠️ Not an emergency service. For an active, immediate threat, call 911 or
        your local emergency number first.
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a) => {
            const color = ALERT_SEVERITY_COLOR[a.severity] ?? ALERT_SEVERITY_COLOR.Unknown;
            return (
              <div
                key={a.id}
                className="rounded border p-3 text-xs"
                style={{ borderColor: color, backgroundColor: `${color}22` }}
              >
                <div className="font-semibold text-slate-100">
                  🔥 {a.event} — {a.areaDesc}
                </div>
                <p className="mt-1 text-slate-300">{a.headline}</p>
                <p className="mt-1 text-slate-500">
                  Official alert from the National Weather Service · expires{' '}
                  {new Date(a.expires).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-700">
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlacePin onPick={setPin} />

          {reports.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={coloredIcon(SEVERITY_COLOR[r.severity] ?? '#f97316')}
            >
              <Popup>
                <div>
                  {r.severity.replace('_', ' ')}
                  {r.count > 1 ? ` · reported ${r.count}x` : ''} · last seen{' '}
                  {new Date(r.created_at).toLocaleString()}
                </div>
                {r.reportIds.some(isMyReport) && (
                  <button
                    onClick={() => handleDelete(r.reportIds)}
                    className="mt-2 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                  >
                    Delete my report
                  </button>
                )}
              </Popup>
            </Marker>
          ))}

          {pin && (
            <Marker position={pin} icon={pendingIcon}>
              <Popup>New report location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {pin && (
        <div className="flex flex-col gap-3 rounded border border-slate-700 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {Object.values(SEVERITY).map((level) => (
              <button
                key={level}
                onClick={() => setSeverity(level)}
                className={`rounded px-3 py-1.5 text-sm capitalize transition ${
                  severity === level
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {level.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      )}

      {status === 'done' && (
        <p className="text-sm text-emerald-400">Thanks — your report was submitted anonymously.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-400">Couldn't submit report: {errorMsg}</p>
      )}
    </main>
  );
}
