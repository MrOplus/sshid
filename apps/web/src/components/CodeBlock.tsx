import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface CodeBlockProps {
  /** Plain text copied to the clipboard. */
  code: string;
  /** Optional rich rendering; falls back to `code`. */
  children?: ReactNode;
  label?: string;
}

export function CodeBlock({ code, children, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable over insecure origins; ignore */
    }
  };

  return (
    <div className="group relative min-w-0 max-w-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-950/80">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          {label && <span className="ml-2 text-xs font-medium text-slate-500">{label}</span>}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-ink-800 hover:text-white"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-accent-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
        <code className="font-mono text-slate-200">{children ?? code}</code>
      </pre>
    </div>
  );
}
