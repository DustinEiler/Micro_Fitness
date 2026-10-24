// Routine editor (a bottom sheet). A routine is a list of muscle groups, each
// with a count per workout and the exercises ticked for its rotation (see
// js/rotation.js). Tapping a ticked exercise opens its target fields.
// Changes stay in editor.draft until Save.

import { S, persist } from './state.js';
import { uid } from './store.js';
import { $, esc, ICON } from './dom.js';
import { unit, toDisp, fromDisp } from './format.js';
import { newItem, describe } from './progression.js';
import { currentPhase, rangeText, stepFor, clamp, restRange, restRangeText, fitAllRest, fmtRest } from './phases.js';
import { exKind, GROUPS, equipText } from './data.js';
import { exById } from './queries.js';
import { isOff } from './rotation.js';
import { openSheet, closeSheet, confirmSheet, sheetState, toast } from './ui.js';
import { render } from './router.js';

// draft = { id, name, groups: [{ group, count }], items: [routine item],
//           open: exerciseId of the expanded exercise, isNew }
export const editor = { draft: null };

const STEP_OPTIONS = { kg: [1, 1.25, 2, 2.5, 5], lb: [1, 2.5, 5, 10] };
const MAX_PER_GROUP = 10;

export function newRoutine() {
  editor.draft = { id: uid(), name: '', groups: [], items: [], open: null, isNew: true };
  openEditor();
}

export function editRoutine(id) {
  const r = S.routines.find((x) => x.id === id);
  editor.draft = { ...r, groups: r.groups.map((g) => ({ ...g })), items: r.items.map((i) => ({ ...i })), open: null, isNew: false };
  openEditor();
}

const itemIndex = (exerciseId) => editor.draft.items.findIndex((it) => it.exerciseId === exerciseId);
const pickedCount = (group) =>
  editor.draft.items.filter((it) => it.picked !== false && exById(it.exerciseId).group === group && !isOff(it.exerciseId)).length;

/* ---------- Rendering ---------- */

const itemSummary = (it) =>
  (it.ready || it.w != null ? describe(it) : `${it.sets} × ${it.reps}, ${fmtRest(it.rest)} rest, weight set in first session`) +
  (it.always ? '. Every workout' : '');

const restHint = (it) => {
  const kind = it.kind || exKind(it.exerciseId, S.exercises);
  return `Rest for ${kind === 'isolation' ? 'isolation exercises' : 'compound lifts'} in this phase: ${restRangeText(it)}${S.experience === 'beginner' ? ' (beginner minimum 60s)' : ''}.`;
};

function itemFields(it, k) {
  const kind = it.kind || exKind(it.exerciseId, S.exercises);
  const steps = STEP_OPTIONS[unit()];
  const cur = toDisp(stepFor(it));
  const stepSel = steps.includes(cur) ? cur : steps.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
  const f = (label, html) => `<label class="field"><span class="field-label">${label}</span>${html}</label>`;
  return `<div class="item-fields">
    <label class="toggle-field"><input type="checkbox" data-item="${k}.always"${it.always ? ' checked' : ''}><span>Every workout <span class="fine">(never rotates out)</span></span></label>
    ${f('Sets', `<select data-item="${k}.sets">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option${n === it.sets ? ' selected' : ''}>${n}</option>`).join('')}</select>`)}
    ${f('Reps per set', `<input data-item="${k}.reps" inputmode="numeric" value="${it.reps}" autocomplete="off">`)}
    ${f(`Weight (${unit()})`, `<input data-item="${k}.w" inputmode="decimal" value="${it.w == null ? '' : toDisp(it.w)}" placeholder="${it.ready ? 'Bodyweight' : 'Set in first session'}" autocomplete="off">`)}
    ${f('Rest (seconds)', `<input data-item="${k}.rest" inputmode="numeric" value="${it.rest}" autocomplete="off">`)}
    ${f('Weight step', `<select data-item="${k}.step">${steps.map((v) => `<option value="${v}"${v === stepSel ? ' selected' : ''}>${v} ${unit()}</option>`).join('')}</select>`)}
    ${f('Type', `<select data-item="${k}.kind">${[['compound', 'Compound lift'], ['isolation', 'Isolation']].map(([v, l]) => `<option value="${v}"${v === kind ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
    <p class="item-hint" id="rest-hint-${k}">${restHint(it)}</p>
  </div>`;
}

function groupBlock({ group, count }, gi, total) {
  const d = editor.draft;
  const label = GROUPS[group] || 'Other';
  const all = S.exercises.filter((e) => (e.group || 'other') === group);
  const on = all.filter((e) => !e.off);
  const off = all.filter((e) => e.off);
  const ticked = pickedCount(group);

  // Ticked and common exercises first; the rest behind "Show all".
  const isPicked = (e) => {
    const it = d.items[itemIndex(e.id)];
    return !!it && it.picked !== false;
  };
  const expanded = d.showAll?.has(group);
  const shown = on.filter((e) => expanded || isPicked(e) || e.common || e.custom || !e.equip);
  const hidden = on.length - shown.length;

  const rows = shown
    .map((e) => {
      const k = itemIndex(e.id);
      const it = d.items[k];
      const picked = isPicked(e);
      const open = picked && d.open === e.id;
      const name = esc(e.name);
      const gear = equipText(e);
      return `<li class="dg-item${picked ? ' is-picked' : ''}${open ? ' is-open' : ''}">
        <div class="dg-row">
          <label class="tick"><input type="checkbox" data-pick="${e.id}"${picked ? ' checked' : ''} aria-label="Include ${name} in the rotation"><span class="tick-box" aria-hidden="true">${ICON.check}</span></label>
          ${
            picked
              ? `<button class="dl-name" data-action="draft-toggle" data-id="${e.id}" aria-expanded="${open}"><span>${name}</span><span class="dl-sum" id="dl-sum-${k}">${itemSummary(it)}</span></button>`
              : `<span class="dl-name dl-off"><span>${name}</span>${gear ? `<span class="dl-gear">${esc(gear)}</span>` : ''}</span>`
          }
        </div>
        ${open ? itemFields(it, k) : ''}
      </li>`;
    })
    .join('');

  return `<section class="dg">
    <header class="dg-head">
      <span class="dot" data-g="${group}"></span>
      <h3>${label}</h3>
      <div class="stepper" role="group" aria-label="${label} exercises per workout">
        <button data-action="group-count" data-id="${group}" data-i="-1" aria-label="Fewer ${label.toLowerCase()} exercises"${count <= 1 ? ' disabled' : ''}>−</button>
        <span class="stepper-n">${count}</span>
        <button data-action="group-count" data-id="${group}" data-i="1" aria-label="More ${label.toLowerCase()} exercises"${count >= MAX_PER_GROUP ? ' disabled' : ''}>+</button>
      </div>
      <button class="icon-btn" data-action="group-move" data-id="${group}" data-i="-1" aria-label="Move ${label} up"${gi === 0 ? ' disabled' : ''}>${ICON.up}</button>
      <button class="icon-btn" data-action="group-remove" data-id="${group}" aria-label="Remove ${label}">${ICON.x}</button>
    </header>
    <p class="fine dg-note">${count} per workout, rotating through ${ticked} ticked.${ticked < count ? ` <strong>Tick at least ${count} to fill every workout.</strong>` : ''}</p>
    <ul class="dg-list">${rows}${expanded ? off.map((e) => `<li class="dg-item is-off"><span class="dl-name dl-off">${esc(e.name)}</span><span class="fine">Switched off</span></li>`).join('') : ''}</ul>
    <div class="dg-actions">
      ${hidden || expanded ? `<button class="btn-text" data-action="group-show-all" data-id="${group}" aria-expanded="${!!expanded}">${expanded ? 'Show fewer' : `Show all ${on.length} ${label.toLowerCase()} exercises`}</button>` : ''}
      <button class="btn-text" data-action="new-ex" data-id="${group}">New exercise</button>
    </div>
  </section>`;
}

export function openEditor() {
  const d = editor.draft;
  const used = new Set(d.groups.map((g) => g.group));
  const addable = Object.keys(GROUPS).filter((g) => !used.has(g) && S.exercises.some((e) => (e.group || 'other') === g));
  openSheet(`<h2 class="sheet-h">${d.isNew ? 'New routine' : 'Edit routine'}</h2>
    <label class="field"><span class="field-label">Name</span>
      <input id="draft-name" value="${esc(d.name)}" placeholder="For example, Chest, triceps and shoulders" autocomplete="off"></label>
    <p class="fine">Pick muscle groups and how many exercises from each per workout. Tick the exercises that can come up: each workout uses the ones you’ve done least recently. Tap a ticked exercise to set its target.</p>
    <p class="phase-hint">${currentPhase().name} phase: ${rangeText(currentPhase())}.</p>
    ${d.groups.map((g, gi) => groupBlock(g, gi, d.groups.length)).join('') || '<p class="empty">No muscle groups yet. Add one below.</p>'}
    ${
      addable.length
        ? `<h3 class="sub-h">Add a muscle group</h3><div class="chips">${addable
            .map((g) => `<button class="chip" data-action="group-add" data-id="${g}"><span class="dot" data-g="${g}"></span>${GROUPS[g]}</button>`)
            .join('')}</div>`
        : ''
    }
    <div class="sheet-actions">
      ${d.isNew ? `<button class="btn" data-action="close-sheet">Cancel</button>` : `<button class="btn btn-quiet danger" data-action="routine-delete">Delete</button>`}
      <button class="btn btn-primary" data-action="routine-save">Save routine</button>
    </div>`, { tall: true });
}

/* ---------- Editing ---------- */

// Tick or untick an exercise. Unticking keeps its progress for later.
export function togglePick(exerciseId, on) {
  const d = editor.draft;
  const k = itemIndex(exerciseId);
  if (k === -1) {
    if (on) d.items.push({ ...newItem(exerciseId), picked: true });
  } else d.items[k].picked = on;
  d.open = on ? exerciseId : d.open === exerciseId ? null : d.open;
  openEditor();
}

export function toggleShowAll(group) {
  const d = editor.draft;
  d.showAll = d.showAll || new Set();
  if (d.showAll.has(group)) d.showAll.delete(group);
  else d.showAll.add(group);
  openEditor();
}

export function toggleOpen(exerciseId) {
  editor.draft.open = editor.draft.open === exerciseId ? null : exerciseId;
  openEditor();
}

export function changeCount(group, delta) {
  const g = editor.draft.groups.find((x) => x.group === group);
  if (g) g.count = clamp(g.count + delta, [1, MAX_PER_GROUP]);
  openEditor();
}

export function addGroup(group) {
  editor.draft.groups.push({ group, count: 1 });
  openEditor();
}

export function moveGroup(group, delta) {
  const list = editor.draft.groups;
  const i = list.findIndex((g) => g.group === group);
  const k = i + delta;
  if (i < 0 || k < 0 || k >= list.length) return;
  [list[i], list[k]] = [list[k], list[i]];
  openEditor();
}

// Removing a group keeps its exercises' progress, in case it's added back.
export function removeGroup(group) {
  editor.draft.groups = editor.draft.groups.filter((g) => g.group !== group);
  openEditor();
}

// Typing in an exercise's target fields.
export function updateDraftItem(k, field, value) {
  const it = editor.draft?.items[k];
  if (!it) return;
  if (field === 'w') it.w = fromDisp(value);
  else if (field === 'step') it.step = fromDisp(value);
  else if (field === 'always') it.always = !!value;
  else if (field === 'kind') {
    it.kind = value;
    const hint = $(`#rest-hint-${k}`);
    if (hint) hint.textContent = restHint(it);
  } else {
    const n = parseInt(value, 10);
    it[field] = Number.isFinite(n) ? n : it[field];
  }
  if (field !== 'always') it.edited = true;
  const sum = $(`#dl-sum-${k}`);
  if (sum) sum.textContent = itemSummary(it);
}

/* ---------- New custom exercise ---------- */

export function openNewExercise(group) {
  const label = (GROUPS[group] || 'Other').toLowerCase();
  openSheet(`<h2 class="sheet-h">New ${label} exercise</h2>
    <label class="field"><span class="field-label">Name</span>
      <input id="new-ex-name" placeholder="For example, Landmine press" autocomplete="off"></label>
    <label class="field"><span class="field-label">Type</span>
      <select id="new-ex-kind"><option value="compound">Compound lift (works several muscles)</option><option value="isolation">Isolation (one muscle)</option></select></label>
    <div class="sheet-actions">
      <button class="btn" data-action="close-sheet">Cancel</button>
      <button class="btn btn-primary" data-action="new-ex-save" data-id="${group}">Add exercise</button>
    </div>`);
  sheetState.onCancel = openEditor; // back to the routine, not lost
  $('#new-ex-name').focus();
}

export function saveNewExercise(group) {
  const name = $('#new-ex-name').value.trim();
  if (!name) {
    toast('Give the exercise a name.');
    return;
  }
  const existing = S.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    toast(`${existing.name} is already in your list under ${GROUPS[existing.group] || 'Other'}.`);
    return;
  }
  const ex = { id: uid(), name, group, kind: $('#new-ex-kind').value, equip: [], custom: true };
  S.exercises.push(ex);
  persist();
  sheetState.onCancel = null;
  closeSheet({ cancelled: false });
  togglePick(ex.id, true);
}

/* ---------- Save and delete ---------- */

export function saveRoutine() {
  const d = editor.draft;
  if (!d.name.trim()) {
    toast('Give the routine a name.');
    $('#draft-name')?.focus();
    return;
  }
  if (!d.groups.length) {
    toast('Add at least one muscle group.');
    return;
  }
  const empty = d.groups.find((g) => !pickedCount(g.group));
  if (empty) {
    toast(`Tick at least one ${(GROUPS[empty.group] || 'other').toLowerCase()} exercise.`);
    return;
  }
  const { isNew, open, showAll, ...r } = d;
  r.name = r.name.trim();
  // Keep targets inside the current phase's ranges.
  const p = currentPhase();
  let adjusted = false;
  r.items = r.items.map(({ edited, ...it }) => {
    const before = `${it.sets}/${it.reps}/${it.rest}`;
    it.sets = p.sets ? clamp(it.sets, p.sets) : Math.min(10, Math.max(1, it.sets));
    it.reps = clamp(it.reps, p.reps);
    it.rest = clamp(it.rest, restRange(it, p));
    if (edited && before !== `${it.sets}/${it.reps}/${it.rest}`) adjusted = true;
    // Exercise type belongs to the exercise, not this routine.
    if (it.kind) {
      const ex = S.exercises.find((e) => e.id === it.exerciseId);
      if (ex) ex.kind = it.kind;
      delete it.kind;
    }
    // A target you set by hand is your new baseline: start the step cycle fresh.
    if (edited) Object.assign(it, { ready: it.ready || it.w != null, missed: 0, pendingLever: null });
    return it;
  });
  if (isNew) S.routines.push(r);
  else S.routines = S.routines.map((x) => (x.id === r.id ? r : x));
  fitAllRest(); // a type change can affect the same exercise in other routines
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

/* ---------- Exercise list: switch exercises on or off everywhere ---------- */

let exListQuery = '';

export function openExerciseList() {
  const offCount = S.exercises.filter((e) => e.off).length;
  openSheet(`<h2 class="sheet-h">Exercise list</h2>
    <p class="fine">Switch off anything you can’t do right now, like an injury or equipment your gym doesn’t have. It’s skipped in every routine until you switch it back on, and your progress on it is kept.</p>
    <p class="phase-hint">${S.exercises.length} exercises${offCount ? `, ${offCount} switched off` : ''}.</p>
    <input type="search" id="exlist-q" class="search" placeholder="Search exercises or equipment" aria-label="Search exercises" autocomplete="off" value="${esc(exListQuery)}">
    <div id="exlist">${Object.entries(GROUPS)
      .map(([g, label]) => {
        const list = S.exercises.filter((e) => (e.group || 'other') === g);
        if (!list.length) return '';
        return `<section class="exlist-group" data-group="${g}"><h3 class="pick-group"><span class="dot" data-g="${g}"></span>${label}</h3>
          <ul class="ex-list">${list
            .map((e) => {
              const gear = equipText(e);
              return `<li class="${e.off ? 'is-off' : ''}" data-search="${esc(`${e.name} ${gear} ${label}`.toLowerCase())}"><label class="switch-row">
                <span class="sw-text"><span class="sw-name">${esc(e.name)}</span>${gear ? `<span class="dl-gear">${esc(gear)}</span>` : ''}</span>
                <input type="checkbox" role="switch" data-ex-on="${e.id}"${e.off ? '' : ' checked'} aria-label="${esc(e.name)} ${e.off ? 'off' : 'on'}">
                <span class="switch" aria-hidden="true"></span>
              </label></li>`;
            })
            .join('')}</ul></section>`;
      })
      .join('')}</div>
    <p class="empty" id="exlist-empty" hidden>No exercises match.</p>`, { tall: true });
  filterExerciseList(exListQuery);
}

// Filters the list in place, so the keyboard stays open while typing.
export function filterExerciseList(q) {
  exListQuery = q;
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let any = false;
  document.querySelectorAll('#exlist .exlist-group').forEach((sec) => {
    let n = 0;
    sec.querySelectorAll('li[data-search]').forEach((li) => {
      const show = words.every((w) => li.dataset.search.includes(w));
      li.hidden = !show;
      if (show) n++;
    });
    sec.hidden = !n;
    if (n) any = true;
  });
  const empty = $('#exlist-empty');
  if (empty) empty.hidden = any;
}

export function setExerciseOn(id, on) {
  const ex = S.exercises.find((e) => e.id === id);
  if (!ex) return;
  if (on) delete ex.off;
  else ex.off = true;
  persist();
  render(); // routine previews behind the sheet
  openExerciseList();
}
