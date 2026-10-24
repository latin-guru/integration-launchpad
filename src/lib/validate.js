// @ts-check
import { isRequired } from './mapping.js';

/**
 * Validation of a mapped Bayline Loop event, run in the browser before anything
 * is "sent". Every check returns a result, passing or failing, so the Test
 * Console can show the full list.
 *
 * action tells the implementation lead what to do with a failure:
 *   "fix"      - the customer (or the mapping) can correct it.
 *   "escalate" - only used for the signature check (see testRun.js): if it
 *                still fails after the secret was re-checked, raise it with
 *                Bayline Loop support.
 *
 * @typedef {import('./mapping.js').ApiSpec} ApiSpec
 * @typedef {import('./mapping.js').ScopeAnswers} ScopeAnswers
 * @typedef {{ check: string, label: string, pass: boolean, message: string, hint: string, action: 'fix' | 'escalate' }} CheckResult
 */

/** ISO-4217 codes accepted by this demo (a short subset of the real list). */
export const ISO_4217_CODES = [
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'COP',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'INR',
  'JPY',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'SEK',
  'SGD',
  'USD',
  'ZAR',
];

/** Bayline Loop click IDs look like "bl_clk_" followed by 10 lower-case letters or digits. */
export const CLICK_ID_PATTERN = /^bl_clk_[a-z0-9]{10}$/;

/** ISO-8601 date and time with seconds and a time zone (Z or +hh:mm). */
export const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Builds one result object. Kept tiny so each check below reads as one rule.
 * @param {string} check
 * @param {string} label
 * @param {boolean} pass
 * @param {string} message
 * @param {string} hint
 * @returns {CheckResult}
 */
function result(check, label, pass, message, hint) {
  return {
    check,
    label,
    pass,
    message: pass ? 'OK' : message,
    hint: pass ? '' : hint,
    action: 'fix',
  };
}

/**
 * Checks a mapped event against the API spec.
 * @param {Record<string, unknown>} event - the mapped payload
 * @param {ApiSpec} spec
 * @param {Iterable<string>} seenEventIds - event_ids already accepted
 * @param {ScopeAnswers} [answers] - discovery answers (some fields are conditionally required)
 * @returns {CheckResult[]}
 */
export function validateEvent(event, spec, seenEventIds, answers = {}) {
  const has = (/** @type {string} */ name) =>
    event[name] !== undefined && event[name] !== null && event[name] !== '';

  const missing = spec.fields
    .filter((f) => isRequired(f, answers) && !has(f.name))
    .map((f) => f.name);

  const wrongType = spec.fields
    .filter((f) => has(f.name) && !matchesType(event[f.name], f))
    .map((f) => f.name);

  const occurredAt = event.occurred_at;
  const timeOk =
    !has('occurred_at') ||
    (typeof occurredAt === 'string' &&
      ISO_8601_PATTERN.test(occurredAt) &&
      !Number.isNaN(Date.parse(occurredAt)));

  const currencyOk =
    !has('currency') ||
    (typeof event.currency === 'string' && ISO_4217_CODES.includes(event.currency));

  const clickOk =
    !has('click_id') ||
    (typeof event.click_id === 'string' && CLICK_ID_PATTERN.test(event.click_id));

  const seen = new Set(seenEventIds);
  const duplicate = has('event_id') && seen.has(String(event.event_id));

  return [
    result(
      'required_fields',
      'Required fields present',
      missing.length === 0,
      `Missing: ${missing.join(', ')}.`,
      'Map each missing field on the Mapping screen, or check the source value exists in the payload.',
    ),
    result(
      'field_types',
      'Field types',
      wrongType.length === 0,
      `Wrong type: ${wrongType.join(', ')}.`,
      'amount must be whole cents (use toCents), IDs must be text (use toString), and enum fields must use an allowed value.',
    ),
    result(
      'occurred_at_iso8601',
      'occurred_at is ISO-8601',
      timeOk,
      `"${String(occurredAt)}" is not an ISO-8601 timestamp with a time zone.`,
      'Apply the isoDate transform to the order date.',
    ),
    result(
      'currency_iso4217',
      'currency is ISO-4217',
      currencyOk,
      `"${String(event.currency)}" is not a three-letter ISO-4217 code.`,
      'Send the store currency code (for example USD), not a symbol or a word. Apply upper if it arrives in lower case.',
    ),
    result(
      'click_id_format',
      'click_id format',
      clickOk,
      `"${String(event.click_id)}" does not look like a Bayline Loop click ID (bl_clk_ + 10 characters).`,
      'Make sure the storefront saves the click ID from the partner link unchanged, and map that value.',
    ),
    result(
      'duplicate_event_id',
      'event_id not seen before',
      !duplicate,
      `event_id "${String(event.event_id)}" was already accepted. Bayline Loop ignores it so the partner is not paid twice.`,
      'Expected for webhook retries. If the store creates new orders as duplicates, the customer must send each order once.',
    ),
  ];
}

/**
 * Does a value match the field's declared type?
 * @param {unknown} value
 * @param {import('./mapping.js').FieldSpec} field
 * @returns {boolean}
 */
export function matchesType(value, field) {
  if (field.type === 'integer') return Number.isInteger(value);
  if (field.type === 'enum') return (field.values ?? []).includes(/** @type {string} */ (value));
  return typeof value === 'string';
}
