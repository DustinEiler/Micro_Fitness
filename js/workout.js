// Starting, finishing and discarding workouts.
// S.active = { id, name, routineId, rest, startedAt, entries: [{ exerciseId, sets: [{ w, r, done }] }] }

import { S, persist } from './state.js';
import { uid } from './store.js';
import { esc } from './dom.js';
import { unit, toDisp, setScore, setStr, fmtDur, fmtNum } from './format.js';
import { exById, lastSetsFor, bestScore, workoutVolume, workoutSets } from './queries.js';
import { openSheet, confirmSheet, toast } from './ui.js';
import { render, go } from './router.js';

// New exercise in a workout: pre-filled from last time, or three empty sets.
export function newEntry(exId) {
  const last = lastSetsFor(exId);
  const sets = last ? last.map((s) => ({ w: s.w, r: s.r, done: false })) : [0, 1, 2].map(() => ({ w: null, r: null, done: false }));
  return { exerciseId: exId, sets };
}

export function startWorkout(r) {
  if (S.active) {
    toast('Finish or discard your current workout first.');
    go('train');
    return;
  }
  S.active = {
    id: uid(),
    name: r ? r.name : 'Workout',
    routineId: r ? r.id : null,
    rest: r ? r.rest : S.rest,
    startedAt: Date.now(),
    entries: r ? r.exerciseIds.map(newEntry) : [],
  };
  persist();
  go('train');
  window.scrollTo(0, 0);
}

// Only checked-off sets with reps are saved; empty exercises are dropped.
export function finishWorkout() {
  const a = S.active;
  const entries = a.entries
    .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done && s.r).map(({ w, r }) => ({ w, r })) }))
    .filter((e) => e.sets.length);
  if (!entries.length) {
    confirmSheet('No sets are checked off yet, so there’s nothing to save. Discard this workout?', 'Discard workout', discardWorkout, true);
    return;
  }
  const unchecked = a.entries.reduce((t, e) => t + e.sets.filter((s) => !s.done).length, 0);
  const save = () => {
    const prs = entries
      .map((e) => {
        const prev = bestScore(e.exerciseId);
        const best = e.sets.reduce((b, s) => (setScore(s) > setScore(b) ? s : b));
        return prev > 0 && setScore(best) > prev ? { name: exById(e.exerciseId).name, set: best } : null;
      })
      .filter(Boolean);
    const w = { id: a.id, name: a.name.trim() || 'Workout', routineId: a.routineId, startedAt: a.startedAt, endedAt: Date.now(), entries };
    S.workouts.push(w);
    S.workouts.sort((p, q) => p.startedAt - q.startedAt);
    S.active = null;
    S.timer = null;
    persist();
    render();
    summarySheet(w, prs);
  };
  if (unchecked) confirmSheet(`${unchecked} set${unchecked === 1 ? ' isn’t' : 's aren’t'} checked off and won’t be saved.`, 'Finish workout', save);
  else save();
}

export function discardWorkout() {
  S.active = null;
  S.timer = null;
  persist();
  render();
}

function summarySheet(w, prs) {
  const vol = workoutVolume(w);
  openSheet(`
    <h2 class="sheet-h">Workout saved</h2>
    <dl class="totals">
      <div><dt>Time</dt><dd>${fmtDur(w.endedAt - w.startedAt)}</dd></div>
      <div><dt>Sets</dt><dd>${workoutSets(w)}</dd></div>
      ${vol ? `<div><dt>Lifted (${unit()})</dt><dd>${fmtNum(toDisp(vol))}</dd></div>` : ''}
    </dl>
    ${prs.length ? `<h3 class="sub-h">New personal bests</h3><ul class="pr-list">${prs.map((p) => `<li><span class="pr-badge">PB</span>${esc(p.name)}, ${setStr(p.set)}</li>`).join('')}</ul>` : ''}
    <button class="btn btn-primary btn-wide" data-action="close-sheet">Done</button>`);
}
