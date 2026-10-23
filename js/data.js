// Built-in exercise library and starter routines.
// IDs are stable: workout history refers to exercises by ID, so never rename an ID.

export const GROUPS = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  other: 'Other',
};

export const DEFAULT_EXERCISES = [
  { id: 'bench', name: 'Bench press', group: 'chest' },
  { id: 'incline-db', name: 'Incline dumbbell press', group: 'chest' },
  { id: 'db-bench', name: 'Dumbbell bench press', group: 'chest' },
  { id: 'cable-fly', name: 'Cable fly', group: 'chest' },
  { id: 'dips', name: 'Dips', group: 'chest' },
  { id: 'push-up', name: 'Push-up', group: 'chest' },

  { id: 'deadlift', name: 'Deadlift', group: 'back' },
  { id: 'row', name: 'Barbell row', group: 'back' },
  { id: 'db-row', name: 'One-arm dumbbell row', group: 'back' },
  { id: 'pull-up', name: 'Pull-up', group: 'back' },
  { id: 'chin-up', name: 'Chin-up', group: 'back' },
  { id: 'lat-pulldown', name: 'Lat pulldown', group: 'back' },
  { id: 'cable-row', name: 'Seated cable row', group: 'back' },

  { id: 'squat', name: 'Back squat', group: 'legs' },
  { id: 'front-squat', name: 'Front squat', group: 'legs' },
  { id: 'rdl', name: 'Romanian deadlift', group: 'legs' },
  { id: 'leg-press', name: 'Leg press', group: 'legs' },
  { id: 'lunge', name: 'Walking lunge', group: 'legs' },
  { id: 'split-squat', name: 'Bulgarian split squat', group: 'legs' },
  { id: 'hip-thrust', name: 'Hip thrust', group: 'legs' },
  { id: 'leg-curl', name: 'Leg curl', group: 'legs' },
  { id: 'leg-ext', name: 'Leg extension', group: 'legs' },
  { id: 'calf-raise', name: 'Standing calf raise', group: 'legs' },

  { id: 'ohp', name: 'Overhead press', group: 'shoulders' },
  { id: 'db-shoulder', name: 'Dumbbell shoulder press', group: 'shoulders' },
  { id: 'lateral-raise', name: 'Lateral raise', group: 'shoulders' },
  { id: 'face-pull', name: 'Face pull', group: 'shoulders' },
  { id: 'rear-delt', name: 'Rear delt fly', group: 'shoulders' },

  { id: 'curl', name: 'Barbell curl', group: 'arms' },
  { id: 'hammer-curl', name: 'Hammer curl', group: 'arms' },
  { id: 'pushdown', name: 'Triceps pushdown', group: 'arms' },
  { id: 'skull', name: 'Skull crusher', group: 'arms' },

  { id: 'leg-raise', name: 'Hanging leg raise', group: 'core' },
  { id: 'cable-crunch', name: 'Cable crunch', group: 'core' },
  { id: 'ab-wheel', name: 'Ab wheel rollout', group: 'core' },
];

// Starter routines. Weights are left blank: the first session with a routine
// records your starting point, and progression builds from there.
const item = (exerciseId, sets, reps, rest) => ({ exerciseId, sets, reps, rest });

export const DEFAULT_ROUTINES = [
  {
    id: 'push',
    name: 'Push',
    items: [item('bench', 4, 8, 90), item('ohp', 3, 8, 90), item('incline-db', 3, 10, 75), item('lateral-raise', 3, 12, 60), item('pushdown', 3, 12, 60)],
  },
  {
    id: 'pull',
    name: 'Pull',
    items: [item('deadlift', 3, 5, 120), item('row', 4, 8, 90), item('pull-up', 3, 6, 90), item('face-pull', 3, 15, 60), item('curl', 3, 10, 60)],
  },
  {
    id: 'legs',
    name: 'Legs',
    items: [item('squat', 4, 6, 120), item('rdl', 3, 8, 90), item('leg-press', 3, 10, 90), item('leg-curl', 3, 12, 60), item('calf-raise', 4, 12, 60)],
  },
];
