/**
 * Shared input-validation helpers.
 */

/**
 * True when the string contains no control characters (C0 range or DEL),
 * including CR/LF. Used to keep newline-bearing input out of user-facing fields
 * that are later rendered into line-oriented formats such as authorized_keys.
 */
export function noControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}
