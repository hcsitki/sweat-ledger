import { View, Text, StyleSheet } from 'react-native';
import type { WorkoutHistorySet } from '@/db/types';

export interface EnrichedSet extends WorkoutHistorySet {
  is_best_set: boolean;
  is_pr: boolean;
}

interface Props {
  exercise_name: string;
  is_bodyweight: number;
  sets: EnrichedSet[];
}

export function WorkoutDetailExercise({ exercise_name, is_bodyweight, sets }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.exerciseName}>{exercise_name}</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.col, styles.colSet, styles.headerText]}>Set</Text>
        <Text style={[styles.col, styles.colWeight, styles.headerText]}>
          {is_bodyweight ? 'Added' : 'Weight'}
        </Text>
        <Text style={[styles.col, styles.colReps, styles.headerText]}>Reps</Text>
        <Text style={[styles.col, styles.colNotes, styles.headerText]}>Notes</Text>
      </View>

      {sets.map((set) => (
        <View
          key={set.id}
          style={[styles.setRow, set.is_best_set && styles.bestSetRow]}
        >
          <Text style={[styles.col, styles.colSet, styles.setValue]}>
            {set.set_number}
          </Text>
          <Text style={[styles.col, styles.colWeight, styles.setValue]}>
            {set.weight_lbs != null && set.weight_lbs > 0
              ? `${set.weight_lbs} lb`
              : is_bodyweight
              ? 'BW'
              : '—'}
          </Text>
          <Text style={[styles.col, styles.colReps, styles.setValue]}>
            {set.reps ?? '—'}
          </Text>
          <View style={[styles.col, styles.colNotes, styles.notesCell]}>
            {set.is_pr && (
              <View style={styles.prBadge}>
                <Text style={styles.prText}>PR</Text>
              </View>
            )}
            {set.notes ? (
              <Text style={styles.notesText} numberOfLines={1}>{set.notes}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#007AFF', marginBottom: 6 },

  headerRow: { flexDirection: 'row', paddingVertical: 2 },
  headerText: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  bestSetRow: { backgroundColor: 'rgba(0, 122, 255, 0.1)' },

  col: { fontSize: 15 },
  colSet: { width: 36, color: '#8E8E93' },
  colWeight: { width: 72 },
  colReps: { width: 48 },
  colNotes: { flex: 1 },

  setValue: { color: '#FFFFFF' },

  notesCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notesText: { fontSize: 13, color: '#8E8E93', flex: 1 },

  prBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
