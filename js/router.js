// Hash routing (#train, #history, #progress, #routines) and full-screen render.
// render() rebuilds the whole <main>; call it after any structural state change.

import { S } from './state.js';
import { $ } from './dom.js';
import { renderTimer } from './timer.js';
import { viewTrain } from './views/train.js';
import { viewSession } from './views/session.js';
import { viewHistory } from './views/history.js';
import { viewProgress } from './views/progress.js';
import { viewRoutines } from './views/routines.js';

const ROUTES = { train: 'Train', history: 'History', progress: 'Progress', routines: 'Routines' };

export const route = () => {
  const r = location.hash.slice(1);
  return ROUTES[r] ? r : 'train';
};

export function render() {
  const r = route();
  $('#title').textContent = r === 'train' && S.active ? 'Workout' : ROUTES[r];
  document.querySelectorAll('.tabs a').forEach((a) => {
    if (a.dataset.route === r) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('.tabs a[data-route="train"]').classList.toggle('is-live', !!S.active);
  const views = { train: S.active ? viewSession : viewTrain, history: viewHistory, progress: viewProgress, routines: viewRoutines };
  $('#view').innerHTML = views[r]();
  renderTimer();
}

export function go(r) {
  if (route() === r && location.hash) render();
  else location.hash = '#' + r;
}
