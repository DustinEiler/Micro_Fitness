// Levels and XP. Everything is worked out from workout history, so it always
// matches what you've logged, and older workouts count too.
//
// Each workout an exercise is in earns:
//   +5   showing up
//   +10  a tiny step: one more rep, or a shorter rest
//   +15  a tiny step: more weight
//   +25  a new best (estimated one-rep max, or most reps for bodyweight moves)
// Workouts saved before steps were recorded earn +10 when they beat the
// previous session, instead of a step.
// Each level needs a little more XP than the last, like a game.

import { S } from './state.js';
import { setScore } from './format.js';
import { exById } from './queries.js';
import { GROUPS } from './data.js';

export const XP = { show: 5, reps: 10, rest: 10, weight: 15, improve: 10, best: 25 };

// XP needed to go from level n to n + 1.
const CURVES = {
  exercise: (n) => 50 + 25 * (n - 1),
  group: (n) => 100 + 50 * (n - 1),
  overall: (n) => 200 + 100 * (n - 1),
};

export function levelFor(xp, kind = 'exercise') {
  const need = CURVES[kind];
  let level = 1;
  let floor = 0;
  while (xp >= floor + need(level)) {
    floor += need(level);
    level++;
  }
  const span = need(level);
  return { level, xp, into: xp - floor, span, toNext: floor + span - xp, pct: (xp - floor) / span };
}

// Titles for the overall level, every five levels.
const TITLES = ['Rookie', 'Regular', 'Committed', 'Strong', 'Seasoned', 'Iron', 'Steel', 'Elite', 'Legend'];
export const titleFor = (level) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 5))];

const STEP_LABEL = { reps: '+1 rep', rest: 'Shorter rest', weight: 'More weight' };

/* ---------- Per exercise ---------- */

// Every exercise with history: XP, level, events, best and starting scores.
// before: only count workouts that started before this time.
export function exerciseStats(before = Infinity) {
  const map = new Map();
  for (const w of S.workouts) {
    if (w.startedAt >= before) continue;
    const seen = new Map();
    for (const e of w.entries) {
      const cur = seen.get(e.exerciseId) || { sets: [], step: null };
      cur.sets.push(...e.sets);
      if (e.step) cur.step = e.step;
      seen.set(e.exerciseId, cur);
    }
    for (const [id, { sets, step }] of seen) {
      const score = Math.max(0, ...sets.map(setScore));
      const st = map.get(id) || { id, xp: 0, events: [], sessions: 0, first: 0, best: 0, last: 0, levelUps: [] };
      const events = [{ pts: XP.show, why: 'Showed up' }];
      if (step?.kind === 'hit') events.push({ pts: XP[step.lever] || XP.reps, why: STEP_LABEL[step.lever] || 'Tiny step' });
      else if (!step && st.sessions && score > st.last) events.push({ pts: XP.improve, why: 'Beat last time' });
      if (st.sessions && st.best > 0 && score > st.best) events.push({ pts: XP.best, why: 'New best' });
      const lvBefore = levelFor(st.xp).level;
      const pts = events.reduce((t, x) => t + x.pts, 0);
      st.xp += pts;
      const after = levelFor(st.xp).level;
      if (after > lvBefore) st.levelUps.push({ t: w.startedAt, level: after });
      st.events.push({ t: w.startedAt, pts, items: events });
      if (!st.sessions) st.first = score;
      st.best = Math.max(st.best, score);
      st.last = score;
      st.sessions++;
      map.set(id, st);
    }
  }
  for (const st of map.values()) {
    const ex = exById(st.id);
    Object.assign(st, levelFor(st.xp), {
      name: ex.name,
      group: ex.group || 'other',
      bodyweight: !sessionsHadWeight(st.id, before),
      gain: st.first ? (st.best / st.first - 1) * 100 : 0,
    });
  }
  return map;
}

function sessionsHadWeight(id, before) {
  for (const w of S.workouts) if (w.startedAt < before) for (const e of w.entries) if (e.exerciseId === id && e.sets.some((s) => s.w)) return true;
  return false;
}

/* ---------- Groups and overall ---------- */

export function allLevels(before = Infinity) {
  const exercises = [...exerciseStats(before).values()];
  const byGroup = new Map();
  for (const st of exercises) byGroup.set(st.group, (byGroup.get(st.group) || 0) + st.xp);
  const groups = [...byGroup]
    .map(([group, xp]) => ({ group, name: GROUPS[group] || 'Other', ...levelFor(xp, 'group') }))
    .sort((a, b) => b.xp - a.xp);
  const total = exercises.reduce((t, st) => t + st.xp, 0);
  const overall = { ...levelFor(total, 'overall') };
  overall.title = titleFor(overall.level);
  const levelUps = exercises
    .flatMap((st) => st.levelUps.map((u) => ({ ...u, name: st.name, id: st.id })))
    .sort((a, b) => b.t - a.t);
  return { overall, groups, exercises: exercises.sort((a, b) => b.xp - a.xp), levelUps };
}

// What a workout earned: XP and any level-ups (exercise, group, overall).
export function workoutGains(w) {
  const before = allLevels(w.startedAt);
  const after = allLevels(w.startedAt + 1);
  const ups = [];
  const prevEx = new Map(before.exercises.map((x) => [x.id, x.level]));
  for (const x of after.exercises) if (x.level > (prevEx.get(x.id) || 1) || (!prevEx.has(x.id) && x.level > 1)) ups.push({ name: x.name, level: x.level });
  const prevGroup = new Map(before.groups.map((g) => [g.group, g.level]));
  for (const g of after.groups) if (g.level > (prevGroup.get(g.group) || 1)) ups.push({ name: g.name, level: g.level, group: true });
  return {
    xp: after.overall.xp - before.overall.xp,
    ups,
    overall: after.overall,
    overallUp: after.overall.level > before.overall.level,
  };
}
