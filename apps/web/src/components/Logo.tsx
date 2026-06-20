import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="SSHID home">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent-500/40 bg-ink-900">
        <svg viewBox="0 0 64 64" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M16 22l9 10-9 10"
            stroke="#2dd4bf"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M34 42h14" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-white">
        ssh<span className="text-accent-400">id</span>
      </span>
    </Link>
  );
}
