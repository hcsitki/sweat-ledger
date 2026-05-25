import type { Env } from './types';

export async function handlePull(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');
  const since = Number(url.searchParams.get('since') ?? '0');

  if (!deviceId) {
    return Response.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  // Pull templates updated after `since` from OTHER devices
  const [templates, templateExercises, templateSets, customExercises] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, created_at, updated_at FROM workout_templates
       WHERE device_id != ? AND updated_at > ?`
    ).bind(deviceId, since).all(),

    env.DB.prepare(
      `SELECT te.id, te.template_id, te.exercise_id, te.order_index
       FROM template_exercises te
       JOIN workout_templates t ON t.id = te.template_id
       WHERE t.device_id != ? AND t.updated_at > ?`
    ).bind(deviceId, since).all(),

    env.DB.prepare(
      `SELECT ts.id, ts.template_exercise_id, ts.set_number, ts.target_reps
       FROM template_sets ts
       JOIN template_exercises te ON te.id = ts.template_exercise_id
       JOIN workout_templates t ON t.id = te.template_id
       WHERE t.device_id != ? AND t.updated_at > ?`
    ).bind(deviceId, since).all(),

    // Custom exercises created after `since` (by any device)
    env.DB.prepare(
      `SELECT id, name, base_name, muscle_group, equipment_type, is_bodyweight, instructions, created_at
       FROM exercises WHERE is_custom = 1 AND created_at > ?`
    ).bind(since).all(),
  ]);

  return Response.json({
    templates: templates.results,
    template_exercises: templateExercises.results,
    template_sets: templateSets.results,
    custom_exercises: customExercises.results,
    pulledAt: Date.now(),
  });
}
