# Micro Fitness

Workout app built on Atomic Habits: every routine exercise has a target (sets × reps @ weight, rest), and each workout moves it **one tiny step** further (+1 rep, +1 weight step, or −5s rest). Plain HTML/CSS/JS progressive web app, hosted on GitHub Pages, used on a phone. The owner is not a developer: keep explanations short and plain.

Future ideas (quests, avatar, friends, timed exercises) are in `ROADMAP.md`. Read it before starting any of them.
The owner is working through `REVIEW.md`, a checklist of training rules, one item at a time. Tick items and write the decision in as they're settled. `GUIDELINES.md` holds what the owner's chosen sites (NASM, ACE, Healthline, Nerd Fitness; ExRx is blocked) recommend and where they conflict. Follow it; ask the owner about any unresolved conflict.

## Hard rules

- No build step, no frameworks, no npm dependencies. Vanilla ES modules only.
- All paths relative (the site is served from `/Micro_Fitness/`, not `/`).
- **When adding, renaming or deleting any file the app loads, update `SHELL` in `sw.js` and bump `CACHE`.** Otherwise the installed app breaks offline.
- Weights are stored in **kg** always. Convert only for display, via `toDisp`/`fromDisp` in `js/format.js`.
- Exercise IDs in `js/library.js` are permanent (history references them). Add new ones; never rename.
- Changing the saved data shape: keep old data loading (`load()` in `js/store.js` merges over `freshState()`); bump `SCHEMA_VERSION` and migrate if a field changes meaning.
- Escape user text with `esc()` before putting it in HTML.

## Where things are

Read only the files a task needs.

| Task | File |
|---|---|
| Button does something | `js/app.js` (`actions` map, keyed by `data-action`) |
| A screen's layout/content | `js/views/<train,session,history,progress,levels,routines>.js` |
| XP and level rules | `js/levels.js` |
| Tiny-step rules: options, rotation, rep cap, hit/miss | `js/progression.js` |
| Training phases: ranges, 13-week clock, fitting targets | `js/phases.js` |
| Start/finish workout, PBs, summary | `js/workout.js` |
| First-run intro screens (questions, SMART goal, plan preview) | `js/intro.js` |
| Building a plan from the intro answers; tips | `js/planner.js` |
| Saving the plan, goal progress, Next up, schedule | `js/goal.js` |
| Routine editor, new exercise, exercise on/off list | `js/editor.js` |
| Which exercises come up each workout (rotation) | `js/rotation.js` |
| Pop-ups: mid-workout picker, phases, settings, backup | `js/sheets.js` |
| Rest timer | `js/timer.js` |
| History lookups (last sets, bests, streak) | `js/queries.js` |
| Units, dates, number formats | `js/format.js` |
| Exercise library: 406 exercises, equipment, flags | `js/library.js` |
| Muscle groups, starter routines, compound vs isolation | `js/data.js` |
| Styles, colours, dark mode | `css/app.css` (tokens at top of file) |

## Intro and SMART goals (js/intro.js, js/planner.js, js/goal.js)

- First launch (`S.onboarding === 'pending'`) shows the intro. Existing users get an offer card on Train (`'offer'`). Settings has "Build a new plan" and "Set a new goal".
- Questions follow the owner's list: goal, why, enjoyment, days (actual weekdays, max 6), session length, place and equipment, experience, past barriers, injury areas, health check and sleep, then the SMART goal and plan preview.
- Plan rules (`buildPlan`): phase from goal (beginners or a health flag start strength/power with a hypertrophy foundation); split by days (1–2 full body, 3 full body for beginners/fat loss/health/endurance else push/pull/legs, 4 upper/lower, 5 PPL + upper/lower, 6 PPL ×2); each routine sized by `estimateMinutes` to fit the session (3–7 exercises, extra sets if time spare, shorter rests if over); only exercises the person's equipment allows, no advanced moves for beginners, `INJURY_RISK` moves switched off.
- Goal: workouts target = days × weeks, plus one lift improved by a % (`recommendedPct` by experience and timeframe; >1.5× is flagged ambitious). Progress compares best e1RM (or reps for bodyweight) during the goal to the session before it started (or the first one after).
- Research behind it: ACE SMART guide, Philly YMCA, SM Personal Training, Freeform Fitness (4–6 exercises, reassess every 4–8 weeks), CDC adult guidelines (150 min moderate activity, strength 2+ days, all major muscles). The SELF article and ExRx block automated reading.
- Health answers are only used to set beginner mode and show a see-your-doctor note. Never give medical advice in copy.

## Levels and XP (js/levels.js, js/views/levels.js)

- Owner chose XP from tiny steps, with an overall level and per-muscle-group levels. Estimated 1RM is shown alongside as the strength number.
- XP is worked out from workout history every time (never stored), so old workouts count. Per exercise per workout: +5 showing up, +10 rep or rest step, +15 weight step, +25 new best (setScore: e1RM, or reps for bodyweight). Workouts without `entry.step` (saved before steps were recorded) get +10 if they beat the previous session.
- `finishWorkout` saves `entry.step = { kind, lever }` from `applyResult`. Keep doing this for any new way of finishing a workout.
- Curves: exercise level n→n+1 needs 50 + 25(n−1) XP; muscle group 100 + 50(n−1); overall 200 + 100(n−1). Overall titles change every 5 levels.
- The workout summary shows XP earned and level-ups (`workoutGains`).

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

- Test lab: `python3 -m http.server 8000`, then open `http://localhost:8000/test/` (the owner double-clicks `Start Micro Fitness.command`). It shows the app in a phone frame, loads sample data, jumps the phase clock, and runs built-in checks.
- **Add a check to `CHECKS` in `test/lab.js` for every new rule.** Run them before pushing; all must pass.
- On localhost the app skips the service worker so edits show on reload. Offline mode can only be tested on the live site.
- `test/` is not part of the app: don't add it to `SHELL` in `sw.js`. The lab refuses to run anywhere but localhost or a local network address, so it can't touch live data.
- Syntax check: `for f in js/*.js js/views/*.js sw.js test/lab.js; do node --check "$f"; done`
- Keep commits small, one change each, with a plain-English message.
- The owner keeps a test copy at `~/Downloads/Micro_Fitness` on his Mac. When the computer is linked, update it after pushing (keep `Start Micro Fitness.command` executable).
