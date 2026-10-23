// Toast messages and the bottom-sheet system (all dialogs are sheets).

import { $, esc } from './dom.js';

/* ---------- Toast ---------- */

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- Sheets ---------- */

// Callbacks for whichever sheet is open.
// onPick/onCancel: exercise picker. confirm: confirmSheet's action.
export const sheetState = { onPick: null, onCancel: null, confirm: null };

let lastFocus = null;
let closedAt = 0;

export function openSheet(html, { tall = false } = {}) {
  const root = $('#sheet-root');
  const opening = !root.classList.contains('open');
  const handoff = Date.now() - closedAt < 100; // one sheet replacing another
  if (opening && !handoff) lastFocus = document.activeElement;
  // Re-rendering an open sheet keeps its scroll position and skips the slide-in.
  const scroll = opening ? 0 : $('.sheet', root)?.scrollTop || 0;
  root.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet${tall ? ' sheet-tall' : ''}${opening && !handoff ? ' sheet-enter' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  root.classList.add('open');
  document.body.classList.add('sheet-open');
  const sheet = $('.sheet', root);
  sheet.setAttribute('aria-label', $('.sheet-h', sheet)?.textContent || 'Dialog');
  sheet.tabIndex = -1;
  sheet.scrollTop = scroll;
  sheet.focus({ preventScroll: true });
}

// cancelled: true when the user dismissed the sheet (backdrop, Cancel, Escape),
// which runs the picker's onCancel if one is set.
export function closeSheet({ cancelled = true } = {}) {
  const root = $('#sheet-root');
  if (!root.classList.contains('open')) return;
  root.classList.remove('open');
  root.innerHTML = '';
  closedAt = Date.now();
  document.body.classList.remove('sheet-open');
  const cb = cancelled && sheetState.onCancel;
  sheetState.onPick = sheetState.onCancel = sheetState.confirm = null;
  if (cb) cb();
  else lastFocus?.focus?.({ preventScroll: true });
}

export function confirmSheet(message, label, fn, danger = false) {
  openSheet(`<h2 class="sheet-h">Are you sure?</h2>
    <p class="lede">${esc(message)}</p>
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${esc(label)}</button>
    </div>`);
  sheetState.confirm = fn;
}
