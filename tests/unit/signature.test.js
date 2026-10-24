import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { DEMO_SIGNING_SECRET, signPayload, verifySignature } from '../../src/lib/signature.js';

const body = JSON.stringify({ event_id: 'wh_jm_0001', amount: 8450 });

describe('signPayload / verifySignature', () => {
  it('produces 64-character lower-case hex', async () => {
    expect(await signPayload(body, DEMO_SIGNING_SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches node:crypto, so the browser and the Node examples agree', async () => {
    const nodeSignature = createHmac('sha256', DEMO_SIGNING_SECRET).update(body).digest('hex');
    expect(await signPayload(body, DEMO_SIGNING_SECRET)).toBe(nodeSignature);
  });

  it('round-trips: a signature verifies against the same body and secret', async () => {
    const signature = await signPayload(body, DEMO_SIGNING_SECRET);
    expect(await verifySignature(body, signature, DEMO_SIGNING_SECRET)).toBe(true);
  });

  it('fails when the body was tampered with', async () => {
    const signature = await signPayload(body, DEMO_SIGNING_SECRET);
    const tampered = body.replace('8450', '9450');
    expect(await verifySignature(tampered, signature, DEMO_SIGNING_SECRET)).toBe(false);
  });

  it('fails with a different secret', async () => {
    const signature = await signPayload(body, 'some-other-secret');
    expect(await verifySignature(body, signature, DEMO_SIGNING_SECRET)).toBe(false);
  });

  it('fails for signatures that are not 64 hex characters', async () => {
    expect(await verifySignature(body, '', DEMO_SIGNING_SECRET)).toBe(false);
    expect(await verifySignature(body, 'zz'.repeat(32), DEMO_SIGNING_SECRET)).toBe(false);
  });
});
