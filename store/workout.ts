import { create } from 'zustand';

export interface WorkoutExerciseEntry {
  workoutExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  isBodyweight: boolean;
  orderIndex: number;
}

interface RestTimerState {
  isRunning: boolean;
  endsAt: number | null;
  durationSeconds: number;
  notificationId: string | null;
}

interface ActiveWorkoutStore {
  sessionId: number | null;
  sessionName: string;
  startedAt: number | null;
  workoutExercises: WorkoutExerciseEntry[];
  restTimer: RestTimerState;
  startWorkout: (sessionId: number, name: string, startedAt: number) => void;
  restoreWorkout: (
    sessionId: number,
    name: string,
    startedAt: number,
    exercises: WorkoutExerciseEntry[]
  ) => void;
  addExerciseToSession: (entry: WorkoutExerciseEntry) => void;
  removeExerciseFromSession: (workoutExerciseId: number) => void;
  setSessionName: (name: string) => void;
  startRestTimer: (durationSeconds: number, notificationId: string) => void;
  extendRestTimer: (additionalSeconds: number) => void;
  stopRestTimer: () => void;
  clearWorkout: () => void;
}

const DEFAULT_REST_TIMER: RestTimerState = {
  isRunning: false,
  endsAt: null,
  durationSeconds: 90,
  notificationId: null,
};

export const useWorkoutStore = create<ActiveWorkoutStore>((set) => ({
  sessionId: null,
  sessionName: '',
  startedAt: null,
  workoutExercises: [],
  restTimer: DEFAULT_REST_TIMER,

  startWorkout: (sessionId, name, startedAt) =>
    set({ sessionId, sessionName: name, startedAt, workoutExercises: [], restTimer: DEFAULT_REST_TIMER }),

  restoreWorkout: (sessionId, name, startedAt, exercises) =>
    set({ sessionId, sessionName: name, startedAt, workoutExercises: exercises, restTimer: DEFAULT_REST_TIMER }),

  addExerciseToSession: (entry) =>
    set((state) => ({ workoutExercises: [...state.workoutExercises, entry] })),

  removeExerciseFromSession: (workoutExerciseId) =>
    set((state) => ({
      workoutExercises: state.workoutExercises.filter(
        (e) => e.workoutExerciseId !== workoutExerciseId
      ),
    })),

  setSessionName: (name) => set({ sessionName: name }),

  startRestTimer: (durationSeconds, notificationId) =>
    set({
      restTimer: {
        isRunning: true,
        endsAt: Date.now() + durationSeconds * 1000,
        durationSeconds,
        notificationId,
      },
    }),

  extendRestTimer: (additionalSeconds) =>
    set((state) => {
      if (!state.restTimer.isRunning || state.restTimer.endsAt == null) return state;
      return {
        restTimer: {
          ...state.restTimer,
          endsAt: state.restTimer.endsAt + additionalSeconds * 1000,
        },
      };
    }),

  stopRestTimer: () =>
    set((state) => ({
      restTimer: { ...state.restTimer, isRunning: false, endsAt: null, notificationId: null },
    })),

  clearWorkout: () =>
    set({ sessionId: null, sessionName: '', startedAt: null, workoutExercises: [], restTimer: DEFAULT_REST_TIMER }),
}));
