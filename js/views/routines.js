// Routines tab: each routine's muscle groups and a preview of what its next
// workout will be. The editor and exercise list are in js/editor.js.

import { S } from '../state.js';
import { esc } from '../dom.js';
import { describe } from '../progression.js';
import { exById } from '../queries.js';
import { GROUPS } from '../data.js';
import { candidates, itemsForToday } from '../rotation.js';

export function viewRoutines() {
  const offCount = S.exercises.filter((e) => e.off).length;
  const cards = S.routines
    .map((r) => {
      const next = itemsForToday(r).map((k) => r.items[k]);
      return `<li class="routine-card">
        <div class="rc-main">
          <h2>${esc(r.name)}</h2>
          <ul class="rc-groups">${r.groups
            .map(({ group, count }) => {
              const n = candidates(r, group).length;
              return `<li><span class="dot" data-g="${group}"></span><span>${GROUPS[group] || 'Other'} × ${count}</span><span class="fine">${n} in rotation</span></li>`;
            })
            .join('')}</ul>
          <h3 class="rc-next-h">Next workout</h3>
          ${
            next.length
              ? `<ul class="rc-items">${next
                  .map((it) => `<li><span>${esc(exById(it.exerciseId).name)}</span><span class="fine">${it.ready ? describe(it) : `${it.sets} × ${it.reps}`}</span></li>`)
                  .join('')}</ul>`
              : `<p class="fine">Nothing available. Tick some exercises, or switch some back on in the exercise list.</p>`
          }
          ${next.some((it) => !it.ready) ? `<p class="fine rc-note">Weights for new exercises are set the first time you do them.</p>` : ''}
        </div>
        <div class="rc-actions">
          <button class="btn btn-small" data-action="edit-routine" data-id="${r.id}">Edit</button>
          <button class="btn btn-small btn-primary" data-action="start" data-id="${r.id}">Start</button>
        </div>
      </li>`;
    })
    .join('');
  return `${cards ? `<ul class="routine-cards">${cards}</ul>` : `<p class="empty">Routines are training days built from muscle groups, like chest, triceps and shoulders.</p>`}
    <button class="btn btn-wide btn-primary" data-action="new-routine">New routine</button>
    <button class="btn btn-wide" data-action="exercise-list">Exercise list${offCount ? ` (${offCount} switched off)` : ''}</button>`;
}
