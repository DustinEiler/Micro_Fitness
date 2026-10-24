// Saving a plan from the intro, and tracking the SMART goal.
// S.profile: the intro answers (stays on this device).
// S.plan  = { order: [routine ids], days: [weekday numbers, 0 = Sunday] }
// S.goal  = { startedAt, endsAt, weeks, workoutsTarget, liftId, pct, statement, whyText }

import { S } from './state.js';
import { setScore } from './format.js';
import { exById } from './queries.js';
import { startPhase } from './phases.js';
import { workoutsTarget, goalStatement, DAY_NAMES, isBeginner } from './planner.js';

const DAY = 864e5;

const isBodyweightEx = (ex) => !(ex?.equip || []).some((q) => ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine'].includes(q));

export function makeGoal(p, startedAt = Date.now()) {
  const endsAt = startedAt + p.weeks * 7 * DAY;
  const ex = p.liftId ? exById(p.liftId) : null;
  return {
    startedAt,
    endsAt,
    weeks: p.weeks,
    workoutsTarget: workoutsTarget(p.days.length, p.weeks),
    liftId: p.liftId || null,
    pct: p.liftId ? p.pct : null,
    statement: goalStatement(p, endsAt, ex?.name, isBodyweightEx(ex)),
    whyText: (p.whyText || '').trim(),
  };
}

// Saves everything the intro decided. replace: swap out existing routines.
export function applyPlan(p, plan, { replace = true } = {}) {
  S.profile = { ...p, autoOff: plan.risky };
  S.experience = isBeginner(p) ? 'beginner' : 'experienced';
  S.weeklyGoal = Math.max(1, p.days.length);
  for (const id of plan.risky) {
    const ex = S.exercises.find((e) => e.id === id);
    if (ex) ex.off = true;
  }
  S.routines = replace ? plan.routines : [...S.routines, ...plan.routines];
  S.plan = { order: plan.routines.map((r) => r.id), days: plan.days };
  startPhase(plan.phase.id); // starts the 13-week clock and fits every target
  S.goal = makeGoal(p);
  S.onboarding = 'done';
}

export function applyGoalOnly(p) {
  S.profile = { ...S.profile, ...p };
  S.weeklyGoal = Math.max(1, p.days.length);
  if (S.plan) S.plan.days = [...p.days];
  S.goal = makeGoal(p);
}

/* ---------- Progress ---------- */

function bestIn(workouts, exId) {
  let best = 0;
  for (const w of workouts) for (const e of w.entries) if (e.exerciseId === exId) for (const s of e.sets) best = Math.max(best, setScore(s));
  return best;
}

export function goalProgress(now = Date.now()) {
  const g = S.goal;
  if (!g) return null;
  const during = S.workouts.filter((w) => w.startedAt >= g.startedAt && w.startedAt <= g.endsAt);
  const out = {
    workouts: during.length,
    target: g.workoutsTarget,
    daysLeft: Math.max(0, Math.ceil((g.endsAt - now) / DAY)),
    ended: now > g.endsAt,
    lift: null,
  };
  if (g.liftId) {
    const ex = exById(g.liftId);
    // Baseline: the last session before the goal started, or else the first one after.
    const before = S.workouts.filter((w) => w.startedAt < g.startedAt && w.entries.some((e) => e.exerciseId === g.liftId));
    const first = during.find((w) => w.entries.some((e) => e.exerciseId === g.liftId));
    const baseFrom = before.length ? [before[before.length - 1]] : first ? [first] : [];
    const base = bestIn(baseFrom, g.liftId);
    const best = bestIn(during, g.liftId);
    out.lift = {
      name: ex.name,
      bodyweight: isBodyweightEx(ex),
      base,
      best,
      gained: base ? Math.max(0, (best / base - 1) * 100) : 0,
      target: g.pct,
      started: base > 0,
    };
  }
  return out;
}

/* ---------- Schedule ---------- */

// The planned routine that comes after the last one you did.
export function nextRoutine() {
  const order = (S.plan?.order || []).filter((id) => S.routines.some((r) => r.id === id));
  if (!order.length) return null;
  const last = [...S.workouts].reverse().find((w) => order.includes(w.routineId));
  const id = last ? order[(order.indexOf(last.routineId) + 1) % order.length] : order[0];
  return S.routines.find((r) => r.id === id);
}

export function todayLine(now = new Date()) {
  const days = S.plan?.days || [];
  if (!days.length) return '';
  const next = nextRoutine();
  if (days.includes(now.getDay())) return next ? `Today is a training day: ${next.name}.` : 'Today is a training day.';
  for (let k = 1; k <= 7; k++) {
    const d = (now.getDay() + k) % 7;
    if (days.includes(d)) return `Rest day today. Next up${next ? `: ${next.name}` : ''} on ${k === 1 ? 'tomorrow' : DAY_NAMES[d]}.`.replace('on tomorrow', 'tomorrow');
  }
  return '';
}
