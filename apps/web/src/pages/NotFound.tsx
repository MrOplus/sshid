import { Link } from 'react-router-dom';

export function NotFound({ handle }: { handle?: string }) {
  return (
    <div className="container-page grid min-h-[calc(100vh-4rem)] place-items-center py-16 text-center">
      <div className="animate-fade-up">
        <p className="font-mono text-6xl font-bold text-ink-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">
          {handle ? `No SSHID found for @${handle}` : 'Page not found'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-slate-400">
          {handle
            ? 'This handle is not registered yet. It could be yours.'
            : 'The page you are looking for does not exist.'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-ghost">
            Back home
          </Link>
          {handle && (
            <Link to="/register" className="btn-primary">
              Claim @{handle}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
