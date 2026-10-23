// The single in-memory app state, shared by every module.
// Mutate S directly, then call persist(). Use setState() only to replace it wholesale.

import { load, save } from './store.js';
import { toast } from './ui.js';

export let S = load();

export function setState(next) {
  S = next;
}

export function persist() {
  if (!save(S)) toast('Couldn’t save. Storage on this device is full or blocked.');
}

// For keystrokes: save shortly after typing stops.
let timer = null;
export function persistSoon() {
  clearTimeout(timer);
  timer = setTimeout(persist, 300);
}
