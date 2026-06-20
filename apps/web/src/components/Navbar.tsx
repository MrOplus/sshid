import { Github, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GITHUB_URL } from '../lib/constants';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/70 bg-ink-950/70 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />

        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:text-white sm:inline-flex"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>

          {!loading && user ? (
            <>
              <Link to="/dashboard" className="btn-ghost py-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost py-2" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost py-2">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary py-2">
                Create SSHID
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
