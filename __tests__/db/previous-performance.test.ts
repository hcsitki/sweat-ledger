import { getPreviousPerformance } from '../../db/queries/previous-performance';

const mockDb = {
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('getPreviousPerformance', () => {
  it('returns null when no completed session is found', async () => {
    const result = await getPreviousPerformance(mockDb, 1);
    expect(result).toBeNull();
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      1
    );
  });

  it('returns sets from the most recent completed session', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ id: 5 })
      .mockResolvedValueOnce({ id: 3 });
    const sets = [{ id: 1, set_number: 1, weight_lbs: 100, reps: 5, notes: null, logged_at: 1000 }];
    mockDb.getAllAsync.mockResolvedValueOnce(sets);

    const result = await getPreviousPerformance(mockDb, 1);
    expect(result).toEqual({ sets });
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE workout_exercise_id = ?'),
      3
    );
  });

  it('returns null when workout_exercise is not found', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ id: 5 })
      .mockResolvedValueOnce(null);

    const result = await getPreviousPerformance(mockDb, 1);
    expect(result).toBeNull();
  });
});
