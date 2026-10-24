// @ts-check
import { addDays } from './dates.js';

/**
 * Saving the workspace in the browser's localStorage. The storage object is
 * passed in (instead of using window.localStorage directly) so tests can use
 * a simple fake.
 */

export const STORAGE_KEY = 'integration-launchpad/v1';

/**
 * Turns the seed file into a fresh workspace. Dates in the seed are relative
 * ("go-live in 21 days") so the demo always looks current.
 * @param {any} seed - contents of src/seed/juniper-moss.json
 * @param {string} today - "YYYY-MM-DD"
 */
export function createSeedState(seed, today) {
  const { goLiveInDays, ...project } = seed.project;
  return {
    project: { ...project, goLiveDate: addDays(today, goLiveInDays) },
    sampleOrder: seed.sampleOrder,
    mappings: seed.mappings,
    taskStatus: seed.taskStatus,
    risks: seed.risks,
    decisions: seed.decisions.map((/** @type {any} */ d) => {
      const { daysAgo, ...decision } = d;
      return { ...decision, date: addDays(today, -daysAgo) };
    }),
    events: [],
    seenEventIds: [],
    lastAcceptedRaw: null,
    testResults: {},
  };
}

/** @typedef {ReturnType<typeof createSeedState>} WorkspaceState */

/**
 * Loads the saved workspace, or returns the fresh seed when nothing is saved
 * or the saved data cannot be read (private browsing, corrupted JSON).
 * @param {Pick<Storage, 'getItem'> | null} storage
 * @param {() => WorkspaceState} makeSeed
 * @returns {WorkspaceState}
 */
export function loadState(storage, makeSeed) {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved) return { ...makeSeed(), ...JSON.parse(saved) };
  } catch {
    // Fall through to the seed.
  }
  return makeSeed();
}

/**
 * Saves the workspace. Failing to save (storage full or blocked) must never
 * break the app, so errors are ignored.
 * @param {Pick<Storage, 'setItem'> | null} storage
 * @param {WorkspaceState} state
 * @returns {boolean} whether the save worked
 */
export function saveState(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return Boolean(storage);
  } catch {
    return false;
  }
}

/**
 * Removes the saved workspace (the "Reset demo" button).
 * @param {Pick<Storage, 'removeItem'> | null} storage
 */
export function clearState(storage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
