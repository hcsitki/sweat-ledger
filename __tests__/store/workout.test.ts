import { useWorkoutStore } from '../../store/workout';

const INITIAL_STATE = {
  sessionId: null,
  sessionName: '',
  startedAt: null,
  workoutExercises: [],
  restTimer: { isRunning: false, endsAt: null, durationSeconds: 90, notificationId: null },
};

beforeEach(() => useWorkoutStore.setState(INITIAL_STATE));

describe('startWorkout', () => {
  it('initializes all fields correctly', () => {
    useWorkoutStore.getState().startWorkout(1, 'Morning Session', 1_000_000);
    const state = useWorkoutStore.getState();
    expect(state.sessionId).toBe(1);
    expect(state.sessionName).toBe('Morning Session');
    expect(state.startedAt).toBe(1_000_000);
    expect(state.workoutExercises).toHaveLength(0);
    expect(state.restTimer.isRunning).toBe(false);
  });
});

describe('restoreWorkout', () => {
  it('populates exercises from DB snapshot', () => {
    const exercises = [
      {
        workoutExerciseId: 1,
        exerciseId: 2,
        exerciseName: 'Squat',
        isBodyweight: false,
        orderIndex: 0,
      },
    ];
    useWorkoutStore.getState().restoreWorkout(5, 'Restored', 999, exercises);
    const state = useWorkoutStore.getState();
    expect(state.sessionId).toBe(5);
    expect(state.workoutExercises).toHaveLength(1);
    expect(state.workoutExercises[0].exerciseName).toBe('Squat');
  });
});

describe('addExerciseToSession / removeExerciseFromSession', () => {
  it('adds and removes an exercise', () => {
    const entry = { workoutExerciseId: 10, exerciseId: 3, exerciseName: 'Bench', isBodyweight: false, orderIndex: 0 };
    useWorkoutStore.getState().addExerciseToSession(entry);
    expect(useWorkoutStore.getState().workoutExercises).toHaveLength(1);
    useWorkoutStore.getState().removeExerciseFromSession(10);
    expect(useWorkoutStore.getState().workoutExercises).toHaveLength(0);
  });
});

describe('restTimer', () => {
  it('startRestTimer sets isRunning and endsAt', () => {
    useWorkoutStore.getState().startRestTimer(90, 'notif-123');
    const { restTimer } = useWorkoutStore.getState();
    expect(restTimer.isRunning).toBe(true);
    expect(restTimer.notificationId).toBe('notif-123');
    expect(restTimer.endsAt).toBeGreaterThan(Date.now());
  });

  it('extendRestTimer adds time when running', () => {
    useWorkoutStore.getState().startRestTimer(90, 'n1');
    const before = useWorkoutStore.getState().restTimer.endsAt!;
    useWorkoutStore.getState().extendRestTimer(30);
    const after = useWorkoutStore.getState().restTimer.endsAt!;
    expect(after).toBeGreaterThanOrEqual(before + 29_000);
  });

  it('stopRestTimer clears timer state', () => {
    useWorkoutStore.getState().startRestTimer(90, 'notif-123');
    useWorkoutStore.getState().stopRestTimer();
    const { restTimer } = useWorkoutStore.getState();
    expect(restTimer.isRunning).toBe(false);
    expect(restTimer.endsAt).toBeNull();
    expect(restTimer.notificationId).toBeNull();
  });
});

describe('clearWorkout', () => {
  it('resets to initial state', () => {
    useWorkoutStore.getState().startWorkout(1, 'Session', 1000);
    useWorkoutStore.getState().clearWorkout();
    const state = useWorkoutStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.sessionName).toBe('');
    expect(state.startedAt).toBeNull();
    expect(state.workoutExercises).toHaveLength(0);
  });
});
