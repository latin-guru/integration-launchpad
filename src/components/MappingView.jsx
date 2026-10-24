import { applyMapping, isMapped, isRequired } from '../lib/mapping.js';
import { listPaths } from '../lib/paths.js';
import { transformNames } from '../lib/transforms.js';
import { ScreenHeader, StatusPill } from './Common.jsx';

/**
 * Field mapping: the customer's sample payload on the left, Bayline Loop's
 * fields on the right. Each field picks a source path and a transform, and
 * shows a live preview of the value it produces.
 */
export default function MappingView({ state, update, spec }) {
  const answers = state.project.scope.answers;
  const paths = listPaths(state.sampleOrder);

  const mappingFor = (name) =>
    state.mappings.find((m) => m.targetField === name) ?? {
      targetField: name,
      sourcePath: '',
      transform: 'none',
      notes: '',
    };

  const setMapping = (name, patch) => {
    const next = { ...mappingFor(name), ...patch };
    const others = state.mappings.filter((m) => m.targetField !== name);
    update({ mappings: [...others, next] });
  };

  const missing = spec.fields.filter(
    (f) =>
      isRequired(f, answers) && !isMapped(state.mappings.find((m) => m.targetField === f.name)),
  );

  return (
    <>
      <ScreenHeader title="Mapping">
        Tell Bayline Loop where each field lives in the store&apos;s order payload, and how to
        convert it.
      </ScreenHeader>

      <p className="status-line" data-testid="mapping-status">
        {missing.length === 0 ? (
          <StatusPill tone="pass">All required fields mapped</StatusPill>
        ) : (
          <StatusPill tone="fail">
            Not mapped yet: {missing.map((f) => f.name).join(', ')}
          </StatusPill>
        )}
      </p>

      <div className="mapping-layout">
        <section className="panel">
          <h2>Store payload (orders/paid)</h2>
          <p className="muted small">Fictional, Shopify-like sample from Juniper &amp; Moss.</p>
          <pre className="code">{JSON.stringify(state.sampleOrder, null, 2)}</pre>
        </section>

        <section className="panel">
          <h2>Bayline Loop Conversion API fields</h2>
          <div className="field-list">
            {spec.fields.map((field) => {
              const m = mappingFor(field.name);
              const required = isRequired(field, answers);
              const preview = applyMapping(state.sampleOrder, [m])[field.name];
              return (
                <div className="field-row" key={field.name} data-testid={`field-${field.name}`}>
                  <div className="field-head">
                    <code className="field-name">{field.name}</code>
                    <span className="muted small">
                      {field.type === 'enum' ? field.values.join(' | ') : field.type}
                    </span>
                    {required ? (
                      isMapped(m) ? (
                        <StatusPill tone="pass">Mapped</StatusPill>
                      ) : (
                        <StatusPill tone="fail">Required</StatusPill>
                      )
                    ) : (
                      <StatusPill tone="neutral">Optional</StatusPill>
                    )}
                  </div>
                  <p className="muted small">{field.description}</p>
                  <div className="field-controls">
                    <label>
                      <span>Source</span>
                      <select
                        aria-label={`Source for ${field.name}`}
                        value={m.sourcePath}
                        disabled={m.transform === 'constant'}
                        onChange={(e) => setMapping(field.name, { sourcePath: e.target.value })}
                      >
                        <option value="">Not mapped</option>
                        {paths.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Transform</span>
                      <select
                        aria-label={`Transform for ${field.name}`}
                        value={m.transform}
                        onChange={(e) => setMapping(field.name, { transform: e.target.value })}
                      >
                        {transformNames.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    {m.transform === 'constant' && (
                      <label>
                        <span>Value</span>
                        <input
                          aria-label={`Constant value for ${field.name}`}
                          value={m.value ?? ''}
                          onChange={(e) => setMapping(field.name, { value: e.target.value })}
                        />
                      </label>
                    )}
                  </div>
                  <p className="preview small">
                    Sends:{' '}
                    <code>{preview === undefined ? 'nothing' : JSON.stringify(preview)}</code>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
