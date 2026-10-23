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
  legs: 'Legs',
  calves: 'Calves',
  core: 'Core',
  arms: 'Arms',
  other: 'Other',
};

// Built-in exercises that moved group when biceps, triceps and calves got
// their own groups. Applied to saved data by the v5 migration.
export const GROUP_FIXES = { curl: 'biceps', 'hammer-curl': 'biceps', pushdown: 'triceps', skull: 'triceps', 'calf-raise': 'calves' };

// Isolation exercises work one muscle group and rest at the shorter end of a
// phase's range. Everything else counts as a compound lift.
const ISOLATION = new Set([
  'cable-fly', 'leg-curl', 'leg-ext', 'calf-raise', 'lateral-raise', 'face-pull', 'rear-delt',
  'curl', 'hammer-curl', 'pushdown', 'skull', 'leg-raise', 'cable-crunch', 'ab-wheel',
  'pec-deck', 'straight-arm', 'cable-lateral', 'db-curl', 'preacher', 'cable-curl', 'oh-ext', 'kickback', 'seated-calf',
]);

// An exercise's kind: its own setting if you've changed it, else the default.
export function exKind(id, exercises = []) {
  const ex = exercises.find((e) => e.id === id);
  return ex?.kind || (ISOLATION.has(id) ? 'isolation' : 'compound');
}

export const DEFAULT_EXERCISES = [
  { id: 'bench', name: 'Bench press', group: 'chest' },
  { id: 'incline-bench', name: 'Incline bench press', group: 'chest' },
  { id: 'incline-db', name: 'Incline dumbbell press', group: 'chest' },
  { id: 'db-bench', name: 'Dumbbell bench press', group: 'chest' },
  { id: 'machine-press', name: 'Machine chest press', group: 'chest' },
  { id: 'cable-fly', name: 'Cable fly', group: 'chest' },
  { id: 'pec-deck', name: 'Pec deck', group: 'chest' },
  { id: 'dips', name: 'Dips', group: 'chest' },
  { id: 'push-up', name: 'Push-up', group: 'chest' },

  { id: 'deadlift', name: 'Deadlift', group: 'back' },
  { id: 'row', name: 'Barbell row', group: 'back' },
  { id: 'tbar-row', name: 'T-bar row', group: 'back' },
  { id: 'db-row', name: 'One-arm dumbbell row', group: 'back' },
  { id: 'pull-up', name: 'Pull-up', group: 'back' },
  { id: 'chin-up', name: 'Chin-up', group: 'back' },
  { id: 'lat-pulldown', name: 'Lat pulldown', group: 'back' },
  { id: 'cable-row', name: 'Seated cable row', group: 'back' },
  { id: 'straight-arm', name: 'Straight-arm pulldown', group: 'back' },

  { id: 'ohp', name: 'Overhead press', group: 'shoulders' },
  { id: 'db-shoulder', name: 'Dumbbell shoulder press', group: 'shoulders' },
  { id: 'arnold', name: 'Arnold press', group: 'shoulders' },
  { id: 'lateral-raise', name: 'Lateral raise', group: 'shoulders' },
  { id: 'cable-lateral', name: 'Cable lateral raise', group: 'shoulders' },
  { id: 'face-pull', name: 'Face pull', group: 'shoulders' },
  { id: 'rear-delt', name: 'Rear delt fly', group: 'shoulders' },

  { id: 'curl', name: 'Barbell curl', group: 'biceps' },
  { id: 'db-curl', name: 'Dumbbell curl', group: 'biceps' },
  { id: 'hammer-curl', name: 'Hammer curl', group: 'biceps' },
  { id: 'preacher', name: 'Preacher curl', group: 'biceps' },
  { id: 'cable-curl', name: 'Cable curl', group: 'biceps' },

  { id: 'pushdown', name: 'Triceps pushdown', group: 'triceps' },
  { id: 'skull', name: 'Skull crusher', group: 'triceps' },
  { id: 'oh-ext', name: 'Overhead triceps extension', group: 'triceps' },
  { id: 'cg-bench', name: 'Close-grip bench press', group: 'triceps' },
  { id: 'kickback', name: 'Triceps kickback', group: 'triceps' },

  { id: 'squat', name: 'Back squat', group: 'legs' },
  { id: 'front-squat', name: 'Front squat', group: 'legs' },
  { id: 'goblet-squat', name: 'Goblet squat', group: 'legs' },
  { id: 'rdl', name: 'Romanian deadlift', group: 'legs' },
  { id: 'leg-press', name: 'Leg press', group: 'legs' },
  { id: 'lunge', name: 'Walking lunge', group: 'legs' },
  { id: 'split-squat', name: 'Bulgarian split squat', group: 'legs' },
  { id: 'hip-thrust', name: 'Hip thrust', group: 'legs' },
  { id: 'leg-curl', name: 'Leg curl', group: 'legs' },
  { id: 'leg-ext', name: 'Leg extension', group: 'legs' },

  { id: 'calf-raise', name: 'Standing calf raise', group: 'calves' },
  { id: 'seated-calf', name: 'Seated calf raise', group: 'calves' },

  { id: 'leg-raise', name: 'Hanging leg raise', group: 'core' },
  { id: 'cable-crunch', name: 'Cable crunch', group: 'core' },
  { id: 'ab-wheel', name: 'Ab wheel rollout', group: 'core' },
];

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
