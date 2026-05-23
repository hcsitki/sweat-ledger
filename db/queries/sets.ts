import { type SQLiteDatabase } from 'expo-sqlite';
import { type Set, type WorkoutExerciseWithDetails } from '../types';

export async function addWorkoutExercise(
  db: SQLiteDatabase,
  sessionId: number,
  exerciseId: number,
  orderIndex: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO workout_exercises (session_id, exercise_id, order_index) VALUES (?, ?, ?)',
    sessionId,
    exerciseId,
    orderIndex
  );
  return result.lastInsertRowId;
}

export async function getWorkoutExercisesForSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<WorkoutExerciseWithDetails[]> {
  return db.getAllAsync<WorkoutExerciseWithDetails>(
    `SELECT we.*, e.name as exercise_name, e.is_bodyweight
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.session_id = ?
     ORDER BY we.order_index ASC`,
    sessionId
  );
}

export async function addSet(
  db: SQLiteDatabase,
  workoutExerciseId: number,
  data: { setNumber: number; weightLbs: number | null; reps: number | null; notes?: string | null }
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO sets (workout_exercise_id, set_number, weight_lbs, reps, notes, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
    workoutExerciseId,
    data.setNumber,
    data.weightLbs ?? null,
    data.reps ?? null,
    data.notes ?? null,
    Date.now()
  );
  return result.lastInsertRowId;
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  updates: { weightLbs?: number | null; reps?: number | null; notes?: string | null }
): Promise<void> {
  const fields: string[] = [];
  const values: (number | string | null)[] = [];

  if ('weightLbs' in updates) {
    fields.push('weight_lbs = ?');
    values.push(updates.weightLbs ?? null);
  }
  if ('reps' in updates) {
    fields.push('reps = ?');
    values.push(updates.reps ?? null);
  }
  if ('notes' in updates) {
    fields.push('notes = ?');
    values.push(updates.notes ?? null);
  }

  if (fields.length === 0) return;

  values.push(setId);
  await db.runAsync(`UPDATE sets SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteSet(db: SQLiteDatabase, setId: number): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE id = ?', setId);
}

export async function deleteWorkoutExercise(db: SQLiteDatabase, workoutExerciseId: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', workoutExerciseId);
}

export async function getSetsForWorkoutExercise(
  db: SQLiteDatabase,
  workoutExerciseId: number
): Promise<Set[]> {
  return db.getAllAsync<Set>(
    'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number ASC',
    workoutExerciseId
  );
}

export async function deleteEmptySetsForSession(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await db.runAsync(
    `DELETE FROM sets
     WHERE workout_exercise_id IN (
       SELECT id FROM workout_exercises WHERE session_id = ?
     )
     AND weight_lbs IS NULL AND reps IS NULL`,
    sessionId
  );
}
