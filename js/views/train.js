// Train tab when no workout is running: weekly goal barbell + routine list.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { ago } from '../format.js';
import { weekCounts } from '../queries.js';
import { itemsForToday } from '../rotation.js';
import { GROUPS } from '../data.js';
import { currentPhase, phaseWeek, phaseComplete, rangeText, PHASE_WEEKS } from '../phases.js';
import { goalProgress, nextRoutine, todayLine } from '../goal.js';

const pctText = (n) => `${Math.round(n * 10) / 10}%`;

// The SMART goal: statement, reason, and progress on each measure.
function goalCard() {
  if (!S.goal) {
    if (S.onboarding !== 'offer') return '';
    return `<section class="goal-card goal-offer">
      <h2 class="gc-h">Set a goal, get a plan</h2>
      <p>Answer a few questions about your goals, time and experience, and Micro Fitness builds routines to match.</p>
      <div class="gc-actions"><button class="btn btn-primary btn-small" data-action="setup">Set up my plan</button><button class="btn btn-quiet btn-small" data-action="setup-later">Not now</button></div>
    </section>`;
  }
  const g = goalProgress();
  const bar = (v, max) => `<span class="gc-bar"><span style="width:${Math.min(100, max ? (v / max) * 100 : 0)}%"></span></span>`;
  const lift = g.lift
    ? `<div class="gc-row"><span class="gc-label">${esc(g.lift.name)}</span><span class="gc-val">${g.lift.started ? `+${pctText(g.lift.gained)} of +${g.lift.target}%` : 'Starts next session'}</span>${bar(g.lift.gained, g.lift.target)}</div>`
    : '';
  const hit = g.workouts >= g.target && (!g.lift || g.lift.gained >= g.lift.target);
  return `<section class="goal-card${g.ended ? ' is-ended' : ''}">
    <h2 class="gc-h">${g.ended ? (hit ? 'Goal reached' : 'Goal date reached') : 'Your goal'}</h2>
    <p class="gc-text">${esc(S.goal.statement)}</p>
    ${S.goal.whyText ? `<p class="gc-why">“${esc(S.goal.whyText)}”</p>` : ''}
    <div class="gc-row"><span class="gc-label">Workouts</span><span class="gc-val">${g.workouts} of ${g.target}</span>${bar(g.workouts, g.target)}</div>
    ${lift}
    ${
      g.ended
        ? `<p class="gc-foot">${hit ? 'You did it. Set the next goal while the momentum’s there.' : 'Every workout you did still counts. Set a new goal and keep going.'}</p><button class="btn btn-primary btn-small" data-action="new-goal">Set my next goal</button>`
        : `<p class="gc-foot">${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left. ${esc(todayLine())}</p>`
    }
  </section>`;
}

// Current training phase and how far through its 13 weeks you are.
function phaseCard() {
  const p = currentPhase();
  const week = phaseWeek();
  if (phaseComplete())
    return `<button class="phase-card is-done" data-action="phase">
      <span class="pc-top"><span class="pc-name">${p.name} phase complete</span><span class="pc-week">${PHASE_WEEKS} of ${PHASE_WEEKS} weeks</span></span>
      <span class="pc-bar"><span style="width:100%"></span></span>
      <span class="pc-cta">Choose your next phase</span>
    </button>`;
  return `<button class="phase-card" data-action="phase" aria-label="${p.name} phase, week ${week} of ${PHASE_WEEKS}. Change phase">
    <span class="pc-top"><span class="pc-name">${p.name} phase</span><span class="pc-week">Week ${week} of ${PHASE_WEEKS}</span></span>
    <span class="pc-bar"><span style="width:${(week / PHASE_WEEKS) * 100}%"></span></span>
    <span class="pc-range">${rangeText(p)}</span>
  </button>`;
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

export function viewTrain() {
  const done = weekCounts(1)[0].count;
  const left = S.weeklyGoal - done;
  const line =
    left > 0
      ? `${done} of ${S.weeklyGoal} workouts this week. ${left} to go.`
      : done === S.weeklyGoal
        ? `Weekly goal met: ${done} of ${S.weeklyGoal} workouts.`
        : `Weekly goal beaten: ${done} workouts against a goal of ${S.weeklyGoal}.`;
  const next = nextRoutine();
  const ordered = next ? [next, ...S.routines.filter((r) => r !== next)] : S.routines;
  const rows = ordered
    .map((r) => {
      const last = [...S.workouts].reverse().find((w) => w.routineId === r.id);
      return `<li><button class="routine-start${r === next ? ' is-next' : ''}" data-action="start" data-id="${r.id}">
        <span class="rs-name">${esc(r.name)}${r === next ? ' <span class="rs-tag">Next up</span>' : ''}</span>
        <span class="rs-meta">${r.groups.map((g) => GROUPS[g.group] || 'Other').join(', ')}. ${itemsForToday(r).length} exercises${last ? `, last done ${ago(last.startedAt)}` : ''}</span>
      </button></li>`;
    })
    .join('');
  return `
    ${goalCard()}
    ${phaseCard()}
    <section class="week">
      ${barbell(done, S.weeklyGoal)}
      <p class="week-line">${line}</p>
      ${S.stepsTaken ? `<p class="fine">${S.stepsTaken} tiny step${S.stepsTaken === 1 ? '' : 's'} taken so far. Each one makes the next workout a little stronger.</p>` : `<p class="fine">Each workout moves every exercise one tiny step forward.</p>`}
    </section>
    <h2 class="section-h">Start a routine</h2>
    ${S.routines.length ? `<ul class="routine-list">${rows}</ul>` : `<p class="empty">You don’t have any routines yet. <a href="#routines">Create a routine</a> or start an empty workout.</p>`}
    <button class="btn btn-wide" data-action="start-empty">Start empty workout</button>`;
}
