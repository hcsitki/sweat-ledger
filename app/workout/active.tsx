import { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/store/workout';
import { finishWorkoutSession, cancelWorkoutSession, updateSessionName, saveSessionCalories } from '@/db/queries/workouts';
import { initHealthKit, getLatestWeight, estimateCalories, writeStrengthWorkout } from '@/services/health';
import { deleteWorkoutExercise } from '@/db/queries/sets';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { WorkoutTimer } from '@/components/workout/WorkoutTimer';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { getElapsedSeconds } from '@/utils/calculations';

export default function ActiveWorkoutScreen() {
  const db = useSQLiteContext();
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const sessionName = useWorkoutStore((s) => s.sessionName);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const workoutExercises = useWorkoutStore((s) => s.workoutExercises);
  const setSessionName = useWorkoutStore((s) => s.setSessionName);
  const removeExerciseFromSession = useWorkoutStore((s) => s.removeExerciseFromSession);
  const clearWorkout = useWorkoutStore((s) => s.clearWorkout);

  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = useCallback(
    (name: string) => {
      setSessionName(name);
      if (sessionId == null) return;
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
      nameDebounceRef.current = setTimeout(() => {
        updateSessionName(db, sessionId, name);
      }, 500);
    },
    [sessionId, db, setSessionName]
  );

  const handleFinish = useCallback(() => {
    Alert.alert('Finish Workout?', 'Save this session and return to home.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          if (sessionId == null || startedAt == null) return;
          const finishedAt = Date.now();
          const durationSeconds = getElapsedSeconds(startedAt);
          await finishWorkoutSession(db, sessionId, durationSeconds, finishedAt);
          const finishedSessionId = sessionId;
          clearWorkout();
          router.replace(`/(tabs)?justFinished=${finishedSessionId}`);

          // Fire-and-forget: write to Apple Health and persist calories
          const capturedDb = db;
          (async () => {
            try {
              const ok = await initHealthKit();
              if (!ok) return;
              const weightLbs = await getLatestWeight();
              const calories = weightLbs != null
                ? estimateCalories(durationSeconds, weightLbs)
                : null;
              if (calories != null) {
                await saveSessionCalories(capturedDb, finishedSessionId, calories);
              }
              await writeStrengthWorkout(startedAt, finishedAt, durationSeconds, calories);
            } catch (e) {
              if (__DEV__) console.warn('HealthKit write failed:', e);
            }
          })();
        },
      },
    ]);
  }, [sessionId, startedAt, db, clearWorkout]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Workout', 'Discard this workout? This cannot be undone.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          if (sessionId != null) await cancelWorkoutSession(db, sessionId);
          clearWorkout();
          router.replace('/(tabs)');
        },
      },
    ]);
  }, [sessionId, db, clearWorkout]);

  const handleDeleteExercise = useCallback(
    async (workoutExerciseId: number) => {
      await deleteWorkoutExercise(db, workoutExerciseId);
      removeExerciseFromSession(workoutExerciseId);
    },
    [db, removeExerciseFromSession]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TextInput
            style={styles.nameInput}
            value={sessionName}
            onChangeText={handleNameChange}
            placeholder="Workout name"
            returnKeyType="done"
          />
          <WorkoutTimer />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {workoutExercises.map((we) => (
          <ExerciseCard
            key={we.workoutExerciseId}
            workoutExercise={we}
            onDeleteExercise={handleDeleteExercise}
          />
        ))}
        {workoutExercises.length === 0 && (
          <Text style={styles.emptyText}>Add an exercise to get started.</Text>
        )}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => router.push('/workout/add-exercise')}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <RestTimerBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameInput: { flex: 1, fontSize: 20, fontWeight: '700', color: '#000' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { color: '#FF3B30', fontSize: 16 },
  finishBtn: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 32, marginBottom: 16 },
  addExerciseBtn: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addExerciseText: { color: '#007AFF', fontWeight: '600', fontSize: 16 },
});
