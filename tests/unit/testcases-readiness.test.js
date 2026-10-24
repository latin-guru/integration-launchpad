import { describe, expect, it } from 'vitest';
import { deriveTestCases, evaluateRun, withResults } from '../../src/lib/testCases.js';
import { gateSummary, goLiveReadiness } from '../../src/lib/readiness.js';
import { answers, fullMappings, seed, spec } from './helpers.js';

const event = (accepted, failed = []) => ({
  accepted,
  results: ['signature', 'currency_iso4217', 'duplicate_event_id'].map((check) => ({
    check,
    pass: !failed.includes(check),
  })),
});

describe('deriveTestCases', () => {
  it('always includes happy path, duplicate, bad currency and bad signature', () => {
    expect(deriveTestCases({ refunds: false }).map((t) => t.sample)).toEqual([
      'good',
      'duplicate',
      'badCurrency',
      'badSignature',
    ]);
  });

  it('adds the refund reversal test when refunds = yes', () => {
    const cases = deriveTestCases({ refunds: true });
    expect(cases.at(-1)).toMatchObject({
      id: 'TC-5',
      sample: 'reversal',
      derivedFrom: 'Discovery: refunds = yes',
    });
  });
});

describe('evaluateRun', () => {
  it('passes "accepted" tests only when the event was accepted', () => {
    expect(evaluateRun('accepted', event(true))).toBe('passed');
    expect(evaluateRun('accepted', event(false, ['signature']))).toBe('failed');
  });

  it('passes "rejected" tests only when that exact check failed', () => {
    expect(evaluateRun('rejected:signature', event(false, ['signature']))).toBe('passed');
    expect(evaluateRun('rejected:signature', event(false, ['currency_iso4217']))).toBe('failed');
    expect(evaluateRun('rejected:duplicate_event_id', event(true))).toBe('failed');
  });
});

describe('withResults', () => {
  it('defaults to not-run and joins saved results', () => {
    const cases = withResults(deriveTestCases({}), {
      'TC-1': { status: 'passed', evidenceEventId: 'EV-1' },
    });
    expect(cases[0]).toMatchObject({ status: 'passed', evidenceEventId: 'EV-1' });
    expect(cases[1]).toMatchObject({ status: 'not-run', evidenceEventId: null });
  });
});

describe('goLiveReadiness', () => {
  const allPassed = withResults(
    deriveTestCases(answers),
    Object.fromEntries(
      ['TC-1', 'TC-2', 'TC-3', 'TC-4'].map((id) => [
        id,
        { status: 'passed', evidenceEventId: 'EV' },
      ]),
    ),
  );

  it('is ready when every required field is mapped and every required test passed', () => {
    expect(goLiveReadiness(fullMappings, spec, allPassed, answers)).toEqual({
      ready: true,
      reasons: [],
      fieldsToMap: 0,
      testsToRun: 0,
      testsFailed: 0,
    });
  });

  it('lists unmapped required fields', () => {
    const result = goLiveReadiness(seed.mappings, spec, allPassed, answers);
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(['Required field amount is not mapped.']);
  });

  it('lists tests that failed or were not run', () => {
    const tests = withResults(deriveTestCases({}), {
      'TC-2': { status: 'failed', evidenceEventId: 'EV' },
    });
    const result = goLiveReadiness(fullMappings, spec, tests);
    expect(result.reasons).toHaveLength(4);
    expect(result.reasons[0]).toMatch(/TC-1 .* has not been run/);
    expect(result.reasons[1]).toMatch(/TC-2 .* has failed/);
  });

  it('ignores tests that are not required', () => {
    const optional = [{ ...allPassed[0], id: 'TC-9', required: false, status: 'failed' }];
    expect(goLiveReadiness(fullMappings, spec, [...allPassed, ...optional], answers).ready).toBe(
      true,
    );
  });
});

describe('gateSummary', () => {
  const base = { ready: false, reasons: ['x'], fieldsToMap: 0, testsToRun: 0, testsFailed: 0 };

  it('says mapping is done when only tests are left', () => {
    expect(gateSummary({ ...base, testsToRun: 5 })).toBe('Mapping done, 5 tests to run');
  });

  it('lists fields to map before tests, with failed tests called out', () => {
    expect(gateSummary({ ...base, fieldsToMap: 1, testsFailed: 1, testsToRun: 2 })).toBe(
      '1 field to map, 1 test failed, 2 tests to run',
    );
  });

  it('confirms everything when ready', () => {
    expect(gateSummary({ ...base, ready: true, reasons: [] })).toBe(
      'All required fields mapped and tests passed',
    );
  });
});
