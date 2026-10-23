// Tiny-step progression: each workout, every routine exercise moves one small
// step beyond its last successful target, by exactly one "lever":
//   reps:   +1 rep on every set
//   weight: +one weight step (default 2.5 kg / 5 lb)
//   rest:   −5 seconds between sets
//
// Routine item (in S.routines[].items):
//   { exerciseId, sets, reps, w (kg or null for bodyweight), rest (seconds),
//     step (kg, optional), ready, lever, pendingLever, missed }
// ready=false means no baseline yet: the next session calibrates it.
// lever: last lever that succeeded. pendingLever/missed: the lever being
// retried after a miss, and how many misses in a row.

import { S } from './state.js';
import { toDisp, unit } from './format.js';

export const LEVER_ORDER = ['reps', 'weight', 'rest'];
export const MIN_REST = 30;
export const REST_STEP = 5;
export const MAX_REPS = 30;
const KG_PER_LB = 0.45359237;

export const defaultStep = () => (S.units === 'lb' ? 5 * KG_PER_LB : 2.5);
export const stepFor = (item) => item.step || defaultStep();

export const newItem = (exerciseId, rest = 60) => ({ exerciseId, sets: 3, reps: 10, w: null, rest, ready: false, missed: 0 });

// The tiny steps available from an item's baseline.
export function stepOptions(item) {
  const base = { sets: item.sets, reps: item.reps, w: item.w, rest: item.rest };
  const opts = [];
  if (item.reps < MAX_REPS) opts.push({ lever: 'reps', label: '+1 rep', target: { ...base, reps: base.reps + 1 } });
  if (item.w) {
    const step = stepFor(item);
    opts.push({ lever: 'weight', label: `+${toDisp(step)} ${unit()}`, target: { ...base, w: base.w + step } });
  }
  if (item.rest - REST_STEP >= MIN_REST) opts.push({ lever: 'rest', label: `−${REST_STEP}s rest`, target: { ...base, rest: base.rest - REST_STEP } });
  return opts;
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
  const opts = stepOptions(item);
  if (!opts.length) return { opts, lever: null, note: 'This one’s maxed out. Edit the routine to set a new target.' };
  const available = opts.map((o) => o.lever);
  if (item.missed === 1 && available.includes(item.pendingLever))
    return { opts, lever: item.pendingLever, note: 'Not quite last time, so same target again.' };
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
