import { useState } from 'react';
import { PHASES } from '../lib/plan.js';
import { renderDecisionsLog, renderIntegrationDoc, renderPlan } from '../lib/docs.js';
import { ScreenHeader } from './Common.jsx';

/**
 * Starts a browser download of a text file. A Blob URL works on a static
 * site with no server.
 */
function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Docs: preview, download as Markdown, or print to PDF. */
export default function DocsView({ state, tasks, testCases, readiness, spec, today }) {
  const [tab, setTab] = useState('integration');
  const { project } = state;

  const docs = {
    integration: {
      label: 'Integration doc',
      file: 'juniper-moss-integration-doc.md',
      text: () =>
        renderIntegrationDoc({
          project,
          mappings: state.mappings,
          spec,
          testCases,
          events: state.events,
          readiness,
          generatedOn: today,
        }),
    },
    plan: {
      label: 'Plan & risk log',
      file: 'juniper-moss-implementation-plan.md',
      text: () =>
        renderPlan({ project, tasks, risks: state.risks, phases: PHASES, generatedOn: today }),
    },
    decisions: {
      label: 'Decisions log',
      file: 'juniper-moss-decisions-log.md',
      text: () => renderDecisionsLog({ project, decisions: state.decisions, generatedOn: today }),
    },
  };
  const current = docs[tab];
  const text = current.text();

  return (
    <>
      <ScreenHeader title="Docs">
        The documents you hand the customer. They are built from this workspace, so they always
        match what was configured and tested.
      </ScreenHeader>

      <div className="tabs no-print" role="tablist">
        {Object.entries(docs).map(([id, d]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="tab"
            onClick={() => setTab(id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="doc-actions no-print">
        <button type="button" className="btn" onClick={() => download(current.file, text)}>
          Download {current.label} (.md)
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      <pre className="doc-preview" data-testid="doc-preview">
        {text}
      </pre>
    </>
  );
}
