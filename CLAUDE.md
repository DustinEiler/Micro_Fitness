# Micro Fitness

Workout app built on Atomic Habits: every routine exercise has a target (sets × reps @ weight, rest), and each workout moves it **one tiny step** further (+1 rep, +1 weight step, or −5s rest). Plain HTML/CSS/JS progressive web app, hosted on GitHub Pages, used on a phone. The owner is not a developer: keep explanations short and plain.

## Hard rules

- No build step, no frameworks, no npm dependencies. Vanilla ES modules only.
- All paths relative (the site is served from `/Micro_Fitness/`, not `/`).
- **When adding, renaming or deleting any file the app loads, update `SHELL` in `sw.js` and bump `CACHE`.** Otherwise the installed app breaks offline.
- Weights are stored in **kg** always. Convert only for display, via `toDisp`/`fromDisp` in `js/format.js`.
- Exercise IDs in `js/data.js` are permanent (history references them). Add new ones; never rename.
- Changing the saved data shape: keep old data loading (`load()` in `js/store.js` merges over `freshState()`); bump `SCHEMA_VERSION` and migrate if a field changes meaning.
- Escape user text with `esc()` before putting it in HTML.

## Where things are

Read only the files a task needs.

| Task | File |
|---|---|
| Button does something | `js/app.js` (`actions` map, keyed by `data-action`) |
| A screen's layout/content | `js/views/<train,session,history,progress,routines>.js` |
| Tiny-step rules: options, rotation, rep cap, hit/miss | `js/progression.js` |
| Training phases: ranges, 13-week clock, fitting targets | `js/phases.js` |
| Start/finish workout, PBs, summary | `js/workout.js` |
| Routine editor, new exercise, exercise on/off list | `js/editor.js` |
| Which exercises come up each workout (rotation) | `js/rotation.js` |
| Pop-ups: mid-workout picker, phases, settings, backup | `js/sheets.js` |
| Rest timer | `js/timer.js` |
| History lookups (last sets, bests, streak) | `js/queries.js` |
| Units, dates, number formats | `js/format.js` |
| Default exercises/routines, compound vs isolation | `js/data.js` |
| Styles, colours, dark mode | `css/app.css` (tokens at top of file) |

## Routines and rotation (js/rotation.js)

- Routine: `{ id, name, groups: [{ group, count }], items: [...] }`. Groups are muscle groups from `GROUPS` in `js/data.js` (biceps, triceps and calves are separate; `arms` only holds old custom exercises).
- `items` are the exercises ticked for the rotation (`picked`), plus unticked ones kept for their progress (`picked: false`). Items are never deleted by the editor, so `plan.index` stays valid.
- Each workout, per group: pinned items (`always`) first, then least recently done (`lastDone`, set on finish), up to `count`.
- `exercise.off` (exercise list) skips an exercise in every routine and the mid-workout picker; progress is kept.

## Progression rules (js/progression.js)

- Routine `items` hold the baseline: `{ exerciseId, sets, reps, w, rest, step?, ready, lever, pendingLever, missed }`.
- `ready: false`: the next session calibrates (logged sets become the baseline).
- Suggested lever rotates reps → weight → rest after the last success. Miss once: retry the same step. Miss twice: rotate to a different lever.
- Hit = at least `sets` checked-off sets with reps ≥ target and weight ≥ target. On hit, the target becomes the baseline and `S.stepsTaken` goes up.
- Every target stays inside the current phase's ranges (`PHASES` in `js/phases.js`): reps, sets (hypertrophy only), rest. The rest step is only offered if it stays above the phase minimum.
- **Rep cap rule:** when reps are at the top of the phase range, the only step is weight, with reps lowered to the smallest count whose estimated 1RM (Epley) still beats the old one (e.g. 12 @ 135 → 11 @ 140 lb).
- Weight step defaults to 2.5 kg / 5 lb (per-exercise override: `item.step`).
- Workout entries from a routine carry `plan` (see top of `js/workout.js`); exercises added mid-workout don't.

## Phases (js/phases.js)

- `S.phase = { id, startedAt, history }`. Phases: endurance 15–20 reps, 30–60s rest; hypertrophy 6–12 reps, 3–6 sets, 30–90s; strength 1–5 reps, 2–5 min; power 1–10 reps, 2–5 min. Each runs 13 weeks; then the Train screen prompts for the next (cycle order: endurance → hypertrophy → strength → power). All ranges come from the owner. Check with the owner before changing phase rules.
- **Rest per exercise** (`restRange`): compound lifts use the longer half of the phase's rest range, isolation exercises the shorter half (split at the midpoint). Kind comes from `exKind` in `js/data.js` (`ISOLATION` set, or the exercise's own `kind`). `S.experience === 'beginner'` raises every rest minimum to 60s. Call `fitAllRest()` after changing either.
- Conditioning (10–40s, HIIT/Tabata) is intentionally not a phase: it's timed work, a possible separate feature.
- Changing phase calls `fitItem` on every routine item: clamps into the new ranges and, if reps change, recalculates weight from estimated 1RM (rounded down to the weight step).
- New/imported/upgraded data sets `phaseFitPending`; `ensureFitted()` runs it once.

## Patterns

- State: `S` from `js/state.js`. Mutate it, call `persist()`, then `render()` (from `js/router.js`) if the screen structure changed. Use `persistSoon()` for keystrokes.
- Screens are template-string functions returning HTML; `render()` replaces `<main>`.
- New button: add `data-action="name"` (+ `data-i`/`data-j`/`data-id`) in the view, and a handler in `actions` in `js/app.js`.
- Dialogs are bottom sheets: `openSheet(html)`, `confirmSheet(msg, label, fn, danger)` in `js/ui.js`.
- Design: chalk-grey base, competition plate colours as accents (`--plate-*`), Barlow Condensed for numbers/headings, Barlow for text. Sentence case, plain copy, no all-caps labels.

## Checking work

- Run: `python3 -m http.server 8000` and open `http://localhost:8000` at a phone-sized viewport (390×844).
- Syntax check: `for f in js/*.js js/views/*.js sw.js; do node --check "$f"; done`
- Keep commits small, one change each, with a plain-English message.
