# Micro Fitness

A workout app built on the idea behind *Atomic Habits*: get a tiny bit stronger every workout. Each exercise in a routine has a target, and every session nudges it forward by one small step: one more rep, a little more weight, or a few seconds less rest.

It's a progressive web app (PWA): it runs in the browser, installs to your home screen like a regular app, and works offline. It can be wrapped as an App Store / Google Play app later with [Capacitor](https://capacitorjs.com/) without rewriting it.

## What it does

- **Intro and SMART goal:** on first launch, a few questions (goal, why, what you enjoy, which days, session length, equipment, experience, past barriers, injuries, health and sleep) build a plan: a training phase, routines sized to your time and equipment, a weekly schedule, and a specific, measurable, time-bound goal. The Train screen shows the goal, your reason, progress and what's next up. Run it again any time from Settings.
- **Train:** start a saved routine or an empty workout. Your weekly goal is shown as plates loaded on a barbell.
- **Tiny steps:** every routine exercise has a target (for example 4 × 13 @ 135 lb, 60s rest). Each workout suggests one small step (+1 rep, +5 lb / 2.5 kg, or −5s rest), rotating between them; tap a different step if you prefer. Hit it and it becomes your new baseline. Miss it and you repeat it next time; miss twice and it tries a different kind of step.
- **Training phases:** endurance (12–20 reps, 2–3 sets, 30–60s rest), hypertrophy (6–12 reps, 3–6 sets, 30–90s rest), maximum strength (1–5 reps, 2–5 min rest) and power (1–10 reps, 2–5 min rest). Each phase runs 13 weeks, then the app prompts you to switch. All targets stay inside the phase's ranges. Once you hit the top of the rep range on every set, the next step is always more weight, with reps lowered just enough to keep it a tiny step. Switching phase converts your targets using your estimated one-rep max.
- **Smarter rest:** big compound lifts (squats, presses, deadlifts) rest at the longer end of the phase's range, isolation exercises (curls, raises, calf raises) at the shorter end. Beginner mode keeps every rest at 60 seconds or more so form holds up.
- **Log sets:** weight and reps for each set, pre-filled from last time, with your previous numbers shown under each exercise.
- **Rest timer:** starts automatically when you tick off a set. It turns yellow in the last 10 seconds, green (with a beep and vibration) when it's time to lift, and red once you're more than 5 seconds over, counting up so you can see how long you actually rested. Tap Stop when you start lifting to see your real rest, or don't bother: ticking off the next set restarts it. Start and Stop buttons work any time during a workout.
- **Levels:** every exercise has its own level and XP bar, like a game. You earn XP for showing up (+5), each tiny step (+10 for a rep or shorter rest, +15 for more weight) and new bests (+25). Muscle groups and your overall level add it all up. Each exercise also shows its estimated one-rep max and how much stronger you've got. Level-ups appear in the workout summary.
- **History:** every finished workout, grouped by month.
- **Progress:** a 12-week consistency view, weekly-goal streak, and a chart per exercise (estimated one-rep max, or max reps for bodyweight moves).
- **Routines built from muscle groups:** a day like Chest × 2, Triceps × 1, Shoulders × 1. Tick which exercises can come up for each group; every workout uses the ones you've done least recently, so you rotate through them. Pin an exercise to keep it in every workout. Each exercise keeps its own target and tiny-step progress. Push, Pull and Legs are included to start.
- **Exercise library:** 406 exercises across 12 muscle groups (including glutes, forearms and power/Olympic lifts), compiled from the StrengthLog and ACE Fitness directories with duplicates removed. Each is tagged with the equipment it needs. Stretches, timed holds and cardio machines are left out because the app logs sets × reps × weight.
- **Exercise list:** switch off anything you can't do right now (an injury, missing equipment). It's skipped in every routine until you switch it back on, and its progress is kept. Add your own exercises from the routine editor.
- **kg or lb:** tap the unit above the weight column during a workout to switch. Weights are saved in one unit behind the scenes, so switching (or sharing a backup with someone who uses the other unit) never changes the actual weight.
- **Settings:** kg or lb, beginner or experienced, weekly goal, default rest time, and backup export/import.

## Your data

Everything is stored on the device, in the browser's local storage. Nothing is sent to a server. Use **Settings → Export backup** now and then, especially before switching phones or clearing browser data.

## Test it on your Mac

Double-click **Start Micro Fitness** in this folder. A Terminal window opens (leave it open) and the **test lab** opens in your browser:

- The app in a phone-sized frame, with a choice of phone sizes.
- **Start fresh** or **load 8 weeks of sample workouts**, so History and Progress have something to show.
- **Save and restore snapshots** to repeat a test from the same point.
- **Phase clock** to jump to any week, including the end of a 13-week phase.
- **Run checks** to test the app's rules (tiny steps, rep cap, misses, phases, rest, rotation, data upgrades) in one click.
- A link to **try it on your phone** over the same Wi-Fi.

Test data stays on your Mac and never touches the app on your phone. Close the Terminal window to stop.

If your Mac says the file can't be opened, right-click it and choose **Open**. It uses Python if you have it, or otherwise a small server that comes with this folder (`test/serve.pl`), so nothing needs installing.

## Put it on your phone

The easiest free hosting is GitHub Pages:

1. In this repo on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute the app is live at `https://<your-username>.github.io/Micro_Fitness/`.
4. Open that link on your phone:
   - **iPhone (Safari):** Share → Add to Home Screen.
   - **Android (Chrome):** menu → Install app / Add to Home screen.

Updates you push to `main` reach your phone the next time you open the app (sometimes it takes two launches, since the offline cache refreshes in the background).

## Project layout

```
index.html            App shell and tab bar
css/app.css           All styles, light and dark mode
js/app.js             Entry point: button actions and event wiring
js/router.js          Tabs (#train, #history, …) and screen rendering
js/views/             One file per screen: train, session, history, progress, levels, routines
js/levels.js          XP and level rules
js/workout.js         Start, finish and discard workouts
js/intro.js           First-run questions, goal and plan preview
js/planner.js         Builds the plan from your answers
js/goal.js            Saves the plan; goal progress and next up
js/editor.js          Routine editor and exercise on/off list
js/rotation.js        Picks which exercises come up each workout
js/progression.js     Tiny-step rules
js/phases.js          Training phases and rest ranges
js/sheets.js          Pop-up sheets: mid-workout picker, phases, settings, backups
js/timer.js           Rest timer and workout clock
js/state.js           Shared app state and saving
js/store.js           Storage format, defaults, backup parsing
js/format.js          Units (kg/lb), dates, number formatting
js/queries.js         Lookups over workout history (last sets, bests, streaks)
js/ui.js              Toasts and the sheet system
js/dom.js             DOM helpers and icons
js/library.js         The exercise library (names, equipment, flags)
js/data.js            Muscle groups and starter routines
sw.js                 Offline caching (service worker)
Start Micro Fitness.command  Double-click on a Mac to open the test lab
test/                 Test lab: phone preview, test data, phase clock, checks
manifest.webmanifest  Install settings: name, icons, colours
icons/                App icons
```

See `CLAUDE.md` for conventions when changing the code, and `ROADMAP.md` for what's planned next (quests, avatars, friends).

## Turning it into a store app later

1. `npm init -y && npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init "Micro Fitness" com.yourname.microfitness --web-dir .` (or move the web files into a `www/` folder and use that)
3. `npx cap add ios` / `npx cap add android`, then open the native projects in Xcode or Android Studio.

Publishing needs an Apple Developer and/or Google Play developer account. Adding a native touch or two (notifications, Apple Health / Health Connect) helps with App Store review.
