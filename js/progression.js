// Tiny-step progression: each workout, every routine exercise moves one small
// step beyond its last successful target, by exactly one "lever":
//   reps:   +1 rep on every set
//   weight: +one weight step (default 2.5 kg / 5 lb)
//   rest:   −5 seconds between sets
// All targets stay inside the current phase's ranges (js/phases.js).
// Cap rule: once reps reach the top of the phase range on every set, the only
// step is more weight, with reps lowered just enough to keep it a tiny step.
//
// Routine item (in S.routines[].items):
//   { exerciseId, sets, reps, w (kg or null for bodyweight), rest (seconds),
//     step (kg, optional), ready, lever, pendingLever, missed }
// ready=false means no baseline yet: the next session calibrates it.
// lever: last lever that succeeded. pendingLever/missed: the lever being
// retried after a miss, and how many misses in a row.

import { toDisp, unit, e1rm } from './format.js';
import { currentPhase, fitItem, stepFor, clamp } from './phases.js';

export const LEVER_ORDER = ['reps', 'weight', 'rest'];
export const REST_STEP = 5;

// New exercise in a routine: bottom of the rep range and longest rest,
// so there's room to climb.
export function newItem(exerciseId) {
  const p = currentPhase();
  return { exerciseId, sets: p.sets ? p.sets[0] : 3, reps: p.reps[0], w: null, rest: p.rest[1], ready: false, missed: 0 };
}

// Smallest rep count at the heavier weight that still beats the old
// estimated one-rep max, kept inside the phase range.
function repsAfterWeightBump(w, reps, w2, range) {
  const old = e1rm(w, reps);
  const r = Math.floor(30 * (old / w2 - 1)) + 1;
  return clamp(r, range);
}

// The tiny steps available from an item's baseline, plus whether the
// rep cap forces a weight increase.
export function stepOptions(item) {
  const p = currentPhase();
  const [, repMax] = p.reps;
  const base = { sets: item.sets, reps: item.reps, w: item.w, rest: item.rest };
  const step = stepFor(item);
  const stepLabel = `+${toDisp(step)} ${unit()}`;

  if (item.reps >= repMax) {
    if (!item.w) return { opts: [], capped: true };
    const w2 = item.w + step;
    const reps = repsAfterWeightBump(item.w, item.reps, w2, p.reps);
    const label = reps < item.reps ? `${stepLabel}, ${reps} reps` : stepLabel;
    return { opts: [{ lever: 'weight', label, target: { ...base, w: w2, reps } }], capped: true };
  }

  const opts = [{ lever: 'reps', label: '+1 rep', target: { ...base, reps: base.reps + 1 } }];
  if (item.w) opts.push({ lever: 'weight', label: stepLabel, target: { ...base, w: base.w + step } });
  if (item.rest - REST_STEP >= p.rest[0]) opts.push({ lever: 'rest', label: `−${REST_STEP}s rest`, target: { ...base, rest: base.rest - REST_STEP } });
  return { opts, capped: false };
}

const nextLever = (after, available) => {
  const start = after ? LEVER_ORDER.indexOf(after) + 1 : 0;
  for (let k = 0; k < LEVER_ORDER.length; k++) {
    const l = LEVER_ORDER[(start + k) % LEVER_ORDER.length];
    if (available.includes(l)) return l;
  }
  return available[0];
};

// Which step to pre-select, and why.
export function suggest(item) {
  const p = currentPhase();
  const { opts, capped } = stepOptions(item);
  if (!opts.length)
    return { opts, lever: null, note: `You’ve reached ${p.reps[1]} reps, the top of the ${p.name.toLowerCase()} range. Add weight (a vest or belt) in the routine editor, or swap to a harder variation.` };
  const available = opts.map((o) => o.lever);
  const retry = item.missed >= 1 ? 'Not quite last time, so same target again.' : '';
  if (capped)
    return { opts, lever: 'weight', note: retry || `You hit ${item.reps} reps on every set, the top of the ${p.name.toLowerCase()} range, so the weight goes up.` };
  if (item.missed === 1 && available.includes(item.pendingLever)) return { opts, lever: item.pendingLever, note: retry };
  if (item.missed >= 2)
    return { opts, lever: nextLever(item.pendingLever, available), note: 'Two misses in a row, so trying a different kind of step.' };
  return { opts, lever: nextLever(item.lever, available), note: '' };
}

const EPS = 0.01;

// Did the logged sets meet the target? Extra sets are fine.
export function hitTarget(target, sets) {
  const good = sets.filter((s) => s.done && s.r >= target.reps && (target.w == null || (s.w || 0) >= target.w - EPS));
  return good.length >= target.sets;
}

// Update a routine item after a workout. Returns an outcome for the summary,
// or null if the exercise wasn't done at all.
export function applyResult(item, plan, sets) {
  const done = sets.filter((s) => s.done && s.r);
  if (!done.length) return null;

  if (plan.calibrate) {
    const allWeighted = done.every((s) => s.w);
    Object.assign(item, {
      sets: done.length,
      reps: Math.min(...done.map((s) => s.r)),
      w: allWeighted ? Math.min(...done.map((s) => s.w)) : null,
      ready: true,
      lever: null,
      pendingLever: null,
      missed: 0,
    });
    fitItem(item); // keep the starting point inside the phase ranges
    return { kind: 'calibrated', target: { sets: item.sets, reps: item.reps, w: item.w, rest: item.rest } };
  }

  if (hitTarget(plan.target, sets)) {
    Object.assign(item, plan.target, { ready: true, lever: plan.lever, pendingLever: null, missed: 0 });
    return { kind: 'hit', lever: plan.lever, label: plan.label, target: plan.target };
  }
  item.pendingLever = plan.lever;
  item.missed = (item.missed || 0) + 1;
  return { kind: 'missed', label: plan.label, target: plan.target };
}

export function describe(t) {
  return `${t.sets} × ${t.reps}${t.w ? ` @ ${toDisp(t.w)} ${unit()}` : ''}, ${t.rest}s rest`;
}
