import { getExercises, createCustomExercise } from '../../db/queries/exercises';

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
