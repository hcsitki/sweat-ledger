import { type SQLiteDatabase } from 'expo-sqlite';
import {
  type WorkoutTemplate,
  type TemplateExerciseWithDetails,
  type TemplateSet,
  type TemplateWithDetails,
} from '../types';
import { getWorkoutExercisesForSession, getSetsForWorkoutExercise } from './sets';
import { syncNow } from '@/lib/sync';

export async function getTemplates(
  db: SQLiteDatabase
): Promise<(WorkoutTemplate & { exercise_count: number; last_used_at: number | null })[]> {
  return db.getAllAsync<WorkoutTemplate & { exercise_count: number; last_used_at: number | null }>(
    `SELECT wt.*,
       (SELECT COUNT(*) FROM template_exercises WHERE template_id = wt.id) AS exercise_count,
       (SELECT MAX(ws.started_at) FROM workout_sessions ws WHERE ws.template_id = wt.id) AS last_used_at
     FROM workout_templates wt
     ORDER BY wt.updated_at DESC`
  );
}

export async function getTemplateWithDetails(
  db: SQLiteDatabase,
  id: number
): Promise<TemplateWithDetails | null> {
  const template = await db.getFirstAsync<WorkoutTemplate>(
    'SELECT * FROM workout_templates WHERE id = ?',
    id
  );
  if (!template) return null;

  const exercises = await db.getAllAsync<Omit<TemplateExerciseWithDetails, 'sets'>>(
    `SELECT te.*, e.name AS exercise_name, e.is_bodyweight
     FROM template_exercises te
     JOIN exercises e ON e.id = te.exercise_id
     WHERE te.template_id = ?
     ORDER BY te.order_index ASC`,
    id
  );

  const exercisesWithSets: TemplateExerciseWithDetails[] = await Promise.all(
    exercises.map(async (ex) => {
      const sets = await db.getAllAsync<TemplateSet>(
        'SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number ASC',
        ex.id
      );
      return { ...ex, sets };
    })
  );

  return {
    ...template,
    exercises: exercisesWithSets,
    exercise_count: exercisesWithSets.length,
  };
}

export async function createTemplate(
  db: SQLiteDatabase,
  name: string
): Promise<{ id: number }> {
  const result = await db.runAsync(
    'INSERT INTO workout_templates (name) VALUES (?)',
    name
  );
  return { id: result.lastInsertRowId };
}

export async function addExerciseToTemplate(
  db: SQLiteDatabase,
  templateId: number,
  exerciseId: number,
  orderIndex: number,
  skipTouch = false
): Promise<{ id: number }> {
  const result = await db.runAsync(
    'INSERT INTO template_exercises (template_id, exercise_id, order_index) VALUES (?, ?, ?)',
    templateId,
    exerciseId,
    orderIndex
  );
  if (!skipTouch) await touchTemplate(db, templateId);
  return { id: result.lastInsertRowId };
}

export async function addSetToTemplateExercise(
  db: SQLiteDatabase,
  templateExerciseId: number,
  setNumber: number,
  targetReps: number | null
): Promise<{ id: number }> {
  const result = await db.runAsync(
    'INSERT INTO template_sets (template_exercise_id, set_number, target_reps) VALUES (?, ?, ?)',
    templateExerciseId,
    setNumber,
    targetReps
  );
  return { id: result.lastInsertRowId };
}

export async function updateTemplateSetReps(
  db: SQLiteDatabase,
  setId: number,
  targetReps: number | null
): Promise<void> {
  await db.runAsync('UPDATE template_sets SET target_reps = ? WHERE id = ?', targetReps, setId);
}

export async function updateTemplateName(
  db: SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  await db.runAsync(
    'UPDATE workout_templates SET name = ?, updated_at = ? WHERE id = ?',
    name,
    Date.now(),
    id
  );
}

export async function removeExerciseFromTemplate(
  db: SQLiteDatabase,
  templateExerciseId: number,
  templateId: number
): Promise<void> {
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', templateExerciseId);
  await touchTemplate(db, templateId);
}

export async function deleteTemplate(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', id);
}

export async function updateTemplateExerciseOrderIndex(
  db: SQLiteDatabase,
  templateExerciseId: number,
  orderIndex: number
): Promise<void> {
  await db.runAsync(
    'UPDATE template_exercises SET order_index = ? WHERE id = ?',
    orderIndex,
    templateExerciseId
  );
}

export async function deleteTemplateSet(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM template_sets WHERE id = ?', id);
}

export async function getLastSessionRepsForExercise(
  db: SQLiteDatabase,
  exerciseId: number
): Promise<number[]> {
  const session = await db.getFirstAsync<{ id: number }>(
    `SELECT ws.id
     FROM workout_sessions ws
     JOIN workout_exercises we ON we.session_id = ws.id
     WHERE ws.status = 'completed' AND we.exercise_id = ?
     ORDER BY ws.finished_at DESC
     LIMIT 1`,
    exerciseId
  );
  if (!session) return [];

  const we = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM workout_exercises WHERE session_id = ? AND exercise_id = ?',
    session.id,
    exerciseId
  );
  if (!we) return [];

  const sets = await db.getAllAsync<{ reps: number | null }>(
    'SELECT reps FROM sets WHERE workout_exercise_id = ? ORDER BY set_number ASC',
    we.id
  );
  return sets.map((s) => s.reps ?? 0);
}

export async function saveWorkoutAsTemplate(
  db: SQLiteDatabase,
  sessionId: number,
  name: string
): Promise<{ id: number }> {
  const { id: templateId } = await createTemplate(db, name);

  const exercises = await getWorkoutExercisesForSession(db, sessionId);
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const { id: templateExerciseId } = await addExerciseToTemplate(
      db,
      templateId,
      ex.exercise_id,
      i,
      true // skip per-insert touch; we'll touch once at the end
    );
    const sets = await getSetsForWorkoutExercise(db, ex.id);
    for (const s of sets) {
      await addSetToTemplateExercise(db, templateExerciseId, s.set_number, s.reps);
    }
  }

  await touchTemplate(db, templateId);
  return { id: templateId };
}

async function touchTemplate(db: SQLiteDatabase, templateId: number): Promise<void> {
  await db.runAsync(
    'UPDATE workout_templates SET updated_at = ?, synced_at = NULL WHERE id = ?',
    Date.now(),
    templateId
  );
  syncNow(db); // fire-and-forget
}
