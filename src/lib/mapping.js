// @ts-check
import { getByPath } from './paths.js';
import { transforms } from './transforms.js';

/**
 * @typedef {{ targetField: string, sourcePath: string, transform: string, value?: string, notes?: string }} Mapping
 * @typedef {{ name: string, type: string, required: boolean, requiredWhen?: string, format: string | null, values?: string[], description: string }} FieldSpec
 * @typedef {{ fields: FieldSpec[] }} ApiSpec
 * @typedef {Record<string, string | boolean>} ScopeAnswers
 */

/**
 * Builds a Bayline Loop event from the customer's raw payload by running every
 * mapping: read the source value, transform it, write it to the target field.
 * Fields whose value comes out undefined are left off, so validation can
 * report them as missing.
 * @param {unknown} raw - the customer's payload (for example a webhook body)
 * @param {Mapping[]} mappings
 * @returns {Record<string, unknown>}
 */
export function applyMapping(raw, mappings) {
  /** @type {Record<string, unknown>} */
  const event = {};
  for (const mapping of mappings) {
    if (!isMapped(mapping)) continue;
    const transform = transforms[mapping.transform] ?? transforms.none;
    const value = transform(getByPath(raw, mapping.sourcePath), mapping.value);
    if (value !== undefined) event[mapping.targetField] = value;
  }
  return event;
}

/**
 * A mapping counts as done when it has a source path, or is a constant
 * with a value.
 * @param {Mapping | undefined} mapping
 * @returns {boolean}
 */
export function isMapped(mapping) {
  if (!mapping) return false;
  if (mapping.transform === 'constant') return Boolean(mapping.value);
  return Boolean(mapping.sourcePath);
}

/**
 * Is this field required for this customer? Some fields only become required
 * because of a discovery answer (promo_code when the store uses promo codes).
 * @param {FieldSpec} field
 * @param {ScopeAnswers} [answers]
 * @returns {boolean}
 */
export function isRequired(field, answers = {}) {
  return field.required || Boolean(field.requiredWhen && answers[field.requiredWhen]);
}

/**
 * One status row per API field: is it required, and is it mapped?
 * @param {Mapping[]} mappings
 * @param {ApiSpec} spec
 * @param {ScopeAnswers} [answers]
 * @returns {{ name: string, required: boolean, mapped: boolean }[]}
 */
export function mappingStatus(mappings, spec, answers = {}) {
  return spec.fields.map((field) => ({
    name: field.name,
    required: isRequired(field, answers),
    mapped: isMapped(mappings.find((m) => m.targetField === field.name)),
  }));
}
