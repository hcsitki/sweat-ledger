import { type SQLiteDatabase } from 'expo-sqlite';
import { getTemplateWithDetails } from '@/db/queries/templates';
import { createWorkoutSession } from '@/db/queries/workouts';
import { addWorkoutExercise, addSet } from '@/db/queries/sets';
import type { ActiveWorkoutStore } from '@/store/workout';

export async function startWorkoutFromTemplate(
  db: SQLiteDatabase,
  store: Pick<ActiveWorkoutStore, 'startWorkout' | 'addExerciseToSession'>,
  templateId: number
): Promise<boolean> {
  const template = await getTemplateWithDetails(db, templateId);
  if (!template) return false;

  const { id: sessionId, startedAt } = await createWorkoutSession(db, template.name, templateId);
  store.startWorkout(sessionId, template.name, startedAt);

  for (const ex of template.exercises) {
    const workoutExerciseId = await addWorkoutExercise(
      db,
      sessionId,
      ex.exercise_id,
      ex.order_index
    );

    store.addExerciseToSession({
      workoutExerciseId,
      exerciseId: ex.exercise_id,
      exerciseName: ex.exercise_name,
      isBodyweight: ex.is_bodyweight === 1,
      orderIndex: ex.order_index,
    });

    const setCount = ex.sets.length > 0 ? ex.sets.length : 1;
    for (let i = 0; i < setCount; i++) {
      await addSet(db, workoutExerciseId, {
        setNumber: i + 1,
        weightLbs: null,
        reps: null,
      });
    }
  }

  return true;
}
