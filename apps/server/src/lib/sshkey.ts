import { createHash } from 'node:crypto';

/**
 * Parsing, validation and fingerprinting of OpenSSH public keys.
 *
 * A public key line has the shape:
 *   <type> <base64-blob> [comment]
 *
 * We validate not only the textual prefix but also that the base64 blob is a
 * well-formed SSH wire-format string whose embedded algorithm name matches the
 * declared type. This rejects malformed or mismatched keys before they are ever
 * stored or served into someone's `authorized_keys`.
 */

export const SUPPORTED_KEY_TYPES = [
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'sk-ssh-ed25519@openssh.com',
  'sk-ecdsa-sha2-nistp256@openssh.com',
] as const;

export type SupportedKeyType = (typeof SUPPORTED_KEY_TYPES)[number];

const SUPPORTED = new Set<string>(SUPPORTED_KEY_TYPES);

/** Maximum accepted length of a raw public key line, in bytes. */
const MAX_KEY_LENGTH = 16 * 1024;

export interface ParsedPublicKey {
  /** Algorithm identifier, e.g. `ssh-ed25519`. */
  readonly type: SupportedKeyType;
  /** Canonical base64 of the wire-format key blob (no surrounding whitespace). */
  readonly blob: string;
  /** Optional comment, trimmed. Empty string if absent. */
  readonly comment: string;
  /** OpenSSH-style SHA256 fingerprint, e.g. `SHA256:abc…` (no padding). */
  readonly fingerprint: string;
  /** Normalised single-line representation `<type> <blob>` (comment dropped). */
  readonly canonical: string;
}

export class InvalidPublicKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPublicKeyError';
  }
}

/** Reads a length-prefixed string from an SSH wire-format buffer. */
function readSshString(buf: Buffer, offset: number): { value: Buffer; next: number } {
  if (offset + 4 > buf.length) {
    throw new InvalidPublicKeyError('Malformed key: truncated length prefix.');
  }
  const len = buf.readUInt32BE(offset);
  const start = offset + 4;
  const end = start + len;
  if (len > buf.length || end > buf.length) {
    throw new InvalidPublicKeyError('Malformed key: declared field exceeds blob size.');
  }
  return { value: buf.subarray(start, end), next: end };
}

/**
 * Parse and validate a single OpenSSH public key line.
 * @throws {InvalidPublicKeyError} when the input is not a valid supported key.
 */
export function parsePublicKey(input: string): ParsedPublicKey {
  if (typeof input !== 'string') {
    throw new InvalidPublicKeyError('Public key must be a string.');
  }
  if (input.length > MAX_KEY_LENGTH) {
    throw new InvalidPublicKeyError('Public key is unreasonably large.');
  }

  // Collapse to a single logical line; reject embedded newlines (one key only).
  const line = input.trim();
  if (line.length === 0) {
    throw new InvalidPublicKeyError('Public key is empty.');
  }
  if (/[\r\n]/.test(line)) {
    throw new InvalidPublicKeyError('Provide exactly one public key per entry.');
  }

  const parts = line.split(/\s+/);
  const [type, blob, ...rest] = parts;
  if (!type || !blob) {
    throw new InvalidPublicKeyError('Expected "<type> <base64> [comment]".');
  }
  if (!SUPPORTED.has(type)) {
    throw new InvalidPublicKeyError(
      `Unsupported key type "${type}". Supported: ${SUPPORTED_KEY_TYPES.join(', ')}.`,
    );
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) {
    throw new InvalidPublicKeyError('Key body is not valid base64.');
  }

  let raw: Buffer;
  try {
    raw = Buffer.from(blob, 'base64');
  } catch {
    throw new InvalidPublicKeyError('Key body could not be decoded.');
  }
  if (raw.length < 4) {
    throw new InvalidPublicKeyError('Key body is too short to be valid.');
  }

  // The first wire-format string must restate the algorithm name.
  const { value: embeddedType } = readSshString(raw, 0);
  if (embeddedType.toString('utf8') !== type) {
    throw new InvalidPublicKeyError('Key type does not match its encoded algorithm.');
  }

  const fingerprint = 'SHA256:' + createHash('sha256').update(raw).digest('base64').replace(/=+$/, '');
  const comment = rest.join(' ').trim();

  return Object.freeze({
    type: type as SupportedKeyType,
    blob,
    comment,
    fingerprint,
    canonical: `${type} ${blob}`,
  });
}

/** Convenience guard used for query-string filtering. */
export function isSupportedKeyType(value: string): value is SupportedKeyType {
  return SUPPORTED.has(value);
}
