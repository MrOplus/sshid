import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { loggerOptions } from './logger.js';
import { registerSecurity } from './plugins/security.js';
import { registerSpa } from './plugins/spa.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { keyRoutes } from './routes/keys.js';
import { publicUserRoutes } from './routes/publicUser.js';

/**
 * Compose the Fastify application. Registration order is deliberate:
 *   1. security middleware (headers, cors, cookies, rate limit)
 *   2. health + JSON API routes
 *   3. the SPA / public resolver last, since it owns `/:handle` and the
 *      not-found handler that backs client-side routing.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    trustProxy: true, // behind the Cloudflare tunnel / reverse proxy
    bodyLimit: 1024 * 1024, // 1 MiB is ample for keys and WebAuthn payloads
    disableRequestLogging: config.isProduction,
    requestTimeout: 15_000,
  });

  app.decorateRequest('user', null);

  await registerSecurity(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(keyRoutes);
  await app.register(publicUserRoutes);
  await app.register(registerSpa);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({ error: 'invalid_request', message: error.message });
    }
    if (error.statusCode === 429) {
      return reply.code(429).send({ error: 'rate_limited', message: 'Too many requests. Please slow down.' });
    }
    request.log.error({ err: error }, 'unhandled error');
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    return reply.code(status).send({
      error: 'internal_error',
      message: status === 500 ? 'Something went wrong.' : error.message,
    });
  });

  return app;
}
