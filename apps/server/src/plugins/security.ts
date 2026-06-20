import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

/**
 * Cross-cutting security middleware: hardened headers, a same-origin CORS
 * policy, signed-cookie support and a global rate limit that protects every
 * endpoint from abuse and accidental hammering.
 */
export async function registerSecurity(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    // The bundler emits a linked stylesheet (no inline <style>/style attrs), so
    // the style policy stays strict; everything is same-origin.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: config.publicOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
  });

  await app.register(cookie, { secret: config.sessionSecret });

  // CSRF defense: browsers always attach an Origin header to cross-origin
  // state-changing requests. Reject any unsafe method whose Origin is present
  // and does not match our own. Non-browser clients (no Origin) are unaffected,
  // and the SameSite=Strict session cookie provides defence in depth.
  const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  app.addHook('onRequest', async (request, reply) => {
    if (!UNSAFE.has(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== config.publicOrigin) {
      await reply.code(403).send({ error: 'forbidden', message: 'Cross-origin request rejected.' });
    }
  });

  await app.register(rateLimit, {
    global: true,
    max: 240,
    timeWindow: '1 minute',
    // Plain-text key endpoints (curl) are read-only and cacheable, so they get
    // their own generous allowance via per-route overrides.
    allowList: (req) => req.method === 'OPTIONS',
  });
}
