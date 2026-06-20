import { z } from 'zod';

/**
 * Handles are the public identity of a user (the `alex` in
 * `https://sshid.example/alex`). They must be URL-safe, unambiguous and must
 * not collide with first-class application routes.
 */
export const HANDLE_MIN = 2;
export const HANDLE_MAX = 39;

/** Single-segment paths the SPA and API own; they can never be handles. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'api',
  'app',
  'assets',
  'dashboard',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'settings',
  'account',
  'admin',
  'health',
  'healthz',
  'metrics',
  'favicon.ico',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'manifest.webmanifest',
  'about',
  'docs',
  'security',
  'support',
  'index.html',
  'static',
  'public',
  'well-known',
  '.well-known',
]);

export const handleSchema = z
  .string()
  .trim()
  .min(HANDLE_MIN, `Handle must be at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Handle must be at most ${HANDLE_MAX} characters.`)
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    'Handle may contain letters, numbers and single hyphens, and cannot start or end with a hyphen.',
  )
  .refine((h) => !RESERVED_HANDLES.has(h.toLowerCase()), 'This handle is reserved.');

export function isReservedHandle(value: string): boolean {
  return RESERVED_HANDLES.has(value.toLowerCase());
}
