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
  fetchRecentReports,
  submitReport,
  SEVERITY,
  SEVERITY_COLOR,
} from '../lib/supabase.js';

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

function ClickToPlacePin({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function ReportMap() {
  const [center, setCenter] = useState([37.7749, -122.4194]); // fallback: SF
  const [pin, setPin] = useState(null);
  const [severity, setSeverity] = useState(SEVERITY.SMOKE);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {
          /* keep fallback center if permission denied */
        }
      );
    }
    loadReports();
  }, []);

  function loadReports() {
    fetchRecentReports()
      .then(setReports)
      .catch((err) => setErrorMsg(err.message));
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

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-orange-300">Report a Fire</h1>
        <p className="text-sm text-slate-400">
          Tap the map where you see smoke or flames. Reports are anonymous and
          locations are rounded for privacy.
        </p>
      </div>

      <div className="rounded border border-amber-700/40 bg-amber-900/20 p-3 text-xs text-amber-200">
        ⚠️ Not an emergency service. For an active, immediate threat, call 911 or
        your local emergency number first.
      </div>

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
                {r.severity.replace('_', ' ')} · reported{' '}
                {new Date(r.created_at).toLocaleString()}
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
