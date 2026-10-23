// Routines tab: saved routines with each exercise's current baseline.
// The editor itself is in sheets.js.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { describe } from '../progression.js';
import { exById } from '../queries.js';

export function viewRoutines() {
  const items = S.routines
    .map(
      (r) => `<li class="routine-card">
        <div class="rc-main">
          <h2>${esc(r.name)}</h2>
          <ul class="rc-items">${r.items
            .map((it) => `<li><span>${esc(exById(it.exerciseId).name)}</span><span class="fine">${it.ready ? describe(it) : `${it.sets} × ${it.reps}`}</span></li>`)
            .join('')}</ul>
          ${r.items.some((it) => !it.ready) ? `<p class="fine rc-note">Weights are set in your first session with this routine.</p>` : ''}
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
