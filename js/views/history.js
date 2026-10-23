// History tab: finished workouts, newest first, grouped by month.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { unit, toDisp, setStr, fmtDate, fmtDur, fmtNum, plural } from '../format.js';
import { exById, workoutVolume, workoutSets } from '../queries.js';

export function viewHistory() {
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
        <span class="h-meta">${fmtDur(w.endedAt - w.startedAt)}, ${plural(workoutSets(w), 'set')}${vol ? `, ${fmtNum(toDisp(vol))} ${unit()} lifted` : ''}</span>
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
