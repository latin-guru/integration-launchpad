// @ts-check
/**
 * HMAC-SHA256 signatures with the browser's Web Crypto API.
 *
 * How it works: the sender and Bayline Loop share a secret. The sender hashes the
 * exact request body together with the secret and puts the result in the
 * X-Bayline-Signature header. Bayline Loop does the same calculation; if the
 * results match, the event came from someone who knows the secret and the
 * body was not changed on the way.
 */

/**
 * DEMO ONLY – in production the secret stays server-side.
 * This value is public on purpose so the demo works in a static site.
 * A real integration signs on the customer's server and never ships the
 * secret to a browser.
 */
export const DEMO_SIGNING_SECRET = 'demo-only-bayline-test-secret';

const encoder = new TextEncoder();

/**
 * Turns the secret text into a Web Crypto key for HMAC-SHA256.
 * @param {string} secret
 * @returns {Promise<CryptoKey>}
 */
function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Signs a raw body and returns the signature as lower-case hex.
 * @param {string} body - the exact JSON text that will be sent
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function signPayload(body, secret) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks a hex signature against a raw body. crypto.subtle.verify compares
 * in constant time, which avoids leaking how many characters matched.
 * @param {string} body
 * @param {string} signatureHex
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function verifySignature(body, signatureHex, secret) {
  if (!/^[0-9a-f]{64}$/.test(signatureHex)) return false;
  const bytes = new Uint8Array(signatureHex.match(/../g).map((pair) => parseInt(pair, 16)));
  const key = await importKey(secret);
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(body));
}
