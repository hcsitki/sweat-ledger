import { type SQLiteDatabase } from 'expo-sqlite';
import { type Set } from '../types';

export async function getPreviousPerformance(
  db: SQLiteDatabase,
  exerciseId: number
): Promise<{ sets: Set[] } | null> {
  const session = await db.getFirstAsync<{ id: number }>(
    `SELECT ws.id
     FROM workout_sessions ws
     JOIN workout_exercises we ON we.session_id = ws.id
     WHERE ws.status = 'completed' AND we.exercise_id = ?
     ORDER BY ws.finished_at DESC
     LIMIT 1`,
    exerciseId
  );

  if (!session) return null;

  const we = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM workout_exercises WHERE session_id = ? AND exercise_id = ?',
    session.id,
    exerciseId
  );

  if (!we) return null;

  const sets = await db.getAllAsync<Set>(
    'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number ASC',
    we.id
  );

  return { sets };
}
