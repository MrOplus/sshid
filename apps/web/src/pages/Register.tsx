import { Fingerprint, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { AuthShell } from '../components/AuthShell';
import { passkeySupported, useAuth } from '../lib/auth';

export function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const supported = passkeySupported();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(handle.trim(), displayName.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your SSHID.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your SSHID" subtitle="Pick a handle and secure it with a passkey.">
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
          <p className="mt-1.5 text-xs text-slate-500">Letters, numbers and hyphens. 2–39 characters.</p>
        </div>

        <div>
          <label htmlFor="displayName" className="label">
            Display name <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex Rivera"
            className="input"
          />
        </div>

        {error && <Alert kind="error" message={error} />}

        <button type="submit" disabled={busy || !supported} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          {busy ? 'Waiting for passkey…' : 'Create with passkey'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an SSHID?{' '}
        <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
