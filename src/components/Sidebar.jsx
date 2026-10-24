import { gateSummary } from '../lib/readiness.js';

/**
 * Left-hand navigation. The steps are numbered because they are the order
 * an implementation runs in. The go-live gate is always visible at the bottom.
 */
export default function Sidebar({ views, current, readiness, onReset }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <p className="brand-name">Integration Launchpad</p>
          <p className="brand-sub">Bayline Loop onboarding, demo</p>
        </div>
      </div>

      <nav aria-label="Implementation steps">
        <ol className="steps">
          {views.map((v, i) => (
            <li key={v.id}>
              <a href={`#/${v.id}`} aria-current={current === v.id ? 'page' : undefined}>
                <span className="step-num">{i === 0 ? '·' : i}</span>
                {v.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <a
        href="#/golive"
        className={`gate-light ${readiness.ready ? 'is-ready' : 'is-blocked'}`}
        data-testid="sidebar-gate"
      >
        <span className="gate-dot" aria-hidden="true" />
        <span>
          <strong>{readiness.ready ? 'Ready for go-live' : 'Not ready for go-live'}</strong>
          <small>{gateSummary(readiness)}</small>
        </span>
      </a>

      <button type="button" className="btn-quiet reset" onClick={onReset}>
        Reset demo
      </button>

      <p className="credit">
        Built by Kevin Gaviria ·{' '}
        <a href="https://www.linkedin.com/in/kevin-gaviria" target="_blank" rel="noreferrer">
          Connect on LinkedIn
        </a>
      </p>
    </aside>
  );
}
