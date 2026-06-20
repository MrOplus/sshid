import { Download, KeyRound, Loader2, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { ApiError, api, type PublicProfile } from '../lib/api';
import { PUBLIC_HOST, PUBLIC_ORIGIN } from '../lib/constants';
import { NotFound } from './NotFound';

export function Profile() {
  const { handle = '' } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    setState('loading');
    api
      .publicProfile(handle)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setState('ready');
      })
      .catch((err) => {
        if (!active) return;
        // A genuine 404 means the handle is unclaimed; anything else (5xx,
        // network) is a transient error the user can retry.
        setState(err instanceof ApiError && err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [handle]);

  if (state === 'loading') {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="container-page grid min-h-[calc(100vh-4rem)] place-items-center py-16 text-center">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-white">Couldn’t load this profile</h1>
          <p className="mx-auto mt-3 max-w-md text-slate-400">
            Something went wrong reaching the server. Please try again.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-8">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state === 'missing' || !profile) {
    return <NotFound handle={handle} />;
  }

  const shareUrl = `${PUBLIC_ORIGIN}/${profile.handle}`;
  const authorizedKeysSnippet =
    profile.keys.map((k) => (k.label ? `${k.publicKey} ${k.label}` : k.publicKey)).join('\n') ||
    '# This SSHID has no public keys yet.';

  return (
    <div className="container-page py-12">
      <header className="animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-accent-500/30 bg-ink-900 text-accent-400">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">@{profile.handle}</h1>
            {profile.displayName && <p className="text-slate-400">{profile.displayName}</p>}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-6 py-4">
            <h2 className="font-semibold text-white">Public keys</h2>
            <span className="rounded-full bg-ink-800 px-2.5 py-0.5 text-xs text-slate-400">
              {profile.keys.length}
            </span>
          </div>
          {profile.keys.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              This SSHID has not published any keys yet.
            </p>
          ) : (
            <ul className="divide-y divide-ink-800/70">
              {profile.keys.map((key) => (
                <li key={key.fingerprint} className="flex items-start gap-4 px-6 py-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-accent-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{key.label || 'Untitled key'}</span>
                      <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
                        {key.type}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{key.fingerprint}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <CodeBlock label="add to a server" code={`curl -fsSL ${PUBLIC_HOST}/${profile.handle} >> ~/.ssh/authorized_keys`}>
            <span className="text-accent-400">curl</span> -fsSL {PUBLIC_HOST}/{profile.handle}{' '}
            <span className="text-slate-300">&gt;&gt;</span> ~/.ssh/authorized_keys
          </CodeBlock>

          <a href={`${shareUrl}.keys`} className="btn-ghost w-full">
            <Download className="h-4 w-4" />
            Download authorized_keys
          </a>

          <CodeBlock label="authorized_keys" code={authorizedKeysSnippet}>
            {authorizedKeysSnippet}
          </CodeBlock>
        </aside>
      </div>
    </div>
  );
}
