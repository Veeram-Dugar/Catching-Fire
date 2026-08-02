import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecentReports } from '../lib/supabase.js';

export default function Home() {
  const [reportCount, setReportCount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentReports(200)
      .then((reports) => setReportCount(reports.length))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center">
      <h1 className="font-retro text-2xl leading-relaxed text-orange-400 sm:text-3xl">
        Catching Fire
      </h1>
      <p className="max-w-xl text-slate-300">
        A community reporting map for spotting wildfires near you, paired with a
        retro 2D game where you put out fires, earn coins, and upgrade your gear.
      </p>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link
          to="/report"
          className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-6 text-left transition hover:bg-orange-500/20"
        >
          <div className="text-2xl">🗺️</div>
          <div className="mt-2 font-semibold text-orange-300">Report a Fire</div>
          <p className="mt-1 text-sm text-slate-400">
            Anonymously drop a pin if you spot smoke or flames near you.
          </p>
        </Link>

        <Link
          to="/game"
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-6 text-left transition hover:bg-emerald-500/20"
        >
          <div className="text-2xl">🎮</div>
          <div className="mt-2 font-semibold text-emerald-300">Play the Game</div>
          <p className="mt-1 text-sm text-slate-400">
            Put out spreading fires, collect coins, and upgrade your hose.
          </p>
        </Link>
      </div>

      <div className="text-xs text-slate-500">
        {error && <span>Couldn't load live reports ({error})</span>}
        {reportCount !== null && !error && (
          <span>{reportCount} reports in the community database</span>
        )}
      </div>

      <div className="mt-4 max-w-xl rounded border border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-400">
        ⚠️ This app is a community awareness tool, not an emergency service. If you
        see an active wildfire, call 911 or your local emergency number immediately.
      </div>
    </main>
  );
}
