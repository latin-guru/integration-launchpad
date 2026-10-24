// @ts-check
import { useEffect, useState } from 'react';
import seed from './seed/juniper-moss.json';
import { todayISO } from './lib/dates.js';
import { clearState, createSeedState, loadState, saveState } from './lib/storage.js';

/** localStorage, or null when the browser blocks it. */
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const makeSeed = () => createSeedState(seed, todayISO());

/**
 * The whole workspace as React state, saved to localStorage on every change.
 * Returns the state, a setter, and a reset function for the "Reset demo" button.
 */
export function useWorkspace() {
  const [state, setState] = useState(() => loadState(browserStorage(), makeSeed));

  useEffect(() => {
    saveState(browserStorage(), state);
  }, [state]);

  function reset() {
    clearState(browserStorage());
    setState(makeSeed());
  }

  return { state, setState, reset };
}
