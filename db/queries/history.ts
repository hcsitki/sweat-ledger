import { type SQLiteDatabase } from 'expo-sqlite';
import {
  type CompletedWorkoutSummary,
  type WorkoutHistoryDetail,
  type WorkoutHistoryExercise,
  type WorkoutHistorySet,
} from '../types';

export async function getCompletedWorkouts(db: SQLiteDatabase): Promise<CompletedWorkoutSummary[]> {
  return db.getAllAsync<CompletedWorkoutSummary>(
    `SELECT id, name, started_at, finished_at, duration_seconds
     FROM workout_sessions
     WHERE status = 'completed'
     ORDER BY started_at DESC`
  );
}

interface DetailRow {
  id: number;
  name: string;
  started_at: number;
  finished_at: number;
  duration_seconds: number;
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
       we.id AS workout_exercise_id, we.exercise_id, we.order_index,
       e.name AS exercise_name, e.is_bodyweight,
       s.id AS set_id, s.set_number, s.weight_lbs, s.reps, s.notes, s.logged_at
     FROM workout_sessions ws
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
    exercises: Array.from(exerciseMap.values()),
  };
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
