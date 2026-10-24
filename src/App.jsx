import { useMemo } from 'react';
import spec from './spec/conversion-v1.json';
import { todayISO } from './lib/dates.js';
import { buildPlan, flagAtRisk } from './lib/plan.js';
import { deriveTestCases, evaluateRun, withResults } from './lib/testCases.js';
import { goLiveReadiness } from './lib/readiness.js';
import { buildSample } from './lib/samples.js';
import { runTestEvent } from './lib/testRun.js';
import { DEMO_SIGNING_SECRET } from './lib/signature.js';
import { useWorkspace } from './useWorkspace.js';
import { useHashView } from './useHashView.js';
import Sidebar from './components/Sidebar.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import DiscoveryView from './components/DiscoveryView.jsx';
import MappingView from './components/MappingView.jsx';
import TestConsoleView from './components/TestConsoleView.jsx';
import PlanView from './components/PlanView.jsx';
import GoLiveView from './components/GoLiveView.jsx';
import DocsView from './components/DocsView.jsx';

export const VIEWS = [
  { id: 'projects', label: 'Projects' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'console', label: 'Test Console' },
  { id: 'plan', label: 'Plan & risks' },
  { id: 'golive', label: 'Go-live' },
  { id: 'docs', label: 'Docs' },
];

/**
 * The app shell. It owns the workspace state, works out everything derived
 * from it (plan, test cases, readiness) with the pure functions in src/lib,
 * and passes the results to the screens as props.
 */
export default function App() {
  const { state, setState, reset } = useWorkspace();
  const view = useHashView(VIEWS.map((v) => v.id));
  const today = todayISO();
  const answers = state.project.scope.answers;

  const tasks = useMemo(
    () => flagAtRisk(buildPlan(state.project, state.taskStatus), today),
    [state.project, state.taskStatus, today],
  );
  const testCases = useMemo(
    () => withResults(deriveTestCases(answers), state.testResults),
    [answers, state.testResults],
  );
  const readiness = goLiveReadiness(state.mappings, spec, testCases, answers);

  /** Changes part of the workspace. */
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  /** Runs a payload through the Test Console and records the result. */
  async function runEvent({ raw, tamper = false, kind = null, note = '' }) {
    const runNumber = state.runCount + 1;
    const event = await runTestEvent({
      id: `EV-${runNumber}`,
      ranAt: new Date().toISOString(),
      raw,
      tamper,
      mappings: state.mappings,
      spec,
      seenEventIds: state.seenEventIds,
      answers,
      secret: DEMO_SIGNING_SECRET,
    });
    const testCase = kind ? testCases.find((t) => t.sample === kind) : null;

    setState((s) => ({
      ...s,
      runCount: runNumber,
      events: [{ ...event, kind, note }, ...s.events].slice(0, 25),
      seenEventIds: event.accepted
        ? [...s.seenEventIds, String(event.mappedPayload.event_id)]
        : s.seenEventIds,
      lastAcceptedRaw: event.accepted ? raw : s.lastAcceptedRaw,
      testResults: testCase
        ? {
            ...s.testResults,
            [testCase.id]: {
              status: evaluateRun(testCase.expected, event),
              evidenceEventId: event.id,
            },
          }
        : s.testResults,
    }));
  }

  /** Builds one of the sample payloads and runs it. */
  function runSample(kind) {
    const sample = buildSample(kind, state.sampleOrder, {
      runNumber: state.runCount + 1,
      lastAcceptedRaw: state.lastAcceptedRaw,
    });
    return runEvent({ ...sample, kind });
  }

  const screens = {
    projects: (
      <ProjectsView state={state} testCases={testCases} readiness={readiness} spec={spec} />
    ),
    discovery: <DiscoveryView state={state} update={update} />,
    mapping: <MappingView state={state} update={update} spec={spec} />,
    console: (
      <TestConsoleView
        state={state}
        testCases={testCases}
        runSample={runSample}
        runEvent={runEvent}
      />
    ),
    plan: <PlanView state={state} tasks={tasks} update={update} />,
    golive: (
      <GoLiveView state={state} testCases={testCases} readiness={readiness} update={update} />
    ),
    docs: (
      <DocsView
        state={state}
        tasks={tasks}
        testCases={testCases}
        readiness={readiness}
        spec={spec}
        today={today}
      />
    ),
  };

  return (
    <div className="shell">
      <Sidebar views={VIEWS} current={view} readiness={readiness} onReset={reset} />
      <main className="main" id="main">
        {screens[view]}
      </main>
    </div>
  );
}
