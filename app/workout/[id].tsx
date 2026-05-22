import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getWorkoutDetail, getBestEpley1RMBeforeSession, deleteWorkout } from '@/db/queries/history';
import { calculateEpley1RM, formatDuration } from '@/utils/calculations';
import {
  WorkoutDetailExercise,
  type EnrichedSet,
} from '@/components/history/WorkoutDetailExercise';
import type { WorkoutHistoryDetail, WorkoutHistoryExercise } from '@/db/types';

interface EnrichedExercise {
  workout_exercise_id: number;
  exercise_name: string;
  is_bodyweight: number;
  sets: EnrichedSet[];
}

function enrichExercises(
  exercises: WorkoutHistoryExercise[],
  priorBests: number[]
): EnrichedExercise[] {
  return exercises.map((ex, i) => {
    const priorBest = priorBests[i];
    let bestSetIndex = -1;
    let bestEpley = 0;

    // Single pass: compute 1RM, track best set, and build enriched sets.
    // Bodyweight-only sets (weight_lbs null/0) yield 1RM of 0 and will never
    // produce a PR badge — Epley requires a meaningful weight value.
    const sets: EnrichedSet[] = ex.sets.map((s, idx) => {
      const e1rm = calculateEpley1RM(s.weight_lbs ?? 0, s.reps ?? 0);
      if (e1rm !== null && e1rm > bestEpley) {
        bestEpley = e1rm;
        bestSetIndex = idx;
      }
      return {
        ...s,
        is_best_set: false,
        is_pr: e1rm !== null && e1rm > priorBest,
      };
    });

    if (bestSetIndex >= 0) sets[bestSetIndex].is_best_set = true;

    return {
      workout_exercise_id: ex.workout_exercise_id,
      exercise_name: ex.exercise_name,
      is_bodyweight: ex.is_bodyweight,
      sets,
    };
  });
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [detail, setDetail] = useState<WorkoutHistoryDetail | null>(null);
  const [enriched, setEnriched] = useState<EnrichedExercise[]>([]);
  const [loading, setLoading] = useState(true);

  function handleDelete() {
    Alert.alert(
      'Delete Workout',
      'This workout will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(db, Number(id));
            router.back();
          },
        },
      ]
    );
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4 }}>
          <Text style={{ color: '#FF3B30', fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, id]);

  useEffect(() => {
    async function load() {
      const workout = await getWorkoutDetail(db, Number(id));
      if (!workout) {
        setLoading(false);
        return;
      }

      const priorBests = await Promise.all(
        workout.exercises.map((ex) =>
          getBestEpley1RMBeforeSession(db, ex.exercise_id, workout.started_at)
        )
      );

      setDetail(workout);
      setEnriched(enrichExercises(workout.exercises, priorBests));
      setLoading(false);
    }
    load();
  }, [db, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Workout not found.</Text>
      </View>
    );
  }

  const totalTonnage = detail.exercises
    .flatMap((ex) => ex.sets)
    .reduce((acc, s) => acc + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0);

  const date = new Date(detail.started_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.workoutName}>{detail.name}</Text>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(detail.duration_seconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalTonnage.toLocaleString()} lb</Text>
            <Text style={styles.statLabel}>Total tonnage</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{detail.exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>
      </View>

      {enriched.map((ex) => (
        <WorkoutDetailExercise
          key={ex.workout_exercise_id}
          exercise_name={ex.exercise_name}
          is_bodyweight={ex.is_bodyweight}
          sets={ex.sets}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#888', fontSize: 16 },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  workoutName: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  date: { fontSize: 14, color: '#888' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: '#e5e5e5' },
});
