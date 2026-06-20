import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GITHUB_URL } from '../lib/constants';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-800/70">
      <div className="container-page flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm leading-relaxed text-slate-500">
            Open-source, passkey-backed SSH public key resolver. Fetch every public key you own with a
            single handle — no daemons, no server-side agents.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm">
          <div className="space-y-3">
            <p className="font-semibold text-slate-300">Product</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <a href="#how-it-works" className="hover:text-accent-400">
                  How it works
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-accent-400">
                  Security
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-accent-400">
                  Create SSHID
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-slate-300">Open source</p>
            <ul className="space-y-2 text-slate-500">
              <li>
                <a href={GITHUB_URL} className="inline-flex items-center gap-1.5 hover:text-accent-400">
                  <Github className="h-3.5 w-3.5" /> Repository
                </a>
              </li>
              <li>
                <a href={`${GITHUB_URL}/blob/main/LICENSE`} className="hover:text-accent-400">
                  MIT License
                </a>
              </li>
              <li>
                <a href={`${GITHUB_URL}/issues`} className="hover:text-accent-400">
                  Report an issue
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-800/70">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-600 sm:flex-row">
          <p>© {new Date().getFullYear()} SSHID contributors. Released under the MIT License.</p>
          <p>Open-source SSH identity, self-hostable and yours to run.</p>
        </div>
      </div>
    </footer>
  );
}
