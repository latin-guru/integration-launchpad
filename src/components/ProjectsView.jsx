import { mappingStatus } from '../lib/mapping.js';
import { SampleTag, ScreenHeader, StatusPill } from './Common.jsx';

/** The project list: one card for the customer being onboarded. */
export default function ProjectsView({ state, testCases, readiness, spec }) {
  const { project } = state;
  const fields = mappingStatus(state.mappings, spec, project.scope.answers).filter(
    (f) => f.required,
  );
  const mapped = fields.filter((f) => f.mapped).length;
  const required = testCases.filter((t) => t.required);
  const passed = required.filter((t) => t.status === 'passed').length;

  return (
    <>
      <ScreenHeader title="Projects">
        You are the implementation lead at Bayline Loop, a fictional partner-tracking platform. A
        new customer signed, and your job is to get their conversion tracking live and correct. All
        companies, people and the API are invented.
      </ScreenHeader>

      <article className="project-card" data-testid="project-card">
        <div className="project-top">
          <div>
            <h2>{project.customer}</h2>
            <p className="muted">{project.vertical}</p>
          </div>
          <StatusPill tone={readiness.ready ? 'pass' : 'fail'}>
            {readiness.ready ? 'Ready for go-live' : 'Not ready'}
          </StatusPill>
        </div>

        <dl className="facts">
          <div>
            <dt>Target go-live</dt>
            <dd>{project.goLiveDate}</dd>
          </div>
          <div>
            <dt>Required fields mapped</dt>
            <dd>
              {mapped} of {fields.length} <SampleTag />
            </dd>
          </div>
          <div>
            <dt>Required tests passed</dt>
            <dd>
              {passed} of {required.length} <SampleTag />
            </dd>
          </div>
        </dl>

        <h3>Stakeholders</h3>
        <ul className="people">
          {project.stakeholders.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> <span className="muted">{p.role}</span>
            </li>
          ))}
        </ul>

        <a className="btn" href="#/discovery">
          Start with discovery
        </a>
      </article>
    </>
  );
}
