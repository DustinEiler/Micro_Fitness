// Progress tab: 12-week consistency strip, streak, and a per-exercise chart.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { unit, toDisp, e1rm, setScore, setStr, fmtDate } from '../format.js';
import { exById, weekCounts, streak } from '../queries.js';

export function viewProgress() {
  const weeks = weekCounts(12);
  const st = streak();
  const strip = weeks
    .map((w) => {
      const cls = w.count >= S.weeklyGoal ? 'met' : w.count ? 'part' : '';
      return `<li class="${cls}" title="Week of ${fmtDate(w.start, { day: 'numeric', month: 'short' })}: ${w.count} workout${w.count === 1 ? '' : 's'}"><span>${w.count || ''}</span></li>`;
    })
    .join('');

  // Exercises with any history, most recently logged first.
  const logged = [];
  for (const w of [...S.workouts].reverse())
    for (const e of w.entries) if (!logged.includes(e.exerciseId)) logged.push(e.exerciseId);
  const sel = logged.includes(S.progressEx) ? S.progressEx : logged[0];

  const monthKey = (ts) => fmtDate(ts, { month: 'numeric', year: 'numeric' });
  const thisMonth = S.workouts.filter((w) => monthKey(w.startedAt) === monthKey(Date.now())).length;

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

// Hand-drawn SVG line chart: best estimated 1RM per session
// (or max reps for exercises that have never had weight logged).
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
