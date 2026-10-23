// Persistence. Everything lives in one JSON blob in localStorage.
// Weights are always stored in kilograms; the UI converts for display.

import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, GROUP_FIXES } from './data.js';

export const STORAGE_KEY = 'micro-fitness.v1';
export const SCHEMA_VERSION = 5;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function freshState() {
  return {
    version: SCHEMA_VERSION,
    units: 'kg',
    weeklyGoal: 3,
    rest: 90,
    experience: 'experienced',
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    routines: DEFAULT_ROUTINES.map((r) => ({
      ...r,
      groups: r.groups.map((g) => ({ ...g })),
      items: r.items.map((i) => ({ ...i, w: null, ready: false, missed: 0, picked: true })),
    })),
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
  if (data.version < 4) {
    // v4: new rest ranges (hypertrophy 30–90s, strength/power 2–5 min) and
    // compound/isolation rest. Refit targets on boot.
    data.phaseFitPending = true;
    data.version = 4;
  }
  if (data.version < 5) {
    // v5: biceps, triceps and calves become their own groups, new built-in
    // exercises, and routines are built from muscle groups. Existing routines
    // keep exactly their current exercises: one group per muscle, with a
    // count equal to how many exercises it had.
    data.exercises = (data.exercises || []).map((e) => (GROUP_FIXES[e.id] ? { ...e, group: GROUP_FIXES[e.id] } : e));
    for (const d of DEFAULT_EXERCISES) if (!data.exercises.some((e) => e.id === d.id)) data.exercises.push({ ...d });
    const groupOf = (id) => data.exercises.find((e) => e.id === id)?.group || 'other';
    data.routines = (data.routines || []).map((r) => {
      if (r.groups) return r;
      const groups = [];
      for (const it of r.items || []) {
        const g = groups.find((x) => x.group === groupOf(it.exerciseId));
        if (g) g.count++;
        else groups.push({ group: groupOf(it.exerciseId), count: 1 });
      }
      return { ...r, groups, items: (r.items || []).map((it) => ({ ...it, picked: true })) };
    });
    data.version = 5;
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
