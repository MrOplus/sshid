import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { config } from '../config.js';
import type { CredentialRow } from '../db/repositories.js';

/**
 * Thin wrappers around @simplewebauthn/server that bind the relying-party
 * configuration and translate between our stored credential rows and the
 * library's expected shapes. Keeping this here means routes never deal with
 * WebAuthn primitives directly.
 */
const rpID = config.rpId;
const rpName = config.rpName;
const origin = config.publicOrigin;

function transportsOf(row: CredentialRow): AuthenticatorTransportFuture[] {
  return row.transports
    ? (row.transports.split(',').filter(Boolean) as AuthenticatorTransportFuture[])
    : [];
}

export async function buildRegistrationOptions(params: {
  userId: string;
  handle: string;
  displayName: string;
  existing: CredentialRow[];
}) {
  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: params.handle,
    userDisplayName: params.displayName || params.handle,
    userID: new TextEncoder().encode(params.userId),
    attestationType: 'none',
    excludeCredentials: params.existing.map((c) => ({ id: c.id, transports: transportsOf(c) })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });
}

export async function checkRegistration(params: { response: RegistrationResponseJSON; challenge: string }) {
  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) return null;

  const { credential } = verification.registrationInfo;
  return {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: credential.transports ?? [],
  };
}

export async function buildAuthenticationOptions(credentialsForUser: CredentialRow[]) {
  return generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: credentialsForUser.map((c) => ({ id: c.id, transports: transportsOf(c) })),
  });
}

export async function checkAuthentication(params: {
  response: AuthenticationResponseJSON;
  challenge: string;
  credential: CredentialRow;
}) {
  const verification = await verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: params.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: params.credential.id,
      publicKey: new Uint8Array(Buffer.from(params.credential.public_key, 'base64')),
      counter: params.credential.counter,
      transports: transportsOf(params.credential),
    },
  });
  if (!verification.verified) return null;
  return { newCounter: verification.authenticationInfo.newCounter };
}
