// Levels tab: overall level, recent level-ups, muscle groups, and every
// exercise you've done with its XP bar. Rules are in js/levels.js.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { toDisp, unit, fmtDate, ago } from '../format.js';
import { allLevels, exerciseStats, levelFor, XP } from '../levels.js';
import { openSheet } from '../ui.js';

const bar = (lv, label) =>
  `<div class="xp-bar" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${lv.span}" aria-valuenow="${lv.into}"><span style="width:${Math.round(lv.pct * 100)}%"></span></div>`;

const strength = (st) =>
  st.bodyweight
    ? `Best ${Math.round(st.best)} reps`
    : `Est. max ${toDisp(st.best)} ${unit()}`;
const gainText = (st) => (st.sessions > 1 && st.gain > 0.5 ? `, up ${Math.round(st.gain)}%` : '');

// The overall level as a weight plate: the ring fills as you earn XP.
function plate(lv) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return `<svg class="lv-plate" viewBox="0 0 128 128" aria-hidden="true">
    <circle class="lv-plate-face" cx="64" cy="64" r="62"/>
    <circle class="lv-plate-track" cx="64" cy="64" r="${r}"/>
    <circle class="lv-plate-fill" cx="64" cy="64" r="${r}" stroke-dasharray="${(lv.pct * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 64 64)"/>
    <circle class="lv-plate-hub" cx="64" cy="64" r="38"/>
    <text class="lv-plate-n" x="64" y="64" text-anchor="middle" dominant-baseline="central">${lv.level}</text>
  </svg>`;
}

export function viewLevels() {
  const L = allLevels();
  if (!L.exercises.length)
    return `<div class="empty-state"><p>Every workout earns XP, and every tiny step earns more. Finish a workout to reach level 2.</p><button class="btn btn-primary" data-action="go" data-id="train">Start a workout</button></div>`;

  const o = L.overall;
  const bests = L.exercises.reduce((t, st) => t + st.events.reduce((a, e) => a + e.items.filter((x) => x.why === 'New best').length, 0), 0);
  const ups = L.levelUps.slice(0, 5);
  const sort = S.levelSort || 'level';
  const list = [...L.exercises].sort(
    sort === 'recent' ? (a, b) => b.events[b.events.length - 1].t - a.events[a.events.length - 1].t
    : sort === 'close' ? (a, b) => a.toNext - b.toNext
    : (a, b) => b.xp - a.xp
  );

  return `
    <section class="lv-hero">
      ${plate(o)}
      <div class="lv-hero-text">
        <p class="lv-title">${esc(o.title)}</p>
        <p class="lv-overall">Level ${o.level}</p>
        ${bar(o, `Overall level ${o.level}`)}
        <p class="fine">${o.into} of ${o.span} XP. ${o.toNext} to level ${o.level + 1}.</p>
      </div>
    </section>
    <dl class="totals">
      <div><dt>Total XP</dt><dd>${o.xp.toLocaleString()}</dd></div>
      <div><dt>Tiny steps</dt><dd>${S.stepsTaken || 0}</dd></div>
      <div><dt>New bests</dt><dd>${bests}</dd></div>
    </dl>

    ${
      ups.length
        ? `<h2 class="section-h">Recent level-ups</h2><ul class="lv-recent">${ups
            .map((u) => `<li><span class="lvl-badge" aria-hidden="true">${u.level}</span><span><strong>${esc(u.name)}</strong> reached level ${u.level}</span><span class="fine">${ago(u.t)}</span></li>`)
            .join('')}</ul>`
        : ''
    }

    <h2 class="section-h">Muscle groups</h2>
    <ul class="lv-list">${L.groups
      .map((g) => `<li class="lv-row lv-group">
        <span class="lv-name"><span class="dot" data-g="${g.group}"></span>${esc(g.name)}</span>
        <span class="lv-lvl">Level ${g.level}</span>
        ${bar(g, `${g.name} level ${g.level}`)}
      </li>`)
      .join('')}</ul>

    <div class="lv-head">
      <h2 class="section-h">Exercises</h2>
      <label class="lv-sort"><span class="sr-only">Sort exercises</span>
        <select id="level-sort">
          <option value="level"${sort === 'level' ? ' selected' : ''}>Highest level</option>
          <option value="close"${sort === 'close' ? ' selected' : ''}>Closest to levelling up</option>
          <option value="recent"${sort === 'recent' ? ' selected' : ''}>Trained most recently</option>
        </select>
      </label>
    </div>
    <ul class="lv-list">${list
      .map((st) => `<li><button class="lv-row lv-ex" data-action="level-ex" data-id="${st.id}">
        <span class="lv-name"><span class="dot" data-g="${st.group}"></span>${esc(st.name)}</span>
        <span class="lv-lvl">Level ${st.level}</span>
        ${bar(st, `${st.name} level ${st.level}`)}
        <span class="lv-sub">${strength(st)}${gainText(st)}. ${st.toNext} XP to level ${st.level + 1}.</span>
      </button></li>`)
      .join('')}</ul>

    <details class="lv-how">
      <summary>How XP works</summary>
      <ul>
        <li><strong>+${XP.show}</strong> for every workout an exercise is in. Showing up counts.</li>
        <li><strong>+${XP.reps}</strong> for a tiny step of one more rep or a shorter rest.</li>
        <li><strong>+${XP.weight}</strong> for a tiny step up in weight.</li>
        <li><strong>+${XP.best}</strong> for a new best: your highest estimated one-rep max, or most reps on a bodyweight move.</li>
      </ul>
      <p class="fine">Each level takes a little more XP than the last. Levels never go down, even when you change phase.</p>
    </details>`;
}

/* ---------- One exercise ---------- */

export function openLevelDetail(id) {
  const st = exerciseStats().get(id);
  if (!st) return;
  const recent = [...st.events].reverse().slice(0, 12);
  openSheet(`<h2 class="sheet-h">${esc(st.name)}</h2>
    <div class="lv-detail">
      <p class="lv-overall">Level ${st.level}</p>
      ${bar(st, `${st.name} level ${st.level}`)}
      <p class="fine">${st.into} of ${st.span} XP. ${st.toNext} to level ${st.level + 1}.</p>
    </div>
    <dl class="totals">
      <div><dt>${st.bodyweight ? 'Best reps' : `Est. max (${unit()})`}</dt><dd>${st.bodyweight ? Math.round(st.best) : toDisp(st.best)}</dd></div>
      <div><dt>Started at</dt><dd>${st.bodyweight ? Math.round(st.first) : toDisp(st.first)}</dd></div>
      <div><dt>Workouts</dt><dd>${st.sessions}</dd></div>
    </dl>
    ${st.gain > 0.5 ? `<p class="lede">You’re ${Math.round(st.gain)}% stronger at this than when you started.</p>` : ''}
    <h3 class="sub-h">Recent XP</h3>
    <ul class="lv-log">${recent
      .map((e) => `<li><span class="lv-log-date">${fmtDate(e.t)}</span><span class="lv-log-why">${e.items.map((x) => esc(x.why)).join(', ')}</span><span class="lv-log-pts">+${e.pts}</span></li>`)
      .join('')}</ul>
    ${st.levelUps.length ? `<p class="fine">Reached level ${st.level} on ${fmtDate(st.levelUps[st.levelUps.length - 1].t, { day: 'numeric', month: 'long' })}.</p>` : ''}
    <button class="btn btn-wide" data-action="close-sheet">Done</button>`, { tall: true });
}

export { levelFor };
