import type { FastifyReply, FastifyRequest } from 'fastify';
import { users, type UserRow } from '../db/repositories.js';
import { readSession } from '../lib/session.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by `requireAuth`; the authenticated user for this request. */
    user: UserRow | null;
  }
}

/** Resolve the session cookie to a user without enforcing authentication. */
export function loadUser(request: FastifyRequest): UserRow | null {
  const session = readSession(request);
  if (!session) return null;
  return users.byId(session.uid) ?? null;
}

/**
 * preHandler guard. Rejects the request with 401 unless a valid session maps to
 * an existing user, in which case `request.user` is populated.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = loadUser(request);
  if (!user) {
    await reply.code(401).send({ error: 'unauthorized', message: 'Authentication required.' });
    return;
  }
  request.user = user;
}
