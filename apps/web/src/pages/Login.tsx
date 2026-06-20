import { Fingerprint, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { AuthShell } from '../components/AuthShell';
import { passkeySupported, useAuth } from '../lib/auth';

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const supported = passkeySupported();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(handle.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in with the passkey on this device.">
      {!supported && (
        <div className="mb-4">
          <Alert kind="error" message="This browser does not support passkeys (WebAuthn)." />
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="handle" className="label">
            Handle
          </label>
          <div className="flex items-center rounded-xl border border-ink-600 bg-ink-900/80 focus-within:border-accent-500">
            <span className="pl-4 pr-1 font-mono text-sm text-slate-500">/</span>
            <input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              placeholder="alex"
              required
              className="w-full bg-transparent px-1 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {error && <Alert kind="error" message={error} />}

        <button type="submit" disabled={busy || !supported} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          {busy ? 'Waiting for passkey…' : 'Sign in with passkey'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{' '}
        <Link to="/register" className="font-medium text-accent-400 hover:text-accent-300">
          Create an SSHID
        </Link>
      </p>
    </AuthShell>
  );
}
