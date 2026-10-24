# Micro Fitness roadmap

Ideas for after the first version, roughly in the order they make sense to build. The big idea behind all three: real-life training "buffs you up" in the app.

## 1. Quests

Short challenges that reward you for training well. These work entirely inside the current app: no accounts, nothing leaves your phone.

- **Weekly quests**, refreshed every Monday. For example:
  - Train 3 times this week
  - Take 5 tiny steps
  - Set a new best on a compound lift
  - Train a muscle group you haven't trained for two weeks
  - Finish every set in a workout
- **Bigger milestone quests** that last longer, like "Hit your weekly goal four weeks in a row", "Reach level 5 on any exercise" or "Finish a 13-week phase".
- **Rewards:** bonus XP, badges and titles at first; avatar gear once avatars exist.
- **Safety rule:** quests never reward skipping rest days, training more days than your plan, or going past your rest and injury settings.

**What it needs:** quest definitions checked against workout history (the same way Levels works out XP), a Quests section (probably on the Levels tab), and checks in the test lab.

## 2. Avatar

A character you create, whose body reflects your actual training.

- **Body grows with your muscle group levels:** a higher chest level means a bigger chest, and the same for arms, legs, back and the rest. Train only one area and it shows.
- **Gear and outfits** earned from quests and levels.
- **Style:** a simple illustrated look that suits the app, not realistic 3D.
- Still entirely on your phone.

**What it needs:** a visual design and artwork for the body at different levels, a character creator, and a decision on how many body stages each muscle group gets.

## 3. Friends

See friends' avatars and levels, and maybe share quests.

This is the biggest change, because right now everything stays on your phone. Friends need:

- **Accounts and sign-in.**
- **An online service** to share levels and avatars (and to back up data). There are free starter tiers, but it's an ongoing service to run.
- **Privacy choices:** what friends can see (avatar and levels only, or workouts too), and how to add or remove friends.

Worth doing once the solo version feels right. It fits naturally with turning the app into an App Store / Google Play app (see the README).

## Also on the list

- **Timed exercises:** planks, hangs, carries and conditioning (HIIT, Tabata, 10–40 seconds' rest), which don't fit sets × reps × weight.
- **More exercises from ExRx**, added by hand (the site blocks automated reading).
- **Store app** with Capacitor, with a native touch like notifications or Apple Health / Health Connect.
- **Test before going live:** keep changes on a test copy until they've been tried, then publish.
