// Rest timer bar (shown above the tabs) and the workout elapsed clock.
// The timer stores an end timestamp, so it stays correct if the app is backgrounded.

import { S, persist } from './state.js';
import { $ } from './dom.js';
import { fmtClock, fmtElapsed } from './format.js';

/* ---------- Sound ---------- */

let audioCtx = null;

// Browsers only allow audio after a user tap, so call this from a tap handler.
export function primeAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio available */ }
}

function beep() {
  if (!audioCtx) return;
  try {
    [0, 0.25].forEach((delay) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + delay);
      o.stop(audioCtx.currentTime + delay + 0.2);
    });
  } catch { /* ignore */ }
}

/* ---------- Timer ---------- */

// S.timer = { startedAt, endsAt, total, stoppedAt? }.
// It counts down, then keeps counting up past zero (it never vanishes on its
// own), so you can see how long you've actually rested. Ticking off a set
// always restarts it, so you never have to press Stop.
// Colours: yellow in the last WARN_SEC seconds, green at zero, red once
// you're more than LATE_SEC seconds over.
export const WARN_SEC = 10;
export const LATE_SEC = 5;
const STALE_MS = 30 * 60e3; // forgotten timers clear themselves after 30 min
let beeped = false;

// The timer's colour state and the seconds to show, at time `now`.
export function timerState(t, now = Date.now()) {
  const at = t.stoppedAt || now;
  const msLeft = t.endsAt - at;
  const left = Math.ceil(msLeft / 1000);
  const over = Math.floor(-msLeft / 1000);
  const rested = Math.floor((at - t.startedAt) / 1000);
  let state = 'run';
  if (msLeft <= 0) state = over > LATE_SEC ? 'late' : 'go';
  else if (left <= WARN_SEC) state = 'warn';
  return { state, left: Math.max(0, left), over: Math.max(0, over), rested, stopped: !!t.stoppedAt };
}

export function startTimer(sec) {
  const now = Date.now();
  S.timer = { startedAt: now, endsAt: now + sec * 1000, total: sec };
  S.lastRest = sec;
  beeped = false;
  persist();
  renderTimer();
}

// Restart with the last rest length (Start button).
export const restartTimer = () => startTimer(S.timer?.total || S.lastRest || S.rest || 90);

export function stopTimer() {
  if (!S.timer || S.timer.stoppedAt) return;
  S.timer.stoppedAt = Date.now();
  persist();
  renderTimer();
}

export function adjustTimer(seconds) {
  if (!S.timer || S.timer.stoppedAt) return;
  S.timer.endsAt = Math.max(Date.now() + 1000, S.timer.endsAt + seconds * 1000);
  S.timer.total = Math.max(5, S.timer.total + seconds);
  persist();
  updateTimer();
}

// Hide the bar until the next set is ticked off.
export function skipTimer() {
  S.timer = null;
  persist();
  renderTimer();
}


export function renderTimer() {
  const root = $('#timer-root');
  const t = S.timer;
  const show = !!t || !!S.active;
  document.body.classList.toggle('has-timer', show);
  if (!show) {
    root.innerHTML = '';
    return;
  }
  if (!t) {
    const sec = S.lastRest || S.rest || 90;
    root.innerHTML = `<div class="timer" data-state="idle">
      <p class="timer-text"><span class="timer-label">Rest timer</span><span class="timer-time">${fmtClock(sec)}</span></p>
      <button class="timer-btn timer-main" data-action="timer-start">Start</button>
    </div>`;
    return;
  }
  const running = !t.stoppedAt;
  root.innerHTML = `<div class="timer" id="timer">
    <svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-track" cx="22" cy="22" r="19"/><circle class="ring-fill" id="ring" cx="22" cy="22" r="19" pathLength="100"/></svg>
    <p class="timer-text"><span class="timer-label" id="timer-label"></span><span class="timer-time" id="timer-time" role="timer"></span></p>
    ${running
      ? `<button class="timer-btn" data-action="timer-add" data-id="-15" aria-label="15 seconds less">−15</button>
         <button class="timer-btn" data-action="timer-add" data-id="15" aria-label="15 seconds more">+15</button>
         <button class="timer-btn timer-main" data-action="timer-stop">Stop</button>`
      : `<button class="timer-btn timer-main" data-action="timer-start">Start</button>
         <button class="timer-btn" data-action="timer-skip" aria-label="Reset timer">✕</button>`}
  </div>`;
  updateTimer();
}

export function updateTimer() {
  const t = S.timer;
  const bar = $('#timer');
  if (!t || !bar) return;
  if (!t.stoppedAt && Date.now() - t.endsAt > STALE_MS) return skipTimer();
  const st = timerState(t);
  bar.dataset.state = st.stopped ? 'stopped' : st.state;
  $('#timer-label').textContent = st.stopped
    ? 'You rested'
    : st.state === 'go' || st.state === 'late' ? 'Time to lift' : 'Rest';
  $('#timer-time').textContent = st.stopped ? fmtClock(st.rested) : st.left > 0 ? fmtClock(st.left) : `+${fmtClock(st.over)}`;
  $('#ring').style.strokeDashoffset = String(100 - Math.min(1, st.left / t.total) * 100);
  if (!st.stopped && st.left === 0 && !beeped) {
    beeped = true;
    if (st.over <= LATE_SEC) { // skip the alert if it ran out while the app was closed
      beep();
      navigator.vibrate?.([200, 100, 200]);
    }
  }
}

// One ticker drives both the rest timer and the workout's elapsed clock.
setInterval(() => {
  updateTimer();
  const el = $('#elapsed');
  if (el && S.active) el.textContent = fmtElapsed(Date.now() - S.active.startedAt);
}, 250);
