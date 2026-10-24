// @ts-check
/**
 * A tiny pretend Bayline Loop API, for local testing only. It accepts
 * POST /v1/conversions and answers the way the real (invented) API would:
 *
 *   401  the X-Bayline-Signature header does not match the body
 *   400  the body is not JSON, or a field fails validation
 *   409  this event_id was already accepted (duplicate)
 *   202  accepted
 *
 * Run it:   node examples/mock-bayline-server.mjs
 * Then:     node examples/send-test-conversion.mjs
 */
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateEvent } from '../src/lib/validate.js';
import { DEMO_SIGNING_SECRET } from '../src/lib/signature.js';

// The same API spec file the browser app uses, so both apply the same rules.
const spec = JSON.parse(
  readFileSync(new URL('../src/spec/conversion-v1.json', import.meta.url), 'utf8'),
);

const MAX_BODY_BYTES = 100_000;

/**
 * Sends a JSON response.
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Is the signature header the HMAC-SHA256 of the raw body?
 * timingSafeEqual compares in constant time, so an attacker cannot learn
 * the right signature one character at a time from response timings.
 * @param {string} rawBody
 * @param {string | undefined} signatureHeader
 * @param {string} secret
 * @returns {boolean}
 */
export function isValidSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const received = Buffer.from(signatureHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Creates the mock server (not yet listening). Each server keeps its own
 * memory of accepted event_ids.
 * @param {{ secret?: string }} [options]
 * @returns {http.Server}
 */
export function createMockServer({ secret = DEMO_SIGNING_SECRET } = {}) {
  /** event_ids already accepted. A real API would keep these in a database. */
  const seenEventIds = new Set();

  return http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/conversions') {
      return reply(res, 404, { error: 'not_found' });
    }

    // 1. Read the raw body. We must keep the exact text to check the signature.
    let rawBody = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > MAX_BODY_BYTES) req.destroy();
    });

    req.on('end', () => {
      // 2. Signature first: never trust a body we cannot verify.
      const signature = req.headers['x-bayline-signature'];
      if (
        !isValidSignature(rawBody, typeof signature === 'string' ? signature : undefined, secret)
      ) {
        return reply(res, 401, { error: 'invalid_signature' });
      }

      // 3. Parse the JSON.
      let event;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return reply(res, 400, { error: 'invalid_json' });
      }

      // 4. Field checks (the same validateEvent the browser uses).
      const failed = validateEvent(event, spec, []).filter((r) => !r.pass);
      if (failed.length > 0) {
        return reply(res, 400, {
          error: 'validation_failed',
          failed: failed.map((r) => ({ check: r.check, message: r.message })),
        });
      }

      // 5. Duplicate check: the same event_id is only ever accepted once.
      if (seenEventIds.has(event.event_id)) {
        return reply(res, 409, { error: 'duplicate_event', event_id: event.event_id });
      }

      seenEventIds.add(event.event_id);
      return reply(res, 202, { status: 'accepted', event_id: event.event_id });
    });
  });
}

// Start listening only when this file is run directly (not when a test imports it).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4010);
  createMockServer().listen(port, () => {
    console.log(`Mock Bayline Loop API listening on http://localhost:${port}/v1/conversions`);
    console.log('DEMO ONLY: uses the public demo secret. Press Ctrl+C to stop.');
  });
}
