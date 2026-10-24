// @ts-check
/**
 * Builds a Bayline Loop conversion event, signs it, and POSTs it, the way a
 * customer's server would. Start the mock server first:
 *
 *   node examples/mock-bayline-server.mjs
 *   node examples/send-test-conversion.mjs                 # good event   -> 202
 *   node examples/send-test-conversion.mjs duplicate       # sent twice   -> 202 then 409
 *   node examples/send-test-conversion.mjs bad-signature   # wrong secret -> 401
 *
 * Set BAYLINE_URL to point somewhere else (default http://localhost:4010/v1/conversions).
 */
import { createHmac, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEMO_SIGNING_SECRET } from '../src/lib/signature.js';

const DEFAULT_URL = 'http://localhost:4010/v1/conversions';

/**
 * A conversion event already in Bayline Loop's format (after mapping).
 * @param {Record<string, unknown>} [overrides] - fields to change, for experiments
 * @returns {Record<string, unknown>}
 */
export function buildConversion(overrides = {}) {
  return {
    event_id: `ex_${randomUUID()}`, // unique per event; a retry must reuse it
    event_type: 'sale',
    click_id: 'bl_clk_7k2m9q4t8w',
    order_id: '7301',
    amount: 8450, // $84.50 in cents
    currency: 'USD',
    customer_status: 'new',
    promo_code: 'FERN10',
    occurred_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * HMAC-SHA256 of the exact body text, as hex. This goes in X-Bayline-Signature.
 * @param {string} body
 * @param {string} secret
 * @returns {string}
 */
export function signBody(body, secret) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * POSTs a signed body and returns the HTTP status and parsed JSON reply.
 * @param {{ url: string, body: string, signature: string }} request
 * @returns {Promise<{ status: number, json: unknown }>}
 */
export async function sendConversion({ url, body, signature }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bayline-Signature': signature },
    body, // send the same string we signed, byte for byte
  });
  return { status: response.status, json: await response.json() };
}

/**
 * Command-line entry point: builds, signs, sends and prints.
 * @param {string} kind - "good", "duplicate" or "bad-signature"
 * @param {string} url
 */
async function main(kind, url) {
  const event = buildConversion();
  const body = JSON.stringify(event);
  const secret = kind === 'bad-signature' ? 'not-the-shared-secret' : DEMO_SIGNING_SECRET;
  const signature = signBody(body, secret);

  const times = kind === 'duplicate' ? 2 : 1;
  for (let i = 0; i < times; i += 1) {
    const { status, json } = await sendConversion({ url, body, signature });
    console.log(`${status} ${JSON.stringify(json)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2] ?? 'good', process.env.BAYLINE_URL ?? DEFAULT_URL).catch((error) => {
    console.error(`Could not send: ${error.message}. Is the mock server running?`);
    process.exitCode = 1;
  });
}
