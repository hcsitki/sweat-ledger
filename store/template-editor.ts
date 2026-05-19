import { create } from 'zustand';

interface PendingExercise {
  id: number;
  name: string;
  isBodyweight: boolean;
}

interface TemplateEditorStore {
  pendingExercise: PendingExercise | null;
  setPendingExercise: (exercise: PendingExercise) => void;
  takePendingExercise: () => PendingExercise | null;
}

export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  pendingExercise: null,

  setPendingExercise: (exercise) => set({ pendingExercise: exercise }),

  takePendingExercise: () => {
    const { pendingExercise } = get();
    set({ pendingExercise: null });
    return pendingExercise;
  },
}));
