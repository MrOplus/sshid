/**
 * Typed client for the SSHID JSON API. All requests are same-origin and carry
 * cookies for session auth. Errors are normalised into `ApiError` so the UI can
 * surface a single, friendly message.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? 'error', body.message ?? 'Request failed.');
  }
  return data as T;
}

export interface SessionUser {
  id: string;
  handle: string;
  displayName: string;
}

export interface SshKey {
  id: string;
  label: string;
  type: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
}

export interface PublicProfile {
  handle: string;
  displayName: string;
  keys: Array<Omit<SshKey, 'id'>>;
}

export const api = {
  me: () => request<{ authenticated: boolean; user?: SessionUser }>('/api/auth/me'),

  registerOptions: (handle: string, displayName: string) =>
    request<PublicKeyCredentialCreationOptionsJSON>('/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({ handle, displayName }),
    }),
  registerVerify: (response: unknown) =>
    request<SessionUser>('/api/auth/register/verify', { method: 'POST', body: JSON.stringify(response) }),

  loginOptions: (handle: string) =>
    request<PublicKeyCredentialRequestOptionsJSON>('/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  loginVerify: (response: unknown) =>
    request<SessionUser>('/api/auth/login/verify', { method: 'POST', body: JSON.stringify(response) }),

  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  listKeys: () => request<{ keys: SshKey[] }>('/api/keys'),
  addKey: (label: string, publicKey: string) =>
    request<SshKey>('/api/keys', { method: 'POST', body: JSON.stringify({ label, publicKey }) }),
  deleteKey: (id: string) => request<void>(`/api/keys/${id}`, { method: 'DELETE' }),

  publicProfile: (handle: string) => request<PublicProfile>(`/api/u/${encodeURIComponent(handle)}`),
};

// Minimal structural types for the WebAuthn JSON options returned by the server.
// The browser helper accepts these directly.
export type PublicKeyCredentialCreationOptionsJSON = Record<string, unknown>;
export type PublicKeyCredentialRequestOptionsJSON = Record<string, unknown>;
