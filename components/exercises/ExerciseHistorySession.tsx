import { View, Text, StyleSheet } from 'react-native';
import type { ExerciseHistorySession as Session } from '@/db/types';

interface Props {
  session: Session;
  isBodyweight: boolean;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function setLabel(weight: number | null, reps: number | null, isBodyweight: boolean): string {
  const repsStr = reps != null ? `${reps}` : '—';
  if (isBodyweight) {
    if (weight && weight > 0) return `+${weight} lbs × ${repsStr}`;
    return `Bodyweight × ${repsStr}`;
  }
  const weightStr = weight != null ? `${weight} lbs` : '—';
  return `${weightStr} × ${repsStr}`;
}

export function ExerciseHistorySession({ session, isBodyweight }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.dateLabel}>{formatDate(session.started_at)}</Text>
      {session.sets.map((set) => (
        <View key={set.id} style={styles.setBlock}>
          <View style={styles.setRow}>
            <Text style={styles.setNumber}>Set {set.set_number}</Text>
            <Text style={styles.setValues}>
              {setLabel(set.weight_lbs, set.reps, isBodyweight)}
            </Text>
          </View>
          {set.notes ? <Text style={styles.notes}>{set.notes}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  setBlock: {
    gap: 2,
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    color: '#888',
    width: 40,
  },
  setValues: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  notes: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    paddingLeft: 48,
  },
});
