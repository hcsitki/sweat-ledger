import { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getExerciseById,
  getExerciseStats,
  getPerformedExerciseIds,
  deleteCustomExercise,
  getExercisePerformanceHistory,
} from '@/db/queries/exercises';
import { ExerciseStatsCard } from '@/components/exercises/ExerciseStatsCard';
import { OneRMChart } from '@/components/exercises/OneRMChart';
import { ExerciseHistorySession } from '@/components/exercises/ExerciseHistorySession';
import type { Exercise, ExerciseStats, ExerciseHistorySession as HistorySession } from '@/db/types';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [hasPerformed, setHasPerformed] = useState(false);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const exerciseId = Number(id);
      const [ex, st, performedIds, hist] = await Promise.all([
        getExerciseById(db, exerciseId),
        getExerciseStats(db, exerciseId),
        getPerformedExerciseIds(db),
        getExercisePerformanceHistory(db, exerciseId),
      ]);
      setExercise(ex);
      setStats(st);
      setHasPerformed(performedIds.has(exerciseId));
      setHistory(hist);
      setLoading(false);
    }
    load();
  }, [db, id]);

  useLayoutEffect(() => {
    if (!exercise) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleEdit} style={{ marginRight: 4 }}>
          <Text style={{ color: '#007AFF', fontSize: 17 }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [exercise, navigation]);

  function handleEdit() {
    router.push({ pathname: '/exercise/create', params: { editId: id } });
  }

  function handleDelete() {
    Alert.alert('Delete Exercise', `Delete "${exercise?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomExercise(db, Number(id));
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete the exercise. Please try again.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Exercise not found.</Text>
      </View>
    );
  }

  const isBodyweight = exercise.is_bodyweight === 1;
  const chartData = history
    .filter((s) => s.session_1rm != null)
    .map((s) => ({ date: s.started_at, value: s.session_1rm! }));
  const displayHistory = [...history].reverse();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{exercise.muscle_group}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{exercise.equipment_type}</Text>
          </View>
          {exercise.is_custom === 1 && (
            <View style={[styles.badge, styles.customBadge]}>
              <Text style={[styles.badgeText, styles.customBadgeText]}>Custom</Text>
            </View>
          )}
        </View>
      </View>

      {exercise.instructions ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to perform</Text>
          <Text style={styles.instructions}>{exercise.instructions}</Text>
        </View>
      ) : null}

      {hasPerformed && stats ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal bests</Text>
            <ExerciseStatsCard stats={stats} />
          </View>

          <View style={styles.sessionCountRow}>
            <Text style={styles.sessionCountText}>
              {history.length} {history.length === 1 ? 'session' : 'sessions'} logged
            </Text>
          </View>

          {chartData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1RM Progression</Text>
              <OneRMChart data={chartData} />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session History</Text>
            <View style={styles.historyList}>
              {displayHistory.map((session) => (
                <ExerciseHistorySession
                  key={session.workout_exercise_id}
                  session={session}
                  isBodyweight={isBodyweight}
                />
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.emptyStats}>
            No sets logged yet. Personal bests will appear here after your first session.
          </Text>
        </View>
      )}

      {exercise.is_custom === 1 && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Exercise</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1C1C1E' },
  content: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E' },
  notFound: { color: '#8E8E93', fontSize: 16 },
  header: { gap: 10 },
  name: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  customBadge: { backgroundColor: 'rgba(0, 122, 255, 0.15)' },
  customBadgeText: { color: '#007AFF' },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructions: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  emptyStats: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 12 },
  sessionCountRow: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  sessionCountText: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  historyList: { gap: 10 },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteText: { color: '#FF3B30', fontSize: 16, fontWeight: '500' },
});
