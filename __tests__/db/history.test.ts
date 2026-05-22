import {
  getCompletedWorkouts,
  getWorkoutDetail,
  getBestEpley1RMBeforeSession,
} from '../../db/queries/history';

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('getCompletedWorkouts', () => {
  it('queries completed sessions ordered by started_at descending', async () => {
    await getCompletedWorkouts(mockDb);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/status = 'completed'/),
    );
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/ORDER BY.*started_at DESC/s),
    );
  });

  it('assembles workout summaries with exercises from two queries', async () => {
    const summaryRows = [
      { id: 1, name: 'Push Day', started_at: 2000, finished_at: 5000, duration_seconds: 3600, total_tonnage: 1200, pr_count: 2 },
    ];
    const exerciseRows = [
      { session_id: 1, exercise_name: 'Bench Press', is_bodyweight: 0, order_index: 0, set_count: 3, best_weight: 80, best_reps: 11 },
    ];
    mockDb.getAllAsync
      .mockResolvedValueOnce(summaryRows)
      .mockResolvedValueOnce(exerciseRows);
    const result = await getCompletedWorkouts(mockDb);
    expect(result).toHaveLength(1);
    expect(result[0].total_tonnage).toBe(1200);
    expect(result[0].pr_count).toBe(2);
    expect(result[0].exercises).toHaveLength(1);
    expect(result[0].exercises[0].exercise_name).toBe('Bench Press');
    expect(result[0].exercises[0].best_weight).toBe(80);
  });

  it('returns empty exercises array when no exercises recorded', async () => {
    const summaryRows = [
      { id: 2, name: 'Empty', started_at: 1000, finished_at: 2000, duration_seconds: 1000, total_tonnage: 0, pr_count: 0 },
    ];
    mockDb.getAllAsync
      .mockResolvedValueOnce(summaryRows)
      .mockResolvedValueOnce([]);
    const result = await getCompletedWorkouts(mockDb);
    expect(result[0].exercises).toEqual([]);
  });
});

describe('getWorkoutDetail', () => {
  it('returns null when no rows come back', async () => {
    const result = await getWorkoutDetail(mockDb, 99);
    expect(result).toBeNull();
  });

  it('queries with JOIN across all four tables', async () => {
    await getWorkoutDetail(mockDb, 5);
    const sql: string = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toMatch(/workout_sessions/);
    expect(sql).toMatch(/workout_exercises/);
    expect(sql).toMatch(/exercises/);
    expect(sql).toMatch(/sets/);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.any(String), 5);
  });

  it('assembles nested structure from flat rows', async () => {
    const rows = [
      {
        id: 1, name: 'Leg Day', started_at: 1000, finished_at: 4600, duration_seconds: 3600,
        workout_exercise_id: 10, exercise_id: 3, order_index: 0,
        exercise_name: 'Squat', is_bodyweight: 0,
        set_id: 100, set_number: 1, weight_lbs: 135, reps: 5, notes: null, logged_at: 1100,
      },
      {
        id: 1, name: 'Leg Day', started_at: 1000, finished_at: 4600, duration_seconds: 3600,
        workout_exercise_id: 10, exercise_id: 3, order_index: 0,
        exercise_name: 'Squat', is_bodyweight: 0,
        set_id: 101, set_number: 2, weight_lbs: 155, reps: 3, notes: 'heavy', logged_at: 1200,
      },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);
    const result = await getWorkoutDetail(mockDb, 1);
    expect(result).not.toBeNull();
    expect(result!.exercises).toHaveLength(1);
    expect(result!.exercises[0].sets).toHaveLength(2);
    expect(result!.exercises[0].exercise_name).toBe('Squat');
    expect(result!.exercises[0].sets[1].notes).toBe('heavy');
  });

  it('groups sets correctly across multiple exercises', async () => {
    const base = { id: 1, name: 'Full Body', started_at: 1000, finished_at: 5000, duration_seconds: 4000 };
    const rows = [
      { ...base, workout_exercise_id: 10, exercise_id: 3, order_index: 0, exercise_name: 'Squat', is_bodyweight: 0, set_id: 100, set_number: 1, weight_lbs: 135, reps: 5, notes: null, logged_at: 1100 },
      { ...base, workout_exercise_id: 10, exercise_id: 3, order_index: 0, exercise_name: 'Squat', is_bodyweight: 0, set_id: 101, set_number: 2, weight_lbs: 155, reps: 3, notes: null, logged_at: 1200 },
      { ...base, workout_exercise_id: 11, exercise_id: 7, order_index: 1, exercise_name: 'Bench Press', is_bodyweight: 0, set_id: 102, set_number: 1, weight_lbs: 185, reps: 5, notes: 'easy', logged_at: 1300 },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);
    const result = await getWorkoutDetail(mockDb, 1);
    expect(result!.exercises).toHaveLength(2);
    expect(result!.exercises[0].exercise_name).toBe('Squat');
    expect(result!.exercises[0].sets).toHaveLength(2);
    expect(result!.exercises[1].exercise_name).toBe('Bench Press');
    expect(result!.exercises[1].sets).toHaveLength(1);
    expect(result!.exercises[1].sets[0].notes).toBe('easy');
  });

  it('handles a workout with no exercises (empty session)', async () => {
    const rows = [
      { id: 2, name: 'Empty', started_at: 1000, finished_at: 2000, duration_seconds: 1000, workout_exercise_id: null, exercise_id: null, order_index: null, exercise_name: null, is_bodyweight: null, set_id: null, set_number: null, weight_lbs: null, reps: null, notes: null, logged_at: null },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);
    const result = await getWorkoutDetail(mockDb, 2);
    expect(result).not.toBeNull();
    expect(result!.exercises).toHaveLength(0);
    expect(result!.name).toBe('Empty');
  });

  it('handles an exercise with no sets', async () => {
    const rows = [
      { id: 3, name: 'No Sets', started_at: 1000, finished_at: 2000, duration_seconds: 1000, workout_exercise_id: 20, exercise_id: 5, order_index: 0, exercise_name: 'Deadlift', is_bodyweight: 0, set_id: null, set_number: null, weight_lbs: null, reps: null, notes: null, logged_at: null },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);
    const result = await getWorkoutDetail(mockDb, 3);
    expect(result!.exercises).toHaveLength(1);
    expect(result!.exercises[0].sets).toHaveLength(0);
  });
});

describe('getBestEpley1RMBeforeSession', () => {
  it('returns 0 when no prior sets exist', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ best_1rm: 0 });
    const result = await getBestEpley1RMBeforeSession(mockDb, 3, 5000);
    expect(result).toBe(0);
  });

  it('returns best_1rm from the db row', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ best_1rm: 220.5 });
    const result = await getBestEpley1RMBeforeSession(mockDb, 3, 5000);
    expect(result).toBe(220.5);
  });

  it('queries with exerciseId and sessionStartedAt params', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ best_1rm: 0 });
    await getBestEpley1RMBeforeSession(mockDb, 7, 9999);
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(expect.any(String), 7, 9999);
  });

  it('SQL includes Epley formula and reps <= 15 guard', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ best_1rm: 0 });
    await getBestEpley1RMBeforeSession(mockDb, 1, 1000);
    const sql: string = mockDb.getFirstAsync.mock.calls[0][0];
    expect(sql).toMatch(/1\.0 \+ s\.reps \/ 30\.0/);
    expect(sql).toMatch(/s\.reps <= 15/);
    expect(sql).toMatch(/ws\.started_at < \?/);
  });
});
