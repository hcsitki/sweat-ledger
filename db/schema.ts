import { type SQLiteDatabase } from 'expo-sqlite';

const SEED_EXERCISES: [string, string, string, number, string][] = [
  [
    'Barbell Bench Press',
    'Chest',
    'Barbell',
    0,
    'Lie flat on a bench with feet on the floor. Grip the bar slightly wider than shoulder-width. Unrack, lower the bar to your mid-chest with elbows at roughly 45°, then press to full extension. Keep your shoulder blades retracted and maintain a slight arch in your lower back throughout.',
  ],
  [
    'Incline Bench Press',
    'Chest',
    'Barbell',
    0,
    'Set the bench to 30–45°. Lie back and grip the bar slightly wider than shoulder-width. Lower the bar to your upper chest with elbows slightly less flared than on a flat bench. Press back to full extension. The incline shifts emphasis to the upper chest and front deltoids.',
  ],
  [
    'Barbell Squat',
    'Quads',
    'Barbell',
    0,
    'Position the bar across your upper traps (high bar) or rear delts (low bar). Stand feet shoulder-width apart, toes slightly out. Brace your core, break at the hips and knees simultaneously, and descend until thighs are at least parallel. Drive through your heels to stand, keeping your chest up and knees tracking over your toes.',
  ],
  [
    'Deadlift',
    'Back',
    'Barbell',
    0,
    'Stand with the bar over your mid-foot, feet hip-width apart. Hinge at the hips and grip the bar just outside your legs. Brace hard, pull the slack out, then push the floor away as you stand. Keep the bar dragging along your shins and thighs. Lock out by squeezing your glutes at the top — do not hyperextend your lower back.',
  ],
  [
    'Romanian Deadlift',
    'Hamstrings',
    'Barbell',
    0,
    'Stand holding a barbell at hip level. Push your hips back while maintaining a slight knee bend and a neutral spine. Lower the bar along your thighs until you feel a strong hamstring stretch — typically just below the knee. Drive your hips forward to return to the top. Keep your back flat throughout.',
  ],
  [
    'Overhead Press',
    'Shoulders',
    'Barbell',
    0,
    'Grip the bar just outside shoulder-width with it resting on your front delts. Brace your core, squeeze your glutes, and press straight overhead, moving your head slightly back then forward as the bar clears your chin. Fully lock out at the top. Lower under control to the starting position.',
  ],
  [
    'Barbell Row',
    'Back',
    'Barbell',
    0,
    'Hinge forward until your torso is roughly 45° to horizontal, knees slightly bent. Grip the bar shoulder-width or slightly wider with an overhand grip. Pull the bar into your lower chest or upper abdomen, driving your elbows back. Hold briefly at the top, then lower with control. Keep your lower back flat throughout.',
  ],
  [
    'Pull-Up',
    'Back',
    'Bodyweight',
    1,
    'Hang from a bar with hands shoulder-width apart, palms facing away. Pull yourself up by driving your elbows down and back until your chin clears the bar. Lower to a dead hang between reps. Engage your scapulae at the start of every rep — avoid shrugging your shoulders to your ears.',
  ],
  [
    'Chin-Up',
    'Back',
    'Bodyweight',
    1,
    'Hang from a bar with hands shoulder-width apart, palms facing you. Pull yourself up until your chin clears the bar, focusing on squeezing your biceps and pulling your elbows down. Lower to a dead hang. The underhand grip involves the biceps more than a standard pull-up.',
  ],
  [
    'Dip',
    'Chest',
    'Bodyweight',
    1,
    'Support yourself on parallel bars with arms fully extended. Lean your torso slightly forward to target the chest. Lower yourself by bending your elbows until your upper arms are roughly parallel to the floor, then press back to full extension. Keep your shoulders down and avoid flaring your elbows excessively.',
  ],
  [
    'Plank',
    'Core',
    'Bodyweight',
    1,
    'Position yourself face-down with forearms on the floor and toes on the floor. Your body should form a straight line from head to heels. Brace your core by pulling your belly button toward your spine and squeeze your glutes. Breathe steadily. Avoid letting your hips sag or pike up. Hold for time.',
  ],
  [
    'Bicep Curl (Dumbbell)',
    'Biceps',
    'Dumbbell',
    0,
    'Stand holding a dumbbell in each hand, arms fully extended, palms facing forward. Keeping your upper arms stationary at your sides, curl the weights up by contracting your biceps. Squeeze at the top, then lower slowly to full extension. Avoid swinging your torso — the movement should be isolated to the forearm rotating up.',
  ],
  [
    'Lateral Raise (Dumbbell)',
    'Shoulders',
    'Dumbbell',
    0,
    'Stand holding dumbbells at your sides, palms facing inward. With a slight bend in your elbows, raise the weights out to your sides until your arms are parallel to the floor. Lead with your pinkies slightly to keep tension on the medial deltoid. Lower slowly. Avoid shrugging your traps or swinging the weights up.',
  ],
  [
    'Lateral Raise (Cable)',
    'Shoulders',
    'Cable',
    0,
    'Stand sideways to a low cable pulley, gripping the handle with the hand farthest from the machine. With a slight elbow bend, raise your arm out to your side until parallel to the floor. The cable provides constant tension throughout — focus on slow, controlled reps. Lower with control.',
  ],
  [
    'Tricep Pushdown',
    'Triceps',
    'Cable',
    0,
    'Stand facing a high cable pulley with a bar or rope attachment. Grip with your elbows tucked close to your sides. Press the attachment down until your arms are fully extended, squeezing your triceps hard at the bottom. Allow the weight to rise only until your forearms are roughly parallel to the floor — keep upper arms pinned throughout.',
  ],
  [
    'Face Pull',
    'Shoulders',
    'Cable',
    0,
    'Set a cable pulley to face height with a rope attachment. Step back and grip each end of the rope, palms facing each other. Pull the rope toward your face by driving your elbows back and out to the sides, finishing with hands beside your ears and upper arms parallel to the floor. This targets the rear deltoids and external rotators. Control the return.',
  ],
  [
    'Leg Press',
    'Quads',
    'Machine',
    0,
    'Sit with your back flat against the pad and feet shoulder-width apart, roughly mid-height on the platform. Lower the platform until your knees form roughly 90° — or as low as possible without your lower back rounding off the pad. Press back to full extension without locking your knees. Keep your heels flat on the platform throughout.',
  ],
  [
    'Leg Curl',
    'Hamstrings',
    'Machine',
    0,
    'Lie face-down with the pad just above your heels and your knees aligned with the machine\'s pivot point. Curl your heels toward your glutes as far as possible, squeezing your hamstrings at the top. Lower slowly to full extension. Keep your hips pressed against the bench — avoid lifting your hips to get extra range.',
  ],
  [
    'Leg Extension',
    'Quads',
    'Machine',
    0,
    'Sit with your back flat against the pad and the roller positioned just above your ankles, knees bent at 90°. Extend your legs fully, squeezing your quads hard at the top. Lower slowly back to 90°. This is an isolation movement for the quadriceps — keep the movement smooth and avoid jerking the weight up.',
  ],
  [
    'Hip Thrust',
    'Glutes',
    'Barbell',
    0,
    'Sit with your upper back against a bench and a loaded barbell across your hips. Plant your feet shoulder-width apart, knees bent. Drive through your heels to thrust your hips up until your torso and thighs form a straight line. Squeeze your glutes hard at the top. Lower under control. Keep your chin tucked to avoid hyperextending your neck.',
  ],
  [
    'Calf Raise',
    'Calves',
    'Machine',
    0,
    'Position the shoulder pads across your upper traps and stand with your toes on the edge of the platform, heels hanging off. Lower your heels as far as possible to fully stretch your calves, then rise onto your toes as high as possible. Hold briefly at the top. Perform reps slowly — calves respond well to a full range of motion and controlled tempo.',
  ],
];

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        is_bodyweight INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        instructions TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        duration_seconds INTEGER
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        order_index INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        weight_lbs REAL,
        reps INTEGER,
        notes TEXT,
        logged_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.execAsync('BEGIN');
    for (const [name, muscle_group, equipment_type, is_bodyweight, instructions] of SEED_EXERCISES) {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_group, equipment_type, is_bodyweight, instructions) VALUES (?, ?, ?, ?, ?)',
        name,
        muscle_group,
        equipment_type,
        is_bodyweight,
        instructions
      );
    }
    await db.execAsync('COMMIT');

    await db.runAsync("INSERT INTO settings (key, value) VALUES ('rest_timer_duration', '90')");
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (version < 2) {
    await migrateToV2(db);
  }

  if (version < 3) {
    await migrateToV3(db);
  }
}

async function migrateToV3(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS template_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_exercise_id INTEGER NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      target_reps INTEGER
    );
  `);

  await db.execAsync('PRAGMA user_version = 3');
}

async function migrateToV2(db: SQLiteDatabase) {
  // On fresh installs (version was 0→1 above) the instructions column already
  // exists in the CREATE TABLE, so we only ALTER on existing v1 databases.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  if (!cols.some((c) => c.name === 'instructions')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN instructions TEXT');
  }

  // Fix muscle groups to match PRD granular spec and seed instructions.
  const muscleGroupUpdates: [string, string][] = [
    ['Biceps', 'Bicep Curl (Dumbbell)'],
    ['Triceps', 'Tricep Pushdown'],
    ['Quads', 'Barbell Squat'],
    ['Quads', 'Leg Press'],
    ['Quads', 'Leg Extension'],
    ['Hamstrings', 'Romanian Deadlift'],
    ['Hamstrings', 'Leg Curl'],
    ['Glutes', 'Hip Thrust'],
    ['Calves', 'Calf Raise'],
  ];
  for (const [newGroup, name] of muscleGroupUpdates) {
    await db.runAsync(
      'UPDATE exercises SET muscle_group = ? WHERE name = ? AND is_custom = 0',
      newGroup,
      name
    );
  }

  for (const [name, , , , instructions] of SEED_EXERCISES) {
    await db.runAsync(
      'UPDATE exercises SET instructions = ? WHERE name = ? AND is_custom = 0',
      instructions,
      name
    );
  }

  await db.execAsync('PRAGMA user_version = 2');
}
