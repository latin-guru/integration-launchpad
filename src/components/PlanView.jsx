import { PHASES } from '../lib/plan.js';
import { SampleTag, ScreenHeader, StatusPill } from './Common.jsx';

const LEVELS = ['low', 'medium', 'high'];

/**
 * Plan & risks: tasks by phase (due dates counted back from go-live) and an
 * editable risk log.
 */
export default function PlanView({ state, tasks, update }) {
  const atRisk = tasks.filter((t) => t.atRisk).length;

  const setTaskStatus = (id, status) =>
    update({ taskStatus: { ...state.taskStatus, [id]: status } });

  const setRisk = (id, patch) =>
    update({ risks: state.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const addRisk = () => {
    const id = `R-${state.risks.length + 1}`;
    update({
      risks: [
        ...state.risks,
        {
          id,
          description: '',
          impact: 'medium',
          likelihood: 'medium',
          mitigation: '',
          owner: 'vendor',
          status: 'open',
        },
      ],
    });
  };

  return (
    <>
      <ScreenHeader title="Plan & risks">
        Due dates are counted back from the go-live date ({state.project.goLiveDate}). A late task
        the customer owns is flagged at risk, because only a conversation can unblock it.
      </ScreenHeader>

      <p className="status-line">
        {atRisk > 0 ? (
          <StatusPill tone="fail">{atRisk} customer task at risk</StatusPill>
        ) : (
          <StatusPill tone="pass">No customer tasks at risk</StatusPill>
        )}{' '}
        <SampleTag />
      </p>

      {PHASES.map((phase) => (
        <section className="panel phase" key={phase}>
          <h2>{phase}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {tasks
                .filter((t) => t.phase === phase)
                .map((t) => (
                  <tr key={t.id} className={t.atRisk ? 'row-risk' : undefined}>
                    <td>{t.title}</td>
                    <td>{t.owner}</td>
                    <td>{t.dueDate}</td>
                    <td>
                      <select
                        aria-label={`Status for ${t.title}`}
                        value={t.status}
                        onChange={(e) => setTaskStatus(t.id, e.target.value)}
                      >
                        <option value="todo">To do</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>
                      {t.atRisk ? (
                        <StatusPill tone="fail">At risk</StatusPill>
                      ) : t.overdue ? (
                        <StatusPill tone="warn">Overdue</StatusPill>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="panel">
        <h2>Risk log</h2>
        <div className="risk-list">
          {state.risks.map((r) => (
            <div className="risk" key={r.id}>
              <strong>{r.id}</strong>
              <label className="wide">
                <span>Risk</span>
                <textarea
                  rows={2}
                  value={r.description}
                  onChange={(e) => setRisk(r.id, { description: e.target.value })}
                />
              </label>
              <label>
                <span>Impact</span>
                <select
                  value={r.impact}
                  onChange={(e) => setRisk(r.id, { impact: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Likelihood</span>
                <select
                  value={r.likelihood}
                  onChange={(e) => setRisk(r.id, { likelihood: e.target.value })}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Owner</span>
                <select value={r.owner} onChange={(e) => setRisk(r.id, { owner: e.target.value })}>
                  <option>vendor</option>
                  <option>customer</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={r.status}
                  onChange={(e) => setRisk(r.id, { status: e.target.value })}
                >
                  <option>open</option>
                  <option>closed</option>
                </select>
              </label>
              <label className="wide">
                <span>Mitigation</span>
                <textarea
                  rows={2}
                  value={r.mitigation}
                  onChange={(e) => setRisk(r.id, { mitigation: e.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={addRisk}>
          Add risk
        </button>
      </section>
    </>
  );
}
