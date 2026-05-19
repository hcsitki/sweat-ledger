export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment_type: string;
  is_bodyweight: number;
  is_custom: number;
  created_at: number;
}

export interface WorkoutSession {
  id: number;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
}

export interface WorkoutExercise {
  id: number;
  session_id: number;
  exercise_id: number;
  order_index: number;
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise_name: string;
  is_bodyweight: number;
}

export interface Set {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
  logged_at: number;
}
