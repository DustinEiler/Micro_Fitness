import { LIBRARY_EXERCISES } from './library.js';
export { EQUIPMENT } from './library.js';

// Built-in exercise library and starter routines.
// IDs are stable: workout history refers to exercises by ID, so never rename an ID.

// Muscle groups, in the order they're listed. "Arms" only holds custom
// exercises made before biceps and triceps were split.
export const GROUPS = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms and grip',
  legs: 'Legs',
  glutes: 'Glutes',
  calves: 'Calves and shins',
  core: 'Core',
  olympic: 'Power and Olympic lifts',
  neck: 'Neck',
  arms: 'Arms',
  other: 'Other',
};

// Built-in exercises that moved group when biceps, triceps and calves got
// their own groups. Applied to saved data by the v5 migration.
export const GROUP_FIXES = { curl: 'biceps', 'hammer-curl': 'biceps', pushdown: 'triceps', skull: 'triceps', 'calf-raise': 'calves' };

// The built-in library (see js/library.js for the list and where it came from).
export const DEFAULT_EXERCISES = LIBRARY_EXERCISES;
const DEFAULTS_BY_ID = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
export const defaultExercise = (id) => DEFAULTS_BY_ID.get(id);

// Short equipment text for lists, e.g. "Dumbbells, bench" or "Bodyweight".
const EQUIP_SHORT = {
  barbell: 'barbell', dumbbell: 'dumbbells', kettlebell: 'kettlebell', bench: 'bench', cable: 'cable',
  machine: 'machine', bar: 'pull-up bar', band: 'band', suspension: 'suspension trainer', small: 'small gear',
};
export function equipText(ex) {
  const list = (ex?.equip ?? defaultExercise(ex?.id)?.equip ?? []).map((k) => EQUIP_SHORT[k] || k);
  if (!list.length) return ex?.equip ? 'Bodyweight' : '';
  const t = list.join(', ');
  return t[0].toUpperCase() + t.slice(1);
}

// Isolation exercises work one muscle group and rest at the shorter end of a
// phase's range. An exercise's own kind wins (you can change it in the
// routine editor), then the library's, else it counts as a compound lift.
export function exKind(id, exercises = []) {
  const ex = exercises.find((e) => e.id === id);
  return ex?.kind || DEFAULTS_BY_ID.get(id)?.kind || 'compound';
}

// Starter routines. Each is a list of muscle groups, how many exercises from
// each group per workout, and which exercises can come up in the rotation.
// always: true pins an exercise so it's in every workout. Weights are left
// blank: the first session sets the starting point. Sets, reps and rest are
// fitted to the current phase on first load.
const pick = (exerciseId, always = false) => ({ exerciseId, sets: 3, reps: 8, rest: 90, always });

export const DEFAULT_ROUTINES = [
  {
    id: 'push',
    name: 'Push',
    groups: [{ group: 'chest', count: 2 }, { group: 'shoulders', count: 2 }, { group: 'triceps', count: 1 }],
    items: [
      pick('bench', true), pick('incline-db'), pick('db-bench'), pick('cable-fly'),
      pick('ohp', true), pick('lateral-raise'), pick('cable-lateral'),
      pick('pushdown'), pick('skull'), pick('oh-ext'),
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    groups: [{ group: 'back', count: 3 }, { group: 'shoulders', count: 1 }, { group: 'biceps', count: 1 }],
    items: [
      pick('deadlift', true), pick('row'), pick('pull-up'), pick('lat-pulldown'), pick('cable-row'),
      pick('face-pull'), pick('rear-delt'),
      pick('curl'), pick('hammer-curl'), pick('db-curl'),
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    groups: [{ group: 'legs', count: 4 }, { group: 'calves', count: 1 }],
    items: [
      pick('squat', true), pick('rdl'), pick('leg-press'), pick('split-squat'), pick('leg-curl'), pick('leg-ext'),
      pick('calf-raise'), pick('seated-calf'),
    ],
  },
];
