import type { SQLiteDatabase } from 'expo-sqlite';
import type { ParsedWorkout } from './parse-strong-csv';
import { createCustomExercise } from '@/db/queries/exercises';

export interface ImportResult {
  imported: number;
  skipped: number;
}

function inferEquipmentFromName(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (!match) return 'Machine';
  const paren = match[1].toLowerCase();
  if (paren.includes('barbell')) return 'Barbell';
  if (paren.includes('dumbbell')) return 'Dumbbell';
  if (paren.includes('cable')) return 'Cable';
  if (paren.includes('machine')) return 'Machine';
  if (paren.includes('bodyweight')) return 'Bodyweight';
  if (paren.includes('kettlebell')) return 'Kettlebell';
  if (paren.includes('band')) return 'Band';
  return 'Machine';
}

export async function importWorkouts(
  db: SQLiteDatabase,
  workouts: ParsedWorkout[],
  exerciseMapping: Record<string, number | null>,
  weightMultiplier: number
): Promise<ImportResult> {
  // Resolve "create new" entries to actual exercise IDs
  const resolvedMapping: Record<string, number> = {};
  for (const [csvName, exerciseId] of Object.entries(exerciseMapping)) {
    if (exerciseId !== null) {
      resolvedMapping[csvName] = exerciseId;
    } else {
      const newId = await createCustomExercise(db, {
        name: csvName,
        muscleGroup: 'Core',
        equipmentType: inferEquipmentFromName(csvName),
        isBodyweight: false,
      });
      resolvedMapping[csvName] = newId;
    }
  }

  // Separate duplicate check from the transaction
  const workoutsToInsert: ParsedWorkout[] = [];
  let skipped = 0;
  for (const workout of workouts) {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM workout_sessions WHERE started_at = ? AND status = 'completed'",
      workout.startedAt
    );
    if (existing) {
      skipped++;
    } else {
      workoutsToInsert.push(workout);
    }
  }

  await db.execAsync('BEGIN');
  try {
    for (const workout of workoutsToInsert) {
      const finishedAt = workout.startedAt + workout.durationSeconds * 1000;
      const sessionResult = await db.runAsync(
        "INSERT INTO workout_sessions (name, status, started_at, finished_at, duration_seconds) VALUES (?, 'completed', ?, ?, ?)",
        workout.name,
        workout.startedAt,
        finishedAt,
        workout.durationSeconds
      );
      const sessionId = sessionResult.lastInsertRowId;

      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        const exerciseId = resolvedMapping[ex.name];
        if (exerciseId == null) continue;

        const weResult = await db.runAsync(
          'INSERT INTO workout_exercises (session_id, exercise_id, order_index) VALUES (?, ?, ?)',
          sessionId,
          exerciseId,
          i
        );
        const weId = weResult.lastInsertRowId;

        for (const s of ex.sets) {
          const adjustedWeight = s.weightLbs > 0 ? s.weightLbs * weightMultiplier : null;
          await db.runAsync(
            'INSERT INTO sets (workout_exercise_id, set_number, weight_lbs, reps, notes, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
            weId,
            s.setNumber,
            adjustedWeight,
            s.reps,
            null,
            workout.startedAt
          );
        }
      }
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  return { imported: workoutsToInsert.length, skipped };
}
