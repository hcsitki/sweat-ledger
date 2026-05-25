import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { syncNow, syncIfStale } from '@/lib/sync';
import { useSyncStore } from '@/store/sync';

export function SyncManager() {
  const db = useSQLiteContext();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const wasConnected = useRef<boolean | null>(null);

  const { setSyncing, setDone, setIdle, setError, initLastSyncedAt } = useSyncStore();

  async function runSync() {
    setSyncing();
    const result = await syncNow(db);
    if (result.ok) {
      setDone(Date.now());
    } else if (result.error === 'offline') {
      setIdle();
    } else {
      setError(result.message ?? 'Sync failed');
    }
  }

  function applyStaleResult(result: Awaited<ReturnType<typeof syncIfStale>>) {
    if (!result) return;
    if (result.ok) setDone(Date.now());
    else if (result.error !== 'offline') setError(result.message ?? 'Sync failed');
  }

  useEffect(() => {
    // Initialize lastSyncedAt from DB
    db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_synced_at'")
      .then((row) => { if (row) initLastSyncedAt(Number(row.value)); })
      .catch(() => {});

    // Sync on mount (first launch / reinstall restore)
    syncIfStale(db).then(applyStaleResult).catch(() => {});

    // Sync on app foregrounding
    const appSub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        syncIfStale(db).then(applyStaleResult).catch(() => {});
      }
      appState.current = next;
    });

    // Sync immediately when network comes back online
    const netSub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      if (wasConnected.current === false && connected) {
        runSync();
      }
      wasConnected.current = connected;
    });

    return () => {
      appSub.remove();
      netSub();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return null;
}
