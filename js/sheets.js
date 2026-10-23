// Content for the bottom sheets: exercise picker, per-exercise menu,
// routine editor, settings, and backup export/import.

import { S, setState, persist } from './state.js';
import { uid, parseBackup } from './store.js';
import { $, esc, ICON } from './dom.js';
import { fmtClock } from './format.js';
import { exById } from './queries.js';
import { GROUPS } from './data.js';
import { openSheet, closeSheet, confirmSheet, sheetState, toast } from './ui.js';
import { render } from './router.js';

/* ---------- Exercise picker ---------- */

// onPick(exerciseId) runs after a choice; onCancel runs if the sheet is dismissed.
export function openPicker(onPick, onCancel) {
  openSheet(`<h2 class="sheet-h">Add exercise</h2>
    <input type="search" id="pick-q" class="search" placeholder="Search or type a new exercise" aria-label="Search exercises" autocomplete="off" enterkeyhint="search">
    <div id="pick-list" class="pick-list"></div>`, { tall: true });
  sheetState.onPick = onPick;
  sheetState.onCancel = onCancel || null;
  renderPickList('');
}

export function renderPickList(q) {
  const ql = q.trim().toLowerCase();
  const list = S.exercises.filter((e) => e.name.toLowerCase().includes(ql));
  let html = '';
  if (ql && !S.exercises.some((e) => e.name.toLowerCase() === ql))
    html += `<button class="pick-create" data-action="pick-create">Create “${esc(q.trim())}”</button>`;
  for (const [g, label] of Object.entries(GROUPS)) {
    const items = list.filter((e) => (e.group || 'other') === g);
    if (!items.length) continue;
    html += `<h3 class="pick-group"><span class="dot" data-g="${g}"></span>${label}</h3><ul>${items
      .map((e) => `<li><button class="pick-item" data-action="pick" data-id="${e.id}">${esc(e.name)}</button></li>`)
      .join('')}</ul>`;
  }
  if (!html) html = `<p class="empty">No exercises match.</p>`;
  $('#pick-list').innerHTML = html;
}

export function pick(id) {
  const cb = sheetState.onPick;
  sheetState.onPick = sheetState.onCancel = null;
  closeSheet({ cancelled: false });
  cb?.(id);
}

// Custom exercises go in the "Other" group.
export function createAndPick() {
  const name = $('#pick-q').value.trim();
  if (!name) return;
  const ex = { id: uid(), name, group: 'other' };
  S.exercises.push(ex);
  persist();
  pick(ex.id);
}

/* ---------- Exercise menu during a workout ---------- */

export function exMenu(i) {
  const n = S.active.entries.length;
  openSheet(`<h2 class="sheet-h">${esc(exById(S.active.entries[i].exerciseId).name)}</h2>
    <div class="menu">
      ${i > 0 ? `<button class="menu-item" data-action="ex-move" data-i="${i}" data-id="-1">${ICON.up}Move up</button>` : ''}
      ${i < n - 1 ? `<button class="menu-item" data-action="ex-move" data-i="${i}" data-id="1">${ICON.down}Move down</button>` : ''}
      <button class="menu-item danger" data-action="ex-remove" data-i="${i}">${ICON.x}Remove from this workout</button>
    </div>`);
}

/* ---------- Routine editor ---------- */

// The routine being edited. Changes stay here until Save.
export const editor = { draft: null };

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

export function newRoutine() {
  editor.draft = { id: uid(), name: '', rest: S.rest, exerciseIds: [], isNew: true };
  openEditor();
}

export function editRoutine(id) {
  const r = S.routines.find((x) => x.id === id);
  editor.draft = { ...r, exerciseIds: [...r.exerciseIds], isNew: false };
  openEditor();
}

export function openEditor() {
  const r = editor.draft;
  openSheet(`<h2 class="sheet-h">${r.isNew ? 'New routine' : 'Edit routine'}</h2>
    <label class="field"><span class="field-label">Name</span>
      <input id="draft-name" value="${esc(r.name)}" placeholder="For example, Upper body" autocomplete="off"></label>
    <label class="field"><span class="field-label">Rest between sets</span>
      <select id="draft-rest">${REST_OPTIONS.map((s) => `<option value="${s}"${s === r.rest ? ' selected' : ''}>${fmtClock(s)}</option>`).join('')}</select></label>
    <h3 class="sub-h">Exercises</h3>
    ${
      r.exerciseIds.length
        ? `<ol class="draft-list">${r.exerciseIds
            .map(
              (id, k) => `<li><span class="dot" data-g="${exById(id).group}"></span><span class="dl-name">${esc(exById(id).name)}</span>
              <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="-1" aria-label="Move ${esc(exById(id).name)} up"${k === 0 ? ' disabled' : ''}>${ICON.up}</button>
              <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="1" aria-label="Move ${esc(exById(id).name)} down"${k === r.exerciseIds.length - 1 ? ' disabled' : ''}>${ICON.down}</button>
              <button class="icon-btn" data-action="draft-remove" data-i="${k}" aria-label="Remove ${esc(exById(id).name)}">${ICON.x}</button></li>`
            )
            .join('')}</ol>`
        : `<p class="empty">No exercises yet.</p>`
    }
    <button class="btn btn-wide" data-action="draft-add">Add exercise</button>
    <div class="sheet-actions">
      ${r.isNew ? `<button class="btn" data-action="close-sheet">Cancel</button>` : `<button class="btn btn-quiet danger" data-action="routine-delete">Delete</button>`}
      <button class="btn btn-primary" data-action="routine-save">Save routine</button>
    </div>`, { tall: true });
}

export function saveRoutine() {
  const draft = editor.draft;
  if (!draft.name.trim()) {
    toast('Give the routine a name.');
    $('#draft-name')?.focus();
    return;
  }
  if (!draft.exerciseIds.length) {
    toast('Add at least one exercise.');
    return;
  }
  const { isNew, ...r } = draft;
  r.name = r.name.trim();
  if (isNew) S.routines.push(r);
  else S.routines = S.routines.map((x) => (x.id === r.id ? r : x));
  persist();
  closeSheet({ cancelled: false });
  render();
  toast(isNew ? 'Routine created.' : 'Routine saved.');
}

export function deleteRoutine() {
  const { id, name } = editor.draft;
  confirmSheet(`Delete the “${name}” routine? Past workouts stay in your history.`, 'Delete routine', () => {
    S.routines = S.routines.filter((r) => r.id !== id);
    persist();
    render();
  }, true);
}

/* ---------- Settings ---------- */

export function openSettings() {
  const goals = [1, 2, 3, 4, 5, 6, 7];
  openSheet(`<h2 class="sheet-h">Settings</h2>
    <fieldset class="field"><legend class="field-label">Weight units</legend>
      <div class="segmented">
        <label><input type="radio" name="units" value="kg"${S.units === 'kg' ? ' checked' : ''}><span>Kilograms</span></label>
        <label><input type="radio" name="units" value="lb"${S.units === 'lb' ? ' checked' : ''}><span>Pounds</span></label>
      </div>
    </fieldset>
    <label class="field"><span class="field-label">Weekly goal</span>
      <select id="set-goal">${goals.map((g) => `<option value="${g}"${g === S.weeklyGoal ? ' selected' : ''}>${g} workout${g === 1 ? '' : 's'} a week</option>`).join('')}</select></label>
    <label class="field"><span class="field-label">Rest timer for empty workouts</span>
      <select id="set-rest">${REST_OPTIONS.map((s) => `<option value="${s}"${s === S.rest ? ' selected' : ''}>${fmtClock(s)}</option>`).join('')}</select></label>
    <h3 class="sub-h">Your data</h3>
    <p class="fine">Your workouts are stored only on this device. Export a backup now and then so you can restore your history on a new phone.</p>
    <div class="sheet-actions">
      <button class="btn" data-action="export">Export backup</button>
      <label class="btn">Import backup<input type="file" id="import-file" accept="application/json,.json" hidden></label>
    </div>
    <button class="btn-text danger" data-action="erase">Erase all data</button>`, { tall: true });
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify({ ...S, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `micro-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup exported.');
}

export async function importBackup(file) {
  try {
    const next = parseBackup(await file.text());
    const n = next.workouts.length;
    confirmSheet(`This replaces everything on this device with the backup, which has ${n} workout${n === 1 ? '' : 's'}.`, 'Import backup', () => {
      setState(next);
      persist();
      closeSheet({ cancelled: false });
      render();
      toast('Backup imported.');
    }, true);
  } catch (err) {
    toast(err instanceof SyntaxError ? 'That file couldn’t be read. Choose a .json backup exported from Micro Fitness.' : err.message);
  }
}
