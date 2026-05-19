import { type SQLiteDatabase } from 'expo-sqlite';
import { type Exercise } from '../types';

interface ExerciseFilters {
  muscleGroup?: string;
  equipmentType?: string;
}

export async function getExercises(
  db: SQLiteDatabase,
  filters?: ExerciseFilters
): Promise<Exercise[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.muscleGroup) {
    conditions.push('muscle_group = ?');
    params.push(filters.muscleGroup);
  }
  if (filters?.equipmentType) {
    conditions.push('equipment_type = ?');
    params.push(filters.equipmentType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<Exercise>(
    `SELECT * FROM exercises ${where} ORDER BY name ASC`,
    params
  );
}

export async function createCustomExercise(
  db: SQLiteDatabase,
  data: { name: string; muscleGroup: string; equipmentType: string; isBodyweight: boolean }
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO exercises (name, muscle_group, equipment_type, is_bodyweight, is_custom) VALUES (?, ?, ?, ?, 1)',
    data.name,
    data.muscleGroup,
    data.equipmentType,
    data.isBodyweight ? 1 : 0
  );
  return result.lastInsertRowId;
}
