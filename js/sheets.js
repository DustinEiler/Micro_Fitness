// Content for the bottom sheets: exercise picker (mid-workout), per-exercise
// menu, training phases, settings, and backup export/import.
// The routine editor and exercise list are in js/editor.js.

import { S, setState, persist } from './state.js';
import { uid, parseBackup } from './store.js';
import { $, esc, ICON } from './dom.js';
import { fmtClock } from './format.js';
import { PHASES, PHASE_ORDER, PHASE_WEEKS, phaseId, phaseWeek, phaseComplete, nextPhaseId, rangeText, ensureFitted } from './phases.js';
import { exById } from './queries.js';
import { GROUPS, equipText } from './data.js';
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
  // Switched-off exercises are hidden here too.
  const list = S.exercises.filter((e) => !e.off && e.name.toLowerCase().includes(ql));
  let html = '';
  if (ql && !S.exercises.some((e) => e.name.toLowerCase() === ql))
    html += `<button class="pick-create" data-action="pick-create">Create “${esc(q.trim())}”</button>`;
  for (const [g, label] of Object.entries(GROUPS)) {
    const items = list.filter((e) => (e.group || 'other') === g);
    if (!items.length) continue;
    html += `<h3 class="pick-group"><span class="dot" data-g="${g}"></span>${label}</h3><ul>${items
      .map((e) => `<li><button class="pick-item" data-action="pick" data-id="${e.id}"><span>${esc(e.name)}</span>${equipText(e) ? `<span class="dl-gear">${esc(equipText(e))}</span>` : ''}</button></li>`)
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
  const ex = { id: uid(), name, group: 'other', equip: [], custom: true };
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

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

export function openSettings() {
  const goals = [1, 2, 3, 4, 5, 6, 7];
  openSheet(`<h2 class="sheet-h">Settings</h2>
    <fieldset class="field"><legend class="field-label">Weight units</legend>
      <div class="segmented">
        <label><input type="radio" name="units" value="kg"${S.units === 'kg' ? ' checked' : ''}><span>Kilograms</span></label>
        <label><input type="radio" name="units" value="lb"${S.units === 'lb' ? ' checked' : ''}><span>Pounds</span></label>
      </div>
    </fieldset>
    <fieldset class="field"><legend class="field-label">Experience</legend>
      <div class="segmented">
        <label><input type="radio" name="experience" value="beginner"${S.experience === 'beginner' ? ' checked' : ''}><span>Beginner</span></label>
        <label><input type="radio" name="experience" value="experienced"${S.experience !== 'beginner' ? ' checked' : ''}><span>Experienced</span></label>
      </div>
      <span class="fine">Beginners always rest at least 60 seconds between sets, so form holds up as you tire.</span>
    </fieldset>
    <label class="field"><span class="field-label">Weekly goal</span>
      <select id="set-goal">${goals.map((g) => `<option value="${g}"${g === S.weeklyGoal ? ' selected' : ''}>${g} workout${g === 1 ? '' : 's'} a week</option>`).join('')}</select></label>
    <label class="field"><span class="field-label">Rest timer for empty workouts</span>
      <select id="set-rest">${REST_OPTIONS.map((s) => `<option value="${s}"${s === S.rest ? ' selected' : ''}>${fmtClock(s)}</option>`).join('')}</select></label>
    <h3 class="sub-h">Plan and goal</h3>
    <p class="fine">${S.goal ? 'Answer the questions again to build a fresh plan, or just set a new goal.' : 'Answer a few questions about your goals, time and experience, and get a plan built for you.'}</p>
    <div class="sheet-actions">
      <button class="btn" data-action="setup">${S.profile ? 'Build a new plan' : 'Set up a plan'}</button>
      ${S.profile?.days?.length ? '<button class="btn" data-action="new-goal">Set a new goal</button>' : ''}
    </div>
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
