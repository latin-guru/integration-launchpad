import { describe, expect, it } from 'vitest';
import { matchesType, validateEvent } from '../../src/lib/validate.js';
import { applyMapping } from '../../src/lib/mapping.js';
import { answers, fullMappings, seed, spec } from './helpers.js';

const goodEvent = applyMapping(seed.sampleOrder, fullMappings);

/** Returns the result for one check. */
function check(results, name) {
  return results.find((r) => r.check === name);
}

describe('validateEvent', () => {
  it('passes every check for a good event', () => {
    const results = validateEvent(goodEvent, spec, [], answers);
    expect(results.every((r) => r.pass)).toBe(true);
    expect(results.every((r) => r.action === 'fix' && r.hint === '')).toBe(true);
  });

  it('flags missing required fields', () => {
    const { amount: _a, ...event } = goodEvent;
    const result = check(validateEvent(event, spec, [], { promoCodes: true }), 'required_fields');
    expect(result.pass).toBe(false);
    expect(result.message).toBe('Missing: amount.');
    expect(result.hint).toMatch(/Mapping screen/);
  });

  it('never requires promo_code, even for stores that use promo codes', () => {
    const { promo_code: _p, ...event } = goodEvent;
    expect(check(validateEvent(event, spec, []), 'required_fields').pass).toBe(true);
    expect(
      check(validateEvent(event, spec, [], { promoCodes: true }), 'required_fields').pass,
    ).toBe(true);
  });

  it('treats null and empty strings as missing', () => {
    const result = check(
      validateEvent({ ...goodEvent, order_id: '', click_id: null }, spec, []),
      'required_fields',
    );
    expect(result.message).toBe('Missing: click_id, order_id.');
  });

  it('flags wrong types: decimal amount, numeric order_id, unknown enum value', () => {
    const event = { ...goodEvent, amount: 84.5, order_id: 7301, customer_status: 'vip' };
    const result = check(validateEvent(event, spec, []), 'field_types');
    expect(result.pass).toBe(false);
    expect(result.message).toBe('Wrong type: order_id, amount, customer_status.');
  });

  it('flags timestamps that are not ISO-8601 with a time zone', () => {
    for (const bad of ['2026-10-20', '2026-10-20 14:32:05', '2026-13-45T99:99:99Z', 1700000000]) {
      const result = check(
        validateEvent({ ...goodEvent, occurred_at: bad }, spec, []),
        'occurred_at_iso8601',
      );
      expect(result.pass, String(bad)).toBe(false);
    }
    const ok = check(
      validateEvent({ ...goodEvent, occurred_at: '2026-10-20T14:32:05-04:00' }, spec, []),
      'occurred_at_iso8601',
    );
    expect(ok.pass).toBe(true);
  });

  it('flags currencies that are not ISO-4217 codes', () => {
    for (const bad of ['US$', 'usd', 'DOLLARS', 840]) {
      const result = check(
        validateEvent({ ...goodEvent, currency: bad }, spec, []),
        'currency_iso4217',
      );
      expect(result.pass, String(bad)).toBe(false);
    }
    expect(
      check(validateEvent({ ...goodEvent, currency: 'EUR' }, spec, []), 'currency_iso4217').pass,
    ).toBe(true);
  });

  it('flags click IDs in the wrong format', () => {
    for (const bad of ['clk_123', 'bl_clk_SHORT', 'bl_clk_7k2m9q4t8w9', 42]) {
      const result = check(
        validateEvent({ ...goodEvent, click_id: bad }, spec, []),
        'click_id_format',
      );
      expect(result.pass, String(bad)).toBe(false);
    }
  });

  it('flags an event_id that was already accepted', () => {
    const result = check(
      validateEvent(goodEvent, spec, new Set(['wh_jm_0001'])),
      'duplicate_event_id',
    );
    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/already accepted/);
  });

  it('skips format checks for missing fields (required_fields reports them once)', () => {
    const results = validateEvent({}, spec, []);
    expect(results.filter((r) => !r.pass).map((r) => r.check)).toEqual(['required_fields']);
  });
});

describe('matchesType', () => {
  it('handles enums with no listed values', () => {
    expect(
      matchesType('x', { name: 'f', type: 'enum', required: false, format: null, description: '' }),
    ).toBe(false);
  });
});
