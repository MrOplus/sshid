import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { signToken, verifyToken } from './token.js';

export const SESSION_COOKIE = 'sshid_session';
export const CHALLENGE_COOKIE = 'sshid_challenge';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL_SECONDS = 60 * 5; // 5 minutes

function baseCookieOptions(maxAgeSeconds: number): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: maxAgeSeconds,
  };
}

export interface SessionPayload extends Record<string, unknown> {
  uid: string;
}

export function issueSession(reply: FastifyReply, userId: string): void {
  reply.setCookie(SESSION_COOKIE, signToken({ uid: userId }, SESSION_TTL_SECONDS), baseCookieOptions(SESSION_TTL_SECONDS));
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readSession(request: FastifyRequest): SessionPayload | null {
  return verifyToken<SessionPayload>(request.cookies[SESSION_COOKIE]);
}

/** WebAuthn ceremonies stash their challenge (and pending context) in a cookie. */
export interface ChallengePayload extends Record<string, unknown> {
  kind: 'registration' | 'authentication';
  challenge: string;
  handle?: string;
  displayName?: string;
  userId?: string;
}

export function setChallenge(reply: FastifyReply, payload: Omit<ChallengePayload, 'exp'>): void {
  reply.setCookie(
    CHALLENGE_COOKIE,
    signToken(payload, CHALLENGE_TTL_SECONDS),
    baseCookieOptions(CHALLENGE_TTL_SECONDS),
  );
}

export function readChallenge(request: FastifyRequest): ChallengePayload | null {
  return verifyToken<ChallengePayload>(request.cookies[CHALLENGE_COOKIE]);
}

export function clearChallenge(reply: FastifyReply): void {
  reply.clearCookie(CHALLENGE_COOKIE, { path: '/' });
}
