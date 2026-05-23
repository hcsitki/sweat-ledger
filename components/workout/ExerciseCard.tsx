import { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SetRow } from './SetRow';
import type { Set as DbSet } from '@/db/types';
import type { WorkoutExerciseEntry } from '@/store/workout';
import { addSet, updateSet, deleteSet, getSetsForWorkoutExercise } from '@/db/queries/sets';
import { getPreviousPerformance } from '@/db/queries/previous-performance';
import { useWorkoutStore } from '@/store/workout';
import { scheduleRestTimerNotification, cancelNotification } from '@/utils/notifications';
import { formatDuration } from '@/utils/calculations';
import { useWorkoutKeyboard } from '@/context/WorkoutKeyboardContext';
import type { TimerHandler } from '@/context/WorkoutKeyboardContext';

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseEntry;
  onDeleteExercise: (workoutExerciseId: number) => void;
  onRegisterFocusFirst?: (fn: (() => void) | null) => void;
  onNextExercise?: () => void;
}

interface InlineTimer {
  endsAt: number;
  secondsLeft: number;
  isDone: boolean;
  isPaused: boolean;
  notificationId: string | null;
}

function parseMSS(str: string): number {
  if (str.includes(':')) {
    const [m, s] = str.split(':');
    return (Number(m) || 0) * 60 + (Number(s) || 0);
  }
  return Number(str) || 0;
}

function formatTimerSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function ExerciseCard({ workoutExercise, onDeleteExercise, onRegisterFocusFirst, onNextExercise }: ExerciseCardProps) {
  const db = useSQLiteContext();
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const extendRestTimer = useWorkoutStore((s) => s.extendRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const { showNumber, showTimer, setTimerPaused, activeNodeRef } = useWorkoutKeyboard();

  const [sets, setSets] = useState<DbSet[]>([]);
  const [prevSets, setPrevSets] = useState<DbSet[]>([]);
  const [restDuration, setRestDuration] = useState(90);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [doneSetIds, setDoneSetIds] = useState<Set<number>>(new Set());
  const [inlineTimer, setInlineTimer] = useState<InlineTimer | null>(null);
  const [timerResetMode, setTimerResetMode] = useState(false);
  const [timerEditValue, setTimerEditValue] = useState('');

  const firstInputs = useRef<Map<number, TextInput | null>>(new Map());
  const doneSetIdsRef = useRef<Set<number>>(new Set());
  const inlineTimerRef = useRef<InlineTimer | null>(null);
  const afterTimerFocusRef = useRef<(() => void) | null>(null);
  const timerEditValueRef = useRef('');
  const timerEditRef = useRef<TextInput>(null);
  const onRegisterFocusFirstRef = useRef(onRegisterFocusFirst);
  onRegisterFocusFirstRef.current = onRegisterFocusFirst;
  const onNextExerciseRef = useRef(onNextExercise);
  onNextExerciseRef.current = onNextExercise;

  useEffect(() => { doneSetIdsRef.current = doneSetIds; }, [doneSetIds]);
  useEffect(() => { inlineTimerRef.current = inlineTimer; }, [inlineTimer]);

  // Inline timer tick — restarts when endsAt changes or pause state changes
  useEffect(() => {
    if (!inlineTimer?.endsAt || inlineTimer.isDone || inlineTimer.isPaused) return;
    const endsAt = inlineTimer.endsAt;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setInlineTimer((prev) => prev ? { ...prev, secondsLeft: remaining, isDone: remaining === 0 } : null);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [inlineTimer?.endsAt, inlineTimer?.isDone, inlineTimer?.isPaused]);

  // Auto-focus next input when timer completes
  useEffect(() => {
    if (!inlineTimer?.isDone) return;
    const fn = afterTimerFocusRef.current;
    afterTimerFocusRef.current = null;
    fn?.();
  }, [inlineTimer?.isDone]);

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
    ).then((row) => { if (row) setRestDuration(Number(row.value)); });
    db.getFirstAsync<{ notes: string | null }>(
      'SELECT notes FROM workout_exercises WHERE id = ?',
      workoutExercise.workoutExerciseId
    ).then((row) => { if (row?.notes) setExerciseNotes(row.notes); });
  }, [loadSets, workoutExercise.exerciseId, workoutExercise.workoutExerciseId, db]);

  // Register a focuser fn so active.tsx can focus our first input from outside
  useEffect(() => {
    if (sets.length > 0) {
      onRegisterFocusFirstRef.current?.(() => {
        firstInputs.current.get(sets[0].id)?.focus();
      });
    }
    return () => { onRegisterFocusFirstRef.current?.(null); };
  }, [sets]);

  // ── Timer handlers (stable object via refs) ──────────────────────────────────

  const handlePauseTimerRef = useRef<() => void>(noop);
  const handleSkipTimerRef = useRef<() => void>(noop);
  const handleAdjustTimerRef = useRef<(d: number) => void>(noop);
  const handleResetTimerRef = useRef<() => void>(noop);

  const timerHandler = useRef<TimerHandler>({
    onPause: () => handlePauseTimerRef.current(),
    onSkip: () => handleSkipTimerRef.current(),
    onAdjust: (d) => handleAdjustTimerRef.current(d),
    onReset: () => handleResetTimerRef.current(),
  }).current;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const startTimerAt = useCallback(async (secs: number) => {
    const prevNotifId = inlineTimerRef.current?.notificationId;
    if (prevNotifId) cancelNotification(prevNotifId).catch(() => {});
    const endsAt = Date.now() + secs * 1000;
    const notifId = await scheduleRestTimerNotification(secs);
    setInlineTimer((prev) => ({
      endsAt,
      secondsLeft: secs,
      isDone: false,
      isPaused: false,
      notificationId: notifId,
      // carry over notification from previous if async races
      ...(prev ? {} : {}),
    }));
    startRestTimer(secs, notifId);
  }, [startRestTimer]);

  // ── Timer control callbacks ───────────────────────────────────────────────────

  const handlePauseTimer = useCallback(() => {
    setInlineTimer((prev) => {
      if (!prev || prev.isDone) return prev;
      if (prev.isPaused) {
        // Resume
        return { ...prev, isPaused: false, endsAt: Date.now() + prev.secondsLeft * 1000 };
      }
      return { ...prev, isPaused: true };
    });
  }, []);
  handlePauseTimerRef.current = handlePauseTimer;

  const handleSkipTimer = useCallback(() => {
    const notifId = inlineTimerRef.current?.notificationId;
    if (notifId) cancelNotification(notifId).catch(() => {});
    setInlineTimer(null);
    setTimerResetMode(false);
    stopRestTimer();
    const fn = afterTimerFocusRef.current;
    afterTimerFocusRef.current = null;
    fn?.();
  }, [stopRestTimer]);
  handleSkipTimerRef.current = handleSkipTimer;

  const handleAdjustTimer = useCallback((delta: number) => {
    setInlineTimer((prev) => {
      if (!prev || prev.isDone) return prev;
      const newSecs = Math.max(1, prev.secondsLeft + delta);
      if (prev.isPaused) {
        return { ...prev, secondsLeft: newSecs };
      }
      return { ...prev, endsAt: prev.endsAt + delta * 1000, secondsLeft: newSecs };
    });
  }, []);
  handleAdjustTimerRef.current = handleAdjustTimer;

  const handleResetTimer = useCallback(() => {
    const currentSecs = inlineTimerRef.current?.secondsLeft ?? restDuration;
    const initVal = formatTimerSecs(currentSecs);
    setInlineTimer((prev) => prev ? { ...prev, isPaused: true } : null);
    setTimerResetMode(true);
    setTimerEditValue(initVal);
    timerEditValueRef.current = initVal;

    showNumber({
      onKey: (k) => {
        // k can be ':' (from dot key when isTimerInput) or a digit
        setTimerEditValue((prev) => {
          let next: string;
          if (k === ':') {
            if (prev.includes(':')) return prev;
            next = prev + ':';
          } else {
            if (prev.length >= 5) return prev; // max "59:59"
            next = prev + k;
          }
          timerEditValueRef.current = next;
          return next;
        });
      },
      onBackspace: () => {
        setTimerEditValue((prev) => {
          const next = prev.slice(0, -1);
          timerEditValueRef.current = next;
          return next;
        });
      },
      onIncrement: (delta) => {
        setTimerEditValue((prev) => {
          const secs = Math.max(5, parseMSS(prev) + delta * 10);
          const formatted = formatTimerSecs(secs);
          timerEditValueRef.current = formatted;
          return formatted;
        });
      },
      onNext: () => {
        const secs = parseMSS(timerEditValueRef.current);
        setTimerResetMode(false);
        if (secs > 0) {
          startTimerAt(secs);
        }
        showTimer(timerHandler, false);
        setTimerPaused(false);
      },
    }, { isTimerInput: true });

    // Focus the edit input after the keyboard switches
    setTimeout(() => {
      timerEditRef.current?.focus();
      activeNodeRef.current = timerEditRef.current;
    }, 50);
  }, [restDuration, showNumber, showTimer, startTimerAt, timerHandler, setTimerPaused, activeNodeRef]);
  handleResetTimerRef.current = handleResetTimer;

  // Cancel reset mode if user navigates away without pressing Next
  const handleTimerEditBlur = useCallback(() => {
    if (timerResetMode) {
      setTimerResetMode(false);
      // Resume the timer with remaining time
      setInlineTimer((prev) => {
        if (!prev || !prev.isPaused) return prev;
        return { ...prev, isPaused: false, endsAt: Date.now() + prev.secondsLeft * 1000 };
      });
    }
  }, [timerResetMode]);

  // Tap the inline timer to (re-)show the timer keyboard
  const handleTapTimer = useCallback(() => {
    if (timerResetMode) {
      setTimerResetMode(false);
      setInlineTimer((prev) => {
        if (!prev || !prev.isPaused) return prev;
        return { ...prev, isPaused: false, endsAt: Date.now() + prev.secondsLeft * 1000 };
      });
    }
    const paused = inlineTimerRef.current?.isPaused ?? false;
    showTimer(timerHandler, paused);
    setTimerPaused(paused);
  }, [timerResetMode, showTimer, timerHandler, setTimerPaused]);

  // ── Set operations ────────────────────────────────────────────────────────────

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
      { text: 'Remove', style: 'destructive', onPress: () => onDeleteExercise(workoutExercise.workoutExerciseId) },
    ]);
  };

  // Checkmark button toggles done state; does NOT force timer keyboard
  const handleToggleDone = useCallback(async (setId: number) => {
    const currentlyDone = doneSetIdsRef.current.has(setId);
    setDoneSetIds((prev) => {
      const next = new Set(prev);
      if (currentlyDone) { next.delete(setId); } else { next.add(setId); }
      return next;
    });
    if (!currentlyDone) {
      await startTimerAt(restDuration);
    }
  }, [restDuration, startTimerAt]);

  const handleExtendTimer = useCallback(() => {
    handleAdjustTimer(30);
    extendRestTimer(30);
  }, [handleAdjustTimer, extendRestTimer]);

  // Called when keyboard Next is pressed on the reps field
  const makeDoneFromNext = useCallback((setId: number, afterTimerFn: () => void) => () => {
    afterTimerFocusRef.current = afterTimerFn;

    if (!doneSetIdsRef.current.has(setId)) {
      setDoneSetIds((prev) => { const n = new Set(prev); n.add(setId); return n; });
      startTimerAt(restDuration);
    }

    showTimer(timerHandler, false);
    setTimerPaused(false);
  }, [restDuration, startTimerAt, showTimer, timerHandler, setTimerPaused]);

  // ── Render ────────────────────────────────────────────────────────────────────

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
      {sets.map((s, idx) => {
        const afterTimerFn = idx < sets.length - 1
          ? () => firstInputs.current.get(sets[idx + 1].id)?.focus()
          : () => onNextExerciseRef.current?.();

        return (
          <SetRow
            key={s.id}
            set={s}
            previousSet={prevSets[idx]}
            isBodyweight={workoutExercise.isBodyweight}
            onUpdate={handleUpdateSet}
            onDelete={handleDeleteSet}
            onRegisterFirstInput={(node) => { firstInputs.current.set(s.id, node); }}
            onDoneFromNext={makeDoneFromNext(s.id, afterTimerFn)}
            done={doneSetIds.has(s.id)}
            onToggleDone={handleToggleDone}
          />
        );
      })}
      {inlineTimer != null && (
        <View style={[styles.inlineTimer, inlineTimer.isDone && styles.inlineTimerDone]}>
          {inlineTimer.isDone ? (
            <Text style={styles.inlineTimerText}>✓  Rest complete</Text>
          ) : timerResetMode ? (
            <>
              <TextInput
                ref={timerEditRef}
                style={[styles.inlineTimerText, styles.inlineTimerCountdown, styles.timerEditInput]}
                value={timerEditValue}
                showSoftInputOnFocus={false}
                onFocus={() => { activeNodeRef.current = timerEditRef.current; }}
                onBlur={handleTimerEditBlur}
                caretHidden={false}
              />
              <Text style={styles.timerBtnText}>M:SS</Text>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleTapTimer} style={{ flex: 1 }} activeOpacity={0.7}>
                <Text style={[styles.inlineTimerText, styles.inlineTimerCountdown, inlineTimer.isPaused && styles.timerPaused]}>
                  {formatDuration(inlineTimer.secondsLeft)}{inlineTimer.isPaused ? '  ⏸' : ''}
                </Text>
              </TouchableOpacity>
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

const noop = () => {};

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
  timerPaused: {
    opacity: 0.65,
  },
  timerEditInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 0,
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
