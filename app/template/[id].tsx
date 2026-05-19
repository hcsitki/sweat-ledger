import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/store/workout';
import { getTemplateWithDetails, deleteTemplate } from '@/db/queries/templates';
import { startWorkoutFromTemplate } from '@/utils/start-from-template';
import type { TemplateWithDetails } from '@/db/types';

export default function TemplateDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [template, setTemplate] = useState<TemplateWithDetails | null>(null);

  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const addExerciseToSession = useWorkoutStore((s) => s.addExerciseToSession);

  useFocusEffect(
    useCallback(() => {
      getTemplateWithDetails(db, Number(id)).then(setTemplate);
    }, [db, id])
  );

  const handleDelete = () => {
    if (!template) return;
    Alert.alert('Delete Template', `Delete "${template.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(db, template.id);
          router.back();
        },
      },
    ]);
  };

  const handleStartWorkout = async () => {
    if (!template) return;
    const ok = await startWorkoutFromTemplate(
      db,
      { startWorkout, addExerciseToSession },
      template.id
    );
    if (ok) router.push('/workout/active');
  };

  if (!template) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.templateName}>{template.name}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/template/create?editId=${template.id}` as Href)}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {template.exercises.length === 0 ? (
          <Text style={styles.emptyText}>No exercises in this template.</Text>
        ) : (
          template.exercises.map((ex) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
              <View style={styles.setHeaderRow}>
                <Text style={[styles.setCol, styles.setColNum, styles.setHeaderText]}>Set</Text>
                <Text style={[styles.setCol, styles.setColReps, styles.setHeaderText]}>
                  Target Reps
                </Text>
              </View>
              {ex.sets.length === 0 ? (
                <Text style={styles.noSetsText}>No sets defined</Text>
              ) : (
                ex.sets.map((s) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={[styles.setCol, styles.setColNum]}>{s.set_number}</Text>
                    <Text style={[styles.setCol, styles.setColReps]}>
                      {s.target_reps != null ? s.target_reps : '—'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
          <Text style={styles.startBtnText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#999' },

  scrollContent: { padding: 20, gap: 16, paddingBottom: 100 },

  templateName: { fontSize: 26, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 12 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editBtnText: { color: '#007AFF', fontWeight: '500' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  deleteBtnText: { color: '#FF3B30', fontWeight: '500' },

  exerciseCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  exerciseName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },

  setHeaderRow: { flexDirection: 'row' },
  setHeaderText: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row' },
  setCol: { fontSize: 15 },
  setColNum: { width: 40, color: '#666' },
  setColReps: { flex: 1 },

  noSetsText: { color: '#999', fontSize: 14 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 20 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
