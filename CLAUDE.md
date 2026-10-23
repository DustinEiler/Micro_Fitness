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
| Tiny-step rules: options, rotation, hit/miss, baselines | `js/progression.js` |
| Start/finish workout, PBs, summary | `js/workout.js` |
| Pop-ups: picker, routine editor, settings, backup | `js/sheets.js` |
| Rest timer | `js/timer.js` |
| History lookups (last sets, bests, streak) | `js/queries.js` |
| Units, dates, number formats | `js/format.js` |
| Default exercises/routines | `js/data.js` |
| Styles, colours, dark mode | `css/app.css` (tokens at top of file) |

## Progression rules (js/progression.js)

- Routine `items` hold the baseline: `{ exerciseId, sets, reps, w, rest, step?, ready, lever, pendingLever, missed }`.
- `ready: false`: the next session calibrates (logged sets become the baseline).
- Suggested lever rotates reps → weight → rest after the last success. Miss once: retry the same step. Miss twice: rotate to a different lever.
- Hit = at least `sets` checked-off sets with reps ≥ target and weight ≥ target. On hit, the target becomes the baseline and `S.stepsTaken` goes up.
- Limits: rest ≥ 30s (`MIN_REST`), reps ≤ 30 (`MAX_REPS`). Weight step defaults to 2.5 kg / 5 lb.
- Workout entries from a routine carry `plan` (see top of `js/workout.js`); exercises added mid-workout don't.

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
