import { type SQLiteDatabase } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

const SYNC_URL = process.env.EXPO_PUBLIC_SYNC_URL;
const SYNC_TOKEN = process.env.EXPO_PUBLIC_SYNC_TOKEN;
const LAST_SYNC_KEY = 'last_synced_at';

export type SyncResult =
  | { ok: true; synced: boolean }
  | { ok: false; error: 'offline' | 'failed'; message?: string };

// ─── Network helpers ─────────────────────────────────────────────────────────

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseMs = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isHttpError = err instanceof Error && /^(Push|Pull) failed \d{3}/.test(err.message);
      if (isHttpError || attempt === maxAttempts - 1) throw err;
      await new Promise<void>((r) => setTimeout(r, baseMs * 2 ** attempt));
    }
  }
  throw new Error('unreachable');
}

type PullResponse = {
  templates: Array<{ id: number; name: string; created_at: number; updated_at: number }>;
  template_exercises: Array<{ id: number; template_id: number; exercise_id: number; order_index: number }>;
  template_sets: Array<{ id: number; template_exercise_id: number; set_number: number; target_reps: number | null }>;
  custom_exercises: Array<{
    id: number; name: string; base_name: string; muscle_group: string;
    equipment_type: string; is_bodyweight: number; instructions: string | null; created_at: number;
  }>;
  pulledAt: number;
};

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getDeviceId(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'device_id'"
  );
  return row?.value ?? null;
}

async function getLastSyncedAt(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    LAST_SYNC_KEY
  );
  return row ? Number(row.value) : 0;
}

async function setLastSyncedAt(db: SQLiteDatabase, ts: number): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    LAST_SYNC_KEY,
    String(ts)
  );
}

// ─── Query unsynced records ──────────────────────────────────────────────────

async function getUnsyncedRecords(db: SQLiteDatabase) {
  const [sessions, workoutExercises, sets, templates, templateExercises, templateSets, customExercises] =
    await Promise.all([
      // Completed sessions not yet pushed
      db.getAllAsync<{
        id: number; name: string; status: string; started_at: number;
        finished_at: number | null; duration_seconds: number | null; calories_burned: number | null;
      }>(
        `SELECT id, name, status, started_at, finished_at, duration_seconds, calories_burned
         FROM workout_sessions WHERE status = 'completed' AND synced_at IS NULL`
      ),

      // workout_exercises whose session hasn't been synced yet
      db.getAllAsync<{ id: number; session_id: number; exercise_id: number; order_index: number; notes: string | null }>(
        `SELECT we.id, we.session_id, we.exercise_id, we.order_index, we.notes
         FROM workout_exercises we
         JOIN workout_sessions ws ON ws.id = we.session_id
         WHERE ws.status = 'completed' AND ws.synced_at IS NULL`
      ),

      // sets whose session hasn't been synced yet
      db.getAllAsync<{
        id: number; workout_exercise_id: number; set_number: number;
        weight_lbs: number | null; reps: number | null; notes: string | null;
        logged_at: number; is_done: number;
      }>(
        `SELECT s.id, s.workout_exercise_id, s.set_number, s.weight_lbs, s.reps, s.notes, s.logged_at, s.is_done
         FROM sets s
         JOIN workout_exercises we ON we.id = s.workout_exercise_id
         JOIN workout_sessions ws ON ws.id = we.session_id
         WHERE ws.status = 'completed' AND ws.synced_at IS NULL`
      ),

      // templates not yet pushed
      db.getAllAsync<{ id: number; name: string; created_at: number; updated_at: number }>(
        `SELECT id, name, created_at, updated_at FROM workout_templates WHERE synced_at IS NULL`
      ),

      // template_exercises whose template hasn't been synced
      db.getAllAsync<{ id: number; template_id: number; exercise_id: number; order_index: number }>(
        `SELECT te.id, te.template_id, te.exercise_id, te.order_index
         FROM template_exercises te
         JOIN workout_templates wt ON wt.id = te.template_id
         WHERE wt.synced_at IS NULL`
      ),

      // template_sets whose template hasn't been synced
      db.getAllAsync<{ id: number; template_exercise_id: number; set_number: number; target_reps: number | null }>(
        `SELECT ts.id, ts.template_exercise_id, ts.set_number, ts.target_reps
         FROM template_sets ts
         JOIN template_exercises te ON te.id = ts.template_exercise_id
         JOIN workout_templates wt ON wt.id = te.template_id
         WHERE wt.synced_at IS NULL`
      ),

      // custom exercises not yet pushed
      db.getAllAsync<{
        id: number; name: string; base_name: string; muscle_group: string;
        equipment_type: string; is_bodyweight: number; instructions: string | null; created_at: number;
      }>(
        `SELECT id, name, base_name, muscle_group, equipment_type, is_bodyweight, instructions, created_at
         FROM exercises WHERE is_custom = 1 AND synced_at IS NULL`
      ),
    ]);

  return { sessions, workout_exercises: workoutExercises, sets, templates, template_exercises: templateExercises, template_sets: templateSets, custom_exercises: customExercises };
}

function totalCount(records: ReturnType<typeof getUnsyncedRecords> extends Promise<infer T> ? T : never): number {
  return (
    records.sessions.length +
    records.workout_exercises.length +
    records.sets.length +
    records.templates.length +
    records.template_exercises.length +
    records.template_sets.length +
    records.custom_exercises.length
  );
}

// ─── Push to Worker ──────────────────────────────────────────────────────────

async function pushToCloud(
  deviceId: string,
  records: Awaited<ReturnType<typeof getUnsyncedRecords>>
): Promise<{ syncedAt: number }> {
  if (!SYNC_URL || !SYNC_TOKEN) throw new Error('Sync not configured');

  const res = await fetch(`${SYNC_URL}/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SYNC_TOKEN}`,
    },
    body: JSON.stringify({ deviceId, records }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Push failed ${res.status}: ${text}`);
  }

  const json = await res.json() as { syncedAt: number };
  return json;
}

// ─── Mark as synced locally ──────────────────────────────────────────────────

async function markAsSynced(
  db: SQLiteDatabase,
  sessionIds: number[],
  templateIds: number[],
  exerciseIds: number[],
  now: number
): Promise<void> {
  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE workout_sessions SET synced_at = ? WHERE id IN (${placeholders})`,
      now,
      ...sessionIds
    );
  }
  if (templateIds.length > 0) {
    const placeholders = templateIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE workout_templates SET synced_at = ? WHERE id IN (${placeholders})`,
      now,
      ...templateIds
    );
  }
  if (exerciseIds.length > 0) {
    const placeholders = exerciseIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE exercises SET synced_at = ? WHERE id IN (${placeholders})`,
      now,
      ...exerciseIds
    );
  }
}

// ─── Pull from Worker ────────────────────────────────────────────────────────

async function pullFromCloud(deviceId: string, since: number): Promise<PullResponse> {
  if (!SYNC_URL || !SYNC_TOKEN) throw new Error('Sync not configured');
  const params = new URLSearchParams({ deviceId, since: String(since) });
  const res = await fetch(`${SYNC_URL}/sync/pull?${params}`, {
    headers: { Authorization: `Bearer ${SYNC_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pull failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<PullResponse>;
}

function pulledCount(pulled: PullResponse): number {
  return (
    pulled.templates.length +
    pulled.template_exercises.length +
    pulled.template_sets.length +
    pulled.custom_exercises.length
  );
}

async function mergeIntoLocal(db: SQLiteDatabase, pulled: PullResponse): Promise<void> {
  const now = pulled.pulledAt;

  for (const t of pulled.templates) {
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_templates (id, name, created_at, updated_at, synced_at) VALUES (?, ?, ?, ?, ?)`,
      t.id, t.name, t.created_at, t.updated_at, now
    );
  }

  for (const te of pulled.template_exercises) {
    await db.runAsync(
      `INSERT OR REPLACE INTO template_exercises (id, template_id, exercise_id, order_index) VALUES (?, ?, ?, ?)`,
      te.id, te.template_id, te.exercise_id, te.order_index
    );
  }

  for (const ts of pulled.template_sets) {
    await db.runAsync(
      `INSERT OR REPLACE INTO template_sets (id, template_exercise_id, set_number, target_reps) VALUES (?, ?, ?, ?)`,
      ts.id, ts.template_exercise_id, ts.set_number, ts.target_reps
    );
  }

  for (const ex of pulled.custom_exercises) {
    await db.runAsync(
      `INSERT OR REPLACE INTO exercises
         (id, name, base_name, muscle_group, equipment_type, is_bodyweight, is_custom, instructions, created_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      ex.id, ex.name, ex.base_name, ex.muscle_group, ex.equipment_type,
      ex.is_bodyweight, ex.instructions, ex.created_at, now
    );
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fire-and-forget push. Safe to call without await from UI code.
 */
export async function syncNow(db: SQLiteDatabase): Promise<SyncResult> {
  try {
    const online = await isOnline();
    if (!online) return { ok: false, error: 'offline' };

    const deviceId = await getDeviceId(db);
    if (!deviceId) return { ok: false, error: 'failed', message: 'no device_id' };

    let pushed = false;

    // Push phase — wrapped in retry for transient network failures
    const records = await getUnsyncedRecords(db);
    if (totalCount(records) > 0) {
      const { syncedAt } = await withRetry(() => pushToCloud(deviceId, records));
      await markAsSynced(
        db,
        records.sessions.map((s) => s.id),
        records.templates.map((t) => t.id),
        records.custom_exercises.map((e) => e.id),
        syncedAt
      );
      pushed = true;
    }

    // Pull phase — since=0 on first launch fetches everything from D1
    const since = await getLastSyncedAt(db);
    const pulled = await withRetry(() => pullFromCloud(deviceId, since));
    if (pulledCount(pulled) > 0) {
      await mergeIntoLocal(db, pulled);
    }
    await setLastSyncedAt(db, pulled.pulledAt);

    return { ok: true, synced: pushed || pulledCount(pulled) > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[sync] sync failed:', message);
    return { ok: false, error: 'failed', message };
  }
}

/**
 * Propagates a local workout deletion to D1. Fire-and-forget — call without
 * await so the local delete can proceed regardless of network state.
 */
export async function deleteSessionFromCloud(db: SQLiteDatabase, sessionId: number): Promise<void> {
  try {
    if (!SYNC_URL || !SYNC_TOKEN) return;
    const deviceId = await getDeviceId(db);
    if (!deviceId) return;
    await fetch(
      `${SYNC_URL}/sync/session/${sessionId}?deviceId=${encodeURIComponent(deviceId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${SYNC_TOKEN}` } }
    );
  } catch {
    // best-effort — local delete is the source of truth
  }
}

/**
 * Only syncs if last sync was more than 24 hours ago.
 */
export async function syncIfStale(db: SQLiteDatabase): Promise<SyncResult | null> {
  const last = await getLastSyncedAt(db);
  const stale = Date.now() - last > 24 * 60 * 60 * 1000;
  if (stale) return syncNow(db);
  return null;
}
