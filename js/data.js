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

export const DEFAULT_ROUTINES = [
  {
    id: 'push',
    name: 'Push',
    rest: 90,
    exerciseIds: ['bench', 'ohp', 'incline-db', 'lateral-raise', 'pushdown'],
  },
  {
    id: 'pull',
    name: 'Pull',
    rest: 90,
    exerciseIds: ['deadlift', 'row', 'pull-up', 'face-pull', 'curl'],
  },
  {
    id: 'legs',
    name: 'Legs',
    rest: 120,
    exerciseIds: ['squat', 'rdl', 'leg-press', 'leg-curl', 'calf-raise'],
  },
];
