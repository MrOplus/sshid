export const GITHUB_URL = 'https://github.com/mroplus/sshid';

/** The public origin, used to render example commands. Falls back to the
 *  current host so previews and self-hosted instances show correct URLs. */
export const PUBLIC_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'https://sshid.koorosh.me';

/** Bare host (no scheme) for `curl host/handle` style examples. */
export const PUBLIC_HOST = PUBLIC_ORIGIN.replace(/^https?:\/\//, '');
