import { create } from 'zustand';

interface AppState {
  activeSessionId: number | null;
  setActiveSessionId: (id: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}));
