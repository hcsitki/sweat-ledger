import type { Env, PushPayload } from './types';

export async function handlePush(request: Request, env: Env): Promise<Response> {
  let payload: PushPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { deviceId, records } = payload;
  if (!deviceId || typeof deviceId !== 'string') {
    return Response.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  const now = Date.now();
  let totalCount = 0;

  const stmts: D1PreparedStatement[] = [];

  for (const s of records.sessions ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO workout_sessions
           (id, device_id, name, status, started_at, finished_at, duration_seconds, calories_burned, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s.id, deviceId, s.name, s.status, s.started_at, s.finished_at, s.duration_seconds, s.calories_burned, now)
    );
    totalCount++;
  }

  for (const we of records.workout_exercises ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO workout_exercises (id, session_id, exercise_id, order_index, notes)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(we.id, we.session_id, we.exercise_id, we.order_index, we.notes)
    );
    totalCount++;
  }

  for (const s of records.sets ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO sets (id, workout_exercise_id, set_number, weight_lbs, reps, notes, logged_at, is_done)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(s.id, s.workout_exercise_id, s.set_number, s.weight_lbs, s.reps, s.notes, s.logged_at, s.is_done)
    );
    totalCount++;
  }

  for (const t of records.templates ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO workout_templates (id, device_id, name, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(t.id, deviceId, t.name, t.created_at, t.updated_at, now)
    );
    totalCount++;
  }

  for (const te of records.template_exercises ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO template_exercises (id, template_id, exercise_id, order_index)
         VALUES (?, ?, ?, ?)`
      ).bind(te.id, te.template_id, te.exercise_id, te.order_index)
    );
    totalCount++;
  }

  for (const ts of records.template_sets ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO template_sets (id, template_exercise_id, set_number, target_reps)
         VALUES (?, ?, ?, ?)`
      ).bind(ts.id, ts.template_exercise_id, ts.set_number, ts.target_reps)
    );
    totalCount++;
  }

  for (const ex of records.custom_exercises ?? []) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO exercises
           (id, name, base_name, muscle_group, equipment_type, is_bodyweight, is_custom, instructions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).bind(ex.id, ex.name, ex.base_name, ex.muscle_group, ex.equipment_type, ex.is_bodyweight, ex.instructions, ex.created_at)
    );
    totalCount++;
  }

  // Update sync cursor
  stmts.push(
    env.DB.prepare(
      `INSERT OR REPLACE INTO sync_cursors (device_id, table_name, last_synced_at)
       VALUES (?, 'all', ?)`
    ).bind(deviceId, now)
  );

  // Write to sync log
  stmts.push(
    env.DB.prepare(
      `INSERT INTO sync_log (device_id, pushed_at, record_count) VALUES (?, ?, ?)`
    ).bind(deviceId, now, totalCount)
  );

  // D1 batch: all-or-nothing
  await env.DB.batch(stmts);

  return Response.json({ ok: true, synced: totalCount, syncedAt: now });
}
