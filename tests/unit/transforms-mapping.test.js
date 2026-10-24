import { describe, expect, it } from 'vitest';
import { transforms, transformNames } from '../../src/lib/transforms.js';
import { applyMapping, isMapped, isRequired, mappingStatus } from '../../src/lib/mapping.js';
import { answers, fullMappings, seed, spec } from './helpers.js';

describe('transforms', () => {
  it('none passes values through', () => {
    expect(transforms.none('x')).toBe('x');
  });

  it('toString turns numbers into text and keeps missing values missing', () => {
    expect(transforms.toString(7301)).toBe('7301');
    expect(transforms.toString(undefined)).toBeUndefined();
    expect(transforms.toString(null)).toBeUndefined();
  });

  it('toCents converts money text to integer cents without float errors', () => {
    expect(transforms.toCents('84.50')).toBe(8450);
    expect(transforms.toCents('19.99')).toBe(1999);
    expect(transforms.toCents(0.1 + 0.2)).toBe(30);
  });

  it('toCents rejects values that are not numbers', () => {
    expect(transforms.toCents('abc')).toBeUndefined();
    expect(transforms.toCents('')).toBeUndefined();
    expect(transforms.toCents(undefined)).toBeUndefined();
  });

  it('upper upper-cases text only', () => {
    expect(transforms.upper('usd')).toBe('USD');
    expect(transforms.upper(5)).toBeUndefined();
  });

  it('isoDate normalizes to UTC ISO-8601', () => {
    expect(transforms.isoDate('2026-10-20T14:32:05-04:00')).toBe('2026-10-20T18:32:05.000Z');
    expect(transforms.isoDate(0)).toBe('1970-01-01T00:00:00.000Z');
  });

  it('isoDate rejects unreadable dates', () => {
    expect(transforms.isoDate('not a date')).toBeUndefined();
    expect(transforms.isoDate({})).toBeUndefined();
  });

  it('customerStatus maps first orders to new and others to returning', () => {
    expect(transforms.customerStatus(1)).toBe('new');
    expect(transforms.customerStatus('3')).toBe('returning');
    expect(transforms.customerStatus(0)).toBeUndefined();
    expect(transforms.customerStatus('x')).toBeUndefined();
  });

  it('eventType maps store topics to Bayline Loop event types', () => {
    expect(transforms.eventType('orders/paid')).toBe('sale');
    expect(transforms.eventType('refunds/create')).toBe('reversal');
    expect(transforms.eventType('orders/created')).toBeUndefined();
  });

  it('constant ignores the source value', () => {
    expect(transforms.constant('ignored', 'sale')).toBe('sale');
  });

  it('lists every transform name', () => {
    expect(transformNames).toContain('toCents');
    expect(transformNames).toHaveLength(Object.keys(transforms).length);
  });
});

describe('applyMapping', () => {
  it('builds a complete Bayline Loop event from the sample order', () => {
    expect(applyMapping(seed.sampleOrder, fullMappings)).toEqual({
      event_id: 'wh_jm_0001',
      event_type: 'sale',
      click_id: 'bl_clk_7k2m9q4t8w',
      order_id: '7301',
      amount: 8450,
      currency: 'USD',
      customer_status: 'new',
      promo_code: 'FERN10',
      occurred_at: '2026-10-20T18:32:05.000Z',
    });
  });

  it('supports constants and falls back to none for unknown transforms', () => {
    const event = applyMapping({ a: 'kept' }, [
      { targetField: 'event_type', sourcePath: '', transform: 'constant', value: 'sale' },
      { targetField: 'x', sourcePath: 'a', transform: 'doesNotExist' },
    ]);
    expect(event).toEqual({ event_type: 'sale', x: 'kept' });
  });

  it('leaves out unmapped fields and values that cannot be converted', () => {
    const event = applyMapping({ price: 'abc' }, [
      { targetField: 'amount', sourcePath: 'price', transform: 'toCents' },
      { targetField: 'order_id', sourcePath: '', transform: 'none' },
    ]);
    expect(event).toEqual({});
  });
});

describe('isMapped / isRequired / mappingStatus', () => {
  it('treats constants as mapped only when they have a value', () => {
    expect(isMapped({ targetField: 'a', sourcePath: '', transform: 'constant', value: 'x' })).toBe(
      true,
    );
    expect(isMapped({ targetField: 'a', sourcePath: '', transform: 'constant' })).toBe(false);
    expect(isMapped(undefined)).toBe(false);
  });

  it('keeps promo_code optional whatever the discovery answers', () => {
    const promo = spec.fields.find((f) => f.name === 'promo_code');
    expect(isRequired(promo, { promoCodes: true })).toBe(false);
    expect(isRequired(promo)).toBe(false);
  });

  it('supports requiredWhen for fields that depend on a discovery answer', () => {
    const field = { name: 'x', type: 'string', required: false, requiredWhen: 'refunds' };
    expect(isRequired(field, { refunds: true })).toBe(true);
    expect(isRequired(field, { refunds: false })).toBe(false);
  });

  it('reports the seed as missing only amount', () => {
    const missing = mappingStatus(seed.mappings, spec, answers).filter(
      (f) => f.required && !f.mapped,
    );
    expect(missing.map((f) => f.name)).toEqual(['amount']);
    expect(mappingStatus(fullMappings, spec).every((f) => f.mapped)).toBe(true);
  });
});
