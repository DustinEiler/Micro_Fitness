// Entry point: wires taps, typing and navigation to the modules that do the work.
// Every button uses data-action="name" (plus optional data-i, data-j, data-id);
// add new buttons by adding a handler to `actions` below.

import { S, setState, persist, persistSoon } from './state.js';
import { freshState } from './store.js';
import { $, $$last } from './dom.js';
import { fromDisp } from './format.js';
import { ensureFitted, startPhase, fitAllRest, PHASES } from './phases.js';
import { closeSheet, confirmSheet, sheetState, toast } from './ui.js';
import { render, go } from './router.js';
import { startTimer, adjustTimer, skipTimer, updateTimer, primeAudio } from './timer.js';
import { newEntry, startWorkout, finishWorkout, discardWorkout, chooseStep, restFor } from './workout.js';
import { openPicker, renderPickList, pick, createAndPick, exMenu, openSettings, exportBackup, importBackup, openPhases } from './sheets.js';
import {
  editor, newRoutine, editRoutine, openEditor, saveRoutine, deleteRoutine, updateDraftItem,
  togglePick, toggleOpen, changeCount, addGroup, moveGroup, removeGroup,
  openNewExercise, saveNewExercise, openExerciseList, setExerciseOn,
} from './editor.js';

const actions = {
  // Navigation and sheets
  go: (b, { id }) => go(id),
  settings: () => openSettings(),
  'close-sheet': () => closeSheet(),
  confirm: () => {
    const fn = sheetState.confirm;
    closeSheet({ cancelled: false });
    fn?.();
  },

  // Workout
  start: (b, { id }) => startWorkout(S.routines.find((r) => r.id === id)),
  'start-empty': () => startWorkout(null),
  finish: () => finishWorkout(),
  discard: () => confirmSheet('Discard this workout? Sets you’ve logged in it will be lost.', 'Discard workout', discardWorkout, true),
  'add-exercise': () =>
    openPicker((id) => {
      S.active.entries.push(newEntry(id));
      persist();
      render();
      $$last('.ex')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }),
  'add-set': (b, { i }) => {
    const sets = S.active.entries[i].sets;
    const prev = sets[sets.length - 1];
    sets.push({ w: prev?.w ?? null, r: prev?.r ?? null, done: false });
    persist();
    render();
  },
  'remove-set': (b, { i }) => {
    S.active.entries[i].sets.pop();
    persist();
    render();
  },
  // Updates the row in place (no re-render) so typing focus isn't lost.
  'toggle-set': (b, { i, j }) => {
    const s = S.active.entries[i].sets[j];
    if (!s.done && !s.r) {
      toast('Enter your reps for this set first.');
      $(`[data-set="${i}.${j}.r"]`)?.focus();
      return;
    }
    s.done = !s.done;
    b.closest('.set-row').classList.toggle('is-done', s.done);
    b.setAttribute('aria-pressed', String(s.done));
    persist();
    if (s.done) {
      primeAudio();
      startTimer(restFor(S.active.entries[i]));
    }
  },
  'choose-step': (b, { i, id }) => chooseStep(i, id),
  'ex-menu': (b, { i }) => exMenu(i),
  'ex-move': (b, { i, id }) => {
    const e = S.active.entries;
    const k = i + Number(id);
    [e[i], e[k]] = [e[k], e[i]];
    persist();
    closeSheet({ cancelled: false });
    render();
  },
  'ex-remove': (b, { i }) => {
    S.active.entries.splice(i, 1);
    persist();
    closeSheet({ cancelled: false });
    render();
  },

  // Rest timer
  'timer-add': (b, { id }) => adjustTimer(Number(id)),
  'timer-skip': () => skipTimer(),

  // Exercise picker
  pick: (b, { id }) => pick(id),
  'pick-create': () => createAndPick(),

  // History
  'delete-workout': (b, { id }) =>
    confirmSheet('Delete this workout from your history? This can’t be undone.', 'Delete workout', () => {
      S.workouts = S.workouts.filter((w) => w.id !== id);
      persist();
      render();
    }, true),

  // Routine editor
  'new-routine': () => newRoutine(),
  'edit-routine': (b, { id }) => editRoutine(id),
  'draft-toggle': (b, { id }) => toggleOpen(id),
  'group-count': (b, { id, i }) => changeCount(id, i),
  'group-add': (b, { id }) => addGroup(id),
  'group-move': (b, { id, i }) => moveGroup(id, i),
  'group-remove': (b, { id }) => removeGroup(id),
  'new-ex': (b, { id }) => openNewExercise(id),
  'new-ex-save': (b, { id }) => saveNewExercise(id),
  'exercise-list': () => openExerciseList(),
  'routine-save': () => saveRoutine(),
  'routine-delete': () => deleteRoutine(),

  // Training phases
  phase: () => openPhases(),
  'phase-pick': (b, { id }) => {
    if (S.active) {
      toast('Finish or discard your current workout before changing phase.');
      return;
    }
    const p = PHASES[id];
    confirmSheet(`Start the ${p.name.toLowerCase()} phase? Your routine targets move into its ranges, with weights adjusted to match your current strength. The 13-week clock starts today.`, `Start ${p.name.toLowerCase()}`, () => {
      startPhase(id);
      persist();
      render();
      toast(`${p.name} phase started. Week 1 of 13.`);
    });
  },

  // Settings
  export: () => exportBackup(),
  erase: () =>
    confirmSheet('Erase all workouts, routines and settings on this device? Export a backup first if you might want them back.', 'Erase everything', () => {
      setState(freshState());
      ensureFitted();
      persist();
      render();
      toast('All data erased.');
    }, true),
};

/* ---------- Event wiring ---------- */

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  const fn = actions[b.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(b, { i: Number(b.dataset.i), j: Number(b.dataset.j), id: b.dataset.id });
});

// Typing: update state without re-rendering, so the keyboard stays open.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.set && S.active) {
    const [i, j, f] = t.dataset.set.split('.');
    const s = S.active.entries[+i]?.sets[+j];
    if (!s) return;
    if (f === 'w') s.w = fromDisp(t.value);
    else {
      const n = parseInt(t.value, 10);
      s.r = Number.isFinite(n) && n > 0 ? n : null;
    }
    persistSoon();
  } else if (t.dataset.field === 'session-name' && S.active) {
    S.active.name = t.value;
    persistSoon();
  } else if (t.id === 'pick-q') {
    renderPickList(t.value);
  } else if (t.id === 'draft-name' && editor.draft) {
    editor.draft.name = t.value;
  } else if (t.dataset.item) {
    const [k, field] = t.dataset.item.split('.');
    updateDraftItem(+k, field, t.type === 'checkbox' ? t.checked : t.value);
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'prog-ex') {
    S.progressEx = t.value;
    persist();
    render();
  } else if (t.dataset.pick) {
    togglePick(t.dataset.pick, t.checked);
  } else if (t.dataset.exOn) {
    setExerciseOn(t.dataset.exOn, t.checked);
  } else if (t.dataset.item) {
    const [k, field] = t.dataset.item.split('.');
    updateDraftItem(+k, field, t.type === 'checkbox' ? t.checked : t.value);
  } else if (t.name === 'experience') {
    S.experience = t.value;
    fitAllRest();
    persist();
    render();
  } else if (t.name === 'units') {
    S.units = t.value;
    persist();
    render();
  } else if (t.id === 'set-goal') {
    S.weeklyGoal = Number(t.value);
    persist();
    render();
  } else if (t.id === 'set-rest') {
    S.rest = Number(t.value);
    persist();
  } else if (t.id === 'import-file' && t.files[0]) {
    importBackup(t.files[0]);
    t.value = '';
  }
});

// Escape closes sheets; Enter in a set field jumps to the next field.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Enter' && e.target.dataset?.set) {
    e.preventDefault();
    const fields = [...document.querySelectorAll('[data-set]')];
    const next = fields[fields.indexOf(e.target) + 1];
    if (next) next.focus();
    else e.target.blur();
  }
});

// Select a number field's contents on focus so it's quick to overwrite.
document.addEventListener('focusin', (e) => {
  if (e.target.classList?.contains('num')) setTimeout(() => e.target.select?.(), 0);
});

window.addEventListener('hashchange', () => {
  closeSheet({ cancelled: false });
  render();
  window.scrollTo(0, 0);
});

// Save in-progress edits when the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
  else updateTimer();
});

/* ---------- Boot ---------- */

// New or upgraded data: move routine targets inside the phase ranges once.
ensureFitted();
persist();

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline support unavailable', err));
}
