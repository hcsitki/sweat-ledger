import { getExercises, createCustomExercise, getExercisePerformanceHistory } from '../../db/queries/exercises';

const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 10, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('getExercises', () => {
  it('fetches all exercises without filters', async () => {
    await getExercises(mockDb);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('FROM exercises'),
      []
    );
  });

  it('filters by muscle group', async () => {
    await getExercises(mockDb, { muscleGroup: 'Chest' });
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('muscle_group = ?'),
      ['Chest']
    );
  });

  it('filters by equipment type', async () => {
    await getExercises(mockDb, { equipmentType: 'Barbell' });
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('equipment_type = ?'),
      ['Barbell']
    );
  });
});

describe('getExercisePerformanceHistory', () => {
  it('groups rows by workout_exercise_id into separate session objects', async () => {
    const rows = [
      { workout_exercise_id: 1, session_id: 10, session_name: 'Push Day', started_at: 1000, set_id: 1, set_number: 1, weight_lbs: 225, reps: 5, notes: null },
      { workout_exercise_id: 1, session_id: 10, session_name: 'Push Day', started_at: 1000, set_id: 2, set_number: 2, weight_lbs: 225, reps: 5, notes: 'felt strong' },
      { workout_exercise_id: 2, session_id: 20, session_name: 'Push Day 2', started_at: 2000, set_id: 3, set_number: 1, weight_lbs: 230, reps: 5, notes: null },
    ];
    const db = { getAllAsync: jest.fn().mockResolvedValue(rows) } as any;
    const result = await getExercisePerformanceHistory(db, 5);

    expect(result).toHaveLength(2);
    expect(result[0].workout_exercise_id).toBe(1);
    expect(result[0].sets).toHaveLength(2);
    expect(result[1].workout_exercise_id).toBe(2);
    expect(result[1].sets).toHaveLength(1);
  });

  it('computes session_1rm as the max Epley value across sets with reps 1–15', async () => {
    const rows = [
      { workout_exercise_id: 1, session_id: 10, session_name: 'A', started_at: 1000, set_id: 1, set_number: 1, weight_lbs: 200, reps: 5, notes: null },
      { workout_exercise_id: 1, session_id: 10, session_name: 'A', started_at: 1000, set_id: 2, set_number: 2, weight_lbs: 180, reps: 10, notes: null },
    ];
    const db = { getAllAsync: jest.fn().mockResolvedValue(rows) } as any;
    const [session] = await getExercisePerformanceHistory(db, 5);

    // Epley: 200*(1+5/30)=233.3, 180*(1+10/30)=240 → max is 240
    expect(session.session_1rm).toBeCloseTo(240);
  });

  it('ignores sets with reps > 15 for session_1rm', async () => {
    const rows = [
      { workout_exercise_id: 1, session_id: 10, session_name: 'A', started_at: 1000, set_id: 1, set_number: 1, weight_lbs: 100, reps: 20, notes: null },
    ];
    const db = { getAllAsync: jest.fn().mockResolvedValue(rows) } as any;
    const [session] = await getExercisePerformanceHistory(db, 5);

    expect(session.session_1rm).toBeNull();
  });

  it('handles duplicate exercise in same session as separate history entries', async () => {
    const rows = [
      { workout_exercise_id: 1, session_id: 10, session_name: 'A', started_at: 1000, set_id: 1, set_number: 1, weight_lbs: 225, reps: 5, notes: null },
      { workout_exercise_id: 2, session_id: 10, session_name: 'A', started_at: 1000, set_id: 2, set_number: 1, weight_lbs: 135, reps: 10, notes: null },
    ];
    const db = { getAllAsync: jest.fn().mockResolvedValue(rows) } as any;
    const result = await getExercisePerformanceHistory(db, 5);

    expect(result).toHaveLength(2);
    expect(result[0].session_id).toBe(10);
    expect(result[1].session_id).toBe(10);
    expect(result[0].sets[0].weight_lbs).toBe(225);
    expect(result[1].sets[0].weight_lbs).toBe(135);
  });

  it('returns empty array when no sessions exist', async () => {
    const db = { getAllAsync: jest.fn().mockResolvedValue([]) } as any;
    const result = await getExercisePerformanceHistory(db, 5);
    expect(result).toHaveLength(0);
  });
});

describe('createCustomExercise', () => {
  it('inserts a custom exercise and returns its id', async () => {
    const id = await createCustomExercise(mockDb, {
      name: 'My Exercise',
      muscleGroup: 'Arms',
      equipmentType: 'Dumbbell',
      isBodyweight: false,
    });
    expect(id).toBe(10);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_custom'),
      'My Exercise',
      'Arms',
      'Dumbbell',
      0,
      null
    );
  });
});
