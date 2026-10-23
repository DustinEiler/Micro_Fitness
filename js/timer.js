// Rest timer bar (shown above the tabs) and the workout elapsed clock.
// The timer stores an end timestamp, so it stays correct if the app is backgrounded.

import { S, persist } from './state.js';
import { $ } from './dom.js';
import { fmtClock, fmtElapsed } from './format.js';
import { toast } from './ui.js';

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

export function startTimer(sec) {
  S.timer = { endsAt: Date.now() + sec * 1000, total: sec };
  persist();
  renderTimer();
}

export function adjustTimer(seconds) {
  if (!S.timer) return;
  S.timer.endsAt = Math.max(Date.now() + 1000, S.timer.endsAt + seconds * 1000);
  S.timer.total = Math.max(S.timer.total, Math.ceil((S.timer.endsAt - Date.now()) / 1000));
  persist();
  updateTimer();
}

export function skipTimer() {
  S.timer = null;
  persist();
  renderTimer();
}

export function renderTimer() {
  const root = $('#timer-root');
  document.body.classList.toggle('has-timer', !!S.timer);
  if (!S.timer) {
    root.innerHTML = '';
    return;
  }
  if (!$('.timer', root))
    root.innerHTML = `<div class="timer">
      <svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-track" cx="22" cy="22" r="19"/><circle class="ring-fill" id="ring" cx="22" cy="22" r="19" pathLength="100"/></svg>
      <p class="timer-text"><span class="timer-label">Rest</span><span class="timer-time" id="timer-time" role="timer"></span></p>
      <button class="timer-btn" data-action="timer-add" data-id="-15" aria-label="15 seconds less">−15</button>
      <button class="timer-btn" data-action="timer-add" data-id="15" aria-label="15 seconds more">+15</button>
      <button class="timer-btn timer-skip" data-action="timer-skip">Skip</button>
    </div>`;
  updateTimer();
}

export function updateTimer() {
  if (!S.timer) return;
  const msLeft = S.timer.endsAt - Date.now();
  const left = Math.max(0, Math.ceil(msLeft / 1000));
  const t = $('#timer-time');
  if (t) t.textContent = fmtClock(left);
  const ring = $('#ring');
  if (ring) ring.style.strokeDashoffset = String(100 - (left / S.timer.total) * 100);
  if (msLeft <= 0) {
    const late = msLeft < -5000; // ran out while the app was closed: clear quietly
    S.timer = null;
    persist();
    renderTimer();
    if (!late) {
      beep();
      navigator.vibrate?.([200, 100, 200]);
      toast('Rest’s over. Time for your next set.');
    }
  }
}

// One ticker drives both the rest timer and the workout's elapsed clock.
setInterval(() => {
  updateTimer();
  const el = $('#elapsed');
  if (el && S.active) el.textContent = fmtElapsed(Date.now() - S.active.startedAt);
}, 250);
