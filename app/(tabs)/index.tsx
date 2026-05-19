import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/store/workout';
import { createWorkoutSession } from '@/db/queries/workouts';

export default function LogScreen() {
  const db = useSQLiteContext();
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const handleStartWorkout = async () => {
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const name = `${dayName} Workout`;
    const { id, startedAt } = await createWorkoutSession(db, name);
    startWorkout(id, name, startedAt);
    router.push('/workout/active');
  };

  if (sessionId != null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Workout in Progress</Text>
        <TouchableOpacity style={styles.resumeBtn} onPress={() => router.push('/workout/active')}>
          <Text style={styles.btnText}>Resume Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log</Text>
      <Text style={styles.subtitle}>Ready to train? Start a workout to log sets.</Text>
      <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
        <Text style={styles.btnText}>Start Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#666', textAlign: 'center', fontSize: 15 },
  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    marginTop: 8,
  },
  resumeBtn: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
