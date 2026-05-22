import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getExercises } from '@/db/queries/exercises';
import { importWorkouts } from '@/services/import/import-workouts';
import { useImportStore } from '@/store/import';
import type { Exercise } from '@/db/types';

export default function ConfirmImportScreen() {
  const db = useSQLiteContext();
  const { parsedWorkouts, exerciseMapping, weightUnit, uniqueExerciseNames, reset } =
    useImportStore();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    getExercises(db).then(setExercises);
  }, [db]);

  function resolveExerciseName(csvName: string): string {
    const mapped = exerciseMapping[csvName];
    if (mapped === null) return 'New custom exercise';
    if (mapped === undefined) return '—';
    return exercises.find((e) => e.id === mapped)?.name ?? `Exercise #${mapped}`;
  }

  const totalSets = parsedWorkouts.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );

  const newExerciseCount = Object.values(exerciseMapping).filter((v) => v === null).length;
  const weightMultiplier = weightUnit === 'kg' ? 2.20462 : 1;

  async function handleImport() {
    setImporting(true);
    try {
      const res = await importWorkouts(db, parsedWorkouts, exerciseMapping, weightMultiplier);
      setResult(res);
    } catch (e) {
      Alert.alert('Import failed', 'Something went wrong. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function handleDone() {
    reset();
    router.dismissAll();
  }

  if (result) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>Import complete</Text>
        <View style={styles.doneStats}>
          <Text style={styles.doneStat}>
            <Text style={styles.doneNumber}>{result.imported}</Text> workouts imported
          </Text>
          {result.skipped > 0 && (
            <Text style={styles.doneSkipped}>{result.skipped} skipped (already existed)</Text>
          )}
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Workouts</Text>
            <Text style={styles.summaryValue}>{parsedWorkouts.length}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider]}>
            <Text style={styles.summaryKey}>Unique exercises</Text>
            <Text style={styles.summaryValue}>{uniqueExerciseNames.length}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider]}>
            <Text style={styles.summaryKey}>Total sets</Text>
            <Text style={styles.summaryValue}>{totalSets}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryDivider]}>
            <Text style={styles.summaryKey}>Weight unit</Text>
            <Text style={styles.summaryValue}>{weightUnit.toUpperCase()}</Text>
          </View>
          {newExerciseCount > 0 && (
            <View style={[styles.summaryRow, styles.summaryDivider]}>
              <Text style={styles.summaryKey}>New custom exercises</Text>
              <Text style={styles.summaryValue}>{newExerciseCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Exercise Mapping</Text>
        <View style={styles.mappingCard}>
          {uniqueExerciseNames.map((csvName, i) => (
              <View
                key={csvName}
                style={[styles.mappingRow, i > 0 && styles.mappingDivider]}
              >
                <Text style={styles.mappingCsv} numberOfLines={1}>
                  {csvName}
                </Text>
                <Text style={styles.mappingArrow}>→</Text>
                <Text style={styles.mappingApp} numberOfLines={1}>
                  {resolveExerciseName(csvName)}
                </Text>
              </View>
          ))}
        </View>
      </View>

      {newExerciseCount > 0 && (
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            {newExerciseCount} new exercise{newExerciseCount !== 1 ? 's' : ''} will be created with a default muscle group of "Core". You can edit them in the Exercises tab after importing.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.importButton, importing && styles.importButtonDisabled]}
        onPress={handleImport}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importText}>Import {parsedWorkouts.length} Workouts</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  summaryDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
  },
  summaryKey: { fontSize: 15, color: '#1a1a1a' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  mappingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  mappingDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
  },
  mappingCsv: { flex: 1, fontSize: 13, color: '#555' },
  mappingArrow: { fontSize: 13, color: '#aaa' },
  mappingApp: { flex: 1, fontSize: 13, color: '#007AFF', textAlign: 'right' },
  noteCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFD700',
  },
  noteText: { fontSize: 13, color: '#7A6000', lineHeight: 18 },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  importButtonDisabled: { opacity: 0.6 },
  importText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  doneContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  doneStats: { alignItems: 'center', gap: 4 },
  doneStat: { fontSize: 16, color: '#555' },
  doneNumber: { fontWeight: '700', color: '#007AFF' },
  doneSkipped: { fontSize: 14, color: '#aaa' },
  doneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  doneButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
