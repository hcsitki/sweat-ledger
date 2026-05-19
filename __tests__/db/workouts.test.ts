import {
  createWorkoutSession,
  getActiveSession,
  finishWorkoutSession,
  cancelWorkoutSession,
} from '../../db/queries/workouts';

const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 42, changes: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('createWorkoutSession', () => {
  it('inserts an active session and returns id + startedAt', async () => {
    const result = await createWorkoutSession(mockDb, 'Monday Push');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_sessions'),
      'Monday Push',
      'active',
      expect.any(Number)
    );
    expect(result.id).toBe(42);
    expect(result.startedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('getActiveSession', () => {
  it('returns null when no active session exists', async () => {
    const result = await getActiveSession(mockDb);
    expect(result).toBeNull();
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'active'")
    );
  });

  it('returns the session when one is found', async () => {
    const session = { id: 1, name: 'Leg Day', status: 'active', started_at: 1000 };
    mockDb.getFirstAsync.mockResolvedValueOnce(session);
    const result = await getActiveSession(mockDb);
    expect(result).toEqual(session);
  });
});

describe('finishWorkoutSession', () => {
  it("sets status to 'completed' with duration and timestamp", async () => {
    await finishWorkoutSession(mockDb, 5, 3600, 1700000000000);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      expect.any(Number),
      3600,
      5
    );
  });
});

describe('cancelWorkoutSession', () => {
  it("sets status to 'cancelled'", async () => {
    await cancelWorkoutSession(mockDb, 3);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("status = 'cancelled'"),
      3
    );
  });
});
