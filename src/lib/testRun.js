// @ts-check
import { applyMapping } from './mapping.js';
import { signPayload, verifySignature } from './signature.js';
import { validateEvent } from './validate.js';

/**
 * @typedef {import('./validate.js').CheckResult} CheckResult
 * @typedef {{ id: string, rawPayload: unknown, mappedPayload: Record<string, unknown>, signature: string, results: CheckResult[], accepted: boolean, ranAt: string }} TestEvent
 */

/**
 * Runs one test event end to end, the same way Bayline Loop would receive it:
 * map the raw payload, sign the JSON body, (optionally) tamper with it,
 * then verify the signature and validate the fields.
 *
 * @param {{
 *   id: string,
 *   ranAt: string,
 *   raw: unknown,
 *   mappings: import('./mapping.js').Mapping[],
 *   spec: import('./mapping.js').ApiSpec,
 *   seenEventIds: string[],
 *   answers?: import('./mapping.js').ScopeAnswers,
 *   secret: string,
 *   tamper?: boolean,
 * }} input
 * @returns {Promise<TestEvent>}
 */
export async function runTestEvent(input) {
  const mapped = applyMapping(input.raw, input.mappings);
  const body = JSON.stringify(mapped);
  const signature = await signPayload(body, input.secret);

  // "Bad signature" sample: the body changes after signing.
  const receivedBody = input.tamper
    ? JSON.stringify({ ...mapped, amount: (Number(mapped.amount) || 0) + 1000 })
    : body;
  const received = JSON.parse(receivedBody);

  const signatureOk = await verifySignature(receivedBody, signature, input.secret);
  /** @type {CheckResult} */
  const signatureResult = {
    check: 'signature',
    label: 'HMAC-SHA256 signature',
    pass: signatureOk,
    message: signatureOk
      ? 'OK'
      : 'The signature does not match the body. The body changed after signing, or a different secret was used.',
    hint: signatureOk
      ? ''
      : 'First re-check that the sender uses the test secret and signs the exact raw body without re-formatting it. If it still fails, escalate to Bayline Loop support with the event_id and time.',
    action: 'escalate',
  };

  const results = [
    signatureResult,
    ...validateEvent(received, input.spec, input.seenEventIds, input.answers),
  ];

  return {
    id: input.id,
    rawPayload: input.raw,
    mappedPayload: received,
    signature,
    results,
    accepted: results.every((r) => r.pass),
    ranAt: input.ranAt,
  };
}
