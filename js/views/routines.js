// Routines tab: saved routines with Edit and Start. The editor itself is in sheets.js.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { fmtClock } from '../format.js';
import { exById } from '../queries.js';

export function viewRoutines() {
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
