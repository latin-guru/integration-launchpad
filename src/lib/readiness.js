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
 * @returns {Readiness}
 */
export function goLiveReadiness(mappings, spec, testCases, answers = {}) {
  const reasons = [];
  const counts = { fieldsToMap: 0, testsToRun: 0, testsFailed: 0 };
  for (const field of mappingStatus(mappings, spec, answers)) {
    if (field.required && !field.mapped) {
      counts.fieldsToMap += 1;
      reasons.push(`Required field ${field.name} is not mapped.`);
    }
  }
  for (const test of testCases) {
    if (test.required && test.status !== 'passed') {
      const failed = test.status === 'failed';
      if (failed) counts.testsFailed += 1;
      else counts.testsToRun += 1;
      reasons.push(`${test.id} "${test.title}" has ${failed ? 'failed' : 'not been run'}.`);
    }
  }
  return { ready: reasons.length === 0, reasons, ...counts };
}

/**
 * @typedef {{ ready: boolean, reasons: string[], fieldsToMap: number,
 *   testsToRun: number, testsFailed: number }} Readiness
 */

/** @param {number} n @param {string} word */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * One short sidebar line saying what is left, in the order the work happens:
 * mapping first, then tests. "Mapping done" makes it clear a blocked gate is
 * waiting on tests, so it never reads as a contradiction of the Mapping screen.
 * @param {Readiness} readiness
 * @returns {string}
 */
export function gateSummary(readiness) {
  if (readiness.ready) return 'All required fields mapped and tests passed';
  const parts = [
    readiness.fieldsToMap > 0 ? `${plural(readiness.fieldsToMap, 'field')} to map` : 'Mapping done',
  ];
  if (readiness.testsFailed > 0) parts.push(`${plural(readiness.testsFailed, 'test')} failed`);
  if (readiness.testsToRun > 0) parts.push(`${plural(readiness.testsToRun, 'test')} to run`);
  return parts.join(', ');
}
