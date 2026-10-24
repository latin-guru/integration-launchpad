import { describe, expect, it } from 'vitest';
import {
  cell,
  renderDecisionsLog,
  renderIntegrationDoc,
  renderPlan,
  table,
} from '../../src/lib/docs.js';
import {
  clearState,
  createSeedState,
  loadState,
  saveState,
  STORAGE_KEY,
} from '../../src/lib/storage.js';
import { buildPlan, flagAtRisk, PHASES } from '../../src/lib/plan.js';
import { deriveTestCases, withResults } from '../../src/lib/testCases.js';
import { fullMappings, seed, spec } from './helpers.js';

const state = createSeedState(seed, '2026-10-24');

describe('table / cell', () => {
  it('escapes pipes and new lines, and shows a dash for empty values', () => {
    expect(cell('a|b\nc')).toBe('a\\|b c');
    expect(cell('')).toBe('-');
    expect(cell(null)).toBe('-');
    expect(table(['A', 'B'], [[1, undefined]])).toBe('| A | B |\n| --- | --- |\n| 1 | - |');
  });
});

describe('renderIntegrationDoc', () => {
  const testCases = withResults(deriveTestCases({ refunds: true }), {
    'TC-1': { status: 'passed', evidenceEventId: 'EV-1' },
  });
  const base = {
    project: {
      ...state.project,
      scope: { answers: { ...state.project.scope.answers, refunds: true } },
    },
    spec,
    testCases,
    events: [{ id: 'EV-1', ranAt: '2026-10-24T12:00:00.000Z' }],
    generatedOn: '2026-10-24',
  };

  it('covers endpoint, mapping, signature, errors, evidence and readiness', () => {
    const doc = renderIntegrationDoc({
      ...base,
      mappings: [
        ...fullMappings.filter((m) => !['event_id', 'event_type'].includes(m.targetField)),
        { targetField: 'event_type', sourcePath: '', transform: 'constant', value: 'sale' },
      ],
      readiness: { ready: false, reasons: ['Required field event_id is not mapped.'] },
    });
    expect(doc).toContain('# Integration doc: Juniper & Moss to Bayline Loop Conversion API');
    expect(doc).toContain('`POST https://api.baylineloop.example/v1/conversions`');
    expect(doc).toContain('| `amount` | integer | Yes | `order.total_price` | toCents |');
    expect(doc).toContain('| `event_id` | string | Yes | NOT MAPPED | - |');
    expect(doc).toContain('constant "sale"');
    expect(doc).toContain('X-Bayline-Signature');
    expect(doc).toContain('| 409 Conflict |');
    expect(doc).toContain(
      '| TC-1 | A paid order is accepted | accepted | passed | EV-1 | 2026-10-24T12:00:00.000Z |',
    );
    expect(doc).toContain('a reversal event each time an order is refunded');
    expect(doc).toContain('- Required field event_id is not mapped.');
    expect(doc).toContain('Sample data');
  });

  it('says ready when the gate is green, and omits refunds when out of scope', () => {
    const doc = renderIntegrationDoc({
      ...base,
      project: state.project,
      mappings: fullMappings,
      readiness: { ready: true, reasons: [] },
    });
    expect(doc).toContain('Ready: every required field is mapped');
    expect(doc).not.toContain('reversal event each time');
  });
});

describe('renderPlan', () => {
  it('groups tasks by phase, flags risks and includes the risk log', () => {
    const tasks = flagAtRisk(buildPlan(state.project, state.taskStatus), '2026-10-24');
    const md = renderPlan({
      project: state.project,
      tasks,
      risks: state.risks,
      phases: PHASES,
      generatedOn: '2026-10-24',
    });
    for (const phase of PHASES) expect(md).toContain(`### ${phase}`);
    expect(md).toContain(
      '| Share test-store access and a sample order payload | customer | 2026-10-20 | todo | AT RISK |',
    );
    expect(md).toContain(
      '| Complete the discovery questions with the customer | vendor | 2026-10-22 | in-progress | Overdue |',
    );
    expect(md).toContain('| R-1 |');
  });
});

describe('renderDecisionsLog', () => {
  it('lists each decision with options, choice, reason and date', () => {
    const md = renderDecisionsLog({
      project: state.project,
      decisions: state.decisions,
      generatedOn: '2026-10-24',
    });
    expect(md).toContain('## D-1: Amount format');
    expect(md).toContain('- Date: 2026-10-18');
    expect(md).toContain('- Chosen: Dedupe on event_id');
  });
});

describe('storage', () => {
  /** A minimal in-memory stand-in for localStorage. */
  function fakeStorage() {
    const data = new Map();
    return {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
      data,
    };
  }
  const makeSeed = () => createSeedState(seed, '2026-10-24');

  it('creates a seed with dates relative to today', () => {
    expect(state.project.goLiveDate).toBe('2026-11-14');
    expect(state.project).not.toHaveProperty('goLiveInDays');
    expect(state.decisions[0].date).toBe('2026-10-18');
    expect(state.events).toEqual([]);
  });

  it('saves, loads and clears', () => {
    const storage = fakeStorage();
    const changed = { ...makeSeed(), seenEventIds: ['wh_jm_0001'] };
    expect(saveState(storage, changed)).toBe(true);
    expect(loadState(storage, makeSeed).seenEventIds).toEqual(['wh_jm_0001']);
    clearState(storage);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(loadState(storage, makeSeed).seenEventIds).toEqual([]);
  });

  it('falls back to the seed for corrupted data or missing storage', () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadState(storage, makeSeed)).toEqual(makeSeed());
    expect(loadState(null, makeSeed)).toEqual(makeSeed());
    expect(saveState(null, makeSeed())).toBe(false);
    expect(() => clearState(null)).not.toThrow();
  });

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadState(blocked, makeSeed)).toEqual(makeSeed());
    expect(saveState(blocked, makeSeed())).toBe(false);
    expect(() => clearState(blocked)).not.toThrow();
  });
});
