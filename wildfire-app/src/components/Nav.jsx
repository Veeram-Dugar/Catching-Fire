import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/report', label: 'Report a Fire' },
  { to: '/game', label: 'Play the Game' },
];

export default function Nav() {
  const location = useLocation();

  return (
    <nav className="flex items-center gap-6 border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <span className="font-retro text-xs text-orange-400">🔥 WildfireWatch</span>
      <div className="flex gap-4 text-sm">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`rounded px-3 py-1.5 transition ${
              location.pathname === link.to
                ? 'bg-orange-500/20 text-orange-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
