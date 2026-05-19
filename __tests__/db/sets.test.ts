import {
  addWorkoutExercise,
  addSet,
  updateSet,
  deleteSet,
  getSetsForWorkoutExercise,
} from '../../db/queries/sets';

const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('addWorkoutExercise', () => {
  it('inserts and returns the new id', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 7, changes: 1 });
    const id = await addWorkoutExercise(mockDb, 1, 2, 0);
    expect(id).toBe(7);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_exercises'),
      1,
      2,
      0
    );
  });
});

describe('addSet', () => {
  it('inserts a set and returns the new id', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 99, changes: 1 });
    const id = await addSet(mockDb, 3, { setNumber: 1, weightLbs: 135, reps: 8 });
    expect(id).toBe(99);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sets'),
      3,
      1,
      135,
      8,
      null,
      expect.any(Number)
    );
  });

  it('stores null for missing weight and reps', async () => {
    await addSet(mockDb, 3, { setNumber: 1, weightLbs: null, reps: null });
    const call = mockDb.runAsync.mock.calls[0];
    expect(call[3]).toBeNull();
    expect(call[4]).toBeNull();
  });
});

describe('updateSet', () => {
  it('updates weight and reps when both are provided', async () => {
    await updateSet(mockDb, 5, { weightLbs: 145, reps: 10 });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sets'),
      [145, 10, 5]
    );
  });

  it('updates only notes when only notes are provided', async () => {
    await updateSet(mockDb, 5, { notes: 'felt heavy' });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('notes = ?'),
      ['felt heavy', 5]
    );
  });

  it('does nothing when no fields are provided', async () => {
    await updateSet(mockDb, 5, {});
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });
});

describe('deleteSet', () => {
  it('deletes the set by id', async () => {
    await deleteSet(mockDb, 42);
    expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM sets WHERE id = ?', 42);
  });
});

describe('getSetsForWorkoutExercise', () => {
  it('returns empty array when no sets exist', async () => {
    const result = await getSetsForWorkoutExercise(mockDb, 1);
    expect(result).toEqual([]);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE workout_exercise_id = ?'),
      1
    );
  });

  it('returns sets in order', async () => {
    const sets = [
      { id: 1, set_number: 1, weight_lbs: 135, reps: 8, notes: null },
      { id: 2, set_number: 2, weight_lbs: 140, reps: 6, notes: null },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(sets);
    const result = await getSetsForWorkoutExercise(mockDb, 3);
    expect(result).toHaveLength(2);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY set_number ASC'),
      3
    );
  });
});
