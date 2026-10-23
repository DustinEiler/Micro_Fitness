import { load, save, uid, freshState, parseBackup } from './store.js';
import { GROUPS } from './data.js';

/* ---------- State ---------- */

let S = load();
let draft = null; // routine being edited
let pickerCtx = null; // { onPick, onCancel }
let confirmFn = null;
let persistTimer = null;

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');

function persist() {
  if (!save(S)) toast('Couldn’t save. Storage on this device is full or blocked.');
}
function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 300);
}

/* ---------- Formatting ---------- */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const KG_PER_LB = 0.45359237;
const unit = () => S.units;
const toDisp = (kg) => {
  if (kg == null || kg === '') return '';
  const v = S.units === 'kg' ? kg : kg / KG_PER_LB;
  return Math.round(v * 10) / 10;
};
const fromDisp = (val) => {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return S.units === 'kg' ? n : n * KG_PER_LB;
};

const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));
const setScore = (s) => (s.w ? e1rm(s.w, s.r) : s.r || 0);
const setStr = (s) => (s.w ? `${toDisp(s.w)} × ${s.r}` : `${s.r} reps`);
const fmtDate = (ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(ts).toLocaleDateString(undefined, opts);
const fmtDur = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const fmtElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  return h ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : fmtClock(s);
};
const fmtNum = (n) => Math.round(n).toLocaleString();

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
function ago(ts) {
  const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}
function weekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // weeks start on Monday
  return d.getTime();
}

/* ---------- Queries ---------- */

const exById = (id) => S.exercises.find((e) => e.id === id) || { id, name: 'Deleted exercise', group: 'other' };

function lastSetsFor(exId, beforeTs = Infinity) {
  for (let k = S.workouts.length - 1; k >= 0; k--) {
    const w = S.workouts[k];
    if (w.startedAt >= beforeTs) continue;
    const sets = w.entries.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets);
    if (sets.length) return sets;
  }
  return null;
}

function bestScore(exId) {
  let best = 0;
  for (const w of S.workouts)
    for (const e of w.entries) if (e.exerciseId === exId) for (const s of e.sets) best = Math.max(best, setScore(s));
  return best;
}

function weekCounts(n) {
  const now = weekStart(Date.now());
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * i);
    weeks.push({ start: d.getTime(), count: 0 });
  }
  for (const w of S.workouts) {
    const b = weeks.find((x) => x.start === weekStart(w.startedAt));
    if (b) b.count++;
  }
  return weeks;
}

// Consecutive weeks that hit the weekly goal. The current week only adds to
// the streak once it's met; an unfinished week never breaks it.
function streak() {
  const counts = new Map();
  for (const w of S.workouts) {
    const k = weekStart(w.startedAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const d = new Date(weekStart(Date.now()));
  let n = (counts.get(d.getTime()) || 0) >= S.weeklyGoal ? 1 : 0;
  for (let guard = 0; guard < 1000; guard++) {
    d.setDate(d.getDate() - 7);
    if ((counts.get(d.getTime()) || 0) >= S.weeklyGoal) n++;
    else break;
  }
  return n;
}

const workoutVolume = (w) => w.entries.reduce((t, e) => t + e.sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), 0);
const workoutSets = (w) => w.entries.reduce((t, e) => t + e.sets.length, 0);

/* ---------- Icons ---------- */

const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

/* ---------- Rendering ---------- */

const ROUTES = { train: 'Train', history: 'History', progress: 'Progress', routines: 'Routines' };
const route = () => {
  const r = location.hash.slice(1);
  return ROUTES[r] ? r : 'train';
};

function render() {
  const r = route();
  $('#title').textContent = r === 'train' && S.active ? 'Workout' : ROUTES[r];
  document.querySelectorAll('.tabs a').forEach((a) => {
    if (a.dataset.route === r) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('.tabs a[data-route="train"]').classList.toggle('is-live', !!S.active);
  const views = { train: S.active ? viewSession : viewTrain, history: viewHistory, progress: viewProgress, routines: viewRoutines };
  view.innerHTML = views[r]();
  renderTimer();
}

function go(r) {
  if (route() === r && location.hash) render();
  else location.hash = '#' + r;
}

const PLATE_COLORS = ['var(--plate-red)', 'var(--plate-blue)', 'var(--plate-yellow)', 'var(--plate-green)', 'var(--plate-white)'];

// Weekly goal drawn as plates on a barbell sleeve: one plate per workout.
function barbell(done, goal) {
  const slots = Math.max(done, goal);
  const pw = 15, gap = 4, x0 = 60;
  let plates = '';
  for (let i = 0; i < slots; i++) {
    const x = x0 + i * (pw + gap);
    plates +=
      i < done
        ? `<rect class="plate" x="${x}" y="6" width="${pw}" height="78" rx="3" style="fill:${PLATE_COLORS[i % 5]}"/>`
        : `<rect class="plate-slot" x="${x + 0.75}" y="6.75" width="${pw - 1.5}" height="76.5" rx="3"/>`;
  }
  const sleeveEnd = Math.max(x0 + slots * (pw + gap) + 18, 210);
  return `<svg class="barbell" viewBox="0 0 ${sleeveEnd + 10} 90" role="img" aria-label="${done} of ${goal} workouts done this week">
    <rect class="bar" x="0" y="41" width="44" height="8" rx="2"/>
    <rect class="sleeve" x="44" y="38" width="${sleeveEnd - 44}" height="14" rx="3"/>
    <rect class="collar" x="48" y="24" width="8" height="42" rx="2"/>
    ${plates}
  </svg>`;
}

function viewTrain() {
  const done = weekCounts(1)[0].count;
  const left = S.weeklyGoal - done;
  const line =
    left > 0
      ? `${done} of ${S.weeklyGoal} workouts this week. ${left} to go.`
      : done === S.weeklyGoal
        ? `Weekly goal met: ${done} of ${S.weeklyGoal} workouts.`
        : `Weekly goal beaten: ${done} workouts against a goal of ${S.weeklyGoal}.`;
  const rows = S.routines
    .map((r) => {
      const last = [...S.workouts].reverse().find((w) => w.routineId === r.id);
      return `<li><button class="routine-start" data-action="start" data-id="${r.id}">
        <span class="rs-name">${esc(r.name)}</span>
        <span class="rs-meta">${r.exerciseIds.length} exercises${last ? `, last done ${ago(last.startedAt)}` : ''}</span>
      </button></li>`;
    })
    .join('');
  return `
    <section class="week">
      ${barbell(done, S.weeklyGoal)}
      <p class="week-line">${line}</p>
    </section>
    <h2 class="section-h">Start a routine</h2>
    ${S.routines.length ? `<ul class="routine-list">${rows}</ul>` : `<p class="empty">You don’t have any routines yet. <a href="#routines">Create a routine</a> or start an empty workout.</p>`}
    <button class="btn btn-wide" data-action="start-empty">Start empty workout</button>`;
}

function viewSession() {
  const a = S.active;
  const entries = a.entries
    .map((e, i) => {
      const ex = exById(e.exerciseId);
      const last = lastSetsFor(e.exerciseId, a.startedAt);
      const sets = e.sets
        .map((s, j) => {
          const p = last?.[j];
          return `<div class="set-row${s.done ? ' is-done' : ''}">
            <span class="set-n">${j + 1}</span>
            <input class="num" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="Set ${j + 1} weight in ${unit()}" data-set="${i}.${j}.w" value="${s.w == null ? '' : toDisp(s.w)}" placeholder="${p?.w ? toDisp(p.w) : 'BW'}">
            <input class="num" inputmode="numeric" enterkeyhint="done" autocomplete="off" aria-label="Set ${j + 1} reps" data-set="${i}.${j}.r" value="${s.r ?? ''}" placeholder="${p?.r ?? '–'}">
            <button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-pressed="${s.done}" aria-label="Set ${j + 1} done">${ICON.check}</button>
          </div>`;
        })
        .join('');
      return `<article class="ex">
        <header class="ex-head">
          <span class="dot" data-g="${ex.group}" title="${GROUPS[ex.group] || 'Other'}"></span>
          <h2>${esc(ex.name)}</h2>
          <button class="icon-btn" data-action="ex-menu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">${ICON.dots}</button>
        </header>
        ${last ? `<p class="ex-last">Last time: ${last.map(setStr).join(', ')}</p>` : `<p class="ex-last">First time logging this one.</p>`}
        <div class="set-grid">
          <div class="set-row set-head" aria-hidden="true"><span>Set</span><span>${unit()}</span><span>Reps</span><span>Done</span></div>
          ${sets}
        </div>
        <div class="ex-actions">
          <button class="btn-text" data-action="add-set" data-i="${i}">Add set</button>
          ${e.sets.length > 1 ? `<button class="btn-text muted" data-action="remove-set" data-i="${i}">Remove last set</button>` : ''}
        </div>
      </article>`;
    })
    .join('');
  return `
    <div class="session-head">
      <input class="session-name" data-field="session-name" value="${esc(a.name)}" aria-label="Workout name" autocomplete="off">
      <span class="elapsed" id="elapsed" aria-label="Time elapsed">${fmtElapsed(Date.now() - a.startedAt)}</span>
    </div>
    ${entries || `<p class="empty">No exercises yet. Add one to start logging sets.</p>`}
    <button class="btn btn-wide" data-action="add-exercise">Add exercise</button>
    <div class="session-foot">
      <button class="btn btn-quiet danger" data-action="discard">Discard</button>
      <button class="btn btn-primary" data-action="finish">Finish workout</button>
    </div>`;
}

function viewHistory() {
  if (!S.workouts.length)
    return `<div class="empty-state"><p>Finished workouts show up here, newest first.</p><button class="btn btn-primary" data-action="go" data-id="train">Start a workout</button></div>`;
  let html = '';
  let month = '';
  for (const w of [...S.workouts].reverse()) {
    const m = fmtDate(w.startedAt, { month: 'long', year: 'numeric' });
    if (m !== month) {
      if (month) html += '</ul>';
      html += `<h2 class="section-h">${m}</h2><ul class="hist-list">`;
      month = m;
    }
    const vol = workoutVolume(w);
    html += `<li><details class="hist">
      <summary>
        <span class="h-top"><span class="h-name">${esc(w.name)}</span><span class="h-date">${fmtDate(w.startedAt)}</span></span>
        <span class="h-meta">${fmtDur(w.endedAt - w.startedAt)}, ${workoutSets(w)} sets${vol ? `, ${fmtNum(toDisp(vol))} ${unit()} lifted` : ''}</span>
      </summary>
      <div class="h-body">
        ${w.entries
          .map((e) => `<div class="h-ex"><h3><span class="dot" data-g="${exById(e.exerciseId).group}"></span>${esc(exById(e.exerciseId).name)}</h3><p>${e.sets.map(setStr).join(', ')}</p></div>`)
          .join('')}
        <button class="btn-text danger" data-action="delete-workout" data-id="${w.id}">Delete workout</button>
      </div>
    </details></li>`;
  }
  return html + '</ul>';
}

function viewProgress() {
  const weeks = weekCounts(12);
  const st = streak();
  const strip = weeks
    .map((w) => {
      const cls = w.count >= S.weeklyGoal ? 'met' : w.count ? 'part' : '';
      return `<li class="${cls}" title="Week of ${fmtDate(w.start, { day: 'numeric', month: 'short' })}: ${w.count} workout${w.count === 1 ? '' : 's'}"><span>${w.count || ''}</span></li>`;
    })
    .join('');

  const logged = [];
  for (const w of [...S.workouts].reverse())
    for (const e of w.entries) if (!logged.includes(e.exerciseId)) logged.push(e.exerciseId);
  const sel = logged.includes(S.progressEx) ? S.progressEx : logged[0];

  const thisMonth = S.workouts.filter((w) => fmtDate(w.startedAt, { month: 'numeric', year: 'numeric' }) === fmtDate(Date.now(), { month: 'numeric', year: 'numeric' })).length;

  return `
    <section class="panel">
      <h2 class="section-h">Consistency</h2>
      <p class="lede">${st ? `You’ve hit your goal of ${S.weeklyGoal} workouts ${st} week${st === 1 ? '' : 's'} in a row.` : `Hit ${S.weeklyGoal} workouts in a week to start a streak.`}</p>
      <ol class="weeks" aria-label="Workouts per week, last 12 weeks">${strip}</ol>
      <p class="weeks-axis"><span>12 weeks ago</span><span>This week</span></p>
      <dl class="totals">
        <div><dt>Workouts</dt><dd>${S.workouts.length}</dd></div>
        <div><dt>This month</dt><dd>${thisMonth}</dd></div>
        <div><dt>Week streak</dt><dd>${st}</dd></div>
      </dl>
    </section>
    <section class="panel">
      <h2 class="section-h">Exercise progress</h2>
      ${
        logged.length
          ? `<label class="field"><span class="field-label">Exercise</span>
              <select id="prog-ex">${logged.map((id) => `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(exById(id).name)}</option>`).join('')}</select>
            </label>
            ${progressChart(sel)}`
          : `<p class="empty">Finish a workout to see charts for each exercise.</p>`
      }
    </section>`;
}

function progressChart(exId) {
  const sessions = S.workouts
    .map((w) => ({ t: w.startedAt, sets: w.entries.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets) }))
    .filter((x) => x.sets.length);
  const bodyweight = sessions.every((x) => x.sets.every((s) => !s.w));
  const pts = sessions.map((x) => ({
    t: x.t,
    v: bodyweight ? Math.max(...x.sets.map((s) => s.r || 0)) : toDisp(Math.max(...x.sets.map((s) => e1rm(s.w, s.r)))),
  }));
  const metric = bodyweight ? 'Most reps in a set' : `Estimated one-rep max (${unit()})`;

  // Bests
  let bestSet = null, bestDate = 0, heaviest = null;
  for (const x of sessions)
    for (const s of x.sets) {
      if (!bestSet || setScore(s) > setScore(bestSet)) { bestSet = s; bestDate = x.t; }
      if (s.w && (!heaviest || s.w > heaviest.w || (s.w === heaviest.w && s.r > heaviest.r))) heaviest = s;
    }

  const W = 320, H = 180, L = 40, R = 14, T = 14, B = 26;
  let svg;
  if (pts.length < 2) {
    svg = `<p class="chart-note">Log ${esc(exById(exId).name.toLowerCase())} in one more workout to see a trend line.</p>`;
  } else {
    let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
    if (lo === hi) { lo -= 5; hi += 5; }
    const padY = (hi - lo) * 0.12;
    lo = Math.max(0, lo - padY); hi += padY;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const x = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const ticks = [lo, (lo + hi) / 2, hi];
    const grid = ticks
      .map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`)
      .join('');
    const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const dots = pts.map((p) => `<circle class="pt" cx="${x(p.t)}" cy="${y(p.v)}" r="3.5"><title>${fmtDate(p.t)}: ${p.v}</title></circle>`).join('');
    svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric} over ${pts.length} sessions, from ${pts[0].v} to ${pts[pts.length - 1].v}">
      ${grid}
      <path class="line" d="${path}"/>
      ${dots}
      <text class="tick" x="${L}" y="${H - 6}">${fmtDate(t0, { day: 'numeric', month: 'short' })}</text>
      <text class="tick" x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(t1, { day: 'numeric', month: 'short' })}</text>
    </svg>`;
  }

  return `<p class="chart-title">${metric}</p>
    ${svg}
    <dl class="totals">
      <div><dt>Best set</dt><dd>${bestSet ? setStr(bestSet) : '–'}</dd></div>
      ${heaviest ? `<div><dt>Heaviest</dt><dd>${toDisp(heaviest.w)} ${unit()}</dd></div>` : ''}
      <div><dt>Sessions</dt><dd>${sessions.length}</dd></div>
    </dl>
    ${bestSet ? `<p class="fine">Best set was on ${fmtDate(bestDate, { day: 'numeric', month: 'long', year: 'numeric' })}.${bodyweight ? '' : ' Estimated one-rep max uses the Epley formula.'}</p>` : ''}`;
}

function viewRoutines() {
  const items = S.routines
    .map(
      (r) => `<li class="routine-card">
        <div class="rc-main">
          <h2>${esc(r.name)}</h2>
          <p>${r.exerciseIds.map((id) => esc(exById(id).name)).join(', ') || 'No exercises yet'}</p>
          <p class="fine">Rest ${fmtClock(r.rest)} between sets</p>
        </div>
        <div class="rc-actions">
          <button class="btn btn-small" data-action="edit-routine" data-id="${r.id}">Edit</button>
          <button class="btn btn-small btn-primary" data-action="start" data-id="${r.id}">Start</button>
        </div>
      </li>`
    )
    .join('');
  return `${items ? `<ul class="routine-cards">${items}</ul>` : `<p class="empty">Routines are saved lists of exercises you can start with one tap.</p>`}
    <button class="btn btn-wide" data-action="new-routine">New routine</button>`;
}

/* ---------- Workout actions ---------- */

function newEntry(exId) {
  const last = lastSetsFor(exId);
  const sets = last ? last.map((s) => ({ w: s.w, r: s.r, done: false })) : [0, 1, 2].map(() => ({ w: null, r: null, done: false }));
  return { exerciseId: exId, sets };
}

function startWorkout(r) {
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

function finishWorkout() {
  const a = S.active;
  const entries = a.entries
    .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done && s.r).map(({ w, r }) => ({ w, r })) }))
    .filter((e) => e.sets.length);
  if (!entries.length) {
    confirmSheet('No sets are checked off yet, so there’s nothing to save. Discard this workout?', 'Discard workout', discardWorkout, true);
    return;
  }
  const unchecked = a.entries.reduce((t, e) => t + e.sets.filter((s) => !s.done).length, 0);
  const done = () => {
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
  if (unchecked) confirmSheet(`${unchecked} set${unchecked === 1 ? ' isn’t' : 's aren’t'} checked off and won’t be saved.`, 'Finish workout', done);
  else done();
}

function discardWorkout() {
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

/* ---------- Rest timer ---------- */

let audioCtx = null;
function primeAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio available */ }
}
function beep() {
  if (!audioCtx) return;
  try {
    [0, 0.25].forEach((delay) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + delay);
      o.stop(audioCtx.currentTime + delay + 0.2);
    });
  } catch { /* ignore */ }
}

function startTimer(sec) {
  S.timer = { endsAt: Date.now() + sec * 1000, total: sec };
  persist();
  renderTimer();
}

function renderTimer() {
  const root = $('#timer-root');
  document.body.classList.toggle('has-timer', !!S.timer);
  if (!S.timer) {
    root.innerHTML = '';
    return;
  }
  if (!$('.timer', root))
    root.innerHTML = `<div class="timer">
      <svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-track" cx="22" cy="22" r="19"/><circle class="ring-fill" id="ring" cx="22" cy="22" r="19" pathLength="100"/></svg>
      <p class="timer-text"><span class="timer-label">Rest</span><span class="timer-time" id="timer-time" role="timer"></span></p>
      <button class="timer-btn" data-action="timer-add" data-id="-15" aria-label="15 seconds less">−15</button>
      <button class="timer-btn" data-action="timer-add" data-id="15" aria-label="15 seconds more">+15</button>
      <button class="timer-btn timer-skip" data-action="timer-skip">Skip</button>
    </div>`;
  updateTimer();
}

function updateTimer() {
  if (!S.timer) return;
  const msLeft = S.timer.endsAt - Date.now();
  const left = Math.max(0, Math.ceil(msLeft / 1000));
  const t = $('#timer-time');
  if (t) t.textContent = fmtClock(left);
  const ring = $('#ring');
  if (ring) ring.style.strokeDashoffset = String(100 - (left / S.timer.total) * 100);
  if (msLeft <= 0) {
    const late = msLeft < -5000; // ran out while the app was closed
    S.timer = null;
    persist();
    renderTimer();
    if (!late) {
      beep();
      navigator.vibrate?.([200, 100, 200]);
      toast('Rest’s over. Time for your next set.');
    }
  }
}

setInterval(() => {
  updateTimer();
  const el = $('#elapsed');
  if (el && S.active) el.textContent = fmtElapsed(Date.now() - S.active.startedAt);
}, 250);

/* ---------- Sheets ---------- */

let lastFocus = null;
function openSheet(html, { tall = false } = {}) {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) lastFocus = document.activeElement;
  root.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet${tall ? ' sheet-tall' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  root.classList.add('open');
  document.body.classList.add('sheet-open');
  const sheet = $('.sheet', root);
  sheet.setAttribute('aria-label', $('.sheet-h', sheet)?.textContent || 'Dialog');
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}

function closeSheet({ cancelled = true } = {}) {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  root.classList.remove('open');
  root.innerHTML = '';
  document.body.classList.remove('sheet-open');
  const cb = cancelled && pickerCtx?.onCancel;
  pickerCtx = null;
  confirmFn = null;
  if (cb) cb();
  else lastFocus?.focus?.({ preventScroll: true });
}

function confirmSheet(message, label, fn, danger = false) {
  confirmFn = fn;
  openSheet(`<h2 class="sheet-h">Are you sure?</h2>
    <p class="lede">${esc(message)}</p>
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${esc(label)}</button>
    </div>`);
}

/* Exercise picker */

function openPicker(onPick, onCancel) {
  openSheet(`<h2 class="sheet-h">Add exercise</h2>
    <input type="search" id="pick-q" class="search" placeholder="Search or type a new exercise" aria-label="Search exercises" autocomplete="off" enterkeyhint="search">
    <div id="pick-list" class="pick-list"></div>`, { tall: true });
  pickerCtx = { onPick, onCancel };
  renderPickList('');
}

function renderPickList(q) {
  const ql = q.trim().toLowerCase();
  const list = S.exercises.filter((e) => e.name.toLowerCase().includes(ql));
  let html = '';
  if (ql && !S.exercises.some((e) => e.name.toLowerCase() === ql))
    html += `<button class="pick-create" data-action="pick-create">Create “${esc(q.trim())}”</button>`;
  for (const [g, label] of Object.entries(GROUPS)) {
    const items = list.filter((e) => (e.group || 'other') === g);
    if (!items.length) continue;
    html += `<h3 class="pick-group"><span class="dot" data-g="${g}"></span>${label}</h3><ul>${items
      .map((e) => `<li><button class="pick-item" data-action="pick" data-id="${e.id}">${esc(e.name)}</button></li>`)
      .join('')}</ul>`;
  }
  if (!html) html = `<p class="empty">No exercises match.</p>`;
  $('#pick-list').innerHTML = html;
}

function pick(id) {
  const cb = pickerCtx?.onPick;
  pickerCtx = null;
  closeSheet({ cancelled: false });
  cb?.(id);
}

/* Exercise menu during a workout */

function exMenu(i) {
  const n = S.active.entries.length;
  openSheet(`<h2 class="sheet-h">${esc(exById(S.active.entries[i].exerciseId).name)}</h2>
    <div class="menu">
      ${i > 0 ? `<button class="menu-item" data-action="ex-move" data-i="${i}" data-id="-1">${ICON.up}Move up</button>` : ''}
      ${i < n - 1 ? `<button class="menu-item" data-action="ex-move" data-i="${i}" data-id="1">${ICON.down}Move down</button>` : ''}
      <button class="menu-item danger" data-action="ex-remove" data-i="${i}">${ICON.x}Remove from this workout</button>
    </div>`);
}

/* Routine editor */

function openEditor() {
  const r = draft;
  const rests = [30, 45, 60, 90, 120, 150, 180, 240, 300];
  openSheet(`<h2 class="sheet-h">${r.isNew ? 'New routine' : 'Edit routine'}</h2>
    <label class="field"><span class="field-label">Name</span>
      <input id="draft-name" value="${esc(r.name)}" placeholder="For example, Upper body" autocomplete="off"></label>
    <label class="field"><span class="field-label">Rest between sets</span>
      <select id="draft-rest">${rests.map((s) => `<option value="${s}"${s === r.rest ? ' selected' : ''}>${fmtClock(s)}</option>`).join('')}</select></label>
    <h3 class="sub-h">Exercises</h3>
    ${
      r.exerciseIds.length
        ? `<ol class="draft-list">${r.exerciseIds
            .map(
              (id, k) => `<li><span class="dot" data-g="${exById(id).group}"></span><span class="dl-name">${esc(exById(id).name)}</span>
              <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="-1" aria-label="Move ${esc(exById(id).name)} up"${k === 0 ? ' disabled' : ''}>${ICON.up}</button>
              <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="1" aria-label="Move ${esc(exById(id).name)} down"${k === r.exerciseIds.length - 1 ? ' disabled' : ''}>${ICON.down}</button>
              <button class="icon-btn" data-action="draft-remove" data-i="${k}" aria-label="Remove ${esc(exById(id).name)}">${ICON.x}</button></li>`
            )
            .join('')}</ol>`
        : `<p class="empty">No exercises yet.</p>`
    }
    <button class="btn btn-wide" data-action="draft-add">Add exercise</button>
    <div class="sheet-actions">
      ${r.isNew ? `<button class="btn" data-action="close-sheet">Cancel</button>` : `<button class="btn btn-quiet danger" data-action="routine-delete">Delete</button>`}
      <button class="btn btn-primary" data-action="routine-save">Save routine</button>
    </div>`, { tall: true });
}

/* Settings */

function openSettings() {
  const goals = [1, 2, 3, 4, 5, 6, 7];
  const rests = [30, 45, 60, 90, 120, 150, 180, 240, 300];
  openSheet(`<h2 class="sheet-h">Settings</h2>
    <fieldset class="field"><legend class="field-label">Weight units</legend>
      <div class="segmented">
        <label><input type="radio" name="units" value="kg"${S.units === 'kg' ? ' checked' : ''}><span>Kilograms</span></label>
        <label><input type="radio" name="units" value="lb"${S.units === 'lb' ? ' checked' : ''}><span>Pounds</span></label>
      </div>
    </fieldset>
    <label class="field"><span class="field-label">Weekly goal</span>
      <select id="set-goal">${goals.map((g) => `<option value="${g}"${g === S.weeklyGoal ? ' selected' : ''}>${g} workout${g === 1 ? '' : 's'} a week</option>`).join('')}</select></label>
    <label class="field"><span class="field-label">Rest timer for empty workouts</span>
      <select id="set-rest">${rests.map((s) => `<option value="${s}"${s === S.rest ? ' selected' : ''}>${fmtClock(s)}</option>`).join('')}</select></label>
    <h3 class="sub-h">Your data</h3>
    <p class="fine">Your workouts are stored only on this device. Export a backup now and then so you can restore your history on a new phone.</p>
    <div class="sheet-actions">
      <button class="btn" data-action="export">Export backup</button>
      <label class="btn">Import backup<input type="file" id="import-file" accept="application/json,.json" hidden></label>
    </div>
    <button class="btn-text danger" data-action="erase">Erase all data</button>`, { tall: true });
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({ ...S, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `micro-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup exported.');
}

async function importBackup(file) {
  try {
    const next = parseBackup(await file.text());
    confirmSheet(`This replaces everything on this device with the backup, which has ${next.workouts.length} workout${next.workouts.length === 1 ? '' : 's'}.`, 'Import backup', () => {
      S = next;
      persist();
      closeSheet({ cancelled: false });
      render();
      toast('Backup imported.');
    }, true);
  } catch (err) {
    toast(err instanceof SyntaxError ? 'That file couldn’t be read. Choose a .json backup exported from Micro Fitness.' : err.message);
  }
}

/* ---------- Toast ---------- */

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- Events ---------- */

const actions = {
  go: (b, { id }) => go(id),
  settings: () => openSettings(),
  'close-sheet': () => closeSheet(),
  confirm: () => {
    const fn = confirmFn;
    closeSheet({ cancelled: false });
    fn?.();
  },

  start: (b, { id }) => startWorkout(S.routines.find((r) => r.id === id)),
  'start-empty': () => startWorkout(null),
  'add-exercise': () =>
    openPicker((id) => {
      S.active.entries.push(newEntry(id));
      persist();
      render();
      $$last('.ex')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }),
  'add-set': (b, { i }) => {
    const sets = S.active.entries[i].sets;
    const prev = sets[sets.length - 1];
    sets.push({ w: prev?.w ?? null, r: prev?.r ?? null, done: false });
    persist();
    render();
  },
  'remove-set': (b, { i }) => {
    S.active.entries[i].sets.pop();
    persist();
    render();
  },
  'toggle-set': (b, { i, j }) => {
    const s = S.active.entries[i].sets[j];
    const row = b.closest('.set-row');
    if (!s.done && !s.r) {
      toast('Enter your reps for this set first.');
      $(`[data-set="${i}.${j}.r"]`)?.focus();
      return;
    }
    s.done = !s.done;
    row.classList.toggle('is-done', s.done);
    b.setAttribute('aria-pressed', String(s.done));
    persist();
    if (s.done) {
      primeAudio();
      startTimer(S.active.rest || S.rest);
    }
  },
  'ex-menu': (b, { i }) => exMenu(i),
  'ex-move': (b, { i, id }) => {
    const e = S.active.entries;
    const k = i + Number(id);
    [e[i], e[k]] = [e[k], e[i]];
    persist();
    closeSheet({ cancelled: false });
    render();
  },
  'ex-remove': (b, { i }) => {
    S.active.entries.splice(i, 1);
    persist();
    closeSheet({ cancelled: false });
    render();
  },
  finish: () => finishWorkout(),
  discard: () => confirmSheet('Discard this workout? Sets you’ve logged in it will be lost.', 'Discard workout', discardWorkout, true),

  'timer-add': (b, { id }) => {
    if (!S.timer) return;
    S.timer.endsAt = Math.max(Date.now() + 1000, S.timer.endsAt + Number(id) * 1000);
    S.timer.total = Math.max(S.timer.total, Math.ceil((S.timer.endsAt - Date.now()) / 1000));
    persist();
    updateTimer();
  },
  'timer-skip': () => {
    S.timer = null;
    persist();
    renderTimer();
  },

  pick: (b, { id }) => pick(id),
  'pick-create': () => {
    const name = $('#pick-q').value.trim();
    if (!name) return;
    const ex = { id: uid(), name, group: 'other' };
    S.exercises.push(ex);
    persist();
    pick(ex.id);
  },

  'delete-workout': (b, { id }) =>
    confirmSheet('Delete this workout from your history? This can’t be undone.', 'Delete workout', () => {
      S.workouts = S.workouts.filter((w) => w.id !== id);
      persist();
      render();
    }, true),

  'new-routine': () => {
    draft = { id: uid(), name: '', rest: S.rest, exerciseIds: [], isNew: true };
    openEditor();
  },
  'edit-routine': (b, { id }) => {
    const r = S.routines.find((x) => x.id === id);
    draft = { ...r, exerciseIds: [...r.exerciseIds], isNew: false };
    openEditor();
  },
  'draft-move': (b, { i, id }) => {
    const list = draft.exerciseIds;
    const k = i + Number(id);
    if (k < 0 || k >= list.length) return;
    [list[i], list[k]] = [list[k], list[i]];
    openEditor();
  },
  'draft-remove': (b, { i }) => {
    draft.exerciseIds.splice(i, 1);
    openEditor();
  },
  'draft-add': () =>
    openPicker(
      (id) => {
        draft.exerciseIds.push(id);
        openEditor();
      },
      () => openEditor()
    ),
  'routine-save': () => {
    if (!draft.name.trim()) {
      toast('Give the routine a name.');
      $('#draft-name')?.focus();
      return;
    }
    if (!draft.exerciseIds.length) {
      toast('Add at least one exercise.');
      return;
    }
    const { isNew, ...r } = draft;
    r.name = r.name.trim();
    if (isNew) S.routines.push(r);
    else S.routines = S.routines.map((x) => (x.id === r.id ? r : x));
    persist();
    closeSheet({ cancelled: false });
    render();
    toast(isNew ? 'Routine created.' : 'Routine saved.');
  },
  'routine-delete': () => {
    const id = draft.id;
    confirmSheet(`Delete the “${draft.name}” routine? Past workouts stay in your history.`, 'Delete routine', () => {
      S.routines = S.routines.filter((r) => r.id !== id);
      persist();
      render();
    }, true);
  },

  export: () => exportBackup(),
  erase: () =>
    confirmSheet('Erase all workouts, routines and settings on this device? Export a backup first if you might want them back.', 'Erase everything', () => {
      S = freshState();
      persist();
      render();
      toast('All data erased.');
    }, true),
};

const $$last = (sel) => {
  const all = document.querySelectorAll(sel);
  return all[all.length - 1];
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  const fn = actions[b.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(b, { i: Number(b.dataset.i), j: Number(b.dataset.j), id: b.dataset.id });
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.set && S.active) {
    const [i, j, f] = t.dataset.set.split('.');
    const s = S.active.entries[+i]?.sets[+j];
    if (!s) return;
    if (f === 'w') s.w = fromDisp(t.value);
    else {
      const n = parseInt(t.value, 10);
      s.r = Number.isFinite(n) && n > 0 ? n : null;
    }
    persistSoon();
  } else if (t.dataset.field === 'session-name' && S.active) {
    S.active.name = t.value;
    persistSoon();
  } else if (t.id === 'pick-q') {
    renderPickList(t.value);
  } else if (t.id === 'draft-name' && draft) {
    draft.name = t.value;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'prog-ex') {
    S.progressEx = t.value;
    persist();
    render();
  } else if (t.id === 'draft-rest' && draft) {
    draft.rest = Number(t.value);
  } else if (t.name === 'units') {
    S.units = t.value;
    persist();
    render();
  } else if (t.id === 'set-goal') {
    S.weeklyGoal = Number(t.value);
    persist();
    render();
  } else if (t.id === 'set-rest') {
    S.rest = Number(t.value);
    persist();
  } else if (t.id === 'import-file' && t.files[0]) {
    importBackup(t.files[0]);
    t.value = '';
  }
});

// Enter in a set field jumps to the next field.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Enter' && e.target.dataset?.set) {
    e.preventDefault();
    const fields = [...document.querySelectorAll('[data-set]')];
    const next = fields[fields.indexOf(e.target) + 1];
    if (next) next.focus();
    else e.target.blur();
  }
});

// Select the contents of a number field on focus so it's quick to overwrite.
document.addEventListener('focusin', (e) => {
  if (e.target.classList?.contains('num')) setTimeout(() => e.target.select?.(), 0);
});

window.addEventListener('hashchange', () => {
  closeSheet({ cancelled: false });
  render();
  window.scrollTo(0, 0);
});

// Save in-progress edits when the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
  else updateTimer();
});

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline support unavailable', err));
}
