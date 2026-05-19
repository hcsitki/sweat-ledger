import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { formatDuration } from '@/utils/calculations';

export function RestTimerBar() {
  const { secondsRemaining, isRunning, stop, extend } = useRestTimer();

  if (!isRunning) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.countdown}>{formatDuration(secondsRemaining)}</Text>
      <TouchableOpacity onPress={() => extend(30)} style={styles.btn}>
        <Text style={styles.btnText}>+30s</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={stop} style={styles.btn}>
        <Text style={styles.btnText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  countdown: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  btn: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
