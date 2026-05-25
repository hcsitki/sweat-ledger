export interface Env {
  DB: D1Database;
  AUTH_TOKEN: string;
}

export interface PushPayload {
  deviceId: string;
  records: {
    sessions: SessionRecord[];
    workout_exercises: WorkoutExerciseRecord[];
    sets: SetRecord[];
    templates: TemplateRecord[];
    template_exercises: TemplateExerciseRecord[];
    template_sets: TemplateSetRecord[];
    custom_exercises: CustomExerciseRecord[];
  };
}

export interface SessionRecord {
  id: number;
  name: string;
  status: string;
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
  calories_burned: number | null;
}

export interface WorkoutExerciseRecord {
  id: number;
  session_id: number;
  exercise_id: number;
  order_index: number;
  notes: string | null;
}

export interface SetRecord {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
  logged_at: number;
  is_done: number;
}

export interface TemplateRecord {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface TemplateExerciseRecord {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
}

export interface TemplateSetRecord {
  id: number;
  template_exercise_id: number;
  set_number: number;
  target_reps: number | null;
}

export interface CustomExerciseRecord {
  id: number;
  name: string;
  base_name: string;
  muscle_group: string;
  equipment_type: string;
  is_bodyweight: number;
  instructions: string | null;
  created_at: number;
}
