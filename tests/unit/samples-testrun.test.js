import { describe, expect, it } from 'vitest';
import { buildSample, SAMPLE_KINDS } from '../../src/lib/samples.js';
import { runTestEvent } from '../../src/lib/testRun.js';
import { DEMO_SIGNING_SECRET } from '../../src/lib/signature.js';
import { answers, fullMappings, seed, spec } from './helpers.js';

const base = seed.sampleOrder;

/** Runs a sample through runTestEvent with the full mapping. */
function run(sample, seenEventIds = []) {
  return runTestEvent({
    id: 'EV-1',
    ranAt: '2026-10-24T12:00:00.000Z',
    raw: sample.raw,
    tamper: sample.tamper,
    mappings: fullMappings,
    spec,
    seenEventIds,
    answers,
    secret: DEMO_SIGNING_SECRET,
  });
}

const failedChecks = (event) => event.results.filter((r) => !r.pass).map((r) => r.check);

describe('buildSample', () => {
  it('gives each good sample a fresh webhook_id and order id without changing the base', () => {
    const sample = buildSample('good', base, { runNumber: 3, lastAcceptedRaw: null });
    expect(sample.raw.webhook_id).toBe('wh_jm_0003');
    expect(sample.raw.order.id).toBe(base.order.id + 3);
    expect(sample.tamper).toBe(false);
    expect(base.webhook_id).toBe('wh_jm_0001');
  });

  it('duplicate re-sends the last accepted payload', () => {
    const last = buildSample('good', base, { runNumber: 1, lastAcceptedRaw: null }).raw;
    const sample = buildSample('duplicate', base, { runNumber: 2, lastAcceptedRaw: last });
    expect(sample.raw).toEqual(last);
    expect(sample.raw).not.toBe(last);
  });

  it('duplicate explains when nothing has been accepted yet', () => {
    const sample = buildSample('duplicate', base, { runNumber: 1, lastAcceptedRaw: null });
    expect(sample.note).toMatch(/Send a good event first/);
  });

  it('badSignature asks for tampering, badCurrency breaks the currency', () => {
    expect(buildSample('badSignature', base, { runNumber: 1, lastAcceptedRaw: null }).tamper).toBe(
      true,
    );
    expect(
      buildSample('badCurrency', base, { runNumber: 1, lastAcceptedRaw: null }).raw.order.currency,
    ).toBe('US$');
  });

  it('reversal uses the refund topic and the last accepted order id', () => {
    const last = buildSample('good', base, { runNumber: 1, lastAcceptedRaw: null }).raw;
    const sample = buildSample('reversal', base, { runNumber: 2, lastAcceptedRaw: last });
    expect(sample.raw.topic).toBe('refunds/create');
    expect(sample.raw.order.id).toBe(last.order.id);
    expect(
      buildSample('reversal', base, { runNumber: 2, lastAcceptedRaw: null }).raw.order.id,
    ).toBe(base.order.id + 2);
  });

  it('lists the five sample kinds', () => {
    expect(SAMPLE_KINDS).toEqual(['good', 'duplicate', 'badSignature', 'badCurrency', 'reversal']);
  });
});

describe('runTestEvent', () => {
  it('accepts a good event and signs the body', async () => {
    const event = await run(buildSample('good', base, { runNumber: 1, lastAcceptedRaw: null }));
    expect(event.accepted).toBe(true);
    expect(event.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(event.mappedPayload.amount).toBe(base.order.total_price * 100);
    expect(event.results[0]).toMatchObject({ check: 'signature', pass: true, action: 'escalate' });
  });

  it('rejects a duplicate only on the duplicate check', async () => {
    const good = buildSample('good', base, { runNumber: 1, lastAcceptedRaw: null });
    const dup = buildSample('duplicate', base, { runNumber: 2, lastAcceptedRaw: good.raw });
    const event = await run(dup, [good.raw.webhook_id]);
    expect(failedChecks(event)).toEqual(['duplicate_event_id']);
  });

  it('rejects a tampered body on the signature check with an escalate tag', async () => {
    const event = await run(
      buildSample('badSignature', base, { runNumber: 1, lastAcceptedRaw: null }),
    );
    expect(failedChecks(event)).toEqual(['signature']);
    expect(event.results[0].hint).toMatch(/escalate/);
    expect(event.mappedPayload.amount).toBe(8450 + 1000);
  });

  it('tampering still works when amount is not mapped', async () => {
    const sample = buildSample('badSignature', base, { runNumber: 1, lastAcceptedRaw: null });
    const event = await runTestEvent({
      id: 'EV-2',
      ranAt: 'now',
      raw: sample.raw,
      tamper: true,
      mappings: seed.mappings,
      spec,
      seenEventIds: [],
      secret: DEMO_SIGNING_SECRET,
    });
    expect(event.mappedPayload.amount).toBe(1000);
    expect(event.accepted).toBe(false);
  });

  it('rejects a bad currency on the currency check', async () => {
    const event = await run(
      buildSample('badCurrency', base, { runNumber: 1, lastAcceptedRaw: null }),
    );
    expect(failedChecks(event)).toEqual(['currency_iso4217']);
  });

  it('accepts a reversal', async () => {
    const event = await run(buildSample('reversal', base, { runNumber: 1, lastAcceptedRaw: null }));
    expect(event.accepted).toBe(true);
    expect(event.mappedPayload.event_type).toBe('reversal');
  });
});
