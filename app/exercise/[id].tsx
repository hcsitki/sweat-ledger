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
import { getExerciseById, getExerciseStats, getPerformedExerciseIds, deleteCustomExercise } from '@/db/queries/exercises';
import { ExerciseStatsCard } from '@/components/exercises/ExerciseStatsCard';
import type { Exercise, ExerciseStats } from '@/db/types';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [hasPerformed, setHasPerformed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const exerciseId = Number(id);
      const [ex, st, performedIds] = await Promise.all([
        getExerciseById(db, exerciseId),
        getExerciseStats(db, exerciseId),
        getPerformedExerciseIds(db),
      ]);
      setExercise(ex);
      setStats(st);
      setHasPerformed(performedIds.has(exerciseId));
      setLoading(false);
    }
    load();
  }, [db, id]);

  useLayoutEffect(() => {
    if (!exercise?.is_custom) return;
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal bests</Text>
          <ExerciseStatsCard stats={stats} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.emptyStats}>No sets logged yet. Personal bests will appear here after your first session.</Text>
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
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#888', fontSize: 16 },
  header: { gap: 10 },
  name: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#e8e8e8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 13, color: '#555', fontWeight: '500' },
  customBadge: { backgroundColor: '#e8f0fe' },
  customBadgeText: { color: '#1a73e8' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  instructions: { fontSize: 15, lineHeight: 22, color: '#333', backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  emptyStats: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 12 },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  deleteText: { color: '#ff3b30', fontSize: 16, fontWeight: '500' },
});
