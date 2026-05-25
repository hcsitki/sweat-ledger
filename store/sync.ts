import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  errorMessage: string | null;
  setSyncing: () => void;
  setDone: (lastSyncedAt: number) => void;
  setIdle: () => void;
  setError: (message: string) => void;
  initLastSyncedAt: (ts: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  errorMessage: null,
  setSyncing: () => set({ status: 'syncing', errorMessage: null }),
  setDone: (lastSyncedAt) => set({ status: 'idle', lastSyncedAt, errorMessage: null }),
  setIdle: () => set({ status: 'idle' }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  initLastSyncedAt: (ts) => set((s) => s.lastSyncedAt === null ? { lastSyncedAt: ts } : {}),
}));
