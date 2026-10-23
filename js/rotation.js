// Which exercises come up in a workout.
// A routine is a list of muscle groups with a count per workout:
//   routine.groups = [{ group: 'chest', count: 2 }, ...]
// and the exercises allowed in its rotation:
//   routine.items[k].picked (ticked for this routine), .always (pinned to
//   every workout), .lastDone (timestamp of the last workout it was done in).
// An exercise switched off in the exercise list (exercise.off) is skipped
// in every routine.

import { S } from './state.js';
import { exById } from './queries.js';

export const isOff = (exerciseId) => !!S.exercises.find((e) => e.id === exerciseId)?.off;

// Exercises that can come up for one group in a routine.
export const candidates = (routine, group) =>
  routine.items
    .map((it, k) => ({ it, k }))
    .filter(({ it }) => it.picked !== false && exById(it.exerciseId).group === group && !isOff(it.exerciseId));

// Indexes into routine.items for the next workout: pinned exercises first,
// then whichever were done least recently (never-done ones in list order).
export function itemsForToday(routine) {
  const chosen = [];
  for (const { group, count } of routine.groups || []) {
    const c = candidates(routine, group);
    const pinned = c.filter(({ it }) => it.always);
    const rotating = c.filter(({ it }) => !it.always).sort((a, b) => (a.it.lastDone || 0) - (b.it.lastDone || 0) || a.k - b.k);
    chosen.push(...[...pinned, ...rotating].slice(0, Math.max(count, pinned.length)).map(({ k }) => k));
  }
  return chosen;
}
