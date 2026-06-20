import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sshKeys, users } from '../db/repositories.js';
import { handleSchema } from '../lib/handle.js';

/**
 * Public, unauthenticated profile data consumed by the SPA to render a user's
 * key page. The plain-text `authorized_keys` view lives on the root `/:handle`
 * route; this is its JSON counterpart.
 */
export async function publicUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/u/:handle', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    const params = z.object({ handle: handleSchema }).safeParse(request.params);
    if (!params.success) {
      return reply.code(404).send({ error: 'not_found', message: 'No such handle.' });
    }
    const user = users.byHandle(params.data.handle);
    if (!user) {
      return reply.code(404).send({ error: 'not_found', message: 'No such handle.' });
    }

    // Optional exact key-type filter, mirroring the plain-text resolver.
    const typeFilter = (request.query as { type?: string }).type?.toLowerCase();

    return {
      handle: user.handle,
      displayName: user.display_name,
      keys: sshKeys
        .byUser(user.id)
        .filter((k) => !typeFilter || k.key_type.toLowerCase() === typeFilter)
        .map((k) => ({
        label: k.label,
        type: k.key_type,
        fingerprint: k.fingerprint,
        publicKey: k.public_key,
        createdAt: k.created_at,
      })),
    };
  });
}
