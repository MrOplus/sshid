import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sshKeys, type SshKeyRow } from '../db/repositories.js';
import { InvalidPublicKeyError, parsePublicKey } from '../lib/sshkey.js';
import { noControlChars } from '../lib/validation.js';
import { requireAuth } from '../plugins/auth.js';

const addKeySchema = z.object({
  // The label is emitted verbatim as a comment in the plain-text
  // authorized_keys output, so an embedded newline could forge a second key
  // line. Disallow all control characters.
  label: z
    .string()
    .trim()
    .max(80)
    .refine(noControlChars, 'Label cannot contain control characters.')
    .optional()
    .default(''),
  publicKey: z.string().min(1).max(16 * 1024),
});

function present(row: SshKeyRow) {
  return {
    id: row.id,
    label: row.label,
    type: row.key_type,
    fingerprint: row.fingerprint,
    publicKey: row.public_key,
    createdAt: row.created_at,
  };
}

/** Authenticated management of the signed-in user's SSH public keys. */
export async function keyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/keys', async (request) => {
    const user = request.user!;
    return { keys: sshKeys.byUser(user.id).map(present) };
  });

  app.post('/api/keys', async (request, reply) => {
    const parsed = addKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: parsed.error.issues[0]?.message });
    }

    let parsedKey;
    try {
      parsedKey = parsePublicKey(parsed.data.publicKey);
    } catch (err) {
      const message = err instanceof InvalidPublicKeyError ? err.message : 'Invalid public key.';
      return reply.code(400).send({ error: 'invalid_key', message });
    }

    const user = request.user!;
    // Fall back to the key's own comment for the label when none is supplied.
    const label = parsed.data.label || parsedKey.comment;

    try {
      const created = sshKeys.create({
        userId: user.id,
        label,
        keyType: parsedKey.type,
        publicKey: parsedKey.canonical,
        fingerprint: parsedKey.fingerprint,
      });
      return reply.code(201).send(present(created));
    } catch (err) {
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        return reply.code(409).send({ error: 'duplicate_key', message: 'You have already added this key.' });
      }
      throw err;
    }
  });

  app.delete('/api/keys/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_request', message: 'Invalid key id.' });
    }
    const user = request.user!;
    const removed = sshKeys.delete(params.data.id, user.id);
    if (!removed) return reply.code(404).send({ error: 'not_found', message: 'Key not found.' });
    return reply.code(204).send();
  });
}
