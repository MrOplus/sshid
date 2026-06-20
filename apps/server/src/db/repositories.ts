import { randomUUID } from 'node:crypto';
import { db } from './index.js';

/** Row shapes as stored in SQLite. */
export interface UserRow {
  id: string;
  handle: string;
  handle_lower: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialRow {
  id: string;
  user_id: string;
  public_key: string;
  counter: number;
  transports: string;
  device_label: string;
  created_at: string;
  last_used_at: string | null;
}

export interface SshKeyRow {
  id: string;
  user_id: string;
  label: string;
  key_type: string;
  public_key: string;
  fingerprint: string;
  created_at: string;
}

/**
 * Prepared statements are compiled once and reused for the lifetime of the
 * process. This is both faster and safer (parameters are always bound, never
 * interpolated) than building SQL per request.
 */
const stmts = {
  insertUser: db.prepare<[string, string, string, string, string, string]>(
    `INSERT INTO users (id, handle, handle_lower, display_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ),
  userById: db.prepare<[string]>('SELECT * FROM users WHERE id = ?'),
  userByHandle: db.prepare<[string]>('SELECT * FROM users WHERE handle_lower = ?'),

  insertCredential: db.prepare<[string, string, string, number, string, string, string]>(
    `INSERT INTO credentials (id, user_id, public_key, counter, transports, device_label, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ),
  credentialsByUser: db.prepare<[string]>('SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at'),
  credentialById: db.prepare<[string]>('SELECT * FROM credentials WHERE id = ?'),
  touchCredential: db.prepare<[number, string, string]>(
    'UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?',
  ),

  insertSshKey: db.prepare<[string, string, string, string, string, string, string]>(
    `INSERT INTO ssh_keys (id, user_id, label, key_type, public_key, fingerprint, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ),
  sshKeysByUser: db.prepare<[string]>('SELECT * FROM ssh_keys WHERE user_id = ? ORDER BY created_at'),
  sshKeyById: db.prepare<[string, string]>('SELECT * FROM ssh_keys WHERE id = ? AND user_id = ?'),
  deleteSshKey: db.prepare<[string, string]>('DELETE FROM ssh_keys WHERE id = ? AND user_id = ?'),
};

const now = (): string => new Date().toISOString();

export const users = {
  create(handle: string, displayName: string): UserRow {
    const id = randomUUID();
    const ts = now();
    stmts.insertUser.run(id, handle, handle.toLowerCase(), displayName, ts, ts);
    return stmts.userById.get(id) as UserRow;
  },
  byId(id: string): UserRow | undefined {
    return stmts.userById.get(id) as UserRow | undefined;
  },
  byHandle(handle: string): UserRow | undefined {
    return stmts.userByHandle.get(handle.toLowerCase()) as UserRow | undefined;
  },
};

export const credentials = {
  create(input: {
    id: string;
    userId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    deviceLabel: string;
  }): void {
    stmts.insertCredential.run(
      input.id,
      input.userId,
      input.publicKey,
      input.counter,
      input.transports.join(','),
      input.deviceLabel,
      now(),
    );
  },
  byUser(userId: string): CredentialRow[] {
    return stmts.credentialsByUser.all(userId) as CredentialRow[];
  },
  byId(id: string): CredentialRow | undefined {
    return stmts.credentialById.get(id) as CredentialRow | undefined;
  },
  touch(id: string, counter: number): void {
    stmts.touchCredential.run(counter, now(), id);
  },
};

export const sshKeys = {
  create(input: {
    userId: string;
    label: string;
    keyType: string;
    publicKey: string;
    fingerprint: string;
  }): SshKeyRow {
    const id = randomUUID();
    stmts.insertSshKey.run(id, input.userId, input.label, input.keyType, input.publicKey, input.fingerprint, now());
    return stmts.sshKeyById.get(id, input.userId) as SshKeyRow;
  },
  byUser(userId: string): SshKeyRow[] {
    return stmts.sshKeysByUser.all(userId) as SshKeyRow[];
  },
  delete(id: string, userId: string): boolean {
    return stmts.deleteSshKey.run(id, userId).changes > 0;
  },
};
