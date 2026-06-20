import { AlertTriangle, Download, KeySquare, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type SshKey } from '../lib/api';
import { ed25519Supported, generateEd25519KeyPair, type GeneratedKeyPair } from '../lib/sshkeygen';
import { Alert } from './Alert';
import { CodeBlock } from './CodeBlock';

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function GenerateKey({ onAdded }: { onAdded: (key: SshKey) => void }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [result, setResult] = useState<{ pair: GeneratedKeyPair; stored: SshKey } | null>(null);

  useEffect(() => {
    let active = true;
    void ed25519Supported().then((ok) => active && setSupported(ok));
    return () => {
      active = false;
    };
  }, []);

  const generate = async () => {
    setError(null);
    setBusy(true);
    try {
      const pair = await generateEd25519KeyPair(label.trim());
      // Only the public half is uploaded; the private key stays in this tab.
      const stored = await api.addKey(label.trim(), pair.publicKey);
      onAdded(stored);
      setResult({ pair, stored });
      setLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key generation failed.');
    } finally {
      setBusy(false);
    }
  };

  if (supported === false) {
    return (
      <div className="card p-6">
        <h2 className="font-semibold text-white">Generate a key pair</h2>
        <div className="mt-3">
          <Alert
            kind="error"
            message="This browser can't generate Ed25519 keys. Use ssh-keygen locally and paste the public key above."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-400" />
          <h2 className="font-semibold text-white">Generate a key pair in your browser</h2>
        </div>
        <p className="mt-1.5 text-sm text-slate-400">
          Creates an Ed25519 key with Web Crypto. The private key is shown only once and never sent to
          the server — the public key is added to your handle automatically.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional), e.g. Work laptop"
            className="input sm:flex-1"
          />
          <button onClick={generate} disabled={busy || supported === null} className="btn-primary shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeySquare className="h-4 w-4" />}
            Generate
          </button>
        </div>
        {error && (
          <div className="mt-3">
            <Alert kind="error" message={error} />
          </div>
        )}
      </div>

      {result && (
        <PrivateKeyModal
          pair={result.pair}
          fingerprint={result.stored.fingerprint}
          onClose={() => setResult(null)}
          onDownload={download}
        />
      )}
    </>
  );
}

function PrivateKeyModal({
  pair,
  fingerprint,
  onClose,
  onDownload,
}: {
  pair: GeneratedKeyPair;
  fingerprint: string;
  onClose: () => void;
  onDownload: (filename: string, contents: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl animate-fade-up p-6 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Save your private key</h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{fingerprint}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This private key is shown <strong>once</strong> and is never stored by SSHID. Download or copy
            it now and keep it secret. The public key has already been added to your handle.
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <CodeBlock label="id_ed25519 (private key)" code={pair.privateKey}>
            {pair.privateKey}
          </CodeBlock>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => onDownload(pair.filename, pair.privateKey)} className="btn-primary">
              <Download className="h-4 w-4" />
              Download private key
            </button>
            <button
              onClick={() => onDownload(`${pair.filename}.pub`, pair.publicKey + '\n')}
              className="btn-ghost"
            >
              <Download className="h-4 w-4" />
              Download public key
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Install it with{' '}
            <code className="font-mono text-slate-400">
              mv {pair.filename} ~/.ssh/ &amp;&amp; chmod 600 ~/.ssh/{pair.filename}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
