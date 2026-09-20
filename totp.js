import { base32decode } from './base32.js';

// RFC 6238 TOTP using the Web Crypto API. Returns a zero-padded string.
export async function totp(secret, { digits = 6, period = 30, when = Date.now() } = {}) {
  const counter = Math.floor(when / 1000 / period);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));

  const key = await crypto.subtle.importKey(
    'raw', base32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));

  const o = hmac[19] & 0xf;
  const bin = ((hmac[o] & 0x7f) << 24) | (hmac[o + 1] << 16) | (hmac[o + 2] << 8) | hmac[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}
