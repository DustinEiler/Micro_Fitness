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

const DEVICES = {
  se: { name: 'iPhone SE', w: 375, h: 667 },
  iphone: { name: 'iPhone 16', w: 393, h: 852 },
  max: { name: 'iPhone 16 Pro Max', w: 440, h: 956 },
  pixel: { name: 'Pixel 9', w: 412, h: 915 },
};

const frame = $('#app');
const shell = $('#phone');
const APP_URL = '../index.html';

function sizeFrame() {
  const d = DEVICES[$('#device').value] || DEVICES.iphone;
  shell.style.setProperty('--w', `${d.w}px`);
  shell.style.setProperty('--h', `${d.h}px`);
  const room = window.innerHeight - 48;
  const scale = Math.min(1, room / (d.h + 28));
  shell.style.setProperty('--scale', scale.toFixed(3));
  $('#scale-note').textContent = scale < 1 ? `Shown at ${Math.round(scale * 100)}% to fit your screen.` : '';
}
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
        entries.push({ exerciseId: item.exerciseId, sets: sets.map(({ w, r }) => ({ w, r })) });
      }
      S.workouts.push({ id: uid(), name: r.name, routineId: r.id, phase: S.phase.id, startedAt: t, endedAt: t + (45 + Math.round(rand() * 20)) * 60e3, entries });
    }
  S.phaseFitPending = false;
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
