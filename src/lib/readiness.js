// @ts-check
import { mappingStatus } from './mapping.js';

/**
 * The go-live gate. The rule is deliberately strict and simple:
 * every required field is mapped AND every required test case has passed.
 * Each blocker becomes a plain-English reason, so the gate explains itself.
 *
 * @param {import('./mapping.js').Mapping[]} mappings
 * @param {import('./mapping.js').ApiSpec} spec
 * @param {import('./testCases.js').TestCase[]} testCases
 * @param {import('./mapping.js').ScopeAnswers} [answers]
 * @returns {{ ready: boolean, reasons: string[] }}
 */
export function goLiveReadiness(mappings, spec, testCases, answers = {}) {
  const reasons = [];
  for (const field of mappingStatus(mappings, spec, answers)) {
    if (field.required && !field.mapped)
      reasons.push(`Required field ${field.name} is not mapped.`);
  }
  for (const test of testCases) {
    if (test.required && test.status !== 'passed') {
      const state = test.status === 'failed' ? 'failed' : 'not been run';
      reasons.push(`${test.id} "${test.title}" has ${state}.`);
    }
  }
  return { ready: reasons.length === 0, reasons };
}
