import { useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { parseStrongCSV } from '@/services/import/parse-strong-csv';
import { useImportStore } from '@/store/import';

export default function ImportSelectFileScreen() {
  const { setParsedData, weightUnit, setWeightUnit, parsedWorkouts } = useImportStore();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setLoading(true);

      const response = await fetch(asset.uri);
      const text = await response.text();
      const workouts = parseStrongCSV(text);

      if (workouts.length === 0) {
        Alert.alert(
          'No workouts found',
          'The file could not be parsed or contains no workouts. Make sure you selected a Strong CSV export.'
        );
        return;
      }

      setParsedData(workouts);
      setFileName(asset.name ?? 'selected file');
    } catch {
      Alert.alert('Error', 'Could not read the file. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const totalSets = parsedWorkouts.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
    0
  );
  const uniqueExercises = new Set(
    parsedWorkouts.flatMap((w) => w.exercises.map((e) => e.name))
  ).size;

  const hasParsed = parsedWorkouts.length > 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Source App</Text>
        <View style={styles.card}>
          <Text style={styles.appName}>Strong</Text>
          <Text style={styles.appInstructions}>
            In Strong, go to Profile → Settings → Export Data, then select "Export Workouts as CSV". Transfer the file to your phone and select it below.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CSV File</Text>
        <TouchableOpacity
          style={[styles.pickButton, hasParsed && styles.pickButtonDone]}
          onPress={handlePickFile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.pickButtonText}>
              {hasParsed ? `✓  ${fileName}` : 'Select CSV File'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {hasParsed && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Found</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{parsedWorkouts.length}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{uniqueExercises}</Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalSets}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Weight Unit in Strong</Text>
            <View style={styles.unitRow}>
              {(['lbs', 'kg'] as const).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitChip, weightUnit === unit && styles.unitChipActive]}
                  onPress={() => setWeightUnit(unit)}
                >
                  <Text style={[styles.unitChipText, weightUnit === unit && styles.unitChipTextActive]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {weightUnit === 'kg' && (
              <Text style={styles.unitHint}>
                Weights will be converted to lbs on import.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/import/map-exercises' as any)}
          >
            <Text style={styles.continueText}>Map Exercises →</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1C1C1E' },
  content: { padding: 16, gap: 24 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    gap: 8,
  },
  appName: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  appInstructions: { fontSize: 14, color: '#8E8E93', lineHeight: 20 },
  pickButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  pickButtonDone: { backgroundColor: '#34C759' },
  pickButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitChip: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  unitChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  unitChipText: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  unitChipTextActive: { color: '#fff' },
  unitHint: { fontSize: 13, color: '#8E8E93', paddingHorizontal: 4 },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
