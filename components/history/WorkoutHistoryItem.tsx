import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { formatDuration } from '@/utils/calculations';
import type { CompletedWorkoutSummary } from '@/db/types';

interface Props {
  workout: CompletedWorkoutSummary;
  onPress: () => void;
}

export function WorkoutHistoryItem({ workout, onPress }: Props) {
  const date = new Date(workout.started_at).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const duration = formatDuration(workout.duration_seconds);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        <Text style={styles.name}>{workout.name}</Text>
        <Text style={styles.meta}>{date} · {duration}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  chevron: { fontSize: 22, color: '#c7c7cc', marginLeft: 8 },
});
