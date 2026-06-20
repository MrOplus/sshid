/**
 * Ordered, append-only schema migrations.
 *
 * Each migration runs exactly once inside a transaction and is recorded in
 * `schema_migrations`. Never edit an applied migration — add a new one.
 */
export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: /* sql */ `
      CREATE TABLE users (
        id           TEXT PRIMARY KEY,
        handle       TEXT NOT NULL,
        handle_lower TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE TABLE credentials (
        id            TEXT PRIMARY KEY,            -- base64url credential id
        user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        public_key    TEXT NOT NULL,               -- base64 COSE public key
        counter       INTEGER NOT NULL DEFAULT 0,
        transports    TEXT NOT NULL DEFAULT '',    -- comma separated
        device_label  TEXT NOT NULL DEFAULT '',
        created_at    TEXT NOT NULL,
        last_used_at  TEXT
      );
      CREATE INDEX idx_credentials_user ON credentials(user_id);

      CREATE TABLE ssh_keys (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label        TEXT NOT NULL DEFAULT '',
        key_type     TEXT NOT NULL,
        public_key   TEXT NOT NULL,               -- canonical "<type> <blob>"
        fingerprint  TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        UNIQUE (user_id, fingerprint)
      );
      CREATE INDEX idx_ssh_keys_user ON ssh_keys(user_id);
    `,
  },
];
