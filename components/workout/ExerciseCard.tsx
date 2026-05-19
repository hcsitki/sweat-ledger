import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SetRow } from './SetRow';
import type { Set } from '@/db/types';
import type { WorkoutExerciseEntry } from '@/store/workout';
import { addSet, updateSet, deleteSet, getSetsForWorkoutExercise } from '@/db/queries/sets';
import { getPreviousPerformance } from '@/db/queries/previous-performance';
import { useWorkoutStore } from '@/store/workout';
import { scheduleRestTimerNotification } from '@/utils/notifications';

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseEntry;
  onDeleteExercise: (workoutExerciseId: number) => void;
}

export function ExerciseCard({ workoutExercise, onDeleteExercise }: ExerciseCardProps) {
  const db = useSQLiteContext();
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);
  const [sets, setSets] = useState<Set[]>([]);
  const [prevSets, setPrevSets] = useState<Set[]>([]);

  const loadSets = useCallback(async () => {
    const fetched = await getSetsForWorkoutExercise(db, workoutExercise.workoutExerciseId);
    setSets(fetched);
  }, [db, workoutExercise.workoutExerciseId]);

  useEffect(() => {
    loadSets();
    getPreviousPerformance(db, workoutExercise.exerciseId).then((perf) => {
      if (perf) setPrevSets(perf.sets);
    });
  }, [loadSets, workoutExercise.exerciseId]);

  const handleAddSet = async () => {
    const lastSet = sets[sets.length - 1];
    await addSet(db, workoutExercise.workoutExerciseId, {
      setNumber: sets.length + 1,
      weightLbs: lastSet?.weight_lbs ?? null,
      reps: lastSet?.reps ?? null,
    });
    await loadSets();

    const notifId = await scheduleRestTimerNotification(90);
    startRestTimer(90, notifId);
  };

  const handleUpdateSet = async (
    setId: number,
    updates: { weightLbs?: number | null; reps?: number | null; notes?: string | null }
  ) => {
    await updateSet(db, setId, updates);
    await loadSets();
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{workoutExercise.exerciseName}</Text>
        <TouchableOpacity onPress={handleDeleteExercise}>
          <Text style={styles.remove}>Remove</Text>
        </TouchableOpacity>
      </View>
      {sets.length > 0 && (
        <View style={styles.columnHeaders}>
          <Text style={styles.colLabel}>Set</Text>
          {!workoutExercise.isBodyweight && <Text style={styles.colLabel}>lbs</Text>}
          <Text style={styles.colLabel}>Reps</Text>
          <Text style={[styles.colLabel, { flex: 1 }]}>Previous</Text>
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
        />
      ))}
      <TouchableOpacity style={styles.addSetBtn} onPress={handleAddSet}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  name: { fontSize: 16, fontWeight: '600' },
  remove: { color: '#FF3B30', fontSize: 14 },
  columnHeaders: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  colLabel: { width: 64, textAlign: 'center', fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  addSetBtn: { padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  addSetText: { color: '#007AFF', fontWeight: '600' },
});
