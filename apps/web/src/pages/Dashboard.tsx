import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { CodeBlock } from '../components/CodeBlock';
import { GenerateKey } from '../components/GenerateKey';
import { api, type SshKey } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PUBLIC_HOST, PUBLIC_ORIGIN } from '../lib/constants';

export function Dashboard() {
  const { user, loading } = useAuth();
  const [keys, setKeys] = useState<SshKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .listKeys()
      .then((res) => active && setKeys(res.keys))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Failed to load keys.'))
      .finally(() => active && setLoadingKeys(false));
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const shareUrl = `${PUBLIC_ORIGIN}/${user.handle}`;

  return (
    <div className="container-page py-12">
      <header className="animate-fade-up">
        <p className="text-sm font-medium text-accent-400">Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">@{user.handle}</h1>
        <p className="mt-2 text-slate-400">Manage the public keys served under your handle.</p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <GenerateKey onAdded={(k) => setKeys((prev) => [...prev, k])} />
          <AddKeyForm onAdded={(k) => setKeys((prev) => [...prev, k])} />

          <div className="card">
            <div className="flex items-center justify-between border-b border-ink-700/70 px-6 py-4">
              <h2 className="font-semibold text-white">Your keys</h2>
              <span className="rounded-full bg-ink-800 px-2.5 py-0.5 text-xs text-slate-400">
                {keys.length}
              </span>
            </div>

            {error && (
              <div className="p-6">
                <Alert kind="error" message={error} />
              </div>
            )}

            {loadingKeys ? (
              <div className="grid place-items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : keys.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-ink-800/70">
                {keys.map((key) => (
                  <KeyRow
                    key={key.id}
                    item={key}
                    onDeleted={() => setKeys((prev) => prev.filter((k) => k.id !== key.id))}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-white">Your public URL</h2>
            <p className="mt-1.5 text-sm text-slate-400">Anyone can resolve your keys from here.</p>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 font-mono text-sm text-accent-300 hover:border-accent-500/50"
            >
              {shareUrl}
            </a>
          </div>

          <CodeBlock
            label="provision a server"
            code={`curl -fsSL ${PUBLIC_HOST}/${user.handle} >> ~/.ssh/authorized_keys`}
          >
            <span className="text-accent-400">curl</span> -fsSL {PUBLIC_HOST}/{user.handle}{' '}
            <span className="text-slate-300">&gt;&gt;</span> ~/.ssh/authorized_keys
          </CodeBlock>
        </aside>
      </section>
    </div>
  );
}

function AddKeyForm({ onAdded }: { onAdded: (key: SshKey) => void }) {
  const [label, setLabel] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.addKey(label.trim(), publicKey.trim());
      onAdded(created);
      setLabel('');
      setPublicKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the key.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <h2 className="font-semibold text-white">Add a public key</h2>
      <div>
        <label htmlFor="label" className="label">
          Label <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="MacBook Pro"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="publicKey" className="label">
          Public key
        </label>
        <textarea
          id="publicKey"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          required
          rows={3}
          spellCheck={false}
          placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5… you@device"
          className="input resize-none font-mono text-xs"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Paste the contents of a <code className="font-mono">.pub</code> file. Supports Ed25519, ECDSA,
          RSA and FIDO keys.
        </p>
      </div>

      {error && <Alert kind="error" message={error} />}

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add key
      </button>
    </form>
  );
}

function KeyRow({ item, onDeleted }: { item: SshKey; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!window.confirm('Remove this key? Servers will stop accepting it after their next sync.')) return;
    setBusy(true);
    try {
      await api.deleteKey(item.id);
      onDeleted();
    } catch {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-start gap-4 px-6 py-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-accent-400">
        <KeyRound className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{item.label || 'Untitled key'}</span>
          <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
            {item.type}
          </span>
        </div>
        <p className="mt-1 break-all font-mono text-xs text-slate-500">{item.fingerprint}</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Added {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={remove}
        disabled={busy}
        aria-label="Remove key"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800 text-slate-500">
        <KeyRound className="h-6 w-6" />
      </div>
      <p className="mt-4 font-medium text-slate-300">No keys yet</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        Add your first public key above to start serving it under your handle.
      </p>
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  );
}
