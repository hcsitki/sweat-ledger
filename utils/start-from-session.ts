import { type SQLiteDatabase } from 'expo-sqlite';
import { getWorkoutDetail } from '@/db/queries/history';
import { createWorkoutSession } from '@/db/queries/workouts';
import { addWorkoutExercise, addSet } from '@/db/queries/sets';
import type { ActiveWorkoutStore } from '@/store/workout';

export async function startWorkoutFromSession(
  db: SQLiteDatabase,
  store: Pick<ActiveWorkoutStore, 'startWorkout' | 'addExerciseToSession'>,
  sessionId: number
): Promise<boolean> {
  const workout = await getWorkoutDetail(db, sessionId);
  if (!workout) return false;

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const name = `${dayName} Workout`;
  const { id: newSessionId, startedAt } = await createWorkoutSession(db, name);
  store.startWorkout(newSessionId, name, startedAt);

  for (const ex of workout.exercises) {
    const workoutExerciseId = await addWorkoutExercise(
      db, newSessionId, ex.exercise_id, ex.order_index
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
      await addSet(db, workoutExerciseId, { setNumber: i + 1, weightLbs: null, reps: null });
    }
  }
  return true;
}
