import { type SQLiteDatabase } from 'expo-sqlite';
import { type Exercise, type ExerciseStats } from '../types';

interface ExerciseFilters {
  muscleGroup?: string;
  equipmentType?: string;
  performedOnly?: boolean;
}

export async function getExercises(
  db: SQLiteDatabase,
  filters?: ExerciseFilters
): Promise<Exercise[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.muscleGroup) {
    conditions.push('e.muscle_group = ?');
    params.push(filters.muscleGroup);
  }
  if (filters?.equipmentType) {
    conditions.push('e.equipment_type = ?');
    params.push(filters.equipmentType);
  }
  if (filters?.performedOnly) {
    conditions.push(
      'EXISTS (SELECT 1 FROM workout_exercises we JOIN workout_sessions ws ON we.session_id = ws.id WHERE we.exercise_id = e.id AND ws.status = \'completed\')'
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<Exercise>(
    `SELECT e.* FROM exercises e ${where} ORDER BY e.name ASC`,
    params
  );
}

export async function getExerciseById(
  db: SQLiteDatabase,
  id: number
): Promise<Exercise | null> {
  return db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', id);
}

export async function getExerciseStats(
  db: SQLiteDatabase,
  exerciseId: number
): Promise<ExerciseStats> {
  const row = await db.getFirstAsync<{
    best_set_weight: number | null;
    best_set_volume: number | null;
    best_session_volume: number | null;
    estimated_1rm: number | null;
  }>(
    `WITH session_vols AS (
       SELECT ws.id AS session_id, SUM(s.weight_lbs * s.reps) AS vol
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       JOIN workout_sessions ws ON we.session_id = ws.id
       WHERE we.exercise_id = ?
         AND ws.status = 'completed'
         AND s.weight_lbs IS NOT NULL
         AND s.reps IS NOT NULL
       GROUP BY ws.id
     )
     SELECT
       MAX(s.weight_lbs) AS best_set_weight,
       MAX(s.weight_lbs * s.reps) AS best_set_volume,
       MAX(CASE WHEN s.reps <= 15 AND s.reps > 0
            THEN s.weight_lbs * (1.0 + CAST(s.reps AS REAL) / 30.0)
            ELSE NULL END) AS estimated_1rm,
       (SELECT MAX(vol) FROM session_vols) AS best_session_volume
     FROM sets s
     JOIN workout_exercises we ON s.workout_exercise_id = we.id
     JOIN workout_sessions ws ON we.session_id = ws.id
     WHERE we.exercise_id = ?
       AND ws.status = 'completed'
       AND s.weight_lbs IS NOT NULL
       AND s.reps IS NOT NULL`,
    exerciseId,
    exerciseId
  );

  return {
    best_set_weight: row?.best_set_weight ?? null,
    best_set_volume: row?.best_set_volume ?? null,
    best_session_volume: row?.best_session_volume ?? null,
    estimated_1rm: row?.estimated_1rm ?? null,
  };
}

export async function createCustomExercise(
  db: SQLiteDatabase,
  data: {
    name: string;
    muscleGroup: string;
    equipmentType: string;
    isBodyweight: boolean;
    instructions?: string;
  }
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO exercises (name, muscle_group, equipment_type, is_bodyweight, is_custom, instructions) VALUES (?, ?, ?, ?, 1, ?)',
    data.name,
    data.muscleGroup,
    data.equipmentType,
    data.isBodyweight ? 1 : 0,
    data.instructions ?? null
  );
  return result.lastInsertRowId;
}

export async function updateCustomExercise(
  db: SQLiteDatabase,
  id: number,
  data: {
    name: string;
    muscleGroup: string;
    equipmentType: string;
    isBodyweight: boolean;
    instructions?: string;
  }
): Promise<void> {
  await db.runAsync(
    'UPDATE exercises SET name = ?, muscle_group = ?, equipment_type = ?, is_bodyweight = ?, instructions = ? WHERE id = ? AND is_custom = 1',
    data.name,
    data.muscleGroup,
    data.equipmentType,
    data.isBodyweight ? 1 : 0,
    data.instructions ?? null,
    id
  );
}

export async function deleteCustomExercise(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', id);
}

export async function getPerformedExerciseIds(db: SQLiteDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ exercise_id: number }>(
    `SELECT DISTINCT we.exercise_id
     FROM workout_exercises we
     JOIN workout_sessions ws ON we.session_id = ws.id
     WHERE ws.status = 'completed'`
  );
  return new Set(rows.map((r) => r.exercise_id));
}
