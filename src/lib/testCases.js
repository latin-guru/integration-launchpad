// @ts-check
/**
 * The go-live test plan. Test cases come from the discovery answers, and
 * each one names the Test Console sample that proves it and the outcome
 * Bayline Loop should give.
 *
 * expected is either "accepted" or "rejected:<check>", meaning the event
 * must be rejected *because of* that check.
 *
 * @typedef {'not-run' | 'passed' | 'failed'} TestStatus
 * @typedef {{ id: string, title: string, derivedFrom: string, sample: import('./samples.js').SampleKind, expected: string, required: boolean }} TestCaseTemplate
 * @typedef {TestCaseTemplate & { status: TestStatus, evidenceEventId: string | null }} TestCase
 * @typedef {Record<string, { status: TestStatus, evidenceEventId: string | null }>} TestResults
 */

/**
 * @param {import('./mapping.js').ScopeAnswers} answers
 * @returns {TestCaseTemplate[]}
 */
export function deriveTestCases(answers) {
  const cases = [
    {
      id: 'TC-1',
      title: 'A paid order is accepted',
      derivedFrom: 'Every integration',
      sample: 'good',
      expected: 'accepted',
      required: true,
    },
    {
      id: 'TC-2',
      title: 'A retried event is rejected as a duplicate',
      derivedFrom: 'Every integration',
      sample: 'duplicate',
      expected: 'rejected:duplicate_event_id',
      required: true,
    },
    {
      id: 'TC-3',
      title: 'A bad currency code is rejected',
      derivedFrom: 'Every integration',
      sample: 'badCurrency',
      expected: 'rejected:currency_iso4217',
      required: true,
    },
    {
      id: 'TC-4',
      title: 'A tampered body fails the signature check',
      derivedFrom: 'Every integration',
      sample: 'badSignature',
      expected: 'rejected:signature',
      required: true,
    },
  ];
  if (answers.refunds) {
    cases.push({
      id: 'TC-5',
      title: 'A refund arrives as an accepted reversal',
      derivedFrom: 'Discovery: refunds = yes',
      sample: 'reversal',
      expected: 'accepted',
      required: true,
    });
  }
  return /** @type {TestCaseTemplate[]} */ (cases);
}

/**
 * Did a test event produce the outcome the test case expects?
 * @param {string} expected - "accepted" or "rejected:<check>"
 * @param {import('./testRun.js').TestEvent} event
 * @returns {'passed' | 'failed'}
 */
export function evaluateRun(expected, event) {
  if (expected === 'accepted') return event.accepted ? 'passed' : 'failed';
  const check = expected.replace('rejected:', '');
  const failedThatCheck = event.results.some((r) => r.check === check && !r.pass);
  return !event.accepted && failedThatCheck ? 'passed' : 'failed';
}

/**
 * Joins test case templates with their saved results.
 * @param {TestCaseTemplate[]} templates
 * @param {TestResults} results
 * @returns {TestCase[]}
 */
export function withResults(templates, results) {
  return templates.map((t) => ({
    ...t,
    status: results[t.id]?.status ?? 'not-run',
    evidenceEventId: results[t.id]?.evidenceEventId ?? null,
  }));
}
