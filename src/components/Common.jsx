/** Small shared pieces used by several screens. */

/** Marks a number computed from the demo data. */
export function SampleTag() {
  return <span className="sample-tag">Sample data</span>;
}

/** Page heading with a one-line explanation of what the screen is for. */
export function ScreenHeader({ title, children }) {
  return (
    <header className="screen-header">
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}

/** Green / red pill for pass-fail style states. */
export function StatusPill({ tone, children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
