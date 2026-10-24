import { describe, expect, it } from 'vitest';
import { BASE_TASKS, buildPlan, flagAtRisk, PHASES, scopeTasks } from '../../src/lib/plan.js';

const baseAnswers = {
  platform: 'hosted',
  orderVolume: '1k-10k',
  refunds: false,
  promoCodes: false,
  crossDomain: false,
};
const project = (answers = baseAnswers) => ({ goLiveDate: '2026-11-20', scope: { answers } });
const ids = (tasks) => tasks.map((t) => t.id);

describe('buildPlan', () => {
  it('counts due dates back from go-live', () => {
    const tasks = buildPlan(project());
    const due = (id) => tasks.find((t) => t.id === id).dueDate;
    expect(due('kickoff-call')).toBe('2026-10-23'); // 28 days before
    expect(due('golive-switch')).toBe('2026-11-20'); // go-live day
    expect(due('hyper-handoff')).toBe('2026-12-04'); // 14 days after
  });

  it('sorts by phase, then due date', () => {
    const tasks = buildPlan(project());
    const phaseOrder = tasks.map((t) => PHASES.indexOf(t.phase));
    expect(phaseOrder).toEqual([...phaseOrder].sort((a, b) => a - b));
    const config = tasks.filter((t) => t.phase === 'Configuration').map((t) => t.dueDate);
    expect(config).toEqual([...config].sort());
  });

  it('uses saved statuses and defaults to todo', () => {
    const tasks = buildPlan(project(), { 'kickoff-call': 'done' });
    expect(tasks.find((t) => t.id === 'kickoff-call').status).toBe('done');
    expect(tasks.find((t) => t.id === 'cfg-mapping').status).toBe('todo');
  });

  it('has only the base tasks plus the webhook task for a minimal scope', () => {
    expect(buildPlan(project())).toHaveLength(BASE_TASKS.length + 1);
  });
});

describe('scopeTasks', () => {
  it('refunds = yes adds reversal setup', () => {
    expect(ids(scopeTasks({ ...baseAnswers, refunds: true }))).toContain('cfg-reversals');
    expect(ids(scopeTasks(baseAnswers))).not.toContain('cfg-reversals');
  });

  it('promo codes, cross-domain checkout and high volume each add a task', () => {
    const all = ids(
      scopeTasks({ ...baseAnswers, promoCodes: true, crossDomain: true, orderVolume: '10k-plus' }),
    );
    expect(all).toEqual(expect.arrayContaining(['cfg-promo', 'cfg-cross-domain', 'cfg-volume']));
  });

  it('a custom checkout gets a build task instead of a settings task', () => {
    const hosted = scopeTasks(baseAnswers).find((t) => t.id === 'cfg-webhook');
    const custom = scopeTasks({ ...baseAnswers, platform: 'custom' }).find(
      (t) => t.id === 'cfg-webhook',
    );
    expect(hosted.title).toMatch(/store admin/);
    expect(custom.title).toMatch(/send-test-conversion/);
  });
});

describe('flagAtRisk', () => {
  const tasks = [
    { id: 'a', owner: 'customer', status: 'todo', dueDate: '2026-10-20' },
    { id: 'b', owner: 'vendor', status: 'todo', dueDate: '2026-10-20' },
    { id: 'c', owner: 'customer', status: 'done', dueDate: '2026-10-20' },
    { id: 'd', owner: 'customer', status: 'in-progress', dueDate: '2026-10-24' },
  ];

  it('flags overdue customer tasks as at risk, overdue vendor tasks as overdue only', () => {
    const flagged = flagAtRisk(tasks, '2026-10-24');
    expect(flagged.map((t) => [t.id, t.overdue, t.atRisk])).toEqual([
      ['a', true, true],
      ['b', true, false],
      ['c', false, false],
      ['d', false, false],
    ]);
  });
});
