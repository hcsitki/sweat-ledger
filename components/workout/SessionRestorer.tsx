import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getActiveSession } from '@/db/queries/workouts';
import { getWorkoutExercisesForSession } from '@/db/queries/sets';
import { useWorkoutStore } from '@/store/workout';

export function SessionRestorer() {
  const db = useSQLiteContext();
  const restoreWorkout = useWorkoutStore((s) => s.restoreWorkout);

  useEffect(() => {
    (async () => {
      const session = await getActiveSession(db);
      if (!session) return;
      const exercises = await getWorkoutExercisesForSession(db, session.id);
      restoreWorkout(
        session.id,
        session.name,
        session.started_at,
        exercises.map((e) => ({
          workoutExerciseId: e.id,
          exerciseId: e.exercise_id,
          exerciseName: e.exercise_name,
          isBodyweight: e.is_bodyweight === 1,
          orderIndex: e.order_index,
        }))
      );
    })();
  }, []);

  return null;
}
