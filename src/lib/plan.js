// @ts-check
import { addDays } from './dates.js';

/**
 * The implementation plan. Every task has a fixed number of days before
 * go-live; the due date is go-live minus that number. Moving the go-live
 * date moves the whole plan. Discovery answers add or change tasks.
 *
 * @typedef {'vendor' | 'customer'} Owner
 * @typedef {'todo' | 'in-progress' | 'done'} TaskStatus
 * @typedef {{ id: string, phase: string, title: string, owner: Owner, daysBeforeGoLive: number, dependsOn: string[] }} TaskTemplate
 * @typedef {{ id: string, phase: string, title: string, owner: Owner, dueDate: string, status: TaskStatus, dependsOn: string[] }} Task
 * @typedef {Task & { atRisk: boolean, overdue: boolean }} FlaggedTask
 * @typedef {{ goLiveDate: string, scope: { answers: import('./mapping.js').ScopeAnswers } }} PlanProject
 */

export const PHASES = [
  'Kickoff',
  'Requirements',
  'Configuration',
  'Testing',
  'Go-live',
  'Hypercare',
];

/**
 * Small helper so the task list below reads like a table.
 * @param {string} id
 * @param {string} phase
 * @param {Owner} owner
 * @param {number} daysBeforeGoLive - negative numbers are after go-live
 * @param {string} title
 * @param {string[]} [dependsOn]
 * @returns {TaskTemplate}
 */
function task(id, phase, owner, daysBeforeGoLive, title, dependsOn = []) {
  return { id, phase, owner, daysBeforeGoLive, title, dependsOn };
}

/** Tasks every implementation gets. */
export const BASE_TASKS = [
  task(
    'kickoff-call',
    'Kickoff',
    'vendor',
    28,
    'Run the kickoff call: goals, owners and go-live date',
  ),
  task(
    'kickoff-access',
    'Kickoff',
    'customer',
    25,
    'Share test-store access and a sample order payload',
    ['kickoff-call'],
  ),
  task(
    'req-discovery',
    'Requirements',
    'vendor',
    23,
    'Complete the discovery questions with the customer',
    ['kickoff-call'],
  ),
  task(
    'req-spec-review',
    'Requirements',
    'customer',
    20,
    'Review the Conversion API spec and confirm where each field comes from',
    ['req-discovery'],
  ),
  task('cfg-mapping', 'Configuration', 'vendor', 16, 'Configure the field mapping', [
    'req-spec-review',
  ]),
  task(
    'cfg-secret',
    'Configuration',
    'vendor',
    15,
    'Send the test signing secret through a secure channel',
  ),
  task('test-run', 'Testing', 'vendor', 7, 'Run the go-live test plan in the Test Console', [
    'cfg-mapping',
    'cfg-webhook',
  ]),
  task('test-signoff', 'Testing', 'customer', 4, 'Sign off on the test evidence', ['test-run']),
  task('golive-switch', 'Go-live', 'customer', 0, 'Switch to the production secret and endpoint', [
    'test-signoff',
  ]),
  task('golive-watch', 'Go-live', 'vendor', 0, 'Watch the first live conversions together', [
    'golive-switch',
  ]),
  task(
    'hyper-rejects',
    'Hypercare',
    'vendor',
    -7,
    'Check rejected events daily for the first week',
  ),
  task(
    'hyper-handoff',
    'Hypercare',
    'vendor',
    -14,
    'Hand off to account management with the integration doc',
  ),
];

/**
 * Tasks that depend on discovery answers.
 * @param {import('./mapping.js').ScopeAnswers} answers
 * @returns {TaskTemplate[]}
 */
export function scopeTasks(answers) {
  const tasks = [];
  if (answers.platform === 'custom') {
    tasks.push(
      task(
        'cfg-webhook',
        'Configuration',
        'customer',
        12,
        'Build the signed webhook sender (see examples/send-test-conversion.mjs)',
        ['cfg-secret'],
      ),
    );
  } else {
    tasks.push(
      task(
        'cfg-webhook',
        'Configuration',
        'customer',
        12,
        'Turn on the orders/paid webhook in the store admin',
        ['cfg-secret'],
      ),
    );
  }
  if (answers.refunds) {
    tasks.push(
      task(
        'cfg-reversals',
        'Configuration',
        'customer',
        11,
        'Turn on the refund webhook so refunds arrive as reversal events',
        ['cfg-webhook'],
      ),
    );
  }
  if (answers.promoCodes) {
    tasks.push(
      task(
        'cfg-promo',
        'Configuration',
        'vendor',
        12,
        'Map promo_code and agree how promo-code sales credit partners',
        ['cfg-mapping'],
      ),
    );
  }
  if (answers.crossDomain) {
    tasks.push(
      task(
        'cfg-cross-domain',
        'Configuration',
        'customer',
        11,
        'Carry click_id across the checkout domain hop as a URL parameter',
      ),
    );
  }
  if (answers.orderVolume === '10k-plus') {
    tasks.push(
      task(
        'cfg-volume',
        'Configuration',
        'vendor',
        10,
        'Confirm retry and back-off settings for peak order volume',
      ),
    );
  }
  return tasks;
}

/**
 * Builds the full task list for a project, with due dates counted back from
 * go-live, sorted by phase and then by due date.
 * @param {PlanProject} project
 * @param {Record<string, TaskStatus>} [taskStatus] - saved status per task id
 * @returns {Task[]}
 */
export function buildPlan(project, taskStatus = {}) {
  const templates = [...BASE_TASKS, ...scopeTasks(project.scope.answers)];
  return templates
    .map((t) => ({
      id: t.id,
      phase: t.phase,
      title: t.title,
      owner: t.owner,
      dueDate: addDays(project.goLiveDate, -t.daysBeforeGoLive),
      status: taskStatus[t.id] ?? 'todo',
      dependsOn: t.dependsOn,
    }))
    .sort(
      (a, b) =>
        PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.dueDate.localeCompare(b.dueDate),
    );
}

/**
 * Marks tasks that are late. A late customer-owned task is "at risk": the
 * vendor cannot finish it for them, so it needs a conversation (and often a
 * risk log entry) before it delays go-live.
 * @param {Task[]} tasks
 * @param {string} today - "YYYY-MM-DD"
 * @returns {FlaggedTask[]}
 */
export function flagAtRisk(tasks, today) {
  return tasks.map((t) => {
    const overdue = t.status !== 'done' && t.dueDate < today;
    return { ...t, overdue, atRisk: overdue && t.owner === 'customer' };
  });
}
