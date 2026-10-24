// Starting, finishing and discarding workouts.
// S.active = { id, name, routineId, startedAt, entries: [entry] }
// entry = { exerciseId, sets: [{ w, r, done }], plan? }
// plan (routine exercises only) = { routineId, index, calibrate, lever, label, note,
//   base, options: [{ lever, label, target }], target: { sets, reps, w, rest } }

import { S, persist } from './state.js';
import { uid } from './store.js';
import { esc } from './dom.js';
import { unit, toDisp, setScore, setStr, fmtDur, fmtNum, plural } from './format.js';
import { exById, lastSetsFor, bestScore, workoutVolume, workoutSets } from './queries.js';
import { suggest, applyResult, describe } from './progression.js';
import { phaseId } from './phases.js';
import { workoutGains } from './levels.js';
import { itemsForToday } from './rotation.js';
import { openSheet, confirmSheet, toast } from './ui.js';
import { render, go } from './router.js';

const fillSets = (t) => Array.from({ length: t.sets }, () => ({ w: t.w ?? null, r: t.reps, done: false }));

// Exercise added during a workout: pre-filled from last time, or three empty sets.
export function newEntry(exId) {
  const last = lastSetsFor(exId);
  const sets = last ? last.map((s) => ({ w: s.w, r: s.r, done: false })) : [0, 1, 2].map(() => ({ w: null, r: null, done: false }));
  return { exerciseId: exId, sets };
}

// Exercise from a routine: today's target is one tiny step past the baseline.
function plannedEntry(routine, index) {
  const item = routine.items[index];
  const base = { sets: item.sets, reps: item.reps, w: item.w, rest: item.rest };
  if (!item.ready) {
    const last = lastSetsFor(item.exerciseId);
    const w = item.w ?? last?.[last.length - 1]?.w ?? null;
    return {
      exerciseId: item.exerciseId,
      sets: fillSets({ ...base, w }),
      plan: { routineId: routine.id, index, calibrate: true, base, target: base, options: [], lever: null },
    };
  }
  const { opts, lever, note } = suggest(item);
  const opt = opts.find((o) => o.lever === lever);
  const target = opt ? opt.target : base;
  return {
    exerciseId: item.exerciseId,
    sets: fillSets(target),
    plan: { routineId: routine.id, index, calibrate: false, base, options: opts, lever, label: opt?.label, note, target },
  };
}

// Switch today's tiny step. Sets already ticked off keep their numbers.
export function chooseStep(i, lever) {
  const e = S.active.entries[i];
  const opt = e.plan?.options.find((o) => o.lever === lever);
  if (!opt) return;
  Object.assign(e.plan, { lever, label: opt.label, target: opt.target, note: '' });
  for (const s of e.sets)
    if (!s.done) {
      s.w = opt.target.w ?? s.w;
      s.r = opt.target.reps;
    }
  persist();
  render();
}

export const restFor = (entry) => entry?.plan?.target.rest || S.rest;

export function startWorkout(r) {
  if (S.active) {
    toast('Finish or discard your current workout first.');
    go('train');
    return;
  }
  if (r && !itemsForToday(r).length) {
    toast(`No exercises are available for ${r.name}. Tick some in the routine, or switch some back on in the exercise list.`);
    return;
  }
  S.active = {
    id: uid(),
    name: r ? r.name : 'Workout',
    routineId: r ? r.id : null,
    startedAt: Date.now(),
    entries: r ? itemsForToday(r).map((k) => plannedEntry(r, k)) : [],
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

    // Move each routine exercise's baseline forward (or note the miss).
    const outcomes = [];
    for (const e of a.entries) {
      if (!e.plan) continue;
      const routine = S.routines.find((r) => r.id === e.plan.routineId);
      const item = routine?.items[e.plan.index];
      if (!item || item.exerciseId !== e.exerciseId) continue; // routine edited mid-workout
      const out = applyResult(item, e.plan, e.sets);
      if (!out) continue;
      item.lastDone = Date.now(); // moves it to the back of the rotation
      if (out.kind === 'hit') S.stepsTaken = (S.stepsTaken || 0) + 1;
      outcomes.push({ ...out, name: exById(e.exerciseId).name });
      // Saved with the workout so the Levels tab can award XP for the step.
      const saved = entries.find((x) => x.exerciseId === e.exerciseId);
      if (saved) saved.step = { kind: out.kind, lever: out.lever || null };
    }

    const w = { id: a.id, name: a.name.trim() || 'Workout', routineId: a.routineId, phase: phaseId(), startedAt: a.startedAt, endedAt: Date.now(), entries };
    S.workouts.push(w);
    S.workouts.sort((p, q) => p.startedAt - q.startedAt);
    S.active = null;
    S.timer = null;
    persist();
    render();
    summarySheet(w, prs, outcomes, workoutGains(w));
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

function outcomeLine(o) {
  if (o.kind === 'hit') return `<li><span class="out-badge out-hit">${esc(o.label)}</span><span><strong>${esc(o.name)}</strong> Step done. New baseline: ${describe(o.target)}.</span></li>`;
  if (o.kind === 'missed') return `<li><span class="out-badge out-miss">Again</span><span><strong>${esc(o.name)}</strong> Not quite this time. You’ll repeat this target next workout.</span></li>`;
  return `<li><span class="out-badge out-start">Start</span><span><strong>${esc(o.name)}</strong> Starting point set: ${describe(o.target)}.</span></li>`;
}

// XP earned, and a badge for each level-up. The one moment of celebration.
function gainsBlock(g) {
  if (!g?.xp) return '';
  const ups = g.ups
    .map((u) => `<li class="lvl-up"><span class="lvl-badge" aria-hidden="true">${u.level}</span><span><strong>${esc(u.name)}</strong> reached level ${u.level}${u.group ? ' (muscle group)' : ''}</span></li>`)
    .join('');
  return `<div class="gains${g.ups.length || g.overallUp ? ' has-ups' : ''}">
    <p class="gains-xp"><span class="gains-n">+${g.xp} XP</span>${g.overallUp ? ` <span class="gains-big">Level ${g.overall.level}: ${esc(g.overall.title)}</span>` : ''}</p>
    <div class="xp-bar" role="progressbar" aria-label="Overall level ${g.overall.level}" aria-valuemin="0" aria-valuemax="${g.overall.span}" aria-valuenow="${g.overall.into}"><span style="width:${Math.round(g.overall.pct * 100)}%"></span></div>
    <p class="fine">Overall level ${g.overall.level}. ${g.overall.toNext} XP to level ${g.overall.level + 1}.</p>
    ${ups ? `<ul class="lvl-ups">${ups}</ul>` : ''}
  </div>`;
}

function summarySheet(w, prs, outcomes, gains) {
  const vol = workoutVolume(w);
  const hits = outcomes.filter((o) => o.kind === 'hit').length;
  openSheet(`
    <h2 class="sheet-h">Workout saved</h2>
    ${gainsBlock(gains)}
    ${hits ? `<p class="lede">${plural(hits, 'tiny step')} forward today. That’s ${plural(S.stepsTaken, 'step')} in total.</p>` : ''}
    <dl class="totals">
      <div><dt>Time</dt><dd>${fmtDur(w.endedAt - w.startedAt)}</dd></div>
      <div><dt>Sets</dt><dd>${workoutSets(w)}</dd></div>
      ${vol ? `<div><dt>Lifted (${unit()})</dt><dd>${fmtNum(toDisp(vol))}</dd></div>` : ''}
    </dl>
    ${outcomes.length ? `<h3 class="sub-h">Next time</h3><ul class="outcomes">${outcomes.map(outcomeLine).join('')}</ul>` : ''}
    ${prs.length ? `<h3 class="sub-h">New personal bests</h3><ul class="pr-list">${prs.map((p) => `<li><span class="pr-badge">PB</span>${esc(p.name)}, ${setStr(p.set)}</li>`).join('')}</ul>` : ''}
    <button class="btn btn-primary btn-wide" data-action="close-sheet">Done</button>`, { tall: outcomes.length > 3 });
}
