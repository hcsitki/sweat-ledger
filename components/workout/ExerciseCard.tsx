import { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SetRow } from './SetRow';
import type { Set } from '@/db/types';
import type { WorkoutExerciseEntry } from '@/store/workout';
import { addSet, updateSet, deleteSet, getSetsForWorkoutExercise } from '@/db/queries/sets';
import { getPreviousPerformance } from '@/db/queries/previous-performance';
import { useWorkoutStore } from '@/store/workout';
import { scheduleRestTimerNotification, cancelNotification } from '@/utils/notifications';
import { formatDuration } from '@/utils/calculations';

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseEntry;
  onDeleteExercise: (workoutExerciseId: number) => void;
}

interface InlineTimer {
  endsAt: number;
  secondsLeft: number;
  isDone: boolean;
  notificationId: string | null;
}

export function ExerciseCard({ workoutExercise, onDeleteExercise }: ExerciseCardProps) {
  const db = useSQLiteContext();
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const extendRestTimer = useWorkoutStore((s) => s.extendRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const [sets, setSets] = useState<Set[]>([]);
  const [prevSets, setPrevSets] = useState<Set[]>([]);
  const [restDuration, setRestDuration] = useState(90);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [doneSetIds, setDoneSetIds] = useState<Set<number>>(new Set());
  const [inlineTimer, setInlineTimer] = useState<InlineTimer | null>(null);
  const firstInputs = useRef<Map<number, TextInput | null>>(new Map());
  const doneSetIdsRef = useRef<Set<number>>(new Set());
  const inlineTimerRef = useRef<InlineTimer | null>(null);

  useEffect(() => { doneSetIdsRef.current = doneSetIds; }, [doneSetIds]);
  useEffect(() => { inlineTimerRef.current = inlineTimer; }, [inlineTimer]);

  // Inline timer tick — restarts only when a new timer is started (endsAt changes)
  useEffect(() => {
    if (!inlineTimer?.endsAt || inlineTimer.isDone) return;
    const endsAt = inlineTimer.endsAt;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setInlineTimer((prev) => prev ? { ...prev, secondsLeft: remaining, isDone: remaining === 0 } : null);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [inlineTimer?.endsAt, inlineTimer?.isDone]);

  const loadSets = useCallback(async () => {
    const fetched = await getSetsForWorkoutExercise(db, workoutExercise.workoutExerciseId);
    setSets(fetched);
  }, [db, workoutExercise.workoutExerciseId]);

  useEffect(() => {
    loadSets();
    getPreviousPerformance(db, workoutExercise.exerciseId).then((perf) => {
      if (perf) setPrevSets(perf.sets);
    });
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'rest_timer_duration'"
    ).then((row) => {
      if (row) setRestDuration(Number(row.value));
    });
    db.getFirstAsync<{ notes: string | null }>(
      'SELECT notes FROM workout_exercises WHERE id = ?',
      workoutExercise.workoutExerciseId
    ).then((row) => {
      if (row?.notes) setExerciseNotes(row.notes);
    });
  }, [loadSets, workoutExercise.exerciseId, workoutExercise.workoutExerciseId, db]);

  const handleAddSet = async () => {
    const lastSet = sets[sets.length - 1];
    await addSet(db, workoutExercise.workoutExerciseId, {
      setNumber: sets.length + 1,
      weightLbs: lastSet?.weight_lbs ?? null,
      reps: lastSet?.reps ?? null,
    });
    await loadSets();
  };

  const handleUpdateSet = async (
    setId: number,
    updates: { weightLbs?: number | null; reps?: number | null }
  ) => {
    await updateSet(db, setId, updates);
    await loadSets();
  };

  const handleExerciseNotesChange = async (text: string) => {
    setExerciseNotes(text);
    await db.runAsync(
      'UPDATE workout_exercises SET notes = ? WHERE id = ?',
      text || null,
      workoutExercise.workoutExerciseId
    );
  };

  const handleDeleteSet = async (setId: number) => {
    await deleteSet(db, setId);
    await loadSets();
  };

  const handleDeleteExercise = () => {
    Alert.alert('Remove Exercise', `Remove ${workoutExercise.exerciseName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDeleteExercise(workoutExercise.workoutExerciseId),
      },
    ]);
  };

  const handleToggleDone = useCallback(async (setId: number) => {
    const currentlyDone = doneSetIdsRef.current.has(setId);
    setDoneSetIds((prev) => {
      const next = new Set(prev);
      if (currentlyDone) { next.delete(setId); } else { next.add(setId); }
      return next;
    });

    if (!currentlyDone) {
      // Cancel any previous inline timer notification
      const prevNotifId = inlineTimerRef.current?.notificationId;
      if (prevNotifId) cancelNotification(prevNotifId).catch(() => {});

      const endsAt = Date.now() + restDuration * 1000;
      const notifId = await scheduleRestTimerNotification(restDuration);
      setInlineTimer({ endsAt, secondsLeft: restDuration, isDone: false, notificationId: notifId });
      startRestTimer(restDuration, notifId);
    }
  }, [restDuration, startRestTimer]);

  const handleExtendTimer = useCallback(() => {
    setInlineTimer((prev) => {
      if (!prev) return null;
      const base = prev.isDone ? Date.now() : prev.endsAt;
      const newEndsAt = base + 30000;
      return { ...prev, endsAt: newEndsAt, secondsLeft: Math.ceil((newEndsAt - Date.now()) / 1000), isDone: false };
    });
    extendRestTimer(30);
  }, [extendRestTimer]);

  const handleSkipTimer = useCallback(() => {
    const notifId = inlineTimerRef.current?.notificationId;
    if (notifId) cancelNotification(notifId).catch(() => {});
    setInlineTimer(null);
    stopRestTimer();
  }, [stopRestTimer]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/exercise/${workoutExercise.exerciseId}`)}>
          <Text style={styles.name}>{workoutExercise.exerciseName}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteExercise}>
          <Text style={styles.remove}>Remove</Text>
        </TouchableOpacity>
      </View>
      {sets.length > 0 && (
        <View style={styles.columnHeaders}>
          <Text style={[styles.colLabel, { width: 32 }]}>Set</Text>
          <Text style={[styles.colLabel, { flex: 1 }]}>Previous</Text>
          {!workoutExercise.isBodyweight && <Text style={styles.colLabel}>lbs</Text>}
          <Text style={styles.colLabel}>Reps</Text>
          <Text style={[styles.colLabel, { width: 36 }]}>✓</Text>
        </View>
      )}
      {sets.map((s, idx) => (
        <SetRow
          key={s.id}
          set={s}
          previousSet={prevSets[idx]}
          isBodyweight={workoutExercise.isBodyweight}
          onUpdate={handleUpdateSet}
          onDelete={handleDeleteSet}
          onRegisterFirstInput={(node) => { firstInputs.current.set(s.id, node); }}
          onNext={idx < sets.length - 1
            ? () => { firstInputs.current.get(sets[idx + 1].id)?.focus(); }
            : undefined}
          done={doneSetIds.has(s.id)}
          onToggleDone={handleToggleDone}
        />
      ))}
      {inlineTimer != null && (
        <View style={[styles.inlineTimer, inlineTimer.isDone && styles.inlineTimerDone]}>
          {inlineTimer.isDone ? (
            <Text style={styles.inlineTimerText}>✓  Rest complete</Text>
          ) : (
            <>
              <Text style={[styles.inlineTimerText, styles.inlineTimerCountdown]}>
                {formatDuration(inlineTimer.secondsLeft)}
              </Text>
              <TouchableOpacity style={styles.timerBtn} onPress={handleExtendTimer}>
                <Text style={styles.timerBtnText}>+30s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerBtn} onPress={handleSkipTimer}>
                <Text style={styles.timerBtnText}>Skip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      <TextInput
        style={styles.notesInput}
        placeholder="Exercise note…"
        placeholderTextColor="#636366"
        value={exerciseNotes}
        onChangeText={handleExerciseNotesChange}
        multiline
      />
      <TouchableOpacity style={styles.addSetBtn} onPress={handleAddSet}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
    backgroundColor: '#2C2C2E',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  remove: { color: '#FF3B30', fontSize: 14 },
  columnHeaders: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  colLabel: { width: 64, textAlign: 'center', fontSize: 11, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
  inlineTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3A3A3C',
  },
  inlineTimerDone: {
    backgroundColor: '#34C759',
  },
  inlineTimerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  inlineTimerCountdown: {
    fontSize: 18,
  },
  timerBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  notesInput: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 8,
    backgroundColor: '#3A3A3C',
    minHeight: 32,
  },
  addSetBtn: { padding: 12, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#38383A' },
  addSetText: { color: '#007AFF', fontWeight: '600' },
});
