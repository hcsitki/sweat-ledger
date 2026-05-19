import { useEffect, useRef, useState, useCallback } from 'react';
import { useWorkoutStore } from '../store/workout';
import { cancelNotification } from '../utils/notifications';

interface RestTimerResult {
  secondsRemaining: number;
  isRunning: boolean;
  stop: () => void;
  extend: (seconds: number) => void;
}

export function useRestTimer(): RestTimerResult {
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const extendRestTimer = useWorkoutStore((s) => s.extendRestTimer);

  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!restTimer.isRunning || restTimer.endsAt == null) {
      setSecondsRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restTimer.endsAt! - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) stopRestTimer();
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restTimer.isRunning, restTimer.endsAt, stopRestTimer]);

  const stop = useCallback(() => {
    if (restTimer.notificationId) cancelNotification(restTimer.notificationId);
    stopRestTimer();
  }, [restTimer.notificationId, stopRestTimer]);

  const extend = useCallback(
    (seconds: number) => extendRestTimer(seconds),
    [extendRestTimer]
  );

  return { secondsRemaining, isRunning: restTimer.isRunning, stop, extend };
}
