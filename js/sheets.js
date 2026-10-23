// Content for the bottom sheets: exercise picker, per-exercise menu,
// routine editor, settings, and backup export/import.

import { S, setState, persist } from './state.js';
import { uid, parseBackup } from './store.js';
import { $, esc, ICON } from './dom.js';
import { fmtClock, unit, toDisp, fromDisp } from './format.js';
import { newItem, describe } from './progression.js';
import { PHASES, PHASE_ORDER, PHASE_WEEKS, currentPhase, phaseId, phaseWeek, phaseComplete, nextPhaseId, rangeText, stepFor, clamp, ensureFitted } from './phases.js';
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
// draft = { id, name, items: [routine item], open: index of expanded item, isNew }
export const editor = { draft: null };

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const STEP_OPTIONS = { kg: [1, 1.25, 2, 2.5, 5], lb: [1, 2.5, 5, 10] };

export function newRoutine() {
  editor.draft = { id: uid(), name: '', items: [], open: null, isNew: true };
  openEditor();
}

export function editRoutine(id) {
  const r = S.routines.find((x) => x.id === id);
  editor.draft = { ...r, items: r.items.map((i) => ({ ...i })), open: null, isNew: false };
  openEditor();
}

export function addDraftItem(exerciseId) {
  editor.draft.items.push(newItem(exerciseId));
  editor.draft.open = editor.draft.items.length - 1;
}

const itemSummary = (it) => (it.ready || it.w != null ? describe(it) : `${it.sets} × ${it.reps}, ${it.rest}s rest, weight set in first session`);

function itemFields(it, k) {
  const steps = STEP_OPTIONS[unit()];
  const cur = toDisp(stepFor(it));
  const stepSel = steps.includes(cur) ? cur : steps.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
  const f = (label, html) => `<label class="field"><span class="field-label">${label}</span>${html}</label>`;
  return `<div class="item-fields">
    ${f('Sets', `<select data-item="${k}.sets">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option${n === it.sets ? ' selected' : ''}>${n}</option>`).join('')}</select>`)}
    ${f('Reps per set', `<input data-item="${k}.reps" inputmode="numeric" value="${it.reps}" autocomplete="off">`)}
    ${f(`Weight (${unit()})`, `<input data-item="${k}.w" inputmode="decimal" value="${it.w == null ? '' : toDisp(it.w)}" placeholder="${it.ready ? 'Bodyweight' : 'Set in first session'}" autocomplete="off">`)}
    ${f('Rest (seconds)', `<input data-item="${k}.rest" inputmode="numeric" value="${it.rest}" autocomplete="off">`)}
    ${f('Weight step', `<select data-item="${k}.step">${steps.map((v) => `<option value="${v}"${v === stepSel ? ' selected' : ''}>${v} ${unit()}</option>`).join('')}</select>`)}
  </div>`;
}

export function openEditor() {
  const r = editor.draft;
  openSheet(`<h2 class="sheet-h">${r.isNew ? 'New routine' : 'Edit routine'}</h2>
    <label class="field"><span class="field-label">Name</span>
      <input id="draft-name" value="${esc(r.name)}" placeholder="For example, Upper body" autocomplete="off"></label>
    <h3 class="sub-h">Exercises</h3>
    <p class="fine">Tap an exercise to set its target. Each workout moves it one tiny step further.</p>
    <p class="phase-hint">${currentPhase().name} phase: ${rangeText(currentPhase())}.</p>
    ${
      r.items.length
        ? `<ol class="draft-list">${r.items
            .map((it, k) => {
              const name = esc(exById(it.exerciseId).name);
              const open = r.open === k;
              return `<li class="draft-item${open ? ' is-open' : ''}">
                <div class="draft-row">
                  <span class="dot" data-g="${exById(it.exerciseId).group}"></span>
                  <button class="dl-name" data-action="draft-toggle" data-i="${k}" aria-expanded="${open}">
                    <span>${name}</span>
                    <span class="dl-sum" id="dl-sum-${k}">${itemSummary(it)}</span>
                  </button>
                  <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="-1" aria-label="Move ${name} up"${k === 0 ? ' disabled' : ''}>${ICON.up}</button>
                  <button class="icon-btn" data-action="draft-move" data-i="${k}" data-id="1" aria-label="Move ${name} down"${k === r.items.length - 1 ? ' disabled' : ''}>${ICON.down}</button>
                  <button class="icon-btn" data-action="draft-remove" data-i="${k}" aria-label="Remove ${name}">${ICON.x}</button>
                </div>
                ${open ? itemFields(it, k) : ''}
              </li>`;
            })
            .join('')}</ol>`
        : `<p class="empty">No exercises yet.</p>`
    }
    <button class="btn btn-wide" data-action="draft-add">Add exercise</button>
    <div class="sheet-actions">
      ${r.isNew ? `<button class="btn" data-action="close-sheet">Cancel</button>` : `<button class="btn btn-quiet danger" data-action="routine-delete">Delete</button>`}
      <button class="btn btn-primary" data-action="routine-save">Save routine</button>
    </div>`, { tall: true });
}

// Typing in an exercise's target fields.
export function updateDraftItem(k, field, value) {
  const it = editor.draft?.items[k];
  if (!it) return;
  if (field === 'w') it.w = fromDisp(value);
  else if (field === 'step') it.step = fromDisp(value);
  else {
    const n = parseInt(value, 10);
    it[field] = Number.isFinite(n) ? n : it[field];
  }
  it.edited = true;
  const sum = $(`#dl-sum-${k}`);
  if (sum) sum.textContent = itemSummary(it);
}

export function saveRoutine() {
  const draft = editor.draft;
  if (!draft.name.trim()) {
    toast('Give the routine a name.');
    $('#draft-name')?.focus();
    return;
  }
  if (!draft.items.length) {
    toast('Add at least one exercise.');
    return;
  }
  const { isNew, open, ...r } = draft;
  r.name = r.name.trim();
  // Keep targets inside the current phase's ranges.
  const p = currentPhase();
  let adjusted = false;
  r.items = r.items.map(({ edited, ...it }) => {
    const before = `${it.sets}/${it.reps}/${it.rest}`;
    it.sets = p.sets ? clamp(it.sets, p.sets) : Math.min(10, Math.max(1, it.sets));
    it.reps = clamp(it.reps, p.reps);
    it.rest = clamp(it.rest, p.rest);
    if (before !== `${it.sets}/${it.reps}/${it.rest}`) adjusted = true;
    // A target you set by hand is your new baseline: start the step cycle fresh.
    if (edited) Object.assign(it, { ready: it.ready || it.w != null, missed: 0, pendingLever: null });
    return it;
  });
  if (isNew) S.routines.push(r);
  else S.routines = S.routines.map((x) => (x.id === r.id ? r : x));
  persist();
  closeSheet({ cancelled: false });
  render();
  toast(
    adjusted
      ? `${isNew ? 'Routine created' : 'Routine saved'}. Some targets were adjusted to fit the ${p.name.toLowerCase()} range: ${rangeText(p)}.`
      : isNew ? 'Routine created.' : 'Routine saved.'
  );
}

export function deleteRoutine() {
  const { id, name } = editor.draft;
  confirmSheet(`Delete the “${name}” routine? Past workouts stay in your history.`, 'Delete routine', () => {
    S.routines = S.routines.filter((r) => r.id !== id);
    persist();
    render();
  }, true);
}

/* ---------- Training phases ---------- */

export function openPhases() {
  const cur = phaseId();
  const next = nextPhaseId();
  const done = phaseComplete();
  openSheet(`<h2 class="sheet-h">Training phase</h2>
    <p class="lede">${
      done
        ? `Your ${PHASES[cur].name.toLowerCase()} phase has run its ${PHASE_WEEKS} weeks. Pick the next one to keep progressing.`
        : `You’re in week ${phaseWeek()} of ${PHASE_WEEKS} of ${PHASES[cur].name.toLowerCase()}. Each phase runs ${PHASE_WEEKS} weeks before changing.`
    }</p>
    <ul class="phase-list">${PHASE_ORDER.map((id) => {
      const p = PHASES[id];
      const tag = id === cur ? 'Current' : id === next ? 'Next in the cycle' : '';
      return `<li><button class="phase-option${id === cur ? ' is-current' : ''}" data-action="${id === cur ? 'close-sheet' : 'phase-pick'}" data-id="${id}">
        <span class="po-top"><span class="po-name">${p.name}</span>${tag ? `<span class="po-tag">${tag}</span>` : ''}</span>
        <span class="po-range">${rangeText(p)}</span>
        <span class="po-focus">${p.focus}</span>
      </button></li>`;
    }).join('')}</ul>`, { tall: true });
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
      ensureFitted();
      persist();
      closeSheet({ cancelled: false });
      render();
      toast('Backup imported.');
    }, true);
  } catch (err) {
    toast(err instanceof SyntaxError ? 'That file couldn’t be read. Choose a .json backup exported from Micro Fitness.' : err.message);
  }
}
