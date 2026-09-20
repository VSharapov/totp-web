const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// RFC 4648 base32 -> Uint8Array. Ignores whitespace, padding and case.
export function base32decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of str.toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    if ((bits += 5) >= 8) out.push((value >> (bits -= 8)) & 0xff);
  }
  return Uint8Array.from(out);
}
