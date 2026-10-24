// The built-in exercise library.
// Compiled from the StrengthLog exercise directory and the ACE Fitness
// exercise library (names only), with duplicates removed. Left out on
// purpose: stretches and mobility drills, agility drills, timed holds
// (planks, hangs, carries) and cardio machines, because the app logs
// sets × reps × weight.
//
// One exercise per line:  id | name | equipment | flags
//   id        permanent: workout history refers to it. Never rename one.
//   equipment what you need, space-separated (keys of EQUIPMENT below);
//             blank means bodyweight only.
//   flags     c = common (shown first in the routine editor)
//             i = isolation (works one muscle; shorter rest)
//             x = explosive (good for the power phase)
//             a = advanced (not suggested to beginners)

export const EQUIPMENT = {
  barbell: 'Barbell and plates',
  dumbbell: 'Dumbbells',
  kettlebell: 'Kettlebells',
  bench: 'Bench',
  cable: 'Cable machine',
  machine: 'Weight machines',
  bar: 'Pull-up or dip bar',
  band: 'Resistance bands',
  suspension: 'Suspension trainer or rings',
  small: 'Small gear (stability ball, medicine ball, box, ab wheel)',
};

const LIBRARY = {
  chest: `
bench | Bench press | barbell bench | c
incline-bench | Incline bench press | barbell bench | c
decline-bench | Decline bench press | barbell bench |
db-bench | Dumbbell bench press | dumbbell bench | c
incline-db | Incline dumbbell press | dumbbell bench | c
decline-db | Decline dumbbell press | dumbbell bench |
offset-db-press | Offset single-arm dumbbell press | dumbbell bench |
db-floor-press | Dumbbell floor press | dumbbell |
floor-press | Floor press | barbell |
kb-floor-press | Kettlebell floor press | kettlebell |
feet-up-bench | Feet-up bench press | barbell bench |
pin-bench | Pin bench press | barbell bench |
board-press | Board press | barbell bench |
band-bench | Band-resisted bench press | barbell bench band | a
band-assisted-bench | Band-assisted bench press | barbell bench band |
smith-bench | Smith machine bench press | machine bench |
smith-incline | Smith machine incline press | machine bench |
smith-reverse-bench | Smith machine reverse-grip bench press | machine bench |
machine-press | Machine chest press | machine | c
machine-cg-press | Machine close-grip chest press | machine |
cable-press | Cable chest press | cable |
cable-incline-press | Incline cable press | cable |
cable-decline-press | Decline cable press | cable |
band-sa-press | Single-arm band chest press | band |
cable-fly | Cable fly | cable | c i
seated-cable-fly | Seated cable fly | cable | i
low-cable-fly | Low-to-high cable fly | cable | i
high-cable-fly | High-to-low cable fly | cable | i
db-fly | Dumbbell fly | dumbbell bench | c i
pec-deck | Pec deck | machine | c i
band-fly | Band chest fly | band | i
db-pullover | Dumbbell pullover | dumbbell bench | i
dips | Dips | bar | c
assisted-dip | Assisted dip | machine |
ring-dip | Ring dip | suspension | a
push-up | Push-up |  | c
incline-push-up | Incline push-up |  |
kneeling-push-up | Kneeling push-up |  |
kneeling-incline-push-up | Kneeling incline push-up |  |
wall-push-up | Wall push-up |  |
decline-push-up | Decline push-up |  |
staggered-push-up | Staggered-hands push-up |  |
push-up-leg-raise | Push-up with leg raise |  |
plank-push-up | Plank to push-up |  |
cobra-push-up | Cobra push-up |  |
clap-push-up | Clap push-up |  | x a
ring-push-up | Push-up with feet in rings | suspension |
trx-push-up | Suspension push-up | suspension |
trx-atomic | Suspension atomic push-up | suspension | a
trx-chest-press | Suspension chest press | suspension |
trx-sa-press | Single-arm suspension chest press | suspension | a
ball-push-up | Stability ball push-up | small |
medball-push-up | Medicine ball push-up | small |
sa-medball-push-up | Single-arm medicine ball push-up | small | a
medball-chest-pass | Medicine ball chest pass | small | x
`,
  back: `
deadlift | Deadlift | barbell | c
sumo-deadlift | Sumo deadlift | barbell |
trap-deadlift | Trap bar deadlift | barbell |
deficit-deadlift | Deficit deadlift | barbell | a
pause-deadlift | Pause deadlift | barbell |
snatch-deadlift | Snatch-grip deadlift | barbell | a
rack-pull | Rack pull | barbell |
db-deadlift | Dumbbell deadlift | dumbbell |
smith-deadlift | Smith machine deadlift | machine |
good-morning | Good morning | barbell |
row | Barbell row | barbell | c
pendlay-row | Pendlay row | barbell |
tbar-row | T-bar row | barbell |
seal-row | Seal row | barbell bench |
db-row | One-arm dumbbell row | dumbbell bench | c
chest-db-row | Chest-supported dumbbell row | dumbbell bench |
kroc-row | Kroc row | dumbbell | a
renegade-row | Renegade row | dumbbell |
kb-row | Kettlebell row | kettlebell |
gorilla-row | Gorilla row | kettlebell |
smith-row | Smith machine one-arm row | machine |
cable-row | Seated cable row | cable | c
wide-cable-row | Wide-grip cable row | cable |
sa-cable-row | One-arm cable row | cable |
machine-row | Seated machine row | machine | c
high-row | Machine high row | machine |
band-row | Band row | band |
band-high-row | Band high row | band |
inverted-row | Inverted row | bar |
inverted-row-underhand | Underhand inverted row | bar |
ring-row | Ring row | suspension |
trx-sa-row | Single-arm suspension row | suspension |
towel-row | Towel row |  |
pull-up | Pull-up | bar | c
neutral-pull-up | Neutral-grip pull-up | bar |
chin-up | Chin-up | bar | c
cg-chin-up | Close-grip chin-up | bar |
assisted-pull-up | Assisted pull-up | machine |
assisted-chin-up | Assisted chin-up | machine |
scap-pull-up | Scapular pull-up | bar |
chest-to-bar | Chest-to-bar pull-up | bar | a
ring-pull-up | Ring pull-up | suspension | a
muscle-up | Bar muscle-up | bar | x a
ring-muscle-up | Ring muscle-up | suspension | x a
banded-muscle-up | Band-assisted muscle-up | bar band | a
jumping-muscle-up | Jumping muscle-up | bar | a
lat-pulldown | Lat pulldown | cable | c
lat-pulldown-supinated | Underhand lat pulldown | cable |
lat-pulldown-neutral | Neutral-grip lat pulldown | cable |
cg-lat-pulldown | Close-grip lat pulldown | cable |
sa-lat-pulldown | One-arm lat pulldown | cable |
machine-pulldown | Machine lat pulldown | machine |
band-pulldown | Kneeling band lat pulldown | band |
straight-arm | Straight-arm pulldown | cable | i
rope-pulldown | Rope pulldown | cable | i
band-straight-arm | Band straight-arm pulldown | band | i
shrug | Barbell shrug | barbell | i
db-shrug | Dumbbell shrug | dumbbell | i
back-ext | Back extension | machine |
floor-back-ext | Floor back extension |  |
superman | Superman |  |
ball-reverse-ext | Stability ball reverse extension | small |
jefferson-curl | Jefferson curl | dumbbell | a
`,
  shoulders: `
ohp | Overhead press | barbell | c
seated-ohp | Seated barbell overhead press | barbell bench |
push-press | Push press | barbell | x
behind-neck-press | Behind-the-neck press | barbell | a
snatch-bnp | Snatch-grip behind-the-neck press | barbell | a
z-press | Z press | barbell |
db-shoulder | Dumbbell shoulder press | dumbbell | c
seated-db-shoulder | Seated dumbbell shoulder press | dumbbell bench | c
arnold | Arnold press | dumbbell |
rot-press | Rotational overhead press | dumbbell |
squat-to-press | Squat to overhead press | dumbbell |
machine-shoulder | Machine shoulder press | machine | c
smith-shoulder | Seated Smith machine shoulder press | machine bench |
landmine-press | Landmine press | barbell |
sa-landmine-press | One-arm landmine press | barbell |
smith-landmine | Smith machine landmine press | machine |
kb-press | Kettlebell press | kettlebell |
seated-kb-press | Seated kettlebell press | kettlebell |
kb-push-press | Kettlebell push press | kettlebell | x
kb-bottom-up | Kettlebell bottom-up press | kettlebell | a
handstand-push-up | Handstand push-up |  | a
wall-walk | Wall walk |  | a
lateral-raise | Lateral raise | dumbbell | c i
cable-lateral | Cable lateral raise | cable | c i
machine-lateral | Machine lateral raise | machine | i
band-lateral | Band lateral raise | band | i
db-front-raise | Dumbbell front raise | dumbbell | i
bb-front-raise | Barbell front raise | barbell | i
cable-front-raise | Cable front raise | cable | i
plate-front-raise | Plate front raise | barbell | i
poliquin-raise | Poliquin raise | dumbbell | i
upright-row | Barbell upright row | barbell |
face-pull | Face pull | cable | c i
band-face-pull | Band face pull | band | i
band-pull-apart | Band pull-apart | band | i
rear-delt | Rear delt fly | dumbbell | c i
incline-rear-delt | Incline rear delt fly | dumbbell bench | i
reverse-cable-fly | Reverse cable fly | cable | i
reverse-machine-fly | Reverse machine fly | machine | i
band-reverse-fly | Band reverse fly | band | i
bb-rear-delt-row | Barbell rear delt row | barbell |
db-rear-delt-row | Dumbbell rear delt row | dumbbell |
cable-rear-delt-row | Cable rear delt row | cable |
cuban-press | Cuban press | dumbbell | i
kb-halo | Kettlebell halo | kettlebell | i
turkish-getup | Turkish get-up | kettlebell | a
band-ext-rot | Band external rotation | band | i
band-int-rot | Band internal rotation | band | i
cable-ext-rot | Cable external rotation | cable | i
cable-int-rot | Cable internal rotation | cable | i
db-ext-rot | Lying dumbbell external rotation | dumbbell | i
db-int-rot | Lying dumbbell internal rotation | dumbbell | i
db-horiz-ext-rot | Dumbbell horizontal external rotation | dumbbell | i
db-horiz-int-rot | Dumbbell horizontal internal rotation | dumbbell | i
`,
  biceps: `
curl | Barbell curl | barbell | c i
ez-curl | EZ-bar curl | barbell | i
db-curl | Dumbbell curl | dumbbell | c i
seated-db-curl | Seated dumbbell curl | dumbbell bench | i
hammer-curl | Hammer curl | dumbbell | c i
incline-curl | Incline dumbbell curl | dumbbell bench | i
concentration-curl | Concentration curl | dumbbell | i
preacher | Preacher curl | barbell bench | i
db-preacher | Dumbbell preacher curl | dumbbell bench | i
spider-curl | Spider curl | dumbbell bench | i
drag-curl | Drag curl | barbell | i
reverse-curl | Reverse barbell curl | barbell | i
reverse-db-curl | Reverse dumbbell curl | dumbbell | i
zottman | Zottman curl | dumbbell | i
cable-curl | Cable curl | cable | c i
rope-curl | Cable rope curl | cable | i
bayesian | Bayesian cable curl | cable | i
overhead-cable-curl | Overhead cable curl | cable | i
crossover-curl | Cable crossover curl | cable | i
lying-cable-curl | Lying cable curl | cable bench | i
machine-curl | Machine curl | machine | i
kb-curl | Kettlebell curl | kettlebell | i
band-curl | Band curl | band | i
bodyweight-curl | Bodyweight curl | suspension | i
`,
  triceps: `
pushdown | Triceps pushdown | cable | c i
rope-pushdown | Rope pushdown | cable | c i
band-pushdown | Band pushdown | band | i
skull | Skull crusher | barbell bench | c i
db-skull | Dumbbell lying triceps extension | dumbbell bench | i
incline-skull | Incline barbell triceps extension | barbell bench | i
smith-skull | Smith machine skull crusher | machine bench | i
oh-ext | Overhead triceps extension | dumbbell | c i
bb-oh-ext | Barbell overhead triceps extension | barbell | i
cable-oh-ext | Overhead cable triceps extension | cable | i
crossbody-ext | Cross-body cable triceps extension | cable | i
machine-tri-ext | Machine triceps extension | machine | i
tate-press | Tate press | dumbbell bench | i
kickback | Triceps kickback | dumbbell | i
cg-bench | Close-grip bench press | barbell bench | c
cg-feet-up-bench | Close-grip feet-up bench press | barbell bench |
cg-push-up | Close-grip push-up |  |
bench-dip | Bench dip | bench |
bw-tri-ext | Bodyweight triceps extension | suspension | i
`,
  forearms: `
wrist-curl | Barbell wrist curl | barbell | c i
db-wrist-curl | Dumbbell wrist curl | dumbbell | c i
btb-wrist-curl | Behind-the-back wrist curl | barbell | i
plate-wrist-curl | Plate wrist curl | barbell | i
wrist-ext | Barbell wrist extension | barbell | i
db-wrist-ext | Dumbbell wrist extension | dumbbell | i
wrist-roller | Wrist roller | small | i
gripper | Hand gripper | small | i
fat-bar-dl | Fat-bar deadlift | barbell |
towel-pull-up | Towel pull-up | bar | a
`,
  legs: `
squat | Back squat | barbell | c
front-squat | Front squat | barbell | c
box-squat | Box squat | barbell |
pause-squat | Pause squat | barbell |
pin-squat | Pin squat | barbell |
safety-bar-squat | Safety bar squat | barbell |
zercher | Zercher squat | barbell | a
bb-hack-squat | Barbell hack squat | barbell |
landmine-squat | Landmine squat | barbell |
landmine-hack | Landmine hack squat | barbell |
smith-squat | Smith machine squat | machine |
smith-front-squat | Smith machine front squat | machine |
hack-squat | Hack squat | machine | c
pendulum-squat | Pendulum squat | machine |
belt-squat | Belt squat | machine |
leg-press | Leg press | machine | c
vertical-leg-press | Vertical leg press | machine |
goblet-squat | Goblet squat | dumbbell | c
db-squat | Dumbbell squat | dumbbell |
kb-front-squat | Kettlebell front squat | kettlebell |
sumo-squat | Sumo squat | dumbbell |
air-squat | Bodyweight squat |  |
chair-squat | Chair squat |  |
zombie-squat | Zombie squat | barbell | a
pistol-squat | Pistol squat |  | a
lunge | Walking lunge | dumbbell | c
bb-walking-lunge | Barbell walking lunge | barbell |
bb-lunge | Barbell lunge | barbell |
db-lunge | Dumbbell lunge | dumbbell |
bw-lunge | Bodyweight lunge |  |
reverse-lunge | Reverse dumbbell lunge | dumbbell |
bb-reverse-lunge | Reverse barbell lunge | barbell |
bw-reverse-lunge | Reverse bodyweight lunge |  |
side-lunge | Side lunge |  |
curtsy-lunge | Curtsy lunge |  |
smith-lunge | Smith machine lunge | machine |
split-squat | Bulgarian split squat | dumbbell bench | c
smith-split-squat | Smith machine Bulgarian split squat | machine bench |
step-up | Step-up | bench |
prisoner-get-up | Prisoner get-up |  |
rdl | Romanian deadlift | barbell | c
db-rdl | Dumbbell Romanian deadlift | dumbbell |
smith-rdl | Smith machine Romanian deadlift | machine |
stiff-leg-dl | Stiff-legged deadlift | barbell |
leg-curl | Leg curl | machine | c i
seated-leg-curl | Seated leg curl | machine | i
standing-leg-curl | Standing leg curl | machine | i
one-leg-curl | One-leg lying leg curl | machine | i
one-leg-seated-curl | One-leg seated leg curl | machine | i
ball-leg-curl | Stability ball leg curl | small | i
bw-leg-curl | Bodyweight leg curl |  | i
nordic | Nordic hamstring curl |  | a
ghr | Glute-ham raise | machine | a
leg-ext | Leg extension | machine | c i
one-leg-ext | One-leg leg extension | machine | i
cable-leg-ext | Standing cable leg extension | cable | i
reverse-nordic | Reverse Nordic |  | a
adductor | Hip adduction machine | machine | i
cable-adduction | Cable hip adduction | cable | i
band-adduction | Band hip adduction | band | i
hip-flexor-raise | Standing hip flexor raise |  | i
band-hip-march | Banded hip march | band | i
jump-squat | Jump squat |  | x
jumping-lunge | Jumping lunge |  | x
jump-reach | Jump and reach |  | x
lateral-bound | Lateral bound |  | x
box-jump | Box jump | small | x
depth-jump | Depth jump | small | x a
alt-push-off | Alternate-leg push-off | small | x
bosu-squat-jump | BOSU squat jump | small | x
`,
  glutes: `
hip-thrust | Hip thrust | barbell bench | c
hip-thrust-machine | Hip thrust machine | machine | c
smith-hip-thrust | Smith machine hip thrust | machine bench |
sl-hip-thrust | One-leg hip thrust | bench |
band-hip-thrust | Hip thrust with band around knees | barbell bench band |
glute-bridge | Glute bridge |  | c
sl-glute-bridge | One-leg glute bridge |  |
ball-glute-bridge | Stability ball glute bridge | small |
trx-hip-press | Suspension hip press | suspension |
frog-pump | Frog pump |  | i
db-frog-pump | Dumbbell frog pump | dumbbell | i
cable-kickback | Cable glute kickback | cable | c i
machine-kickback | Machine glute kickback | machine | i
donkey-kick | Donkey kick |  | i
fire-hydrant | Fire hydrant |  | i
clamshell | Clamshell |  | i
side-kick | Banded side kick | band | i
abduction-machine | Hip abduction machine | machine | c i
cable-abduction | Cable hip abduction | cable | i
band-abduction | Band hip abduction | band | i
lateral-walk | Lateral band walk | band | i
pull-through | Cable pull-through | cable |
reverse-hyper | Reverse hyperextension | machine |
cossack | Cossack squat |  |
sl-rdl | Single-leg Romanian deadlift | dumbbell |
kb-sl-deadlift | Single-leg kettlebell deadlift | kettlebell |
kb-windmill | Kettlebell windmill | kettlebell | a
`,
  calves: `
calf-raise | Standing calf raise | machine | c i
bb-calf-raise | Barbell standing calf raise | barbell | i
seated-calf | Seated calf raise | machine | c i
bb-seated-calf | Barbell seated calf raise | barbell bench | i
leg-press-calf | Calf raise on the leg press | machine | i
donkey-calf | Donkey calf raise | machine | i
heel-raise | Bodyweight calf raise |  | c i
eccentric-heel-drop | Eccentric heel drop |  | i
tib-raise | Tibialis raise |  | i
kb-tib-raise | Kettlebell tibialis raise | kettlebell | i
band-tib | Band tibialis pull | band | i
`,
  core: `
cable-crunch | Cable crunch | cable | c i
machine-crunch | Machine crunch | machine | i
crunch | Crunch |  | c i
bicycle-crunch | Bicycle crunch |  | i
oblique-crunch | Oblique crunch |  | i
reverse-crunch | Reverse crunch |  | i
hollow-crunch | Hollow body crunch |  | i
sit-up | Sit-up |  | i
oblique-sit-up | Oblique sit-up |  | i
jackknife | Jackknife sit-up |  | i
hanging-sit-up | Hanging sit-up | bar | i a
leg-raise | Hanging leg raise | bar | c i
hanging-knee-raise | Hanging knee raise | bar | i
captain-knee-raise | Captain's chair knee raise | machine | i
captain-leg-raise | Captain's chair leg raise | machine | i
lying-leg-raise | Lying leg raise |  | i
windshield-wiper | Hanging windshield wiper | bar | i a
lying-wiper | Lying windshield wiper |  | i
dragon-flag | Dragon flag | bench | i a
ab-wheel | Ab wheel rollout | small | c i
bb-rollout | Barbell rollout | barbell | i a
dead-bug | Dead bug |  | c i
bird-dog | Bird dog |  | i
pallof | Pallof press | cable | c i
band-pallof | Band Pallof press | band | i
cable-woodchop-high | High-to-low cable woodchop | cable | i
cable-woodchop-low | Low-to-high cable woodchop | cable | i
cable-woodchop-h | Horizontal cable woodchop | cable | i
band-woodchop | Band woodchop | band | i
landmine-rotation | Landmine rotation | barbell | i
db-side-bend | Dumbbell side bend | dumbbell | i
russian-twist | Russian twist |  | i
medball-rotation | Seated medicine ball rotation | small | i
hay-baler | Half-kneeling hay baler | small | i
kb-plank-pull | Kettlebell plank pull-through | kettlebell | i
plank-shoulder-taps | Plank shoulder taps |  | i
plank-leg-lifts | Plank with leg lifts |  | i
dynamic-side-plank | Dynamic side plank |  | i
pull-over-crunch | Kettlebell pullover crunch | kettlebell | i
ball-knee-tuck | Stability ball knee tuck | small | i
ball-pike | Stability ball pike | small | i a
ball-walkout | Stability ball walkout | small | i
trx-knee-tuck | Suspension knee tuck | suspension | i
`,
  olympic: `
power-clean | Power clean | barbell | c x
hang-power-clean | Hang power clean | barbell | c x
clean | Clean | barbell | x a
hang-clean | Hang clean | barbell | x a
block-clean | Block clean | barbell | x a
clean-jerk | Clean and jerk | barbell | x a
jerk | Jerk | barbell | x a
power-jerk | Power jerk | barbell | x a
split-jerk | Split jerk | barbell | x a
squat-jerk | Squat jerk | barbell | x a
snatch | Snatch | barbell | x a
power-snatch | Power snatch | barbell | x a
hang-snatch | Hang snatch | barbell | x a
hang-power-snatch | Hang power snatch | barbell | x a
block-snatch | Block snatch | barbell | x a
barbell-jammer | Barbell jammer | barbell | x
ground-overhead | Ground to overhead | barbell | x
kb-swing | Kettlebell swing | kettlebell | c x
sa-kb-swing | One-arm kettlebell swing | kettlebell | x
kb-clean | Kettlebell clean | kettlebell | x
kb-clean-press | Kettlebell clean and press | kettlebell | x
kb-clean-jerk | Kettlebell clean and jerk | kettlebell | x
kb-snatch | Kettlebell snatch | kettlebell | x
kb-thruster | Kettlebell thruster | kettlebell | c x
devils-press | Devil's press | dumbbell | x
ball-slam | Medicine ball slam | small | c x
reverse-slam | Reverse medicine ball slam | small | x
oh-medball-throw | Overhead medicine ball throw | small | x
`,
  neck: `
neck-curl | Lying neck curl | bench | i
neck-ext | Lying neck extension | bench | i
`,
};

export const LIBRARY_EXERCISES = Object.entries(LIBRARY).flatMap(([group, block]) =>
  block
    .trim()
    .split('\n')
    .map((line) => {
      const [id, name, equip = '', flags = ''] = line.split('|').map((s) => s.trim());
      const f = new Set(flags.split(/\s+/).filter(Boolean));
      const ex = { id, name, group, equip: equip.split(/\s+/).filter(Boolean), kind: f.has('i') ? 'isolation' : 'compound' };
      if (f.has('c')) ex.common = true;
      if (f.has('x')) ex.explosive = true;
      if (f.has('a')) ex.advanced = true;
      return ex;
    })
);
