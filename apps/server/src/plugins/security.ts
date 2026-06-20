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
    // The SPA needs inline styles from the bundler and same-origin XHR/WebAuthn.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
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

  await app.register(rateLimit, {
    global: true,
    max: 240,
    timeWindow: '1 minute',
    // Plain-text key endpoints (curl) are read-only and cacheable, so they get
    // their own generous allowance via per-route overrides.
    allowList: (req) => req.method === 'OPTIONS',
  });
}
