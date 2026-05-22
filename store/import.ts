import { create } from 'zustand';
import type { ParsedWorkout } from '@/services/import/parse-strong-csv';

interface ImportStore {
  parsedWorkouts: ParsedWorkout[];
  uniqueExerciseNames: string[];
  exerciseMapping: Record<string, number | null>; // null = create as new custom exercise
  weightUnit: 'lbs' | 'kg';
  setParsedData: (workouts: ParsedWorkout[]) => void;
  setExerciseMapping: (name: string, exerciseId: number | null) => void;
  setWeightUnit: (unit: 'lbs' | 'kg') => void;
  reset: () => void;
}

export const useImportStore = create<ImportStore>((set) => ({
  parsedWorkouts: [],
  uniqueExerciseNames: [],
  exerciseMapping: {},
  weightUnit: 'lbs',

  setParsedData: (workouts) => {
    const names = Array.from(
      new Set(workouts.flatMap((w) => w.exercises.map((e) => e.name)))
    ).sort();
    set({ parsedWorkouts: workouts, uniqueExerciseNames: names, exerciseMapping: {} });
  },

  setExerciseMapping: (name, exerciseId) =>
    set((state) => ({
      exerciseMapping: { ...state.exerciseMapping, [name]: exerciseId },
    })),

  setWeightUnit: (unit) => set({ weightUnit: unit }),

  reset: () =>
    set({
      parsedWorkouts: [],
      uniqueExerciseNames: [],
      exerciseMapping: {},
      weightUnit: 'lbs',
    }),
}));
