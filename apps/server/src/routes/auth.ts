import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { credentials, users } from '../db/repositories.js';
import { handleSchema } from '../lib/handle.js';
import {
  clearChallenge,
  clearSession,
  issueSession,
  readChallenge,
  setChallenge,
} from '../lib/session.js';
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  checkAuthentication,
  checkRegistration,
} from '../lib/webauthn.js';
import { loadUser } from '../plugins/auth.js';

const registerStartSchema = z.object({
  handle: handleSchema,
  displayName: z.string().trim().max(80).optional().default(''),
});

const loginStartSchema = z.object({ handle: handleSchema });

/**
 * Passkey (WebAuthn) registration and authentication.
 *
 * Each ceremony is two steps. The first returns options and stores the expected
 * challenge in a short-lived, signed cookie; the second verifies the
 * authenticator's response against that challenge. On success a session cookie
 * is issued. No passwords are ever involved.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Tighten the rate limit on credential ceremonies specifically.
  const ceremonyLimit = { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };

  app.get('/api/auth/me', async (request) => {
    const user = loadUser(request);
    if (!user) return { authenticated: false as const };
    return {
      authenticated: true as const,
      user: { id: user.id, handle: user.handle, displayName: user.display_name },
    };
  });

  app.post('/api/auth/register/options', ceremonyLimit, async (request, reply) => {
    const parsed = registerStartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: parsed.error.issues[0]?.message });
    }
    const { handle, displayName } = parsed.data;
    if (users.byHandle(handle)) {
      return reply.code(409).send({ error: 'handle_taken', message: 'That handle is already registered.' });
    }

    // Use a stable, opaque user id so the same passkey maps to one account.
    const userId = crypto.randomUUID();
    const options = await buildRegistrationOptions({ userId, handle, displayName, existing: [] });
    setChallenge(reply, { kind: 'registration', challenge: options.challenge, handle, displayName, userId });
    return options;
  });

  app.post('/api/auth/register/verify', ceremonyLimit, async (request, reply) => {
    const challenge = readChallenge(request);
    if (!challenge || challenge.kind !== 'registration' || !challenge.handle || !challenge.userId) {
      return reply.code(400).send({ error: 'challenge_expired', message: 'Registration session expired. Try again.' });
    }
    // Guard against a race where the handle was claimed between the two steps.
    if (users.byHandle(challenge.handle)) {
      clearChallenge(reply);
      return reply.code(409).send({ error: 'handle_taken', message: 'That handle is already registered.' });
    }

    const verified = await checkRegistration({
      response: request.body as RegistrationResponseJSON,
      challenge: challenge.challenge,
    });
    if (!verified) {
      return reply.code(400).send({ error: 'verification_failed', message: 'Passkey could not be verified.' });
    }

    const user = users.create(challenge.handle, challenge.displayName ?? '');
    credentials.create({
      id: verified.id,
      userId: user.id,
      publicKey: verified.publicKey,
      counter: verified.counter,
      transports: verified.transports,
      deviceLabel: '',
    });

    clearChallenge(reply);
    issueSession(reply, user.id);
    return { id: user.id, handle: user.handle, displayName: user.display_name };
  });

  app.post('/api/auth/login/options', ceremonyLimit, async (request, reply) => {
    const parsed = loginStartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: parsed.error.issues[0]?.message });
    }
    const user = users.byHandle(parsed.data.handle);
    const userCreds = user ? credentials.byUser(user.id) : [];
    const options = await buildAuthenticationOptions(userCreds);
    // Store the challenge regardless of whether the user exists, so timing does
    // not reveal account existence. Verification will still fail for unknowns.
    setChallenge(reply, { kind: 'authentication', challenge: options.challenge, userId: user?.id });
    return options;
  });

  app.post('/api/auth/login/verify', ceremonyLimit, async (request, reply) => {
    const challenge = readChallenge(request);
    if (!challenge || challenge.kind !== 'authentication') {
      return reply.code(400).send({ error: 'challenge_expired', message: 'Login session expired. Try again.' });
    }

    const response = request.body as AuthenticationResponseJSON;
    const credential = credentials.byId(response.id);
    if (!credential) {
      return reply.code(401).send({ error: 'unknown_credential', message: 'Passkey not recognised.' });
    }

    const result = await checkAuthentication({ response, challenge: challenge.challenge, credential });
    if (!result) {
      return reply.code(401).send({ error: 'verification_failed', message: 'Passkey could not be verified.' });
    }

    credentials.touch(credential.id, result.newCounter);
    clearChallenge(reply);
    issueSession(reply, credential.user_id);

    const user = users.byId(credential.user_id);
    return user
      ? { id: user.id, handle: user.handle, displayName: user.display_name }
      : reply.code(500).send({ error: 'internal', message: 'Account missing for credential.' });
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSession(reply);
    return { ok: true };
  });
}
