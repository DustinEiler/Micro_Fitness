// Persistence. Everything lives in one JSON blob in localStorage.
// Weights are always stored in kilograms; the UI converts for display.

import { DEFAULT_EXERCISES, DEFAULT_ROUTINES } from './data.js';

export const STORAGE_KEY = 'micro-fitness.v1';
export const SCHEMA_VERSION = 3;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function freshState() {
  return {
    version: SCHEMA_VERSION,
    units: 'kg',
    weeklyGoal: 3,
    rest: 90,
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    routines: DEFAULT_ROUTINES.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i, w: null, ready: false, missed: 0 })) })),
    workouts: [],
    stepsTaken: 0,
    phase: { id: 'hypertrophy', startedAt: Date.now(), history: [] },
    phaseFitPending: true, // app.js fits routine targets to the phase on boot
    active: null,
    timer: null,
    progressEx: null,
  };
}

// Bring older saved data up to the current shape.
function migrate(data) {
  if ((data.version || 1) < 2) {
    // v1 routines had exerciseIds + one rest time; v2 has per-exercise targets.
    data.routines = (data.routines || []).map(({ exerciseIds = [], rest = 90, ...r }) => ({
      ...r,
      items: exerciseIds.map((exerciseId) => ({ exerciseId, sets: 3, reps: 10, w: null, rest, ready: false, missed: 0 })),
    }));
    data.active = null; // an in-progress v1 workout has no plan data
    data.version = 2;
  }
  if (data.version < 3) {
    // v3 adds training phases. Start in hypertrophy; targets get fitted on boot.
    data.phase = { id: 'hypertrophy', startedAt: Date.now(), history: [] };
    data.phaseFitPending = true;
    data.version = 3;
  }
  return data;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...freshState(), ...migrate(JSON.parse(raw)) };
  } catch (err) {
    console.warn('Could not read saved data', err);
  }
  return freshState();
}

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Could not save data', err);
    return false;
  }
}

// Checks that an imported backup has the shape we expect.
export function parseBackup(text) {
  const data = JSON.parse(text);
  const ok =
    data &&
    typeof data === 'object' &&
    Array.isArray(data.exercises) &&
    Array.isArray(data.routines) &&
    Array.isArray(data.workouts);
  if (!ok) throw new Error('This file isn’t a Micro Fitness backup.');
  return { ...freshState(), ...migrate(data), active: null, timer: null };
}
