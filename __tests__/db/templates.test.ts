import {
  getTemplates,
  getTemplateWithDetails,
  createTemplate,
  addExerciseToTemplate,
  addSetToTemplateExercise,
  updateTemplateSetReps,
  updateTemplateName,
  removeExerciseFromTemplate,
  deleteTemplate,
  deleteTemplateSet,
  getLastSessionRepsForExercise,
  saveWorkoutAsTemplate,
} from '../../db/queries/templates';

const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
} as any;

beforeEach(() => jest.clearAllMocks());

describe('getTemplates', () => {
  it('queries templates ordered by updated_at DESC with exercise_count', async () => {
    await getTemplates(mockDb);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringMatching(/ORDER BY wt\.updated_at DESC/)
    );
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('exercise_count')
    );
  });

  it('returns rows from the database', async () => {
    const rows = [
      { id: 1, name: 'Push Day', exercise_count: 3 },
      { id: 2, name: 'Pull Day', exercise_count: 4 },
    ];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);
    const result = await getTemplates(mockDb);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Push Day');
  });
});

describe('getTemplateWithDetails', () => {
  it('returns null when template does not exist', async () => {
    const result = await getTemplateWithDetails(mockDb, 99);
    expect(result).toBeNull();
  });

  it('assembles template with exercises and sets', async () => {
    const template = { id: 1, name: 'Push Day', created_at: 1000, updated_at: 1000 };
    const exercises = [
      { id: 10, template_id: 1, exercise_id: 5, order_index: 0, exercise_name: 'Bench Press', is_bodyweight: 0 },
    ];
    const sets = [
      { id: 100, template_exercise_id: 10, set_number: 1, target_reps: 8 },
      { id: 101, template_exercise_id: 10, set_number: 2, target_reps: 10 },
    ];

    mockDb.getFirstAsync.mockResolvedValueOnce(template);
    mockDb.getAllAsync
      .mockResolvedValueOnce(exercises) // exercises query
      .mockResolvedValueOnce(sets);     // sets for exercise 10

    const result = await getTemplateWithDetails(mockDb, 1);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Push Day');
    expect(result!.exercises).toHaveLength(1);
    expect(result!.exercises[0].exercise_name).toBe('Bench Press');
    expect(result!.exercises[0].sets).toHaveLength(2);
    expect(result!.exercise_count).toBe(1);
  });
});

describe('createTemplate', () => {
  it('inserts a template and returns its id', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 7, changes: 1 });
    const result = await createTemplate(mockDb, 'Push Day');
    expect(result.id).toBe(7);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_templates'),
      'Push Day'
    );
  });
});

describe('addExerciseToTemplate', () => {
  it('inserts and returns the new id, touches template', async () => {
    mockDb.runAsync
      .mockResolvedValueOnce({ lastInsertRowId: 20, changes: 1 }) // insert
      .mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 }); // touchTemplate
    const result = await addExerciseToTemplate(mockDb, 1, 5, 0);
    expect(result.id).toBe(20);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO template_exercises');
  });

  it('skips touchTemplate when skipTouch=true', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 21, changes: 1 });
    await addExerciseToTemplate(mockDb, 1, 5, 0, true);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });
});

describe('addSetToTemplateExercise', () => {
  it('inserts a template set and returns its id', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 50, changes: 1 });
    const result = await addSetToTemplateExercise(mockDb, 20, 1, 8);
    expect(result.id).toBe(50);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO template_sets'),
      20,
      1,
      8
    );
  });

  it('stores null target_reps', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 51, changes: 1 });
    await addSetToTemplateExercise(mockDb, 20, 1, null);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.any(String),
      20,
      1,
      null
    );
  });
});

describe('updateTemplateSetReps', () => {
  it('updates target_reps for the given set id', async () => {
    await updateTemplateSetReps(mockDb, 50, 12);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE template_sets SET target_reps = ? WHERE id = ?',
      12,
      50
    );
  });
});

describe('updateTemplateName', () => {
  it('updates name and updated_at', async () => {
    await updateTemplateName(mockDb, 1, 'New Name');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_templates'),
      'New Name',
      expect.any(Number),
      1
    );
  });
});

describe('removeExerciseFromTemplate', () => {
  it('deletes the template exercise and touches the template', async () => {
    await removeExerciseFromTemplate(mockDb, 20, 1);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('DELETE FROM template_exercises');
    expect(mockDb.runAsync.mock.calls[1][0]).toContain('UPDATE workout_templates');
  });
});

describe('deleteTemplate', () => {
  it('deletes the template by id', async () => {
    await deleteTemplate(mockDb, 1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM workout_templates WHERE id = ?',
      1
    );
  });
});

describe('deleteTemplateSet', () => {
  it('deletes the template set by id', async () => {
    await deleteTemplateSet(mockDb, 50);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM template_sets WHERE id = ?',
      50
    );
  });
});

describe('getLastSessionRepsForExercise', () => {
  it('returns empty array when no completed session exists', async () => {
    const result = await getLastSessionRepsForExercise(mockDb, 5);
    expect(result).toEqual([]);
  });

  it('returns reps array from last completed session', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ id: 10 }) // session
      .mockResolvedValueOnce({ id: 100 }); // workout_exercise
    mockDb.getAllAsync.mockResolvedValueOnce([
      { reps: 8 },
      { reps: 10 },
      { reps: 12 },
    ]);
    const result = await getLastSessionRepsForExercise(mockDb, 5);
    expect(result).toEqual([8, 10, 12]);
  });

  it('replaces null reps with 0', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce({ id: 100 });
    mockDb.getAllAsync.mockResolvedValueOnce([{ reps: null }, { reps: 5 }]);
    const result = await getLastSessionRepsForExercise(mockDb, 5);
    expect(result).toEqual([0, 5]);
  });

  it('returns empty array when session found but workout_exercise missing', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ id: 10 }) // session found
      .mockResolvedValueOnce(null);       // no workout_exercise
    const result = await getLastSessionRepsForExercise(mockDb, 5);
    expect(result).toEqual([]);
  });
});

describe('saveWorkoutAsTemplate', () => {
  it('creates a template from a completed session', async () => {
    // createTemplate insert
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 99, changes: 1 });

    const exercises = [
      { id: 200, exercise_id: 5, order_index: 0, exercise_name: 'Squat', is_bodyweight: 0 },
    ];
    const sets = [
      { id: 300, workout_exercise_id: 200, set_number: 1, weight_lbs: 135, reps: 5 },
      { id: 301, workout_exercise_id: 200, set_number: 2, weight_lbs: 135, reps: 5 },
    ];

    mockDb.getAllAsync
      .mockResolvedValueOnce(exercises) // getWorkoutExercisesForSession
      .mockResolvedValueOnce(sets);     // getSetsForWorkoutExercise

    // addExerciseToTemplate (skipTouch=true) + touchTemplate + 2x addSetToTemplateExercise
    mockDb.runAsync
      .mockResolvedValueOnce({ lastInsertRowId: 99, changes: 1 }) // createTemplate
      .mockResolvedValueOnce({ lastInsertRowId: 200, changes: 1 }) // addExerciseToTemplate
      .mockResolvedValueOnce({ lastInsertRowId: 300, changes: 1 }) // addSet 1
      .mockResolvedValueOnce({ lastInsertRowId: 301, changes: 1 }) // addSet 2
      .mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });  // touchTemplate

    const result = await saveWorkoutAsTemplate(mockDb, 42, 'My Template');
    expect(result.id).toBe(99);

    // createTemplate should have been called with the name
    expect(mockDb.runAsync.mock.calls[0]).toContain('My Template');
  });
});
