import { StyleSheet, Text } from 'react-native';
import { useWorkoutTimer } from '@/hooks/use-workout-timer';
import { formatDuration } from '@/utils/calculations';

export function WorkoutTimer() {
  const elapsed = useWorkoutTimer();
  return <Text style={styles.timer}>{formatDuration(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  timer: { fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
