/**
 * Client-side SSH key generation.
 *
 * An Ed25519 key pair is generated with the Web Crypto API and encoded into the
 * exact byte formats OpenSSH uses:
 *   - the public key as a single `ssh-ed25519 AAAA… comment` line, and
 *   - the private key as an unencrypted `openssh-key-v1` PEM blob.
 *
 * The private key is produced and handled entirely in the browser — it is never
 * transmitted to the server. Only the public half is uploaded.
 */

export interface GeneratedKeyPair {
  /** OpenSSH single-line public key (`ssh-ed25519 <base64> <comment>`). */
  publicKey: string;
  /** Unencrypted OpenSSH private key (PEM). */
  privateKey: string;
  /** Suggested filename stem, e.g. `id_ed25519`. */
  filename: string;
}

/** Whether this browser can generate Ed25519 keys via Web Crypto. */
export async function ed25519Supported(): Promise<boolean> {
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    return true;
  } catch {
    return false;
  }
}

class ByteWriter {
  private chunks: Uint8Array[] = [];

  bytes(data: Uint8Array): this {
    this.chunks.push(data);
    return this;
  }

  uint32(value: number): this {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value, false);
    return this.bytes(b);
  }

  /** SSH wire-format string: 4-byte big-endian length prefix + payload. */
  sshString(data: Uint8Array | string): this {
    const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return this.uint32(payload.length).bytes(payload);
  }

  concat(): Uint8Array {
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrap(base64: string, width = 70): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += width) lines.push(base64.slice(i, i + width));
  return lines.join('\n');
}

function publicKeyBlob(pub: Uint8Array): Uint8Array {
  return new ByteWriter().sshString('ssh-ed25519').sshString(pub).concat();
}

function encodePrivateKey(seed: Uint8Array, pub: Uint8Array, comment: string): string {
  const checkInt = crypto.getRandomValues(new Uint32Array(1))[0]!;

  // priv field is seed(32) || public(32), as OpenSSH stores it.
  const priv = new Uint8Array(64);
  priv.set(seed, 0);
  priv.set(pub, 32);

  let privateSection = new ByteWriter()
    .uint32(checkInt)
    .uint32(checkInt)
    .sshString('ssh-ed25519')
    .sshString(pub)
    .sshString(priv)
    .sshString(comment)
    .concat();

  // Pad to a multiple of the cipher block size (8 for "none") with 1,2,3,…
  const padLen = (8 - (privateSection.length % 8)) % 8;
  if (padLen > 0) {
    const padded = new Uint8Array(privateSection.length + padLen);
    padded.set(privateSection, 0);
    for (let i = 0; i < padLen; i++) padded[privateSection.length + i] = i + 1;
    privateSection = padded;
  }

  const magic = new TextEncoder().encode('openssh-key-v1\0');
  const body = new ByteWriter()
    .bytes(magic)
    .sshString('none') // ciphername
    .sshString('none') // kdfname
    .sshString('') // kdfoptions
    .uint32(1) // number of keys
    .sshString(publicKeyBlob(pub))
    .sshString(privateSection)
    .concat();

  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrap(toBase64(body))}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

export async function generateEd25519KeyPair(comment: string): Promise<GeneratedKeyPair> {
  const label = comment.trim() || 'sshid';
  const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;

  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  // PKCS#8 for Ed25519 is a fixed prefix followed by the 32-byte seed.
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  const seed = pkcs8.slice(pkcs8.length - 32);

  const publicKey = `ssh-ed25519 ${toBase64(publicKeyBlob(pub))} ${label}`;
  const privateKey = encodePrivateKey(seed, pub, label);

  return { publicKey, privateKey, filename: 'id_ed25519' };
}
