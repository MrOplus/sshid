import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Alert({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  const error = kind === 'error';
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        error
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          : 'border-accent-500/30 bg-accent-500/10 text-accent-200'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
