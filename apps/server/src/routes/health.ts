import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_req, reply) => {
    // A trivial query confirms the database handle is live, not just the process.
    try {
      db.prepare('SELECT 1').get();
      return { status: 'ok', uptime: Math.round(process.uptime()) };
    } catch {
      return reply.code(503).send({ status: 'degraded' });
    }
  });
}
