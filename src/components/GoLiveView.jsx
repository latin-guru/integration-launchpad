import { ScreenHeader, StatusPill } from './Common.jsx';

const TONE = { passed: 'pass', failed: 'fail', 'not-run': 'neutral' };

/**
 * Go-live: the test plan with evidence, and the readiness gate. The gate is
 * green only when every required field is mapped and every required test
 * has passed.
 */
export default function GoLiveView({ state, testCases, readiness, update }) {
  const setStatus = (id, status) =>
    update({
      testResults: {
        ...state.testResults,
        [id]: { status, evidenceEventId: state.testResults[id]?.evidenceEventId ?? null },
      },
    });

  return (
    <>
      <ScreenHeader title="Go-live">
        Run each test in the Test Console. Results are recorded here as evidence, and you can mark a
        test by hand if it was checked another way.
      </ScreenHeader>

      <section
        className={`gate ${readiness.ready ? 'gate-ready' : 'gate-blocked'}`}
        data-testid="readiness-gate"
      >
        <span className="gate-dot" aria-hidden="true" />
        <div>
          <h2>{readiness.ready ? 'Ready for go-live' : 'Not ready for go-live'}</h2>
          {readiness.ready ? (
            <p>Every required field is mapped and every required test has passed.</p>
          ) : (
            <ul>
              {readiness.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Test plan</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Test</th>
              <th>From</th>
              <th>Expected</th>
              <th>Evidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((t) => {
              const event = state.events.find((e) => e.id === t.evidenceEventId);
              return (
                <tr key={t.id} data-testid={`test-${t.id}`}>
                  <td>
                    <strong>{t.id}</strong> {t.title}
                  </td>
                  <td>{t.derivedFrom}</td>
                  <td>
                    <code>{t.expected}</code>
                  </td>
                  <td>
                    {event ? (
                      <a href="#/console">
                        {event.id}, {event.accepted ? 'accepted' : 'rejected'}
                      </a>
                    ) : (
                      <span className="muted">None yet</span>
                    )}
                  </td>
                  <td>
                    <StatusPill tone={TONE[t.status]}>{t.status}</StatusPill>
                    <select
                      aria-label={`Mark ${t.id}`}
                      value={t.status}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                    >
                      <option value="not-run">Not run</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
