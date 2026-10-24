// @ts-check
import { isRequired } from './mapping.js';

/**
 * Markdown exports: the integration doc, the implementation plan with its
 * risk log, and the configuration decisions log. Plain string building, so
 * the output is easy to read in the code and in any Markdown viewer.
 *
 * @typedef {{ id: string, description: string, impact: string, likelihood: string, mitigation: string, owner: string, status: string }} Risk
 * @typedef {{ id: string, topic: string, optionsConsidered: string[], chosen: string, rationale: string, date: string }} Decision
 * @typedef {{ customer: string, vertical: string, goLiveDate: string, scope: { answers: import('./mapping.js').ScopeAnswers } }} DocProject
 */

const DEMO_NOTE =
  '> Demo document. Bayline Loop, Juniper & Moss and the Bayline Loop API are fictional. Sample data.';

/**
 * Makes a value safe for a Markdown table cell.
 * @param {unknown} value
 * @returns {string}
 */
export function cell(value) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

/**
 * Builds a Markdown table from a header row and data rows.
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function table(headers, rows) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ];
  return lines.join('\n');
}

/**
 * The integration doc a prospect or customer developer gets before go-live.
 * @param {{
 *   project: DocProject,
 *   mappings: import('./mapping.js').Mapping[],
 *   spec: import('./mapping.js').ApiSpec & { endpoint: { method: string, path: string, baseUrl: string }, signature: { header: string } },
 *   testCases: import('./testCases.js').TestCase[],
 *   events: import('./testRun.js').TestEvent[],
 *   readiness: { ready: boolean, reasons: string[] },
 *   generatedOn: string,
 * }} input
 * @returns {string}
 */
export function renderIntegrationDoc({
  project,
  mappings,
  spec,
  testCases,
  events,
  readiness,
  generatedOn,
}) {
  const answers = project.scope.answers;
  const { method, path, baseUrl } = spec.endpoint;

  const fieldRows = spec.fields.map((field) => {
    const m = mappings.find((x) => x.targetField === field.name);
    const source = m?.transform === 'constant' ? `constant "${m.value ?? ''}"` : m?.sourcePath;
    return [
      `\`${field.name}\``,
      field.type,
      isRequired(field, answers) ? 'Yes' : 'No',
      source ? `\`${source}\`` : 'NOT MAPPED',
      m && m.transform !== 'constant' ? m.transform : '-',
      m?.notes,
    ];
  });

  const evidenceRows = testCases.map((t) => {
    const event = events.find((e) => e.id === t.evidenceEventId);
    return [t.id, t.title, t.expected, t.status, event?.id, event?.ranAt];
  });

  return [
    `# Integration doc: ${project.customer} to Bayline Loop Conversion API`,
    '',
    DEMO_NOTE,
    '',
    `Generated ${generatedOn}. Target go-live: ${project.goLiveDate}.`,
    '',
    '## What connects',
    '',
    `${project.customer} (${project.vertical}) sends one event to Bayline Loop each time an order is paid` +
      (answers.refunds ? ', and a reversal event each time an order is refunded.' : '.') +
      ' Bayline Loop uses the click_id in the event to credit the partner whose link the shopper clicked.',
    '',
    '## Endpoint',
    '',
    `\`${method} ${baseUrl}${path}\` with a JSON body and \`Content-Type: application/json\`.`,
    '',
    '## Fields and mapping',
    '',
    table(
      ['Bayline Loop field', 'Type', 'Required', 'Source in store payload', 'Transform', 'Notes'],
      fieldRows,
    ),
    '',
    '## Authentication and signature',
    '',
    `Every request carries \`${spec.signature.header}\`: the HMAC-SHA256 of the exact raw request body, using the shared secret, written as lower-case hex.`,
    'Bayline Loop recomputes the HMAC and rejects the request if it does not match. Sign the body bytes you send; re-formatting the JSON after signing breaks the signature.',
    'The secret stays on the sending server and is never put in browser code. Test and production use different secrets.',
    '',
    '## Error handling',
    '',
    table(
      ['Status', 'Meaning', 'What the sender should do'],
      [
        ['202 Accepted', 'Event stored.', 'Nothing.'],
        [
          '400 Bad Request',
          'A field is missing or invalid. The response lists the failed checks.',
          'Fix the mapping or data. Do not retry the same body.',
        ],
        [
          '401 Unauthorized',
          'Signature missing or wrong.',
          'Re-check the secret and that the raw body is signed. Escalate to Bayline Loop if it persists.',
        ],
        [
          '409 Conflict',
          'event_id was already accepted.',
          'Nothing. This is how retries stay safe.',
        ],
        [
          '5xx',
          'Bayline Loop-side problem.',
          'Retry with back-off (for example 1, 5, 25 minutes) using the same event_id.',
        ],
      ],
    ),
    '',
    '## Test evidence',
    '',
    table(['Test', 'Title', 'Expected', 'Status', 'Evidence event', 'Ran at'], evidenceRows),
    '',
    '## Go-live readiness',
    '',
    readiness.ready
      ? 'Ready: every required field is mapped and every required test has passed.'
      : ['Not ready yet:', '', ...readiness.reasons.map((r) => `- ${r}`)].join('\n'),
    '',
  ].join('\n');
}

/**
 * The implementation plan and risk log.
 * @param {{ project: DocProject, tasks: import('./plan.js').FlaggedTask[], risks: Risk[], phases: string[], generatedOn: string }} input
 * @returns {string}
 */
export function renderPlan({ project, tasks, risks, phases, generatedOn }) {
  const sections = phases.map((phase) => {
    const rows = tasks
      .filter((t) => t.phase === phase)
      .map((t) => [
        t.title,
        t.owner,
        t.dueDate,
        t.status,
        t.atRisk ? 'AT RISK' : t.overdue ? 'Overdue' : '',
      ]);
    return [`### ${phase}`, '', table(['Task', 'Owner', 'Due', 'Status', 'Flag'], rows), ''].join(
      '\n',
    );
  });

  return [
    `# Implementation plan: ${project.customer}`,
    '',
    DEMO_NOTE,
    '',
    `Generated ${generatedOn}. Go-live: ${project.goLiveDate}. Due dates are counted back from go-live.`,
    '',
    '## Tasks by phase',
    '',
    ...sections,
    '## Risk log',
    '',
    table(
      ['ID', 'Risk', 'Impact', 'Likelihood', 'Mitigation', 'Owner', 'Status'],
      risks.map((r) => [
        r.id,
        r.description,
        r.impact,
        r.likelihood,
        r.mitigation,
        r.owner,
        r.status,
      ]),
    ),
    '',
  ].join('\n');
}

/**
 * The configuration decisions log: what was decided, what else was
 * considered, and why.
 * @param {{ project: DocProject, decisions: Decision[], generatedOn: string }} input
 * @returns {string}
 */
export function renderDecisionsLog({ project, decisions, generatedOn }) {
  const entries = decisions.map((d) =>
    [
      `## ${d.id}: ${d.topic}`,
      '',
      `- Date: ${d.date}`,
      `- Options considered: ${d.optionsConsidered.join('; ')}`,
      `- Chosen: ${d.chosen}`,
      `- Why: ${d.rationale}`,
      '',
    ].join('\n'),
  );
  return [
    `# Configuration decisions log: ${project.customer}`,
    '',
    DEMO_NOTE,
    '',
    `Generated ${generatedOn}.`,
    '',
    ...entries,
  ].join('\n');
}
