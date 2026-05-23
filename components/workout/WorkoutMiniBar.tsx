import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '@/store/workout';
import { useWorkoutTimer } from '@/hooks/use-workout-timer';
import { formatDuration } from '@/utils/calculations';

export function WorkoutMiniBar() {
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const sessionName = useWorkoutStore((s) => s.sessionName);
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const elapsedSeconds = useWorkoutTimer();
  const insets = useSafeAreaInsets();
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);

  useEffect(() => {
    if (!restTimer.isRunning || restTimer.endsAt == null) {
      setRestSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((restTimer.endsAt! - Date.now()) / 1000));
      setRestSecondsLeft(left);
      if (left === 0) clearInterval(interval);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restTimer.isRunning, restTimer.endsAt]);

  if (sessionId == null) return null;

  const TAB_BAR_HEIGHT = 49;

  return (
    <TouchableOpacity
      style={[styles.bar, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}
      onPress={() => router.push('/workout/active')}
      activeOpacity={0.85}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {sessionName || 'Workout'}
        </Text>
        <Text style={styles.separator}>•</Text>
        <Text style={styles.duration}>{formatDuration(elapsedSeconds)}</Text>
      </View>
      {restTimer.isRunning && restSecondsLeft > 0 && (
        <View style={styles.timerPill}>
          <Text style={styles.timerText}>{formatDuration(restSecondsLeft)}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    zIndex: 100,
    elevation: 10,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },
  separator: { color: '#8E8E93', fontSize: 14 },
  duration: { fontSize: 14, color: '#8E8E93', fontVariant: ['tabular-nums'] },
  timerPill: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timerText: { color: '#fff', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chevron: { color: '#8E8E93', fontSize: 22, fontWeight: '300' },
});
