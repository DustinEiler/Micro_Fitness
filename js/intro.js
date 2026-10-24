// The intro: a short set of questions on first launch that builds a SMART
// goal and a plan. Full-screen, one question per screen, Back and Next.
// openIntro('full') runs every step; openIntro('goal') just sets a new goal.

import { S, persist } from './state.js';
import { $, esc } from './dom.js';
import { EQUIPMENT, GROUPS } from './data.js';
import { PHASES, rangeText, fmtRest } from './phases.js';
import { exById } from './queries.js';
import { toast } from './ui.js';
import { render } from './router.js';
import {
  GOALS, WHYS, ENJOY, MINUTES, PLACES, EXPERIENCE, BARRIERS, AREAS, SLEEP, TIMEFRAMES,
  DAY_SHORT, WEEK_ORDER, defaultProfile, buildPlan, estimateMinutes, liftChoices,
  recommendedPct, PCT_OPTIONS, isAmbitious, workoutsTarget, goalStatement, tipsFor, isBeginner,
} from './planner.js';
import { applyPlan, applyGoalOnly } from './goal.js';

const st = { mode: 'full', i: 0, p: null, plan: null, replace: true };

/* ---------- Building blocks ---------- */

const opt = (key, val, label, help, on, multi = false) =>
  `<button class="io" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}" data-pick="${key}" data-val="${esc(val)}"${multi ? ' data-multi="1"' : ''}>
    <span class="io-label">${label}</span>${help ? `<span class="io-help">${help}</span>` : ''}
  </button>`;

const options = (key, map, multi = false, helpOf = null) =>
  `<div class="io-list" role="${multi ? 'group' : 'radiogroup'}">${Object.entries(map)
    .map(([v, label]) => {
      const text = typeof label === 'string' ? label : label.label;
      const help = typeof label === 'string' ? helpOf?.(v) : label.help;
      const cur = st.p[key];
      const on = multi ? (cur || []).includes(v) : String(cur) === String(v);
      return opt(key, v, text, help, on, multi);
    })
    .join('')}</div>`;

const chipRow = (key, entries) =>
  `<div class="io-chips" role="group">${entries
    .map(([v, label]) => {
      // Compare as text: days are saved as numbers, chip values are strings.
      const on = (st.p[key] || []).map(String).includes(String(v));
      return `<button class="io-chip" role="checkbox" aria-checked="${on}" data-pick="${key}" data-val="${v}" data-multi="1"><span class="io-tick" aria-hidden="true">✓</span>${label}</button>`;
    })
    .join('')}</div>`;

/* ---------- Steps ---------- */

const STEPS = [
  {
    id: 'welcome',
    title: 'Let’s build your plan',
    body: () => `<p class="in-lede">A few quick questions about your goals, your time and your experience. Micro Fitness then builds a plan that makes you a tiny bit stronger every workout.</p>
      <p class="in-lede">It takes about two minutes. You can change anything later, and your answers stay on this device.</p>`,
    next: 'Start',
  },
  {
    id: 'goal',
    title: 'What’s your main goal?',
    help: 'Pick the one that matters most right now. One goal at a time is easier to reach.',
    body: () => options('goal', GOALS),
    valid: (p) => (p.goal ? true : 'Pick a goal to continue.'),
  },
  {
    id: 'why',
    title: 'Why does this matter to you now?',
    help: 'Your reason keeps you going when progress feels slow. It’ll be on the Train screen as a reminder.',
    body: () => `${chipRow('why', Object.entries(WHYS).map(([v, l]) => [v, l[0].toUpperCase() + l.slice(1)]))}
      <label class="in-field"><span>In your own words (optional)</span>
        <textarea id="in-why" rows="2" maxlength="160" placeholder="For example, to carry my kids without my back hurting">${esc(st.p.whyText)}</textarea></label>`,
    valid: (p) => (p.why.length || p.whyText.trim() ? true : 'Pick at least one reason, or write your own.'),
  },
  {
    id: 'enjoy',
    title: 'What do you actually enjoy?',
    help: 'You’ll stick with what you like. Pick as many as you want.',
    body: () => options('enjoy', ENJOY, true),
    optional: true,
  },
  {
    id: 'days',
    title: 'Which days can you train?',
    help: 'Be honest about your week. Two or three days is plenty to start, and you need at least one rest day.',
    body: () => {
      const n = st.p.days.length;
      return `<div class="io-days">${chipRow('days', WEEK_ORDER.map((d) => [String(d), DAY_SHORT[d]]))}</div>
        <p class="in-note">${n ? `${n} day${n === 1 ? '' : 's'} a week: ${WEEK_ORDER.filter((d) => st.p.days.includes(d)).map((d) => DAY_SHORT[d]).join(', ')}.` : 'Tap the days you can train.'}${n === 1 ? ' Two days a week works every muscle often enough to build strength.' : ''}</p>`;
    },
    valid: (p) => (p.days.length ? true : 'Pick at least one day.'),
  },
  {
    id: 'minutes',
    title: 'How long can each session be?',
    help: 'Including a few minutes to warm up. Your plan is sized to fit.',
    body: () => options('minutes', MINUTES),
    valid: (p) => (p.minutes ? true : 'Pick a session length.'),
  },
  {
    id: 'equipment',
    title: 'Where will you train?',
    help: 'This decides which exercises are in your plan. Untick anything you don’t have.',
    body: () => `${options('place', Object.fromEntries(Object.entries(PLACES).map(([k, v]) => [k, v.label])))}
      ${st.p.place ? `<h3 class="in-sub">Equipment you have</h3>${chipRow('equip', Object.entries(EQUIPMENT))}<p class="in-note">${st.p.equip.length ? '' : 'Bodyweight only: that’s fine, there are plenty of exercises for it.'}</p>` : ''}`,
    valid: (p) => (p.place ? true : 'Pick where you’ll train.'),
  },
  {
    id: 'experience',
    title: 'How much have you trained before?',
    help: 'Beginners start with simpler moves and longer rests, so form stays good.',
    body: () => options('experience', EXPERIENCE),
    valid: (p) => (p.experience ? true : 'Pick one to continue.'),
  },
  {
    id: 'barriers',
    title: 'What made you stop in the past?',
    help: 'Knowing this helps you plan around it. Skip if this is your first time.',
    body: () => options('barriers', BARRIERS, true),
    optional: true,
  },
  {
    id: 'injuries',
    title: 'Any injuries or pain to work around?',
    help: 'The riskiest exercises for those areas will be switched off to start with. You can switch them back on.',
    body: () => options('injuries', AREAS, true),
    optional: true,
    skip: 'No injuries',
  },
  {
    id: 'health',
    title: 'Health and recovery',
    help: 'Has a doctor told you to limit exercise, or do you have a heart condition, chest pain, dizziness or another condition that affects exercise?',
    body: () => `${options('health', { no: 'No', yes: 'Yes', unsure: 'Not sure' })}
      ${st.p.health === 'yes' || st.p.health === 'unsure' ? '<p class="in-warn">Please check with your doctor before starting, especially before lifting heavy. Your plan will start gently, with longer rests.</p>' : ''}
      <h3 class="in-sub">How much do you usually sleep?</h3>${options('sleep', SLEEP)}`,
    valid: (p) => (p.health && p.sleep ? true : 'Answer both questions to continue.'),
  },
  {
    id: 'smart',
    title: 'Your goal',
    help: 'Specific, measurable and with a date, so you’ll know when you’ve done it.',
    enter: () => ensurePlan(),
    body: () => smartBody(),
  },
  {
    id: 'plan',
    title: 'Your plan',
    enter: () => ensurePlan(true),
    body: () => planBody(),
    next: 'Start my plan',
  },
];

const stepsFor = (mode) => (mode === 'goal' ? STEPS.filter((s) => s.id === 'smart') : STEPS);

/* ---------- The goal step ---------- */

function ensurePlan(force = false) {
  if (st.mode === 'goal') {
    st.plan = { routines: S.routines, phase: { id: S.phase?.id || 'hypertrophy' } };
  } else if (force || !st.plan) st.plan = buildPlan(st.p);
  const choices = liftChoices(st.plan);
  if (!choices.some((e) => e.id === st.p.liftId)) st.p.liftId = choices[0]?.id || null;
  if (st.p.pct == null) st.p.pct = recommendedPct(st.p.experience, st.p.weeks);
}

function smartBody() {
  const p = st.p;
  const choices = liftChoices(st.plan);
  const rec = recommendedPct(p.experience, p.weeks);
  const endsAt = Date.now() + p.weeks * 7 * 864e5;
  const ex = p.liftId ? exById(p.liftId) : null;
  const bw = ex && !(ex.equip || []).some((q) => ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine'].includes(q));
  const ambitious = isAmbitious(p.pct, p.experience, p.weeks);
  return `<h3 class="in-sub">By when?</h3>
    ${options('weeks', TIMEFRAMES)}
    <h3 class="in-sub">A lift to measure</h3>
    <label class="in-field"><span>Exercise</span>
      <select id="in-lift">${choices.map((e) => `<option value="${e.id}"${e.id === p.liftId ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
    <p class="in-note">Your first session sets the starting point. The app tracks your ${bw ? 'best reps in a set' : 'estimated one-rep max'} from there.</p>
    <h3 class="in-sub">Improve it by</h3>
    <div class="io-chips" role="radiogroup">${PCT_OPTIONS.map((v) => `<button class="io-chip" role="radio" aria-checked="${v === p.pct}" data-pick="pct" data-val="${v}">${v}%${v === rec ? ' <span class="io-rec">suggested</span>' : ''}</button>`).join('')}</div>
    <p class="${ambitious ? 'in-warn' : 'in-note'}">${ambitious ? `That’s ambitious for ${TIMEFRAMES[p.weeks]}. Around ${rec}% is realistic at your level, and a goal you hit beats one you give up on.` : `${rec}% is realistic for ${TIMEFRAMES[p.weeks]} at your level.`}</p>
    <div class="in-goal">
      <p class="in-goal-text">${esc(goalStatement(p, endsAt, ex?.name, bw))}</p>
      <dl class="in-smart">
        <div><dt>Specific</dt><dd>${p.days.length} set days a week</dd></div>
        <div><dt>Measurable</dt><dd>${workoutsTarget(p.days.length, p.weeks)} workouts${ex ? `, ${ex.name.toLowerCase()} +${p.pct}%` : ''}</dd></div>
        <div><dt>Attainable</dt><dd>${ambitious ? 'A stretch' : 'Realistic for you'}</dd></div>
        <div><dt>Relevant</dt><dd>${esc(p.whyText.trim() || (p.why[0] ? WHYS[p.why[0]] : '') || '–')}</dd></div>
        <div><dt>Time-bound</dt><dd>${new Date(endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
      </dl>
    </div>`;
}

/* ---------- The plan step ---------- */

function planBody() {
  const plan = st.plan;
  const ph = PHASES[plan.phase.id];
  const days = plan.days;
  const schedule = days.map((d, k) => `<li><span class="sch-day">${DAY_SHORT[d]}</span><span>${esc(plan.routines[k % plan.routines.length].name)}</span></li>`).join('');
  const routines = plan.routines
    .map((r) => {
      const mins = estimateMinutes(r, plan.phase.id, plan.beginner);
      const groups = r.groups.map((g) => `${esc(GROUPS[g.group] || 'Other')}${g.count > 1 ? ` × ${g.count}` : ''}`).join(', ');
      const first = r.items.filter((it) => it.picked).slice(0, 4).map((it) => esc(exById(it.exerciseId).name)).join(', ');
      return `<li class="pl-r"><span class="pl-name">${esc(r.name)}</span><span class="pl-meta">${groups}. About ${mins} minutes.</span><span class="pl-ex">${first}${r.items.length > 4 ? ` and ${r.items.length - 4} more in the rotation` : ''}</span></li>`;
    })
    .join('');
  const tips = tipsFor(st.p, plan);
  const hasOwn = S.workouts.length || S.routines.some((r) => !r.planned && !['push', 'pull', 'legs'].includes(r.id));
  return `<div class="pl-phase"><p class="pl-phase-name">${ph.name} phase, 13 weeks</p><p class="in-note">${rangeText(ph)}.${plan.phase.foundation ? ' A foundation before heavier work.' : ''}</p></div>
    <h3 class="in-sub">Your week</h3><ul class="sch">${schedule}</ul>
    <h3 class="in-sub">Routines</h3><ul class="pl-list">${routines}</ul>
    <p class="in-note">Each workout moves every exercise one tiny step forward: one more rep, a little more weight, or ${fmtRest(5)} less rest.</p>
    ${tips.length ? `<h3 class="in-sub">Good to know</h3><ul class="tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${
      hasOwn
        ? `<h3 class="in-sub">Your current routines</h3>${['replace', 'keep']
            .map((v) => opt('replace', v, v === 'replace' ? 'Replace them with this plan' : 'Keep them and add this plan', v === 'replace' ? 'Your workout history stays.' : '', (v === 'replace') === st.replace))
            .join('')}`
        : ''
    }`;
}

/* ---------- Render ---------- */

function renderIntro(focusTop = true) {
  const steps = stepsFor(st.mode);
  const step = steps[st.i];
  const root = $('#intro-root');
  const n = steps.length;
  root.innerHTML = `<div class="intro" role="dialog" aria-modal="true" aria-labelledby="in-title">
    <header class="in-top">
      ${st.i > 0 ? '<button class="in-back" data-in="back">Back</button>' : '<span></span>'}
      ${n > 1 ? `<div class="in-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${st.i + 1}" aria-label="Step ${st.i + 1} of ${n}"><span style="width:${((st.i + 1) / n) * 100}%"></span></div>` : '<span></span>'}
      <button class="in-close" data-in="close">${st.i === 0 && st.mode === 'full' ? 'Skip' : 'Close'}</button>
    </header>
    <main class="in-body" id="in-body">
      <h1 id="in-title">${step.title}</h1>
      ${step.help ? `<p class="in-help">${step.help}</p>` : ''}
      ${step.body()}
    </main>
    <footer class="in-foot">
      ${step.optional ? `<button class="btn" data-in="skip">${step.skip || 'Skip'}</button>` : ''}
      <button class="btn btn-primary" data-in="next">${step.next || (st.mode === 'goal' ? 'Save goal' : 'Next')}</button>
    </footer>
  </div>`;
  root.hidden = false;
  document.body.classList.add('intro-open');
  if (focusTop) {
    $('#in-body').scrollTop = 0;
    $('#in-title').focus?.();
  }
}

function go(delta) {
  const steps = stepsFor(st.mode);
  st.i = Math.max(0, Math.min(steps.length - 1, st.i + delta));
  steps[st.i].enter?.();
  renderIntro();
}

function next() {
  const steps = stepsFor(st.mode);
  const step = steps[st.i];
  const ok = step.valid ? step.valid(st.p) : true;
  if (ok !== true) return toast(ok);
  if (st.i < steps.length - 1) return go(1);
  finish();
}

function finish() {
  if (st.mode === 'goal') {
    applyGoalOnly(st.p);
    toast('New goal saved.');
  } else {
    applyPlan(st.p, st.plan, { replace: st.replace });
    toast('Your plan is ready. Start with the routine marked Next up.');
  }
  persist();
  closeIntro();
  location.hash = '#train';
  render();
}

export function closeIntro() {
  const root = $('#intro-root');
  root.hidden = true;
  root.innerHTML = '';
  document.body.classList.remove('intro-open');
}

export function openIntro(mode = 'full') {
  st.mode = mode === 'goal' && S.profile?.days?.length ? 'goal' : 'full';
  st.i = 0;
  st.p = { ...defaultProfile(), ...(S.profile || {}), weeks: S.profile?.weeks || 13, pct: null };
  st.plan = null;
  st.replace = true;
  stepsFor(st.mode)[0].enter?.();
  renderIntro();
}

/* ---------- Events (scoped to the intro) ---------- */

function onPick(b) {
  const key = b.dataset.pick;
  let val = b.dataset.val;
  if (key === 'replace') {
    st.replace = val === 'replace';
    return renderIntro(false);
  }
  if (['minutes', 'weeks', 'pct'].includes(key)) val = Number(val);
  if (key === 'days') val = Number(val);
  if (b.dataset.multi) {
    const list = new Set(st.p[key] || []);
    if (list.has(val)) list.delete(val);
    else {
      if (key === 'days' && list.size >= 6) return toast('Keep at least one rest day a week. Recovery is when you get stronger.');
      list.add(val);
    }
    st.p[key] = [...list];
  } else {
    st.p[key] = val;
    if (key === 'place') st.p.equip = [...PLACES[val].equip];
    if (key === 'experience' || key === 'weeks') st.p.pct = recommendedPct(st.p.experience, st.p.weeks);
  }
  const scroll = $('#in-body')?.scrollTop || 0;
  renderIntro(false);
  $('#in-body').scrollTop = scroll;
}

export function initIntro() {
  const root = $('#intro-root');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick], [data-in]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation(); // keep the app's own button handler out of it
    if (b.dataset.pick) return onPick(b);
    const act = b.dataset.in;
    if (act === 'back') go(-1);
    else if (act === 'next') next();
    else if (act === 'skip') {
      const key = stepsFor(st.mode)[st.i].id;
      if (key === 'injuries') st.p.injuries = [];
      go(1);
    } else if (act === 'close') {
      if (st.mode === 'full' && S.onboarding !== 'done') {
        S.onboarding = 'offer';
        persist();
        render();
      }
      closeIntro();
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'in-why') st.p.whyText = e.target.value;
  });
  root.addEventListener('change', (e) => {
    if (e.target.id === 'in-lift') {
      st.p.liftId = e.target.value;
      renderIntro(false);
    }
  });
}

