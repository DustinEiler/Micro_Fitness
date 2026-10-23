// Units, numbers and dates. Weights are stored in kg and converted for display.

import { S } from './state.js';

const KG_PER_LB = 0.45359237;

export const unit = () => S.units;

export const toDisp = (kg) => {
  if (kg == null || kg === '') return '';
  const v = S.units === 'kg' ? kg : kg / KG_PER_LB;
  return Math.round(v * 10) / 10;
};

export const fromDisp = (val) => {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return S.units === 'kg' ? n : n * KG_PER_LB;
};

// Estimated one-rep max (Epley).
export const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));
// How "good" a set is: e1RM for weighted sets, reps for bodyweight sets.
export const setScore = (s) => (s.w ? e1rm(s.w, s.r) : s.r || 0);
export const setStr = (s) => (s.w ? `${toDisp(s.w)} × ${s.r}` : `${s.r} reps`);

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const fmtNum = (n) => Math.round(n).toLocaleString();

export const fmtDate = (ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(ts).toLocaleDateString(undefined, opts);

export const fmtDur = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export const fmtElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  return h ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : fmtClock(s);
};

export const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function ago(ts) {
  const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

// Weeks start on Monday.
export function weekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
