// Read-only lookups over workout history. S.workouts is kept sorted oldest first.

import { S } from './state.js';
import { setScore, weekStart } from './format.js';

export const exById = (id) => S.exercises.find((e) => e.id === id) || { id, name: 'Deleted exercise', group: 'other' };

// Sets from the most recent workout (before beforeTs) that included this exercise.
export function lastSetsFor(exId, beforeTs = Infinity) {
  for (let k = S.workouts.length - 1; k >= 0; k--) {
    const w = S.workouts[k];
    if (w.startedAt >= beforeTs) continue;
    const sets = w.entries.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets);
    if (sets.length) return sets;
  }
  return null;
}

export function bestScore(exId) {
  let best = 0;
  for (const w of S.workouts)
    for (const e of w.entries) if (e.exerciseId === exId) for (const s of e.sets) best = Math.max(best, setScore(s));
  return best;
}

// Workout counts for the last n weeks, oldest first.
export function weekCounts(n) {
  const now = weekStart(Date.now());
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * i);
    weeks.push({ start: d.getTime(), count: 0 });
  }
  for (const w of S.workouts) {
    const b = weeks.find((x) => x.start === weekStart(w.startedAt));
    if (b) b.count++;
  }
  return weeks;
}

// Consecutive weeks that hit the weekly goal. The current week only adds to
// the streak once it's met; an unfinished week never breaks it.
export function streak() {
  const counts = new Map();
  for (const w of S.workouts) {
    const k = weekStart(w.startedAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const d = new Date(weekStart(Date.now()));
  let n = (counts.get(d.getTime()) || 0) >= S.weeklyGoal ? 1 : 0;
  for (let guard = 0; guard < 1000; guard++) {
    d.setDate(d.getDate() - 7);
    if ((counts.get(d.getTime()) || 0) >= S.weeklyGoal) n++;
    else break;
  }
  return n;
}

export const workoutVolume = (w) => w.entries.reduce((t, e) => t + e.sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), 0);
export const workoutSets = (w) => w.entries.reduce((t, e) => t + e.sets.length, 0);
