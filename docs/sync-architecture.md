# Cloudflare Sync Architecture

Sweat Ledger uses a **local-first** model. Local SQLite is always the source of truth on-device. Cloudflare D1 is the cloud mirror. The app works fully offline; sync is additive.

## Stack

- **Cloudflare Workers** — API layer (edge functions on your own domain)
- **Cloudflare D1** — serverless SQLite database (same dialect as Expo SQLite)
- **Auth** — static bearer token hardcoded in app, validated on every Worker request

## Data Flow

```
Device                          Cloudflare Edge
──────────────────────          ──────────────────────────
Local SQLite                    Workers API
  └─ all tables          ←──►   ├─ POST /sync/push
                                ├─ GET  /sync/pull?since=
                                └─ DELETE /sync/session/:id

                                D1 Database
                                  └─ mirror of all tables
                                     + sync_cursors table
                                     + sync_log table
```

## What Gets Synced

| Table | Direction | Notes |
|---|---|---|
| `workout_sessions` | push only | completed sessions only |
| `workout_exercises` | push only | child of sessions |
| `sets` | push only | child of workout_exercises |
| `workout_templates` | bidirectional | last-write-wins on `updated_at` |
| `template_exercises` | bidirectional | child of templates |
| `template_sets` | bidirectional | child of template_exercises |
| `exercises` (custom only) | bidirectional | `is_custom = 1` rows only |
| `settings` | skip | device-local preferences |

Seed exercises (`is_custom = 0`) never sync — they're baked into both the app and Worker.

## Conflict Resolution

- **Workout history**: Append-only push. Sessions are immutable once `status = completed`, so no conflict is possible.
- **Templates**: Last-write-wins using `updated_at`. Worker keeps the newer record.
- **Custom exercises**: Last-write-wins using `created_at` (they aren't edited after creation).

## D1 Schema Additions

These two tables live only in D1, not on device:

```sql
-- tracks which records each device has already pushed
CREATE TABLE sync_cursors (
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  last_synced_at INTEGER NOT NULL,  -- epoch ms
  PRIMARY KEY (device_id, table_name)
);

-- append-only push log for debugging
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  pushed_at INTEGER NOT NULL,
  record_count INTEGER NOT NULL
);
```

## Worker Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sync/push` | App pushes new/changed records to D1 |
| `GET` | `/sync/pull?deviceId=&since=` | App pulls changes newer than cursor |
| `DELETE` | `/sync/session/:id` | Propagate history deletion to D1 |

### POST /sync/push
```json
{
  "deviceId": "uuid",
  "records": {
    "sessions": [],
    "workout_exercises": [],
    "sets": [],
    "templates": [],
    "template_exercises": [],
    "template_sets": [],
    "custom_exercises": []
  }
}
```
Worker does `INSERT OR REPLACE` on all records. Fully idempotent — safe to retry.

### GET /sync/pull
Returns only rows newer than the `since` timestamp. App merges these into local SQLite.

## App-Side Changes Required

1. **`device_id`** — UUID generated once at install, stored in the `settings` table
2. **`synced_at` column** — added to `workout_sessions`, `workout_templates`, `exercises`; `NULL` = not yet pushed
3. **Sync trigger points**:
   - After finishing a workout
   - After saving or editing a template
   - On app foreground if last sync > 24h ago
4. **Pull on first launch** — restores history when reinstalling on a new device

---

## Implementation Checklist

Work through these phases in order. Mark each item `[x]` when done.

### Phase 1 — Cloudflare Setup
- [ ] Create D1 database via Cloudflare dashboard
- [x] Scaffold Worker project (`npm create cloudflare@latest sync-worker`)
- [x] Write D1 schema (mirror of app tables + `sync_cursors` + `sync_log`)
- [x] Apply schema to D1
- [x] Generate and store bearer token secret in Worker environment variables
- [x] Deploy Worker to your domain (e.g., `sync.yourdomain.com`)
- [x] Smoke test: `curl -X POST /sync/push` returns 200

### Phase 2 — App-Side Migration
- [x] Add v8 migration: `synced_at INTEGER` column on `workout_sessions`, `workout_templates`, `exercises`
- [x] Add v8 migration: insert `device_id` row into `settings` (generate UUID on first run)
- [x] Update `db/schema.ts` types to include new columns
- [ ] Verify migration runs cleanly on existing local DB

### Phase 3 — Push Logic (App → D1)
- [x] Create `lib/sync.ts` — core sync module
- [x] Implement `getUnsynced()` — queries all rows where `synced_at IS NULL` across relevant tables
- [x] Implement `pushToCloud(records)` — POST to Worker, handle errors/retries
- [x] Implement `markAsSynced(ids)` — sets `synced_at = Date.now()` after confirmed push
- [x] Wire push trigger into `finishWorkoutSession()` in `db/queries/workouts.ts`
- [x] Wire push trigger into template save/update flows in `db/queries/templates.ts`
- [x] Add background sync on app foreground (use `AppState` listener)
- [x] Test: finish a workout, confirm record appears in D1

### Phase 4 — Pull Logic (D1 → App)
- [x] Implement `pullFromCloud(since)` — GET from Worker, returns new templates and custom exercises
- [x] Implement `mergeIntoLocal(records)` — upserts pulled records into local SQLite
- [x] Call pull on app first launch (check if `synced_at` cursor exists in settings)
- [x] Test: wipe local DB (reinstall sim), confirm history restores from D1

### Phase 5 — Delete Propagation
- [x] Update `deleteWorkout()` in `db/queries/history.ts` to also call `DELETE /sync/session/:id`
- [x] Decide: hard delete or soft delete with `deleted_at` flag (soft delete is safer for sync)
- [x] Test: delete a workout on device, confirm it's removed from D1

### Phase 6 — Hardening
- [x] Add network availability check before all sync attempts (use `@react-native-community/netinfo`)
- [x] Add retry with exponential backoff on push failure
- [x] Expose sync status in UI (small indicator — last synced timestamp or error state)
- [ ] Test offline → online transition (queue push, fire when reconnected)
- [ ] Test reinstall scenario end-to-end

---

## Current Status

**Phase**: Phase 6 in progress — netinfo, retry backoff, and sync status UI complete  
**Last updated**: 2026-05-24  
**Next action**: Phase 6 — test offline→online transition and reinstall scenario end-to-end
