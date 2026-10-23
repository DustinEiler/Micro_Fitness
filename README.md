# Micro Fitness

A simple workout logbook for your phone. Log sets as you lift, follow saved routines with a rest timer, and track your progress over time.

It's a progressive web app (PWA): it runs in the browser, installs to your home screen like a regular app, and works offline. It can be wrapped as an App Store / Google Play app later with [Capacitor](https://capacitorjs.com/) without rewriting it.

## What it does

- **Train:** start a saved routine or an empty workout. Your weekly goal is shown as plates loaded on a barbell.
- **Log sets:** weight and reps for each set, pre-filled from last time, with your previous numbers shown under each exercise.
- **Rest timer:** starts automatically when you tick off a set, with a beep and vibration when it's done.
- **History:** every finished workout, grouped by month.
- **Progress:** a 12-week consistency view, weekly-goal streak, and a chart per exercise (estimated one-rep max, or max reps for bodyweight moves).
- **Routines:** create, edit, reorder and delete your own routines. Push, Pull and Legs are included to start.
- **Settings:** kg or lb, weekly goal, default rest time, and backup export/import.

## Your data

Everything is stored on the device, in the browser's local storage. Nothing is sent to a server. Use **Settings → Export backup** now and then, especially before switching phones or clearing browser data.

## Run it locally

No build step and no dependencies. From this folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly as a file won't work, because the app uses JavaScript modules.)

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
js/app.js             Screens, workout logic, rest timer, charts
js/store.js           Saving and loading data, backup import
js/data.js            Built-in exercise library and starter routines
sw.js                 Offline caching (service worker)
manifest.webmanifest  Install settings: name, icons, colours
icons/                App icons
```

## Turning it into a store app later

1. `npm init -y && npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init "Micro Fitness" com.yourname.microfitness --web-dir .` (or move the web files into a `www/` folder and use that)
3. `npx cap add ios` / `npx cap add android`, then open the native projects in Xcode or Android Studio.

Publishing needs an Apple Developer and/or Google Play developer account. Adding a native touch or two (notifications, Apple Health / Health Connect) helps with App Store review.
