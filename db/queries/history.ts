import { type SQLiteDatabase } from 'expo-sqlite';
import {
  type CompletedWorkoutSummary,
  type WorkoutExerciseLine,
  type WorkoutHistoryDetail,
  type WorkoutHistoryExercise,
  type WorkoutHistorySet,
} from '../types';

export interface DailyTonnage {
  date: string; // YYYY-MM-DD
  tonnage: number;
  workout_count: number;
}

interface WorkoutSummaryRow {
  id: number;
  name: string;
  started_at: number;
  finished_at: number;
  duration_seconds: number;
  total_tonnage: number;
  pr_count: number;
}

interface ExerciseLineRow extends WorkoutExerciseLine {
  session_id: number;
  order_index: number;
}

export async function getCompletedWorkouts(db: SQLiteDatabase): Promise<CompletedWorkoutSummary[]> {
  const [summaries, exerciseRows] = await Promise.all([
    db.getAllAsync<WorkoutSummaryRow>(`
      SELECT
        ws.id,
        ws.name,
        ws.started_at,
        ws.finished_at,
        ws.duration_seconds,
        COALESCE(SUM(CASE WHEN s.weight_lbs > 0 AND s.reps > 0 THEN s.weight_lbs * s.reps ELSE 0 END), 0) AS total_tonnage,
        COUNT(DISTINCT CASE
          WHEN s.reps > 0 AND s.reps <= 15 AND s.weight_lbs > 0
          AND (s.weight_lbs * (1.0 + s.reps / 30.0)) > COALESCE((
            SELECT MAX(s2.weight_lbs * (1.0 + s2.reps / 30.0))
            FROM sets s2
            JOIN workout_exercises we2 ON s2.workout_exercise_id = we2.id
            JOIN workout_sessions ws2 ON we2.session_id = ws2.id
            WHERE we2.exercise_id = we.exercise_id
              AND ws2.started_at < ws.started_at
              AND ws2.status = 'completed'
              AND s2.reps > 0 AND s2.reps <= 15 AND s2.weight_lbs > 0
          ), 0)
          THEN we.exercise_id
          ELSE NULL
        END) AS pr_count
      FROM workout_sessions ws
      LEFT JOIN workout_exercises we ON we.session_id = ws.id
      LEFT JOIN sets s ON s.workout_exercise_id = we.id
      WHERE ws.status = 'completed'
      GROUP BY ws.id, ws.name, ws.started_at, ws.finished_at, ws.duration_seconds
      ORDER BY ws.started_at DESC
    `),
    db.getAllAsync<ExerciseLineRow>(`
      SELECT
        we.session_id,
        e.name AS exercise_name,
        e.is_bodyweight,
        we.order_index,
        COUNT(s.id) AS set_count,
        (SELECT s2.weight_lbs FROM sets s2
         WHERE s2.workout_exercise_id = we.id
           AND s2.weight_lbs > 0 AND s2.reps > 0
         ORDER BY s2.weight_lbs * (1.0 + s2.reps / 30.0) DESC
         LIMIT 1) AS best_weight,
        (SELECT s2.reps FROM sets s2
         WHERE s2.workout_exercise_id = we.id
           AND s2.weight_lbs > 0 AND s2.reps > 0
         ORDER BY s2.weight_lbs * (1.0 + s2.reps / 30.0) DESC
         LIMIT 1) AS best_reps
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      JOIN workout_sessions ws ON ws.id = we.session_id AND ws.status = 'completed'
      LEFT JOIN sets s ON s.workout_exercise_id = we.id
      GROUP BY we.id, we.session_id, e.name, e.is_bodyweight, we.order_index
      ORDER BY we.session_id DESC, we.order_index ASC
    `),
  ]);

  const exercisesBySession = new Map<number, WorkoutExerciseLine[]>();
  for (const row of exerciseRows) {
    if (!exercisesBySession.has(row.session_id)) {
      exercisesBySession.set(row.session_id, []);
    }
    exercisesBySession.get(row.session_id)!.push({
      exercise_name: row.exercise_name,
      is_bodyweight: row.is_bodyweight,
      set_count: row.set_count,
      best_weight: row.best_weight,
      best_reps: row.best_reps,
    });
  }

  return summaries.map((s) => ({
    ...s,
    exercises: exercisesBySession.get(s.id) ?? [],
  }));
}

interface DetailRow {
  id: number;
  name: string;
  started_at: number;
  finished_at: number;
  duration_seconds: number;
  template_id: number | null;
  template_name: string | null;
  workout_exercise_id: number;
  exercise_id: number;
  order_index: number;
  exercise_name: string;
  is_bodyweight: number;
  set_id: number;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
  logged_at: number;
}

export async function getWorkoutDetail(
  db: SQLiteDatabase,
  sessionId: number
): Promise<WorkoutHistoryDetail | null> {
  const rows = await db.getAllAsync<DetailRow>(
    `SELECT
       ws.id, ws.name, ws.started_at, ws.finished_at, ws.duration_seconds,
       ws.template_id, wt.name AS template_name,
       we.id AS workout_exercise_id, we.exercise_id, we.order_index,
       e.name AS exercise_name, e.is_bodyweight,
       s.id AS set_id, s.set_number, s.weight_lbs, s.reps, s.notes, s.logged_at
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON wt.id = ws.template_id
     LEFT JOIN workout_exercises we ON we.session_id = ws.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE ws.id = ?
     ORDER BY we.order_index, s.set_number`,
    sessionId
  );

  if (rows.length === 0) return null;

  const first = rows[0];
  const exerciseMap = new Map<number, WorkoutHistoryExercise>();

  for (const row of rows) {
    if (row.workout_exercise_id == null) continue;

    if (!exerciseMap.has(row.workout_exercise_id)) {
      exerciseMap.set(row.workout_exercise_id, {
        workout_exercise_id: row.workout_exercise_id,
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        is_bodyweight: row.is_bodyweight,
        order_index: row.order_index,
        sets: [],
      });
    }

    if (row.set_id != null) {
      const set: WorkoutHistorySet = {
        id: row.set_id,
        set_number: row.set_number,
        weight_lbs: row.weight_lbs,
        reps: row.reps,
        notes: row.notes,
        logged_at: row.logged_at,
      };
      exerciseMap.get(row.workout_exercise_id)!.sets.push(set);
    }
  }

  return {
    id: first.id,
    name: first.name,
    started_at: first.started_at,
    finished_at: first.finished_at,
    duration_seconds: first.duration_seconds,
    template_id: first.template_id,
    template_name: first.template_name,
    exercises: Array.from(exerciseMap.values()),
  };
}

export async function getDailyTonnage(db: SQLiteDatabase, daysBack = 112): Promise<DailyTonnage[]> {
  const cutoffMs = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return db.getAllAsync<DailyTonnage>(
    `SELECT
       date(ws.started_at / 1000, 'unixepoch', 'localtime') AS date,
       COALESCE(SUM(CASE WHEN s.weight_lbs > 0 AND s.reps > 0 THEN s.weight_lbs * s.reps ELSE 0 END), 0) AS tonnage,
       COUNT(DISTINCT ws.id) AS workout_count
     FROM workout_sessions ws
     LEFT JOIN workout_exercises we ON we.session_id = ws.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE ws.status = 'completed'
       AND ws.started_at >= ?
     GROUP BY date(ws.started_at / 1000, 'unixepoch', 'localtime')
     ORDER BY date ASC`,
    cutoffMs
  );
}

export interface WeeklyTonnage {
  week_start: string; // YYYY-MM-DD of the Monday of that week
  tonnage: number;
}

export async function getWeeklyTonnage(db: SQLiteDatabase, weeksBack = 12): Promise<WeeklyTonnage[]> {
  const cutoffMs = Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000;
  return db.getAllAsync<WeeklyTonnage>(
    `SELECT
       date(date(ws.started_at / 1000, 'unixepoch', 'localtime'), 'weekday 0', '-6 days') AS week_start,
       COALESCE(SUM(CASE WHEN s.weight_lbs > 0 AND s.reps > 0 THEN s.weight_lbs * s.reps ELSE 0 END), 0) AS tonnage
     FROM workout_sessions ws
     LEFT JOIN workout_exercises we ON we.session_id = ws.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     WHERE ws.status = 'completed'
       AND ws.started_at >= ?
     GROUP BY week_start
     ORDER BY week_start ASC`,
    cutoffMs
  );
}

export async function updateSessionTemplate(
  db: SQLiteDatabase,
  sessionId: number,
  templateId: number | null
): Promise<void> {
  await db.runAsync(
    'UPDATE workout_sessions SET template_id = ? WHERE id = ?',
    templateId,
    sessionId
  );
}

export async function deleteWorkout(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', sessionId);
}

export async function getBestEpley1RMBeforeSession(
  db: SQLiteDatabase,
  exerciseId: number,
  sessionStartedAt: number
): Promise<number> {
  const row = await db.getFirstAsync<{ best_1rm: number }>(
    `SELECT COALESCE(MAX(s.weight_lbs * (1.0 + s.reps / 30.0)), 0) AS best_1rm
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workout_sessions ws ON we.session_id = ws.id
     WHERE we.exercise_id = ?
       AND ws.started_at < ?
       AND ws.status = 'completed'
       AND s.reps > 0 AND s.reps <= 15
       AND s.weight_lbs > 0`,
    exerciseId,
    sessionStartedAt
  );
  return row?.best_1rm ?? 0;
}
