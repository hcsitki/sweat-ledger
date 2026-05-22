import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { formatDurationHM } from '@/utils/calculations';
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
  });
  const duration = formatDurationHM(workout.duration_seconds);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{workout.name}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>

      <Text style={styles.meta}>{date} · {duration}</Text>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>{workout.total_tonnage.toLocaleString()} lb</Text>
        {workout.pr_count > 0 && (
          <View style={styles.prBadge}>
            <Text style={styles.prText}>{workout.pr_count} PR{workout.pr_count > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {workout.exercises.length > 0 && (
        <View style={styles.exerciseList}>
          {workout.exercises.map((ex, i) => {
            const bestSet =
              ex.best_weight != null && ex.best_reps != null
                ? `  ${ex.best_weight} lb x ${ex.best_reps}`
                : ex.is_bodyweight && ex.best_reps != null
                ? `  BW x ${ex.best_reps}`
                : '';
            return (
              <Text key={i} style={styles.exerciseLine} numberOfLines={1}>
                <Text style={styles.setCount}>{ex.set_count} x </Text>
                {ex.exercise_name}
                <Text style={styles.bestSet}>{bestSet}</Text>
              </Text>
            );
          })}

        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  chevron: { fontSize: 22, color: '#636366', marginLeft: 8 },
  meta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
  },
  stat: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  prBadge: {
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 214, 10, 0.4)',
  },
  prText: { fontSize: 12, fontWeight: '600', color: '#FFD60A' },
  exerciseList: { marginTop: 8, gap: 3 },
  exerciseLine: { fontSize: 13, color: '#8E8E93' },
  setCount: { fontWeight: '600', color: '#FFFFFF' },
  bestSet: { color: '#636366' },
});
