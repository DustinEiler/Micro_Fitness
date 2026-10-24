// Test lab: runs the app in a phone-sized frame on your computer, with tools
// for test data, time travel and a set of built-in checks. It only works on
// your own computer (localhost), never on the live site, so it can't touch
// the workouts on your phone.
//
// The checks and sample data use the app's own modules in this page. They
// never save through the app; the lab writes test data straight to storage
// and reloads the frame.

import { S, setState } from '../js/state.js';
import { freshState, parseBackup, STORAGE_KEY, uid } from '../js/store.js';
import { toDisp, fromDisp } from '../js/format.js';
import { newItem, suggest, applyResult } from '../js/progression.js';
import { PHASES, ensureFitted, fitItem, restRange, PHASE_WEEKS } from '../js/phases.js';
import { itemsForToday } from '../js/rotation.js';
import { defaultProfile, buildPlan, PLACES, estimateMinutes, recommendedPct, isAmbitious, INJURY_RISK } from '../js/planner.js';
import { applyPlan, nextRoutine, goalProgress } from '../js/goal.js';
import { exerciseStats, levelFor, workoutGains, allLevels, XP } from '../js/levels.js';
import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, EQUIPMENT, GROUPS } from '../js/data.js';

const $ = (sel) => document.querySelector(sel);
const DAY = 864e5;

/* ---------- Local only ---------- */

const host = location.hostname;
const isLocal =
  ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) ||
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
  host.endsWith('.local');

if (!isLocal) {
  document.body.innerHTML = `<main class="blocked"><h1>Test lab</h1>
    <p>The test lab only runs on your computer, so it can never change the workouts on your phone.</p>
    <p>On your Mac, double-click <strong>Start Micro Fitness</strong> in the Micro_Fitness folder.</p>
    <p><a href="../">Open the app</a></p></main>`;
  throw new Error('Test lab is local only');
}

/* ---------- The phone frame ---------- */

// Sizes in CSS pixels (what the browser sees), from each phone's screen
// divided by its pixel density.
const DEVICES = {
  s22u: [384, 824], s24u: [384, 824], s23: [360, 780], s20u: [412, 915], a51: [412, 914], fold: [344, 882],
  pixel7: [412, 915],
  se: [375, 667], i13: [390, 844], i16: [393, 852], i14max: [430, 932], i16max: [440, 956],
};

const frame = $('#app');
const shell = $('#phone');
const APP_URL = '../index.html';
const PREFS_KEY = 'micro-fitness.lab-screen';
let rotated = false;

// Remember the chosen size between visits.
try {
  const p = JSON.parse(localStorage.getItem(PREFS_KEY));
  if (p?.device && (DEVICES[p.device] || p.device === 'custom')) $('#device').value = p.device;
  if (p?.w) $('#custom-w').value = p.w;
  if (p?.h) $('#custom-h').value = p.h;
  rotated = !!p?.rotated;
} catch { /* first visit */ }

function sizeFrame() {
  const key = $('#device').value;
  const custom = key === 'custom';
  $('#custom-w-f').hidden = $('#custom-h-f').hidden = !custom;
  let [w, h] = custom
    ? [Math.min(1200, Math.max(280, Number($('#custom-w').value) || 384)), Math.min(1400, Math.max(400, Number($('#custom-h').value) || 824))]
    : DEVICES[key] || DEVICES.s22u;
  if (rotated) [w, h] = [h, w];
  $('#btn-rotate').setAttribute('aria-pressed', String(rotated));
  shell.style.setProperty('--w', `${w}px`);
  shell.style.setProperty('--h', `${h}px`);
  const roomH = window.innerHeight - 48;
  const roomW = window.innerWidth > 900 ? window.innerWidth - 420 : window.innerWidth - 32;
  const scale = Math.min(1, roomH / (h + 28), roomW / (w + 28));
  shell.style.setProperty('--scale', scale.toFixed(3));
  $('#scale-note').textContent = `${w} × ${h}${rotated ? ', sideways' : ''}${scale < 1 ? `, shown at ${Math.round(scale * 100)}% to fit your screen` : ''}.`;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ device: key, w: $('#custom-w').value, h: $('#custom-h').value, rotated }));
  } catch { /* not saved */ }
}
$('#custom-w').addEventListener('input', sizeFrame);
$('#custom-h').addEventListener('input', sizeFrame);
$('#btn-rotate').addEventListener('click', () => {
  rotated = !rotated;
  sizeFrame();
});
$('#device').addEventListener('change', sizeFrame);
window.addEventListener('resize', sizeFrame);
sizeFrame();

// Load the frame blank first, so the app saves and closes before test data is written.
function blankFrame() {
  return new Promise((resolve) => {
    frame.addEventListener('load', resolve, { once: true });
    frame.src = 'about:blank';
  });
}
async function writeAndReload(data) {
  await blankFrame();
  if (data === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  frame.src = APP_URL;
}

/* ---------- Status line ---------- */

let statusTimer;
function status(msg) {
  const el = $('#status');
  el.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (el.textContent = ''), 5000);
}

/* ---------- Test data ---------- */

const savedData = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

// A fresh state with routine targets already fitted to the phase.
function fresh(units = 'kg') {
  const st = freshState();
  st.units = units;
  setState(st);
  ensureFitted();
  return S;
}

// Rough starting weights (kg) for sample history. Bodyweight moves have none.
const START = {
  bench: 60, 'incline-bench': 50, 'incline-db': 22, 'db-bench': 24, 'machine-press': 50, 'cable-fly': 12, 'pec-deck': 35,
  deadlift: 100, row: 60, 'tbar-row': 40, 'db-row': 26, 'lat-pulldown': 50, 'cable-row': 50, 'straight-arm': 20,
  ohp: 40, 'db-shoulder': 18, arnold: 14, 'lateral-raise': 8, 'cable-lateral': 6, 'face-pull': 20, 'rear-delt': 8,
  curl: 30, 'db-curl': 12, 'hammer-curl': 12, preacher: 25, 'cable-curl': 20,
  pushdown: 25, skull: 25, 'oh-ext': 20, 'cg-bench': 50, kickback: 8,
  squat: 80, 'front-squat': 60, 'goblet-squat': 24, rdl: 70, 'leg-press': 120, lunge: 16, 'split-squat': 14, 'hip-thrust': 80,
  'leg-curl': 35, 'leg-ext': 40, 'calf-raise': 60, 'seated-calf': 40, 'cable-crunch': 30,
};
const BODYWEIGHT = new Set(['pull-up', 'chin-up', 'dips', 'push-up', 'leg-raise', 'ab-wheel']);

// Same random numbers every time, so sample history is repeatable.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eight weeks of Push / Pull / Legs, three times a week, following the app's
// own rules: a tiny step each workout, about one miss in five.
function sampleHistory(weeks = 8) {
  const units = savedData()?.units || 'kg';
  fresh(units);
  const rand = seeded(42);
  const firstMonday = new Date(Date.now() - weeks * 7 * DAY);
  firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));
  firstMonday.setHours(18, 0, 0, 0);
  S.phase.startedAt = firstMonday.getTime();

  let n = 0;
  for (let w = 0; w < weeks; w++)
    for (const day of [0, 2, 4]) {
      const t = firstMonday.getTime() + (w * 7 + day) * DAY;
      if (t > Date.now() - DAY) continue;
      const r = S.routines[n++ % S.routines.length];
      const entries = [];
      for (const k of itemsForToday(r)) {
        const item = r.items[k];
        let plan, sets;
        if (!item.ready) {
          const w0 = BODYWEIGHT.has(item.exerciseId) ? null : START[item.exerciseId] ?? 20;
          plan = { calibrate: true };
          sets = Array.from({ length: item.sets }, () => ({ w: w0, r: item.reps, done: true }));
        } else {
          const { opts, lever } = suggest(item);
          const opt = opts.find((o) => o.lever === lever);
          const target = opt ? opt.target : { sets: item.sets, reps: item.reps, w: item.w, rest: item.rest };
          const hit = rand() < 0.8;
          plan = { calibrate: false, lever: opt?.lever ?? null, label: opt?.label ?? '', target };
          sets = Array.from({ length: target.sets }, (_, j) => ({
            w: target.w,
            r: hit || j < target.sets - 1 ? target.reps : Math.max(1, target.reps - 2),
            done: true,
          }));
        }
        const out = applyResult(item, plan, sets);
        if (out?.kind === 'hit') S.stepsTaken++;
        item.lastDone = t;
        const entry = { exerciseId: item.exerciseId, sets: sets.map(({ w, r }) => ({ w, r })) };
        if (out) entry.step = { kind: out.kind, lever: out.lever || null };
        entries.push(entry);
      }
      S.workouts.push({ id: uid(), name: r.name, routineId: r.id, phase: S.phase.id, startedAt: t, endedAt: t + (45 + Math.round(rand() * 20)) * 60e3, entries });
    }
  S.phaseFitPending = false;
  S.onboarding = 'offer'; // sample data skips the intro; the Train screen offers it
  return { ...S, active: null, timer: null };
}

$('#btn-fresh').addEventListener('click', async () => {
  await writeAndReload(null);
  status('Started fresh: no workouts, starter routines only.');
});

$('#btn-sample').addEventListener('click', async () => {
  const data = sampleHistory();
  await writeAndReload(data);
  status(`Loaded ${data.workouts.length} sample workouts over 8 weeks, with ${data.stepsTaken} tiny steps taken.`);
});

// Phase clock: put the current phase at a chosen week.
$('#btn-week').addEventListener('click', async () => {
  const week = Number($('#week').value);
  const data = savedData() || { ...fresh(), active: null, timer: null };
  const days = week > PHASE_WEEKS ? PHASE_WEEKS * 7 + 1 : (week - 1) * 7;
  data.phase = { ...(data.phase || { id: 'hypertrophy', history: [] }), startedAt: Date.now() - days * DAY - 60e3 };
  await writeAndReload(data);
  status(week > PHASE_WEEKS ? 'The phase is now complete, so the app should ask you to pick the next one.' : `The phase is now at week ${week} of ${PHASE_WEEKS}.`);
});

// Save and restore a snapshot of test data, to repeat a test from the same point.
const SNAP_KEY = 'micro-fitness.lab-snapshot';
function refreshSnapshotButton() {
  const snap = localStorage.getItem(SNAP_KEY);
  $('#btn-restore').disabled = !snap;
}
$('#btn-snapshot').addEventListener('click', async () => {
  await blankFrame(); // let the app save first
  const raw = localStorage.getItem(STORAGE_KEY);
  frame.src = APP_URL;
  if (!raw) return status('Nothing to save yet. Use the app first.');
  localStorage.setItem(SNAP_KEY, raw);
  refreshSnapshotButton();
  status('Saved a snapshot of the current test data.');
});
$('#btn-restore').addEventListener('click', async () => {
  const raw = localStorage.getItem(SNAP_KEY);
  if (!raw) return;
  await writeAndReload(JSON.parse(raw));
  status('Restored your snapshot.');
});
refreshSnapshotButton();

$('#btn-reload').addEventListener('click', () => {
  frame.src = APP_URL;
  status('Reloaded the app.');
});

/* ---------- Phone on the same Wi-Fi ---------- */

const lan = new URLSearchParams(location.search).get('lan');
if (lan && /^[\w.:-]+$/.test(lan)) {
  const url = `http://${lan}/`;
  $('#lan-url').textContent = url;
  $('#lan-url').href = url;
  $('#lan').hidden = false;
  $('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      status('Link copied.');
    } catch {
      status(`Couldn’t copy. Type ${url} into your phone’s browser.`);
    }
  });
}

/* ---------- Built-in checks ---------- */

const near = (a, b) => Math.abs(a - b) < 0.01;
const kgItem = (exerciseId, sets, reps, w, rest) => ({ ...newItem(exerciseId), sets, reps, w, rest, ready: true });
const failing = (t) => Array.from({ length: t.sets }, (_, j) => ({ w: t.w, r: j ? t.reps : t.reps - 3, done: true }));
const passing = (t) => Array.from({ length: t.sets }, () => ({ w: t.w, r: t.reps, done: true }));

// An intro answer set for planner checks.
const profile = (o = {}) => ({
  ...defaultProfile(), goal: 'muscle', why: ['energy'], days: [1, 3, 5], minutes: 45, place: 'gym',
  equip: [...PLACES.gym.equip], experience: 'some', health: 'no', sleep: 'good', weeks: 13, ...o,
});
const groupsOf = (plan) => new Set(plan.routines.flatMap((r) => r.groups.map((g) => g.group)));
const exOf = (id) => S.exercises.find((e) => e.id === id);

// A logged workout for XP checks. sets: [[kg, reps], ...]
let wid = 0;
const logged = (t, exerciseId, sets, step) => {
  const w = { id: `w${wid++}`, name: 'Test', routineId: null, startedAt: t, endedAt: t + 1, entries: [{ exerciseId, sets: sets.map(([w, r]) => ({ w, r })), ...(step ? { step } : {}) }] };
  S.workouts.push(w);
  return w;
};

const CHECKS = [
  ['Starter routines fit the hypertrophy ranges', () => {
    fresh();
    const bad = S.routines.flatMap((r) => r.items).filter((it) => it.reps < 6 || it.reps > 12 || it.rest < restRange(it)[0] || it.rest > restRange(it)[1]);
    return bad.length ? `${bad.length} exercises are outside the ranges` : true;
  }],
  ['A new baseline suggests +1 rep first', () => {
    fresh();
    const s = suggest(kgItem('bench', 4, 8, 60, 90));
    return s.lever === 'reps' || `suggested ${s.lever}`;
  }],
  ['At the rep cap, the only step is more weight', () => {
    fresh();
    const { opts } = suggest(kgItem('bench', 4, 12, 60, 90));
    const o = opts[0];
    return (opts.length === 1 && o.lever === 'weight' && near(o.target.w, 62.5) && o.target.reps === 11) || `got ${opts.map((x) => x.label).join(', ')}`;
  }],
  ['A missed step is repeated next time', () => {
    fresh();
    const item = kgItem('bench', 4, 8, 60, 90);
    const s = suggest(item);
    const opt = s.opts.find((o) => o.lever === s.lever);
    applyResult(item, { lever: s.lever, label: opt.label, target: opt.target }, failing(opt.target));
    return suggest(item).lever === s.lever || 'a different step was suggested';
  }],
  ['Two misses in a row switch to a different step', () => {
    fresh();
    const item = kgItem('bench', 4, 8, 60, 90);
    let s = suggest(item);
    const first = s.lever;
    for (let k = 0; k < 2; k++) {
      s = suggest(item);
      const opt = s.opts.find((o) => o.lever === s.lever);
      applyResult(item, { lever: s.lever, label: opt.label, target: opt.target }, failing(opt.target));
    }
    return suggest(item).lever !== first || 'still suggesting the same step';
  }],
  ['Hitting the target makes it the new baseline', () => {
    fresh();
    const item = kgItem('bench', 4, 8, 60, 90);
    const s = suggest(item);
    const opt = s.opts.find((o) => o.lever === s.lever);
    const out = applyResult(item, { lever: s.lever, label: opt.label, target: opt.target }, passing(opt.target));
    return (out.kind === 'hit' && item.reps === 9) || `baseline is ${item.sets} × ${item.reps}`;
  }],
  ['Rest never drops below the floor for compound lifts', () => {
    fresh();
    const { opts } = suggest(kgItem('squat', 4, 8, 100, restRange({ exerciseId: 'squat' })[0]));
    return !opts.some((o) => o.lever === 'rest') || 'a shorter rest was offered';
  }],
  ['Beginner mode keeps rest at 60 seconds or more', () => {
    fresh();
    S.experience = 'beginner';
    const lo = restRange({ exerciseId: 'curl' })[0];
    return lo >= 60 || `curl rest floor is ${lo}s`;
  }],
  ['Changing phase converts reps and weight', () => {
    fresh();
    const item = kgItem('bench', 4, 11, 65, 90);
    fitItem(item, PHASES.strength);
    const ok = item.reps === 5 && item.w > 65 && item.w < 85 && near(item.w / 2.5, Math.round(item.w / 2.5));
    return ok || `became ${item.sets} × ${item.reps} @ ${item.w} kg`;
  }],
  ['Each workout fills every muscle group', () => {
    fresh();
    const push = S.routines.find((r) => r.id === 'push');
    const ids = itemsForToday(push).map((k) => push.items[k].exerciseId);
    const ok = ids.length === 5 && ids.includes('bench') && ids.includes('ohp');
    return ok || `got ${ids.join(', ')}`;
  }],
  ['The rotation moves on to different exercises', () => {
    fresh();
    const push = S.routines.find((r) => r.id === 'push');
    const day1 = itemsForToday(push);
    day1.forEach((k) => (push.items[k].lastDone = Date.now()));
    const day2 = itemsForToday(push);
    const repeats = day2.filter((k) => day1.includes(k) && !push.items[k].always);
    return !repeats.length || `${repeats.length} non-pinned exercises came up twice in a row`;
  }],
  ['Switched-off exercises never come up', () => {
    fresh();
    S.exercises.find((e) => e.id === 'incline-db').off = true;
    const push = S.routines.find((r) => r.id === 'push');
    for (let n = 0; n < 6; n++) {
      const ks = itemsForToday(push);
      if (ks.some((k) => push.items[k].exerciseId === 'incline-db')) return 'it came up anyway';
      ks.forEach((k) => (push.items[k].lastDone = Date.now() + n));
    }
    return true;
  }],
  ['Data from the first version still loads', () => {
    const v1 = { version: 1, units: 'lb', exercises: [{ id: 'bench', name: 'Bench press', group: 'chest' }], routines: [{ id: 'old', name: 'Old', rest: 75, exerciseIds: ['bench', 'pushdown'] }], workouts: [{ id: 'w', name: 'Old', startedAt: 1, endedAt: 2, entries: [] }] };
    const s = parseBackup(JSON.stringify(v1));
    const r = s.routines[0];
    return (s.workouts.length === 1 && r.groups?.length === 2 && r.items.length === 2) || 'upgrade lost something';
  }],
  ['The exercise library has no duplicates', () => {
    const ids = new Set(), names = new Set(), dups = [];
    for (const e of DEFAULT_EXERCISES) {
      const n = e.name.toLowerCase();
      if (ids.has(e.id) || names.has(n)) dups.push(e.name);
      ids.add(e.id);
      names.add(n);
    }
    return !dups.length || `duplicates: ${dups.join(', ')}`;
  }],
  ['Every exercise has a valid group and equipment', () => {
    const bad = DEFAULT_EXERCISES.filter((e) => !GROUPS[e.group] || e.equip.some((q) => !EQUIPMENT[q]));
    return !bad.length || `check: ${bad.map((e) => e.id).join(', ')}`;
  }],
  ['Exercises you may have logged keep their IDs', () => {
    const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    const original = 'bench incline-bench incline-db db-bench machine-press cable-fly pec-deck dips push-up deadlift row tbar-row db-row pull-up chin-up lat-pulldown cable-row straight-arm ohp db-shoulder arnold lateral-raise cable-lateral face-pull rear-delt curl db-curl hammer-curl preacher cable-curl pushdown skull oh-ext cg-bench kickback squat front-squat goblet-squat rdl leg-press lunge split-squat hip-thrust leg-curl leg-ext calf-raise seated-calf leg-raise cable-crunch ab-wheel'.split(' ');
    const routineIds = DEFAULT_ROUTINES.flatMap((r) => r.items.map((i) => i.exerciseId));
    const missing = [...original, ...routineIds].filter((id) => !ids.has(id));
    return !missing.length || `missing: ${missing.join(', ')}`;
  }],
  ['Upgrading moves hip thrust to glutes and keeps it in your routine', () => {
    const v5 = { version: 5, units: 'kg', exercises: [{ id: 'hip-thrust', name: 'Hip thrust', group: 'legs', off: true }, { id: 'squat', name: 'Back squat', group: 'legs' }],
      routines: [{ id: 'l', name: 'Legs', groups: [{ group: 'legs', count: 2 }], items: [{ exerciseId: 'squat', picked: true }, { exerciseId: 'hip-thrust', picked: true }] }], workouts: [] };
    const s = parseBackup(JSON.stringify(v5));
    const ht = s.exercises.find((e) => e.id === 'hip-thrust');
    const groups = s.routines[0].groups.map((g) => `${g.group}:${g.count}`).join(' ');
    return (ht.group === 'glutes' && ht.off === true && ht.equip.includes('barbell') && groups === 'legs:1 glutes:1' && s.exercises.length === DEFAULT_EXERCISES.length) || `hip thrust ${ht.group}, groups ${groups}, ${s.exercises.length} exercises`;
  }],
  ['Plan: 3 days for a beginner is full body, covering every major muscle', () => {
    fresh();
    const plan = buildPlan(profile({ experience: 'new' }));
    const g = groupsOf(plan);
    const ok = plan.routines.length === 3 && plan.routines.every((r) => r.name.startsWith('Full body')) && ['legs', 'chest', 'back', 'shoulders'].every((x) => g.has(x));
    return ok || `got ${plan.routines.map((r) => r.name).join(', ')}`;
  }],
  ['Plan: 4 days is upper and lower body', () => {
    fresh();
    const plan = buildPlan(profile({ days: [1, 2, 4, 5] }));
    return plan.routines.map((r) => r.name).join(',') === 'Upper body A,Lower body A,Upper body B,Lower body B' || plan.routines.map((r) => r.name).join(', ');
  }],
  ['Plan: no equipment means bodyweight exercises only', () => {
    fresh();
    const plan = buildPlan(profile({ place: 'none', equip: [] }));
    const bad = plan.routines.flatMap((r) => r.items).filter((it) => exOf(it.exerciseId).equip.length);
    return (!bad.length && plan.routines.every((r) => r.items.length)) || `${bad.length} need equipment`;
  }],
  ['Plan: sore knees switch off jumps, and none are ticked', () => {
    fresh();
    const plan = buildPlan(profile({ injuries: ['knees'], goal: 'power', experience: 'experienced' }));
    const ticked = plan.routines.flatMap((r) => r.items.map((it) => it.exerciseId)).filter((id) => INJURY_RISK.knees.includes(id));
    return (plan.risky.includes('box-jump') && !ticked.length) || `ticked: ${ticked.join(', ')}`;
  }],
  ['Plan: beginners wanting strength start with a foundation phase', () => {
    fresh();
    const plan = buildPlan(profile({ goal: 'strength', experience: 'new' }));
    return (plan.phase.id === 'hypertrophy' && plan.phase.foundation && !plan.routines.flatMap((r) => r.items).some((it) => exOf(it.exerciseId).advanced)) || `phase ${plan.phase.id}`;
  }],
  ['Plan: shorter sessions get fewer exercises, and fit the time', () => {
    fresh();
    const short = buildPlan(profile({ minutes: 30 }));
    const long = buildPlan(profile({ minutes: 90 }));
    const n = (pl) => pl.routines[0].groups.reduce((t, g) => t + g.count, 0);
    const over = long.routines.map((r) => estimateMinutes(r, long.phase.id, false)).filter((m) => m > 100);
    return (n(short) < n(long) && !over.length) || `30 min: ${n(short)}, 90 min: ${n(long)}, over: ${over}`;
  }],
  ['Goal: realistic targets, and ambitious ones are flagged', () => {
    return (recommendedPct('new', 13) === 20 && isAmbitious(30, 'experienced', 4) && !isAmbitious(5, 'some', 4)) || 'recommendations are off';
  }],
  ['Saving a plan sets routines, schedule, phase and goal', () => {
    fresh();
    const p = profile({ days: [1, 3, 5], weeks: 4, liftId: 'bench', pct: 5 });
    const plan = buildPlan(p);
    applyPlan(p, plan);
    const g = goalProgress();
    const ok = S.routines.length === 3 && S.weeklyGoal === 3 && S.plan.order.length === 3 && g.target === 12 && S.goal.statement.includes('Monday') && S.phase.id === 'hypertrophy' && S.onboarding === 'done';
    return ok || `routines ${S.routines.length}, target ${g?.target}, statement ${S.goal?.statement}`;
  }],
  ['Next up follows the plan order', () => {
    fresh();
    const p = profile({ days: [1, 3, 5] });
    applyPlan(p, buildPlan(p));
    const first = nextRoutine();
    S.workouts.push({ id: 'w', name: first.name, routineId: first.id, startedAt: Date.now(), endedAt: Date.now(), entries: [] });
    return (first.id === S.plan.order[0] && nextRoutine().id === S.plan.order[1]) || 'next up is out of order';
  }],
  ['XP: showing up, tiny steps and new bests', () => {
    fresh();
    logged(1, 'bench', [[60, 8], [60, 8]], { kind: 'calibrated', lever: null });
    logged(2, 'bench', [[60, 9], [60, 9]], { kind: 'hit', lever: 'reps' });
    logged(3, 'bench', [[62.5, 9], [62.5, 9]], { kind: 'hit', lever: 'weight' });
    const st = exerciseStats().get('bench');
    const want = XP.show + (XP.show + XP.reps + XP.best) + (XP.show + XP.weight + XP.best);
    return (st.xp === want && st.level === 2) || `xp ${st.xp} (wanted ${want}), level ${st.level}`;
  }],
  ['XP: a missed step still earns XP for showing up', () => {
    fresh();
    logged(1, 'squat', [[80, 6]], { kind: 'calibrated', lever: null });
    logged(2, 'squat', [[80, 5]], { kind: 'missed', lever: null });
    const st = exerciseStats().get('squat');
    return st.xp === XP.show * 2 || `xp ${st.xp}`;
  }],
  ['XP: older workouts count when they beat last time', () => {
    fresh();
    logged(1, 'row', [[50, 8]]);
    logged(2, 'row', [[50, 10]]);
    const st = exerciseStats().get('row');
    return st.xp === XP.show * 2 + XP.improve + XP.best || `xp ${st.xp}`;
  }],
  ['XP: bodyweight moves level up on reps', () => {
    fresh();
    logged(1, 'pull-up', [[null, 5]]);
    logged(2, 'pull-up', [[null, 7]], { kind: 'hit', lever: 'reps' });
    const st = exerciseStats().get('pull-up');
    return (st.bodyweight && st.best === 7 && st.xp === XP.show * 2 + XP.reps + XP.best) || `best ${st.best}, xp ${st.xp}`;
  }],
  ['Levels take a little more XP each time', () => {
    const a = levelFor(49).level, b = levelFor(50).level, c = levelFor(124).level, d = levelFor(125).level;
    return (a === 1 && b === 2 && c === 2 && d === 3 && levelFor(200, 'overall').level === 2) || `got ${a} ${b} ${c} ${d}`;
  }],
  ['Level-ups show in the workout summary', () => {
    fresh();
    logged(1, 'bench', [[60, 8]], { kind: 'calibrated', lever: null });
    logged(2, 'bench', [[60, 9]], { kind: 'hit', lever: 'reps' });
    const w = logged(3, 'bench', [[62.5, 9]], { kind: 'hit', lever: 'weight' });
    const g = workoutGains(w);
    return (g.xp === XP.show + XP.weight + XP.best && g.ups.some((u) => u.name === 'Bench press' && u.level === 2)) || `xp ${g.xp}, ups ${JSON.stringify(g.ups)}`;
  }],
  ['Overall level adds up every exercise', () => {
    fresh();
    logged(1, 'bench', [[60, 8]]);
    logged(2, 'squat', [[80, 6]]);
    const L = allLevels();
    return L.overall.xp === XP.show * 2 || `overall ${L.overall.xp}`;
  }],
  ['Pounds convert without rounding errors', () => {
    fresh('lb');
    return toDisp(fromDisp(135)) === 135 || `135 lb came back as ${toDisp(fromDisp(135))}`;
  }],
];

$('#btn-checks').addEventListener('click', () => {
  const list = $('#check-list');
  let passed = 0;
  list.innerHTML = CHECKS.map(([name, fn]) => {
    let result;
    try {
      result = fn();
    } catch (err) {
      result = `error: ${err.message}`;
    }
    const ok = result === true;
    if (ok) passed++;
    return `<li class="${ok ? 'pass' : 'fail'}"><span class="mark" aria-hidden="true">${ok ? '✓' : '✗'}</span><span>${name}${ok ? '' : `<small>${String(result).replace(/</g, '&lt;')}</small>`}</span></li>`;
  }).join('');
  const total = CHECKS.length;
  $('#check-summary').textContent = passed === total ? `All ${total} checks passed.` : `${total - passed} of ${total} checks failed.`;
  $('#check-summary').className = passed === total ? 'pass' : 'fail';
  fresh(); // leave this page's copy of the app clean
});
