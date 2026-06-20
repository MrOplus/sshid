import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sshKeys, users } from '../db/repositories.js';
import { handleSchema, isReservedHandle } from '../lib/handle.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Locate the built web assets across dev, build and container layouts. */
function findWebRoot(): string | null {
  const candidates = [
    process.env.WEB_ROOT,
    resolve(here, '../../../web/dist'), // monorepo: apps/server/dist/plugins -> apps/web/dist
    resolve(here, '../../web'), // container: web copied next to server
    resolve(process.cwd(), 'apps/web/dist'),
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) return candidate;
  }
  return null;
}

/** A browser asks for HTML; tools like curl/wget do not. */
function clientWantsHtml(request: FastifyRequest): boolean {
  const accept = request.headers.accept ?? '';
  return accept.includes('text/html');
}

function renderAuthorizedKeys(handle: string, lines: string[]): string {
  const header = [
    `# SSHID — public keys for @${handle}`,
    `# ${config.publicOrigin}/${handle}`,
    `# Retrieved ${new Date().toISOString()}`,
    '',
  ];
  return [...header, ...lines, ''].join('\n');
}

export async function registerSpa(app: FastifyInstance): Promise<void> {
  const webRoot = findWebRoot();
  const indexHtml = webRoot ? readFileSync(join(webRoot, 'index.html')) : null;

  if (webRoot) {
    await app.register(fastifyStatic, {
      root: webRoot,
      prefix: '/',
      wildcard: false, // register a route per real file; everything else falls through
      index: false,
      cacheControl: true,
      maxAge: '1h',
    });
    logger.info({ webRoot }, 'serving web assets');
  } else {
    logger.warn('web build not found; UI routes will return a placeholder (run the web dev server separately)');
  }

  const sendApp = (reply: FastifyReply): FastifyReply => {
    if (indexHtml) {
      return reply.type('text/html; charset=utf-8').header('cache-control', 'no-cache').send(indexHtml);
    }
    return reply
      .code(200)
      .type('text/html; charset=utf-8')
      .send('<!doctype html><title>SSHID</title><p>UI build not found. Run the web dev server.</p>');
  };

  // Root: always the SPA (landing page).
  app.get('/', async (_request, reply) => sendApp(reply));

  // Public handle resolver. Plain text for tooling, the SPA profile for browsers.
  const resolver = async (request: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const rawParam = (request.params as { handle: string }).handle;
    const handle = rawParam.endsWith('.keys') ? rawParam.slice(0, -'.keys'.length) : rawParam;
    const forceText = rawParam.endsWith('.keys') || (request.query as { format?: string }).format === 'txt';

    // Reserved single-segment paths belong to the SPA router.
    if (isReservedHandle(handle)) return sendApp(reply);

    const valid = handleSchema.safeParse(handle);
    const user = valid.success ? users.byHandle(valid.data) : undefined;

    // Browsers (and unrecognised handles without forced text) get the SPA, which
    // renders either the profile or a friendly not-found page.
    if (!forceText && clientWantsHtml(request)) return sendApp(reply);

    reply.type('text/plain; charset=utf-8');
    if (!user) {
      return reply.code(404).send(`# No SSHID found for "@${handle}"\n`);
    }

    const typeFilter = (request.query as { type?: string }).type?.toLowerCase();
    const lines = sshKeys
      .byUser(user.id)
      .filter((k) => !typeFilter || k.key_type.toLowerCase().includes(typeFilter))
      .map((k) => (k.label ? `${k.public_key} ${k.label}` : k.public_key));

    return reply.header('cache-control', 'public, max-age=60').send(renderAuthorizedKeys(user.handle, lines));
  };

  app.get('/:handle', resolver);

  // Deep SPA links (e.g. /dashboard after a hard refresh) — serve the app shell.
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, async (request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/') && clientWantsHtml(request)) {
      return sendApp(reply);
    }
    return reply.code(404).send({ error: 'not_found', message: 'Resource not found.' });
  });
}
