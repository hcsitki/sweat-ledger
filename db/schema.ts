import { type SQLiteDatabase } from 'expo-sqlite';

const SEED_EXERCISES: [string, string, string, number][] = [
  ['Barbell Bench Press', 'Chest', 'Barbell', 0],
  ['Incline Bench Press', 'Chest', 'Barbell', 0],
  ['Barbell Squat', 'Legs', 'Barbell', 0],
  ['Deadlift', 'Back', 'Barbell', 0],
  ['Romanian Deadlift', 'Legs', 'Barbell', 0],
  ['Overhead Press', 'Shoulders', 'Barbell', 0],
  ['Barbell Row', 'Back', 'Barbell', 0],
  ['Pull-Up', 'Back', 'Bodyweight', 1],
  ['Chin-Up', 'Back', 'Bodyweight', 1],
  ['Dip', 'Chest', 'Bodyweight', 1],
  ['Plank', 'Core', 'Bodyweight', 1],
  ['Bicep Curl (Dumbbell)', 'Arms', 'Dumbbell', 0],
  ['Lateral Raise (Dumbbell)', 'Shoulders', 'Dumbbell', 0],
  ['Lateral Raise (Cable)', 'Shoulders', 'Cable', 0],
  ['Tricep Pushdown', 'Arms', 'Cable', 0],
  ['Face Pull', 'Shoulders', 'Cable', 0],
  ['Leg Press', 'Legs', 'Machine', 0],
  ['Leg Curl', 'Legs', 'Machine', 0],
  ['Leg Extension', 'Legs', 'Machine', 0],
  ['Hip Thrust', 'Legs', 'Barbell', 0],
  ['Calf Raise', 'Legs', 'Machine', 0],
];

export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((row?.user_version ?? 0) >= 1) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      is_bodyweight INTEGER NOT NULL DEFAULT 0,
      is_custom INTEGER NOT NULL DEFAULT 0,
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

  for (const [name, muscle_group, equipment_type, is_bodyweight] of SEED_EXERCISES) {
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_group, equipment_type, is_bodyweight) VALUES (?, ?, ?, ?)',
      name,
      muscle_group,
      equipment_type,
      is_bodyweight
    );
  }

  await db.runAsync("INSERT INTO settings (key, value) VALUES ('rest_timer_duration', '90')");

  await db.execAsync('PRAGMA user_version = 1');
}
