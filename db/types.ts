export interface Exercise {
  id: number;
  name: string;
  base_name: string;
  muscle_group: string;
  equipment_type: string;
  is_bodyweight: number;
  is_custom: number;
  instructions: string | null;
  created_at: number;
  synced_at: number | null;
}

export interface ExerciseGroup {
  base_name: string;
  muscle_group: string;
  variant_count: number;
  has_performed: number; // 0 or 1
}

export interface ExerciseGroupHistorySession {
  workout_exercise_id: number;
  session_id: number;
  session_name: string;
  started_at: number;
  exercise_id: number;
  exercise_name: string;
  equipment_type: string;
  is_bodyweight: number;
  session_1rm: number | null;
  sets: ExerciseHistorySet[];
}

export interface ExerciseStats {
  best_set_weight: number | null;
  best_set_volume: number | null;
  best_session_volume: number | null;
  estimated_1rm: number | null;
}

export interface WorkoutSession {
  id: number;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
  calories_burned: number | null;
  synced_at: number | null;
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
  is_done: number;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
}

export interface TemplateSet {
  id: number;
  template_exercise_id: number;
  set_number: number;
  target_reps: number | null;
}

export interface TemplateExerciseWithDetails extends TemplateExercise {
  exercise_name: string;
  is_bodyweight: number;
  sets: TemplateSet[];
}

export interface TemplateWithDetails extends WorkoutTemplate {
  exercises: TemplateExerciseWithDetails[];
  exercise_count: number;
}

export interface WorkoutExerciseLine {
  exercise_name: string;
  is_bodyweight: number;
  set_count: number;
  best_weight: number | null;
  best_reps: number | null;
}

export interface CompletedWorkoutSummary {
  id: number;
  name: string;
  started_at: number;
  finished_at: number;
  duration_seconds: number;
  total_tonnage: number;
  pr_count: number;
  exercises: WorkoutExerciseLine[];
}

export interface WorkoutHistorySet {
  id: number;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
  logged_at: number;
}

export interface WorkoutHistoryExercise {
  workout_exercise_id: number;
  exercise_id: number;
  exercise_name: string;
  is_bodyweight: number;
  order_index: number;
  sets: WorkoutHistorySet[];
}

export interface WorkoutHistoryDetail {
  id: number;
  name: string;
  started_at: number;
  finished_at: number;
  duration_seconds: number;
  template_id: number | null;
  template_name: string | null;
  exercises: WorkoutHistoryExercise[];
}

export interface ExerciseHistorySet {
  id: number;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
}

export interface ExerciseHistorySession {
  workout_exercise_id: number;
  session_id: number;
  session_name: string;
  started_at: number;
  session_1rm: number | null;
  sets: ExerciseHistorySet[];
}
