// Train tab while a workout is running (S.active): exercises with set rows.
// Set inputs carry data-set="entryIndex.setIndex.field" (field is w or r).

import { S } from '../state.js';
import { esc, ICON } from '../dom.js';
import { unit, toDisp, setStr, fmtElapsed } from '../format.js';
import { exById, lastSetsFor } from '../queries.js';
import { GROUPS } from '../data.js';

export function viewSession() {
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
            <input class="num" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="Set ${j + 1} weight in ${unit()}" data-set="${i}.${j}.w" value="${s.w == null ? '' : toDisp(s.w)}" placeholder="${p ? (p.w ? toDisp(p.w) : 'BW') : '–'}">
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
