// Persistence. Everything lives in one JSON blob in localStorage.
// Weights are always stored in kilograms; the UI converts for display.

import { DEFAULT_EXERCISES, DEFAULT_ROUTINES } from './data.js';

export const STORAGE_KEY = 'micro-fitness.v1';
export const SCHEMA_VERSION = 1;

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function freshState() {
  return {
    version: SCHEMA_VERSION,
    units: 'kg',
    weeklyGoal: 3,
    rest: 90,
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    routines: DEFAULT_ROUTINES.map((r) => ({ ...r, exerciseIds: [...r.exerciseIds] })),
    workouts: [],
    active: null,
    timer: null,
    progressEx: null,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
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
  return { ...freshState(), ...data, active: null, timer: null };
}
