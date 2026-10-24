// Turns the intro answers (a "profile") into a plan: a training phase,
// routines built from muscle groups with exercises ticked for each, a weekly
// schedule, and a SMART goal. Everything here is a plain function of the
// profile and the exercise list, so the test lab can check it.
//
// Guidelines behind the rules (see the intro research notes in CLAUDE.md):
// - 4–6 exercises a session, mixing compound and accessory moves (Freeform Fitness)
// - strength work at least 2 days a week, all major muscle groups (CDC)
// - beginners build a foundation before heavier phases
// - goals are specific, measurable, attainable, relevant and time-bound (ACE, YMCA)

import { S } from './state.js';
import { uid } from './store.js';
import { PHASES, restRange } from './phases.js';
import { newItem } from './progression.js';

/* ---------- Choices offered in the intro ---------- */

export const GOALS = {
  muscle: { label: 'Build muscle', help: 'Grow bigger, more defined muscles.', phase: 'hypertrophy' },
  strength: { label: 'Get stronger', help: 'Lift heavier weights.', phase: 'strength' },
  endurance: { label: 'Build endurance', help: 'Keep going for longer without tiring.', phase: 'endurance' },
  power: { label: 'Be more explosive', help: 'Jump higher, sprint and throw harder.', phase: 'power' },
  fat: { label: 'Lose fat and get fitter', help: 'Strength training plus activity on other days.', phase: 'hypertrophy' },
  health: { label: 'Stay healthy and move well', help: 'Feel good, stay mobile, keep up with life.', phase: 'endurance' },
};

export const WHYS = {
  energy: 'have more energy',
  stress: 'feel less stressed',
  strong: 'feel stronger day to day',
  look: 'look and feel better',
  health: 'look after my health',
  sport: 'perform better at my sport',
  family: 'keep up with family and friends',
};

export const ENJOY = {
  free: 'Free weights',
  machines: 'Machines',
  bodyweight: 'Bodyweight exercises',
  cardio: 'Running, cycling or swimming',
  classes: 'Classes or dancing',
  sports: 'Sports',
  yoga: 'Yoga or stretching',
};

export const MINUTES = { 30: '20 to 30 minutes', 45: '30 to 45 minutes', 60: '45 to 60 minutes', 90: '60 to 90 minutes' };

// Equipment each kind of place usually has (keys of EQUIPMENT in js/library.js).
export const PLACES = {
  gym: { label: 'A full gym', equip: ['barbell', 'dumbbell', 'kettlebell', 'bench', 'cable', 'machine', 'bar', 'band', 'suspension', 'small'] },
  home: { label: 'A home gym', equip: ['barbell', 'dumbbell', 'bench', 'bar', 'band'] },
  minimal: { label: 'A few things at home', equip: ['dumbbell', 'band'] },
  none: { label: 'No equipment', equip: [] },
};

export const EXPERIENCE = {
  new: { label: 'New to it', help: 'Never trained, or less than 6 months.' },
  some: { label: 'Some experience', help: '6 months to 2 years, on and off.' },
  experienced: { label: 'Experienced', help: 'Training regularly for 2 years or more.' },
};

export const BARRIERS = {
  time: 'Not enough time',
  motivation: 'Lost motivation',
  progress: 'Didn’t see progress',
  bored: 'Got bored',
  pain: 'Injury or pain',
  unsure: 'Didn’t know what to do',
  busy: 'Life got busy or I travelled',
};

export const AREAS = {
  shoulders: 'Shoulders',
  back: 'Lower back',
  knees: 'Knees',
  elbows: 'Elbows or wrists',
  hips: 'Hips',
  neck: 'Neck',
};

export const SLEEP = { low: 'Less than 6 hours', some: '6 to 7 hours', good: '7 to 9 hours', lots: 'More than 9 hours' };

export const TIMEFRAMES = { 4: '4 weeks', 13: '3 months', 26: '6 months' };

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export const defaultProfile = () => ({
  goal: null, why: [], whyText: '', enjoy: [],
  days: [], minutes: 45, place: null, equip: [],
  experience: null, barriers: [], injuries: [],
  health: null, sleep: null,
  weeks: 13, liftId: null, pct: null,
});

/* ---------- Phase ---------- */

// Beginners start with a foundation phase before heavy or explosive work.
export function phaseFor(p) {
  const goal = GOALS[p.goal] || GOALS.muscle;
  const careful = p.experience === 'new' || p.health === 'yes' || p.health === 'unsure';
  if (careful && (goal.phase === 'strength' || goal.phase === 'power')) return { id: 'hypertrophy', foundation: true, target: goal.phase };
  return { id: goal.phase, foundation: false, target: goal.phase };
}

export const isBeginner = (p) => p.experience === 'new' || p.health === 'yes' || p.health === 'unsure';

/* ---------- Injuries: the riskiest moves for each area ---------- */

// Not a diagnosis: just the moves most likely to aggravate each area, switched
// off to start with. The person can switch any of them back on.
export const INJURY_RISK = {
  shoulders: ['behind-neck-press', 'snatch-bnp', 'upright-row', 'dips', 'ring-dip', 'bench-dip', 'handstand-push-up', 'wall-walk', 'muscle-up', 'ring-muscle-up', 'banded-muscle-up', 'jumping-muscle-up', 'snatch', 'power-snatch', 'hang-snatch', 'hang-power-snatch', 'block-snatch', 'jerk', 'power-jerk', 'split-jerk', 'squat-jerk', 'clean-jerk', 'kb-snatch'],
  back: ['deadlift', 'sumo-deadlift', 'deficit-deadlift', 'snatch-deadlift', 'pause-deadlift', 'rack-pull', 'stiff-leg-dl', 'good-morning', 'jefferson-curl', 'row', 'pendlay-row', 'tbar-row', 'kroc-row', 'zercher', 'power-clean', 'hang-power-clean', 'clean', 'hang-clean', 'block-clean', 'snatch', 'power-snatch', 'hang-snatch', 'block-snatch', 'ground-overhead', 'barbell-jammer', 'bb-rollout', 'dragon-flag', 'kb-windmill'],
  knees: ['jump-squat', 'jumping-lunge', 'jump-reach', 'lateral-bound', 'box-jump', 'depth-jump', 'alt-push-off', 'bosu-squat-jump', 'pistol-squat', 'reverse-nordic', 'curtsy-lunge', 'cossack', 'split-jerk', 'squat-jerk'],
  elbows: ['skull', 'db-skull', 'incline-skull', 'smith-skull', 'bb-oh-ext', 'tate-press', 'front-squat', 'power-clean', 'hang-power-clean', 'clean', 'hang-clean', 'block-clean', 'wrist-curl', 'btb-wrist-curl', 'wrist-roller', 'handstand-push-up'],
  hips: ['cossack', 'sumo-deadlift', 'curtsy-lunge', 'pistol-squat', 'kb-windmill', 'lateral-bound', 'depth-jump'],
  neck: ['neck-curl', 'neck-ext', 'behind-neck-press', 'snatch-bnp', 'handstand-push-up'],
};

export const riskyIds = (p) => [...new Set((p.injuries || []).flatMap((a) => INJURY_RISK[a] || []))];

/* ---------- Which exercises fit ---------- */

export function canDo(ex, p, risky = riskyIds(p)) {
  if (ex.off) return false;
  if (risky.includes(ex.id)) return false;
  if (isBeginner(p) && ex.advanced) return false;
  const owned = new Set(p.equip || []);
  return (ex.equip || []).every((q) => owned.has(q));
}

// Higher scores are ticked first: common moves, what the person enjoys, and
// explosive moves in the power phase.
function score(ex, p, phaseId) {
  let s = ex.common ? 4 : 0;
  const eq = ex.equip || [];
  const enjoy = new Set(p.enjoy || []);
  if (enjoy.has('machines') && eq.some((q) => q === 'machine' || q === 'cable')) s += 2;
  if (enjoy.has('free') && eq.some((q) => q === 'barbell' || q === 'dumbbell' || q === 'kettlebell')) s += 2;
  if (enjoy.has('bodyweight') && (!eq.length || eq.includes('suspension') || eq.includes('bar'))) s += 2;
  if (phaseId === 'power' && ex.explosive) s += 5;
  if (phaseId !== 'power' && ex.explosive) s -= 2;
  return s;
}

export function candidatesFor(group, p, phaseId) {
  const risky = riskyIds(p);
  return S.exercises
    .map((ex, k) => ({ ex, k }))
    .filter(({ ex }) => ex.group === group && canDo(ex, p, risky))
    .sort((a, b) => score(b.ex, p, phaseId) - score(a.ex, p, phaseId) || a.k - b.k)
    .map(({ ex }) => ex);
}

/* ---------- Session length ---------- */

// Rough minutes for one exercise: each set takes about 45 seconds plus rest,
// and about a minute to set up.
function slotMinutes(phaseId, sets, beginner) {
  let [lo, hi] = PHASES[phaseId].rest;
  if (beginner) lo = Math.max(lo, 60);
  const rest = (Math.max(lo, hi) + lo) / 2;
  return (sets * (45 + rest) + 60) / 60;
}

// How many exercises fit in a session, after a 5-minute warm-up. Between 3 and 7.
export function slotsFor(minutes, phaseId, beginner) {
  const sets = PHASES[phaseId].sets ? PHASES[phaseId].sets[0] : 3;
  const n = Math.floor((minutes - 5) / slotMinutes(phaseId, sets, beginner));
  return Math.min(7, Math.max(3, n));
}

export function estimateMinutes(routine, phaseId, beginner) {
  const prev = S.experience;
  S.experience = beginner ? 'beginner' : 'experienced';
  let sec = 5 * 60;
  for (const { group, count } of routine.groups) {
    const it = routine.items.find((x) => x.picked && S.exercises.find((e) => e.id === x.exerciseId)?.group === group);
    const rest = it ? it.rest : restRange({ exerciseId: '' }, PHASES[phaseId])[0];
    const sets = it ? it.sets : 3;
    sec += count * (sets * (45 + rest) + 60);
  }
  S.experience = prev;
  return Math.round(sec / 60 / 5) * 5;
}

/* ---------- Splits ---------- */

// Each template is a sequence of muscle groups; a routine with n exercises
// takes the first n slots (repeats add to that group's count).
const TEMPLATES = {
  full: ['legs', 'chest', 'back', 'shoulders', 'glutes', 'core', 'biceps', 'triceps', 'calves'],
  upper: ['chest', 'back', 'shoulders', 'triceps', 'biceps', 'chest', 'back'],
  lower: ['legs', 'glutes', 'legs', 'core', 'calves', 'glutes', 'legs'],
  push: ['chest', 'shoulders', 'triceps', 'chest', 'shoulders', 'triceps', 'chest'],
  pull: ['back', 'biceps', 'back', 'shoulders', 'back', 'biceps', 'forearms'],
  legs: ['legs', 'glutes', 'legs', 'calves', 'core', 'legs', 'glutes'],
};
const NAMES = { full: 'Full body', upper: 'Upper body', lower: 'Lower body', push: 'Push', pull: 'Pull', legs: 'Legs' };

export function splitFor(p) {
  const n = Math.min(6, (p.days || []).length || 3);
  const fullBodyFirst = isBeginner(p) || p.goal === 'fat' || p.goal === 'health' || p.goal === 'endurance';
  const plans = {
    1: ['full'],
    2: ['full', 'full'],
    3: fullBodyFirst ? ['full', 'full', 'full'] : ['push', 'pull', 'legs'],
    4: ['upper', 'lower', 'upper', 'lower'],
    5: ['push', 'pull', 'legs', 'upper', 'lower'],
    6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  };
  return plans[n];
}

// Turns a template into [{ group, count }], skipping groups with nothing available.
function groupsFor(template, slots, available, power) {
  const seq = [...(power && available('olympic') ? ['olympic'] : []), ...TEMPLATES[template]];
  const groups = [];
  let filled = 0;
  for (let pass = 0; pass < 3 && filled < slots; pass++)
    for (const g of seq) {
      if (filled >= slots) break;
      if (g === 'olympic' && pass > 0) continue;
      const have = available(g);
      const cur = groups.find((x) => x.group === g);
      if (!have || (cur && cur.count >= have)) continue;
      if (cur) cur.count++;
      else groups.push({ group: g, count: 1 });
      filled++;
    }
  return groups;
}

/* ---------- The plan ---------- */

export function buildPlan(p) {
  const phase = phaseFor(p);
  const beginner = isBeginner(p);
  const slots = slotsFor(p.minutes || 45, phase.id, beginner);
  const power = phase.id === 'power';
  const cache = {};
  const cands = (g) => (cache[g] ??= candidatesFor(g, p, phase.id));
  const available = (g) => cands(g).length;

  const split = splitFor(p);
  const seen = {};
  const prev = S.experience;
  S.experience = beginner ? 'beginner' : 'experienced';
  const savedPhase = S.phase;
  S.phase = { ...(S.phase || {}), id: phase.id }; // so targets fit the new phase

  const minutes = p.minutes || 45;
  const build = (template, variant, n) => {
    const groups = groupsFor(template, n, available, power);
    const items = [];
    for (const [gi, { group, count: c }] of groups.entries()) {
      const list = cands(group);
      const want = Math.min(list.length, phase.id === 'strength' || power ? c + 1 : c + 2);
      // Each variant (A, B, C) starts further down the list, for variety.
      const start = list.length > want ? (variant * want) % list.length : 0;
      for (let k = 0; k < want; k++) {
        const ex = list[(start + k) % list.length];
        if (items.some((it) => it.exerciseId === ex.id)) continue;
        const it = { ...newItem(ex.id), picked: true };
        // Strength and power: keep the main lift in every workout.
        if ((phase.id === 'strength' || power) && gi === 0 && k === 0 && ex.kind !== 'isolation') it.always = true;
        items.push(it);
      }
    }
    return { groups, items };
  };

  const routines = split.map((template) => {
    const variant = (seen[template] = (seen[template] ?? -1) + 1);
    const count = split.filter((t) => t === template).length;
    const name = count > 1 ? `${NAMES[template]} ${'ABC'[variant]}` : NAMES[template];
    // Start from the estimate, then add or drop exercises until it fits the time.
    let n = Math.min(7, slots + 2);
    let r = build(template, variant, n);
    const est = () => estimateMinutes(r, phase.id, beginner);
    while (n > 3 && est() > minutes) r = build(template, variant, --n);
    // Still too long (heavy lifting rests a lot): start rests at the short end of their range.
    if (est() > minutes) for (const it of r.items) it.rest = restRange(it, PHASES[phase.id])[0];
    // Time to spare: an extra set on the big lifts, within the phase's range.
    const maxSets = Math.min(5, PHASES[phase.id].sets ? PHASES[phase.id].sets[1] : 5);
    const compound = r.items.filter((it) => S.exercises.find((e) => e.id === it.exerciseId)?.kind !== 'isolation');
    while (compound.length && compound[0].sets < maxSets && est() < minutes - 12) {
      compound.forEach((it) => it.sets++);
      if (est() > minutes) {
        compound.forEach((it) => it.sets--);
        break;
      }
    }
    return { id: uid(), name, groups: r.groups, items: r.items, planned: true };
  });

  S.experience = prev;
  S.phase = savedPhase;
  const risky = riskyIds(p).filter((id) => S.exercises.some((e) => e.id === id && !e.off));
  const longest = Math.max(...routines.map((r) => estimateMinutes(r, phase.id, beginner)));
  const overTime = longest > minutes + 5 ? longest : 0;
  return { phase, beginner, slots, routines, risky, overTime, days: [...(p.days || [])].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)) };
}

/* ---------- SMART goal ---------- */

// Realistic improvement in a lift's estimated max (or reps, for bodyweight
// moves) for the timeframe. Beginners improve fastest.
const RECOMMENDED = { new: { 4: 10, 13: 20, 26: 30 }, some: { 4: 5, 13: 10, 26: 15 }, experienced: { 4: 2.5, 13: 5, 26: 10 } };
export const recommendedPct = (experience, weeks) => (RECOMMENDED[experience] || RECOMMENDED.some)[weeks] ?? 10;
export const PCT_OPTIONS = [2.5, 5, 10, 15, 20, 25, 30];
export const isAmbitious = (pct, experience, weeks) => pct > recommendedPct(experience, weeks) * 1.5;

// Lifts that make a good measurable target: compound moves in the plan.
export function liftChoices(plan) {
  const ids = [];
  for (const r of plan.routines) for (const it of r.items) if (!ids.includes(it.exerciseId)) ids.push(it.exerciseId);
  const exs = ids.map((id) => S.exercises.find((e) => e.id === id)).filter(Boolean);
  const compound = exs.filter((e) => e.kind !== 'isolation' && e.group !== 'olympic');
  return (compound.length ? compound : exs).slice(0, 12);
}

export const workoutsTarget = (days, weeks) => days * weeks;

const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function goalStatement(p, endsAt, liftName, bodyweight) {
  const days = [...p.days].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)).map((d) => DAY_NAMES[d]);
  const date = new Date(endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  const lift = liftName
    ? bodyweight
      ? ` and do ${p.pct}% more ${liftName.toLowerCase()} reps in a set`
      : ` and raise my ${liftName.toLowerCase()} by ${p.pct}%`
    : '';
  const why = (p.why || []).map((w) => WHYS[w]).filter(Boolean);
  return `Train ${days.length} time${days.length === 1 ? '' : 's'} a week (${listJoin(days)})${lift} by ${date}${why.length ? `, so I can ${listJoin(why.slice(0, 2))}` : ''}.`;
}

/* ---------- Tips from the answers ---------- */

export function tipsFor(p, plan) {
  const t = [];
  const phase = PHASES[plan.phase.id];
  if (p.health === 'yes' || p.health === 'unsure')
    t.push('Check with your doctor before you start, especially before lifting heavy. Your plan starts gently, with longer rests.');
  if (plan.overTime)
    t.push(`Heavy lifting needs long rests, so these sessions take about ${plan.overTime} minutes, longer than you picked. If that’s too long, go back and choose a longer session or a different goal.`);
  if (plan.phase.foundation)
    t.push(`You’re starting with ${phase.name.toLowerCase()} to build a foundation. After 13 weeks the app will suggest moving toward ${PHASES[plan.phase.target].name.toLowerCase()}.`);
  if (plan.risky.length)
    t.push(`${plan.risky.length} exercises that are hardest on your ${listJoin((p.injuries || []).map((a) => AREAS[a].toLowerCase()))} are switched off. This isn’t a diagnosis: stop anything that hurts, and see a doctor or physio about pain that doesn’t go away.`);
  const other = (p.enjoy || []).filter((e) => ['cardio', 'classes', 'sports', 'yoga'].includes(e)).map((e) => ENJOY[e].toLowerCase());
  if (other.length) t.push(`Keep up ${listJoin(other)} on other days. Adults need about 150 minutes of moderate activity a week, plus strength work at least twice a week.`);
  else if (p.goal === 'fat' || p.goal === 'health' || p.goal === 'endurance')
    t.push('Add walks or other activity on rest days. Adults need about 150 minutes of moderate activity a week, plus strength work at least twice a week.');
  if (p.goal === 'fat') t.push('Food matters as much as training for fat loss. A dietitian can help with a plan that suits you.');
  const b = new Set(p.barriers || []);
  if (b.has('time')) t.push('Sessions are planned to fit your time. A short workout still counts.');
  if (b.has('motivation')) t.push('Your reason for training is on the Train screen. Telling someone about your goal helps too.');
  if (b.has('progress')) t.push('Every workout moves you one tiny step forward, and Progress shows each one. Compare yourself only to your own past numbers.');
  if (b.has('bored')) t.push('Exercises rotate each workout, so things stay fresh.');
  if (b.has('unsure')) t.push('Each day tells you exactly what to do: exercises, sets, reps, weight and rest.');
  if (b.has('busy')) t.push('Missing a workout doesn’t break the plan. Pick up with the next one: consistency beats perfection.');
  if (p.sleep === 'low' || p.sleep === 'some') t.push('Aim for at least 7 hours of sleep. Recovery is when you actually get stronger.');
  if ((p.days || []).length >= 5 && isBeginner(p)) t.push('That’s a lot of days for a start. If it feels like too much, drop to 3 in Settings: you’ll still make progress.');
  return t;
}
