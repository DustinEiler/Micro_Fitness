// Persistence. Everything lives in one JSON blob in localStorage.
// Weights are always stored in kilograms; the UI converts for display.

import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, GROUP_FIXES } from './data.js';

export const STORAGE_KEY = 'micro-fitness.v1';
export const SCHEMA_VERSION = 7;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function freshState() {
  return {
    version: SCHEMA_VERSION,
    units: 'kg',
    weeklyGoal: 3,
    rest: 90,
    lastRest: null, // last rest timer length, for the Start button
    experience: 'experienced',
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e, equip: [...e.equip] })),
    routines: DEFAULT_ROUTINES.map((r) => ({
      ...r,
      groups: r.groups.map((g) => ({ ...g })),
      items: r.items.map((i) => ({ ...i, w: null, ready: false, missed: 0, picked: true })),
    })),
    workouts: [],
    stepsTaken: 0,
    phase: { id: 'hypertrophy', startedAt: Date.now(), history: [] },
    phaseFitPending: true, // app.js fits routine targets to the phase on boot
    onboarding: 'pending', // 'pending' shows the intro; 'offer' shows a card on Train; 'done' or 'skipped'
    profile: null, // intro answers (js/planner.js)
    plan: null, // { order, days } from the intro
    goal: null, // the SMART goal (js/goal.js)
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
  if (data.version < 6) {
    // v6: the full exercise library (js/library.js). Built-in exercises get
    // equipment tags and may move group (hip thrust moves to glutes); your own
    // names, kinds and on/off switches are kept. Routines that used a moved
    // exercise get its new group added so it keeps coming up.
    const before = new Map((data.exercises || []).map((e) => [e.id, e.group]));
    const defs = new Map(DEFAULT_EXERCISES.map((d) => [d.id, d]));
    data.exercises = (data.exercises || []).map((e) => {
      const d = defs.get(e.id);
      if (!d) return e;
      const { equip, common, explosive, advanced, group } = d;
      const merged = { ...e, group, equip };
      for (const [k, v] of Object.entries({ common, explosive, advanced })) if (v) merged[k] = v;
      if (!merged.kind) merged.kind = d.kind;
      return merged;
    });
    for (const d of DEFAULT_EXERCISES) if (!data.exercises.some((e) => e.id === d.id)) data.exercises.push({ ...d, equip: [...d.equip] });
    const groupOf = (id) => data.exercises.find((e) => e.id === id)?.group || 'other';
    for (const r of data.routines || []) {
      if (!r.groups) continue;
      for (const it of r.items || []) {
        const was = before.get(it.exerciseId);
        const now = groupOf(it.exerciseId);
        if (!was || was === now || it.picked === false) continue;
        const g = r.groups.find((x) => x.group === now);
        if (g) g.count = Math.max(g.count, 1);
        else r.groups.splice(r.groups.findIndex((x) => x.group === was) + 1, 0, { group: now, count: 1 });
        const old = r.groups.find((x) => x.group === was);
        if (old && old.count > 1) old.count--;
      }
    }
    data.version = 6;
  }
  if (data.version < 7) {
    // v7: the intro and SMART goals. Existing users aren't sent through the
    // intro; the Train screen offers it instead.
    data.onboarding = data.onboarding || 'offer';
    data.version = 7;
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
