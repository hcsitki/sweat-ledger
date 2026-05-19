import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { Exercise } from '@/db/types';

interface Props {
  exercise: Exercise;
  hasStats?: boolean;
  onPress: () => void;
}

export function ExerciseListItem({ exercise, hasStats, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.meta}>
          {exercise.muscle_group} · {exercise.equipment_type}
        </Text>
      </View>
      <View style={styles.right}>
        {exercise.is_custom === 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Custom</Text>
          </View>
        )}
        {hasStats && <View style={styles.dot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#555' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF' },
});
