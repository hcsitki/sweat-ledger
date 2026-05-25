import { type SQLiteDatabase } from 'expo-sqlite';
import { type WorkoutSession } from '../types';
import { syncNow } from '@/lib/sync';

export async function createWorkoutSession(
  db: SQLiteDatabase,
  name: string
): Promise<{ id: number; startedAt: number }> {
  const startedAt = Date.now();
  const result = await db.runAsync(
    'INSERT INTO workout_sessions (name, status, started_at) VALUES (?, ?, ?)',
    name,
    'active',
    startedAt
  );
  return { id: result.lastInsertRowId, startedAt };
}

export async function getActiveSession(db: SQLiteDatabase): Promise<WorkoutSession | null> {
  return db.getFirstAsync<WorkoutSession>(
    "SELECT * FROM workout_sessions WHERE status = 'active' LIMIT 1"
  );
}

export async function updateSessionName(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE workout_sessions SET name = ? WHERE id = ?', name, id);
}

export async function finishWorkoutSession(
  db: SQLiteDatabase,
  id: number,
  durationSeconds: number,
  finishedAt: number
): Promise<void> {
  await db.runAsync(
    "UPDATE workout_sessions SET status = 'completed', finished_at = ?, duration_seconds = ? WHERE id = ?",
    finishedAt,
    durationSeconds,
    id
  );
  syncNow(db); // fire-and-forget
}

export async function saveSessionCalories(
  db: SQLiteDatabase,
  id: number,
  calories: number
): Promise<void> {
  await db.runAsync(
    'UPDATE workout_sessions SET calories_burned = ? WHERE id = ?',
    calories,
    id
  );
}

export async function cancelWorkoutSession(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    "UPDATE workout_sessions SET status = 'cancelled' WHERE id = ?",
    id
  );
}
