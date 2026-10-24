import { useState } from 'react';
import { ScreenHeader, StatusPill } from './Common.jsx';

const SAMPLE_BUTTONS = [
  ['good', 'Send good event'],
  ['duplicate', 'Send duplicate'],
  ['badSignature', 'Send bad signature'],
  ['badCurrency', 'Send bad currency'],
  ['reversal', 'Send refund reversal'],
];

/**
 * Test Console: build or paste a payload, map it, sign it, and check it the
 * way Bayline Loop would. Sample buttons record their result as evidence on
 * the matching test case.
 */
export default function TestConsoleView({ state, testCases, runSample, runEvent }) {
  const [draft, setDraft] = useState(() => JSON.stringify(state.sampleOrder, null, 2));
  const [parseError, setParseError] = useState('');
  const [busy, setBusy] = useState(false);
  const latest = state.events[0];
  const refunds = state.project.scope.answers.refunds;

  async function go(action) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  function runDraft() {
    try {
      const raw = JSON.parse(draft);
      setParseError('');
      go(() => runEvent({ raw, note: 'Pasted payload. Not linked to a test case.' }));
    } catch (error) {
      setParseError(`This is not valid JSON: ${error.message}`);
    }
  }

  const caseFor = (kind) => testCases.find((t) => t.sample === kind);

  return (
    <>
      <ScreenHeader title="Test Console">
        Every event is mapped, signed with HMAC-SHA256 using a demo secret, then checked in your
        browser. Nothing leaves the page.
      </ScreenHeader>

      <div className="sample-buttons" role="group" aria-label="Sample events">
        {SAMPLE_BUTTONS.filter(([kind]) => kind !== 'reversal' || refunds).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            className={kind === 'good' ? 'btn' : 'btn-secondary'}
            disabled={busy}
            onClick={() => go(() => runSample(kind))}
          >
            {label}
            {caseFor(kind) && <small className="btn-note">{caseFor(kind).id}</small>}
          </button>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Result</h2>
          {!latest ? (
            <p className="muted">Send a good event to see each check.</p>
          ) : (
            <LatestResult event={latest} testCases={testCases} />
          )}
        </section>

        <section className="panel">
          <h2>Payload</h2>
          {latest && (
            <>
              <h3>Mapped event received</h3>
              <pre className="code">{JSON.stringify(latest.mappedPayload, null, 2)}</pre>
              <p className="small signature">
                <code>X-Bayline-Signature: {latest.signature}</code>
              </p>
            </>
          )}
          <h3>Paste a store payload</h3>
          <textarea
            className="code"
            rows={10}
            value={draft}
            aria-label="Store payload JSON"
            onChange={(e) => setDraft(e.target.value)}
          />
          {parseError && <p className="error">{parseError}</p>}
          <button type="button" className="btn-secondary" disabled={busy} onClick={runDraft}>
            Run pasted payload
          </button>
        </section>
      </div>

      <section className="panel">
        <h2>Event log</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Sample</th>
              <th>Outcome</th>
              <th>Failed checks</th>
              <th>Ran at</th>
            </tr>
          </thead>
          <tbody>
            {state.events.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.kind ?? 'pasted'}</td>
                <td>{e.accepted ? 'Accepted' : 'Rejected'}</td>
                <td>
                  {e.results
                    .filter((r) => !r.pass)
                    .map((r) => r.check)
                    .join(', ') || '-'}
                </td>
                <td>{new Date(e.ranAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

/** The check list for the most recent event, with fix hints and tags. */
function LatestResult({ event, testCases }) {
  const testCase = testCases.find((t) => t.evidenceEventId === event.id);
  return (
    <div data-testid="latest-result">
      <p className="status-line">
        <StatusPill tone={event.accepted ? 'pass' : 'fail'}>
          {event.id} {event.accepted ? 'accepted' : 'rejected'}
        </StatusPill>
      </p>
      {event.note && <p className="muted small">{event.note}</p>}
      {testCase && (
        <p className="small">
          Recorded as evidence for {testCase.id}: <strong>{testCase.status}</strong>
        </p>
      )}
      <ul className="checks">
        {event.results.map((r) => (
          <li key={r.check} className={r.pass ? 'check-pass' : 'check-fail'}>
            <span className="check-mark" aria-hidden="true">
              {r.pass ? '✓' : '✕'}
            </span>
            <div>
              <strong>{r.label}</strong>
              {!r.pass && (
                <>
                  <span className={`tag tag-${r.action}`}>
                    {r.action === 'fix' ? 'Customer can fix' : 'Escalate if it persists'}
                  </span>
                  <p>{r.message}</p>
                  <p className="hint">{r.hint}</p>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
