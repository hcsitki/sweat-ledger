import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useWorkoutTimer } from '../../hooks/use-workout-timer';
import { useWorkoutStore } from '../../store/workout';

const INITIAL = {
  sessionId: null,
  sessionName: '',
  startedAt: null,
  workoutExercises: [],
  restTimer: { isRunning: false, endsAt: null, durationSeconds: 90, notificationId: null },
};

beforeEach(() => {
  useWorkoutStore.setState(INITIAL);
  jest.useFakeTimers();
});

afterEach(() => {
  useWorkoutStore.setState(INITIAL);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useWorkoutTimer', () => {
  it('returns 0 when no workout is active', () => {
    const { result } = renderHook(() => useWorkoutTimer());
    expect(result.current).toBe(0);
  });

  it('returns correct elapsed seconds based on startedAt', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      useWorkoutStore.getState().startWorkout(1, 'Test', now - 5_000);
    });
    const { result } = renderHook(() => useWorkoutTimer());
    expect(result.current).toBe(5);
  });

  it('increments elapsed each second via interval', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      useWorkoutStore.getState().startWorkout(1, 'Test', now);
    });
    const { result } = renderHook(() => useWorkoutTimer());
    expect(result.current).toBe(0);
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(result.current).toBe(3);
  });

  it('resets to 0 when workout is cleared', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      useWorkoutStore.getState().startWorkout(1, 'Test', now - 10_000);
    });
    const { result } = renderHook(() => useWorkoutTimer());
    expect(result.current).toBe(10);
    act(() => {
      useWorkoutStore.getState().clearWorkout();
    });
    expect(result.current).toBe(0);
  });

  it('re-syncs elapsed on AppState active event', () => {
    const listeners: Array<(state: string) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event: any, cb: any) => {
      listeners.push(cb);
      return { remove: jest.fn() } as any;
    });

    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      useWorkoutStore.getState().startWorkout(1, 'Test', now - 30_000);
    });
    const { result } = renderHook(() => useWorkoutTimer());
    expect(result.current).toBe(30);

    jest.setSystemTime(now + 10_000);
    act(() => {
      listeners.forEach((cb) => cb('active'));
    });
    expect(result.current).toBe(40);
  });
});
