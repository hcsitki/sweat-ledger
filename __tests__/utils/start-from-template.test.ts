import { startWorkoutFromTemplate } from '../../utils/start-from-template';

// Mock modules used by the utility
jest.mock('../../db/queries/templates', () => ({
  getTemplateWithDetails: jest.fn(),
}));
jest.mock('../../db/queries/workouts', () => ({
  createWorkoutSession: jest.fn(),
}));
jest.mock('../../db/queries/sets', () => ({
  addWorkoutExercise: jest.fn(),
  addSet: jest.fn(),
}));

import { getTemplateWithDetails } from '../../db/queries/templates';
import { createWorkoutSession } from '../../db/queries/workouts';
import { addWorkoutExercise, addSet } from '../../db/queries/sets';

const mockDb = {} as any;

const mockStore = {
  startWorkout: jest.fn(),
  addExerciseToSession: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('startWorkoutFromTemplate', () => {
  it('returns false when template does not exist', async () => {
    (getTemplateWithDetails as jest.Mock).mockResolvedValueOnce(null);
    const result = await startWorkoutFromTemplate(mockDb, mockStore, 99);
    expect(result).toBe(false);
    expect(mockStore.startWorkout).not.toHaveBeenCalled();
  });

  it('creates session, adds exercises and blank sets, returns true', async () => {
    const template = {
      id: 1,
      name: 'Push Day',
      exercises: [
        {
          id: 10,
          exercise_id: 5,
          exercise_name: 'Bench Press',
          is_bodyweight: 0,
          order_index: 0,
          sets: [
            { id: 100, set_number: 1, target_reps: 8 },
            { id: 101, set_number: 2, target_reps: 10 },
          ],
        },
      ],
    };
    (getTemplateWithDetails as jest.Mock).mockResolvedValueOnce(template);
    (createWorkoutSession as jest.Mock).mockResolvedValueOnce({ id: 42, startedAt: 1000 });
    (addWorkoutExercise as jest.Mock).mockResolvedValueOnce(200);
    (addSet as jest.Mock).mockResolvedValue(undefined);

    const result = await startWorkoutFromTemplate(mockDb, mockStore, 1);

    expect(result).toBe(true);
    expect(createWorkoutSession).toHaveBeenCalledWith(mockDb, 'Push Day');
    expect(mockStore.startWorkout).toHaveBeenCalledWith(42, 'Push Day', 1000);
    expect(addWorkoutExercise).toHaveBeenCalledWith(mockDb, 42, 5, 0);
    expect(mockStore.addExerciseToSession).toHaveBeenCalledWith({
      workoutExerciseId: 200,
      exerciseId: 5,
      exerciseName: 'Bench Press',
      isBodyweight: false,
      orderIndex: 0,
    });
    // Two sets from template
    expect(addSet).toHaveBeenCalledTimes(2);
    expect(addSet).toHaveBeenCalledWith(mockDb, 200, {
      setNumber: 1,
      weightLbs: null,
      reps: null,
    });
  });

  it('creates at least 1 blank set when template exercise has no sets', async () => {
    const template = {
      id: 1,
      name: 'Minimal',
      exercises: [
        {
          id: 10,
          exercise_id: 5,
          exercise_name: 'Squat',
          is_bodyweight: 0,
          order_index: 0,
          sets: [], // no sets defined
        },
      ],
    };
    (getTemplateWithDetails as jest.Mock).mockResolvedValueOnce(template);
    (createWorkoutSession as jest.Mock).mockResolvedValueOnce({ id: 1, startedAt: 1000 });
    (addWorkoutExercise as jest.Mock).mockResolvedValueOnce(10);

    await startWorkoutFromTemplate(mockDb, mockStore, 1);
    expect(addSet).toHaveBeenCalledTimes(1);
    expect(addSet).toHaveBeenCalledWith(mockDb, 10, { setNumber: 1, weightLbs: null, reps: null });
  });

  it('handles multiple exercises', async () => {
    const template = {
      id: 1,
      name: 'Full Body',
      exercises: [
        { id: 10, exercise_id: 1, exercise_name: 'Squat', is_bodyweight: 0, order_index: 0, sets: [{ id: 100, set_number: 1, target_reps: 5 }] },
        { id: 11, exercise_id: 2, exercise_name: 'Pull-Up', is_bodyweight: 1, order_index: 1, sets: [{ id: 101, set_number: 1, target_reps: 8 }] },
      ],
    };
    (getTemplateWithDetails as jest.Mock).mockResolvedValueOnce(template);
    (createWorkoutSession as jest.Mock).mockResolvedValueOnce({ id: 5, startedAt: 2000 });
    (addWorkoutExercise as jest.Mock)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(21);

    await startWorkoutFromTemplate(mockDb, mockStore, 1);

    expect(addWorkoutExercise).toHaveBeenCalledTimes(2);
    expect(mockStore.addExerciseToSession).toHaveBeenCalledTimes(2);
    expect(addSet).toHaveBeenCalledTimes(2);

    // Bodyweight flag is correctly mapped
    expect(mockStore.addExerciseToSession).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseName: 'Pull-Up', isBodyweight: true })
    );
  });
});
