// Training phases. Each lasts 13 weeks and sets the guardrails every routine
// target and tiny step must stay inside. S.phase = { id, startedAt, history: [] }.

import { S } from './state.js';
import { toDisp, fromDisp, e1rm } from './format.js';

export const PHASE_WEEKS = 13;
export const PHASE_ORDER = ['endurance', 'hypertrophy', 'strength', 'power'];

// reps/sets/rest are [min, max]; sets: null means no limit.
export const PHASES = {
  endurance: {
    name: 'Endurance',
    focus: 'Muscular endurance and conditioning. Lighter weight, more reps, short rest to keep the effort high.',
    reps: [15, 20],
    sets: null,
    rest: [30, 60],
  },
  hypertrophy: {
    name: 'Hypertrophy',
    focus: 'Muscle growth. Moderate-to-heavy weight in the middle rep range.',
    reps: [6, 12],
    sets: [3, 6],
    rest: [60, 90],
  },
  strength: {
    name: 'Maximum strength',
    focus: 'Heavy loads, above 85% of your one-rep max, to train your nervous system to recruit more muscle.',
    reps: [1, 5],
    sets: null,
    rest: [120, 180],
  },
  power: {
    name: 'Power',
    focus: 'Explosive, high-speed reps. Move the weight as fast as you can with good form.',
    reps: [1, 10],
    sets: null,
    rest: [120, 180],
  },
};

export const phaseId = () => (PHASES[S.phase?.id] ? S.phase.id : 'hypertrophy');
export const currentPhase = () => PHASES[phaseId()];
export const phaseWeek = () => Math.floor((Date.now() - (S.phase?.startedAt || Date.now())) / (7 * 864e5)) + 1;
export const phaseComplete = () => phaseWeek() > PHASE_WEEKS;
export const nextPhaseId = () => PHASE_ORDER[(PHASE_ORDER.indexOf(phaseId()) + 1) % PHASE_ORDER.length];

export function rangeText(p) {
  const parts = [`${p.reps[0]}–${p.reps[1]} reps`];
  if (p.sets) parts.push(`${p.sets[0]}–${p.sets[1]} sets`);
  parts.push(`${p.rest[0]}–${p.rest[1]}s rest`);
  return parts.join(', ');
}

export const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

/* ---------- Weight steps ---------- */

const KG_PER_LB = 0.45359237;
export const defaultStep = () => (S.units === 'lb' ? 5 * KG_PER_LB : 2.5);
export const stepFor = (item) => item.step || defaultStep();

// Round down to a whole number of steps, in the units the user sees.
export function roundDownToStep(kg, stepKg) {
  const s = toDisp(stepKg);
  return fromDisp(Math.max(s, Math.floor(toDisp(kg) / s + 1e-6) * s));
}

// Weight that gives the same estimated one-rep max at a different rep count.
export const weightForReps = (oneRm, reps) => (reps === 1 ? oneRm : oneRm / (1 + reps / 30));

/* ---------- Fitting targets into a phase ---------- */

// Move a routine item's target inside the phase ranges. If reps change,
// the weight is recalculated so the effort stays about the same.
export function fitItem(item, p = currentPhase()) {
  const reps = clamp(item.reps, p.reps);
  if (item.w && reps !== item.reps) item.w = roundDownToStep(weightForReps(e1rm(item.w, item.reps), reps), stepFor(item));
  item.reps = reps;
  if (p.sets) item.sets = clamp(item.sets, p.sets);
  item.rest = clamp(item.rest, p.rest);
  return item;
}

export function fitAllRoutines(p = currentPhase()) {
  for (const r of S.routines)
    for (const it of r.items) {
      fitItem(it, p);
      Object.assign(it, { lever: null, pendingLever: null, missed: 0 });
    }
}

export function startPhase(id) {
  const old = S.phase;
  const history = [...(old?.history || [])];
  if (old?.id) history.push({ id: old.id, startedAt: old.startedAt, endedAt: Date.now() });
  S.phase = { id, startedAt: Date.now(), history };
  fitAllRoutines(PHASES[id]);
}

// New, imported or upgraded data is flagged so its targets get fitted once.
export function ensureFitted() {
  if (!S.phaseFitPending) return;
  fitAllRoutines();
  S.phaseFitPending = false;
}
