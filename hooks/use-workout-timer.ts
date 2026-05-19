import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getElapsedSeconds } from '../utils/calculations';
import { useWorkoutStore } from '../store/workout';

export function useWorkoutTimer(): number {
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    startedAt != null ? getElapsedSeconds(startedAt) : 0
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt == null) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => setElapsedSeconds(getElapsedSeconds(startedAt));
    tick();
    intervalRef.current = setInterval(tick, 1000);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') tick();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [startedAt]);

  return elapsedSeconds;
}
