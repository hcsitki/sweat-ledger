-- Mirror of app tables (sans settings — device-local only)
-- Run: npm run db:apply

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  base_name TEXT NOT NULL DEFAULT '',
  muscle_group TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  is_bodyweight INTEGER NOT NULL DEFAULT 0,
  is_custom INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  duration_seconds INTEGER,
  calories_burned INTEGER,
  synced_at INTEGER
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  weight_lbs REAL,
  reps INTEGER,
  notes TEXT,
  logged_at INTEGER NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id INTEGER PRIMARY KEY,
  template_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS template_sets (
  id INTEGER PRIMARY KEY,
  template_exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  target_reps INTEGER
);

-- D1-only sync metadata tables
CREATE TABLE IF NOT EXISTS sync_cursors (
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  last_synced_at INTEGER NOT NULL,
  PRIMARY KEY (device_id, table_name)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  pushed_at INTEGER NOT NULL,
  record_count INTEGER NOT NULL
);

-- Indexes for pull queries (filter by device + timestamp)
CREATE INDEX IF NOT EXISTS idx_sessions_device ON workout_sessions (device_id, synced_at);
CREATE INDEX IF NOT EXISTS idx_templates_device ON workout_templates (device_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_custom ON exercises (is_custom, created_at);
