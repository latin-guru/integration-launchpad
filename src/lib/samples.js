// @ts-check
/**
 * Sample payloads for the Test Console buttons. Each one starts from the
 * customer's real sample order and changes one thing, so each test case
 * proves exactly one rule.
 *
 * @typedef {'good' | 'duplicate' | 'badSignature' | 'badCurrency' | 'reversal'} SampleKind
 * @typedef {{ webhook_id: string, topic: string, order: Record<string, any> }} WebhookPayload
 * @typedef {{ raw: WebhookPayload, tamper: boolean, note: string }} Sample
 */

/** The sample buttons, in the order the Test Console shows them. */
export const SAMPLE_KINDS = /** @type {const} */ ([
  'good',
  'duplicate',
  'badSignature',
  'badCurrency',
  'reversal',
]);

/**
 * Builds a sample payload.
 * @param {SampleKind} kind
 * @param {WebhookPayload} base - the customer's sample order
 * @param {{ runNumber: number, lastAcceptedRaw: WebhookPayload | null }} context
 * @returns {Sample}
 */
export function buildSample(kind, base, { runNumber, lastAcceptedRaw }) {
  const fresh = structuredClone(base);
  fresh.webhook_id = `wh_jm_${String(runNumber).padStart(4, '0')}`;
  fresh.order.id = base.order.id + runNumber;

  switch (kind) {
    case 'duplicate':
      if (!lastAcceptedRaw) {
        return {
          raw: structuredClone(base),
          tamper: false,
          note: 'No event has been accepted yet, so there is nothing to duplicate. Send a good event first.',
        };
      }
      return {
        raw: structuredClone(lastAcceptedRaw),
        tamper: false,
        note: 'Re-sends the last accepted event, like a webhook retry.',
      };
    case 'badSignature':
      return {
        raw: fresh,
        tamper: true,
        note: 'The body is changed after it was signed, as if someone edited it on the way.',
      };
    case 'badCurrency':
      fresh.order.currency = 'US$';
      return {
        raw: fresh,
        tamper: false,
        note: 'The store sends a currency symbol instead of a code.',
      };
    case 'reversal':
      fresh.topic = 'refunds/create';
      if (lastAcceptedRaw) fresh.order.id = lastAcceptedRaw.order.id;
      return {
        raw: fresh,
        tamper: false,
        note: 'A refund for the last accepted order, sent as a reversal event.',
      };
    default:
      return { raw: fresh, tamper: false, note: 'A normal paid order.' };
  }
}
