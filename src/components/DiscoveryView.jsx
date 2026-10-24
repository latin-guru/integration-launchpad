import { scopeTasks } from '../lib/plan.js';
import { deriveTestCases } from '../lib/testCases.js';
import { ScreenHeader } from './Common.jsx';

const QUESTIONS = [
  {
    key: 'platform',
    label: 'How is the store built?',
    options: [
      ['hosted', 'Hosted storefront (Shopify-like)'],
      ['custom', 'Custom-built checkout'],
    ],
  },
  {
    key: 'orderVolume',
    label: 'Monthly order volume',
    options: [
      ['under-1k', 'Under 1,000'],
      ['1k-10k', '1,000 to 10,000'],
      ['10k-plus', 'More than 10,000'],
    ],
  },
  { key: 'refunds', label: 'Do refunds need to reverse partner commissions?', yesNo: true },
  { key: 'promoCodes', label: 'Does the store use promo codes?', yesNo: true },
  { key: 'crossDomain', label: 'Does checkout happen on a different domain?', yesNo: true },
];

/**
 * Discovery questions. Each answer is saved on the project, and the plan and
 * test plan are rebuilt from the answers, so changes show up right away.
 */
export default function DiscoveryView({ state, update }) {
  const { project } = state;
  const answers = project.scope.answers;

  const setAnswer = (key, value) =>
    update({ project: { ...project, scope: { answers: { ...answers, [key]: value } } } });

  const addedTasks = scopeTasks(answers);
  const addedTests = deriveTestCases(answers).filter((t) => t.derivedFrom !== 'Every integration');

  return (
    <>
      <ScreenHeader title="Discovery">
        Confirm how the customer sells before configuring anything. Your answers add tasks and test
        cases to the plan.
      </ScreenHeader>

      <div className="two-col">
        <form className="panel questions" onSubmit={(e) => e.preventDefault()}>
          <label className="question">
            <span>Target go-live date</span>
            <input
              type="date"
              value={project.goLiveDate}
              onChange={(e) =>
                e.target.value && update({ project: { ...project, goLiveDate: e.target.value } })
              }
            />
          </label>

          {QUESTIONS.map((q) => (
            <fieldset key={q.key} className="question">
              <legend>{q.label}</legend>
              <div className="choices">
                {(q.yesNo
                  ? [
                      [true, 'Yes'],
                      [false, 'No'],
                    ]
                  : q.options
                ).map(([value, text]) => (
                  <label key={String(value)} className="choice">
                    <input
                      type="radio"
                      name={q.key}
                      checked={answers[q.key] === value}
                      onChange={() => setAnswer(q.key, value)}
                    />
                    {text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </form>

        <section className="panel" aria-live="polite" data-testid="scope-effects">
          <h2>What these answers add</h2>
          <h3>Tasks</h3>
          <ul className="plain">
            {addedTasks.map((t) => (
              <li key={t.id}>
                {t.title} <span className="muted">({t.owner})</span>
              </li>
            ))}
          </ul>
          <h3>Test cases</h3>
          {addedTests.length === 0 ? (
            <p className="muted">Only the standard tests. Refunds add a reversal test.</p>
          ) : (
            <ul className="plain">
              {addedTests.map((t) => (
                <li key={t.id}>
                  {t.id}: {t.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
