import { View, Text, StyleSheet } from 'react-native';
import type { ExerciseStats } from '@/db/types';

function fmt(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${Math.round(value * 10) / 10} ${unit}`;
}

interface Props {
  stats: ExerciseStats;
}

export function ExerciseStatsCard({ stats }: Props) {
  const cells = [
    { label: 'Best Set Weight', value: fmt(stats.best_set_weight, 'lbs') },
    { label: 'Best Set Volume', value: fmt(stats.best_set_volume, 'lbs') },
    { label: 'Best Session Vol.', value: fmt(stats.best_session_volume, 'lbs') },
    { label: 'Est. 1RM', value: fmt(stats.estimated_1rm, 'lbs') },
  ];

  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View key={cell.label} style={styles.cell}>
          <Text style={styles.value}>{cell.value}</Text>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: '#38383A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    width: '50%',
    backgroundColor: '#2C2C2E',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  value: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  label: { fontSize: 12, color: '#8E8E93', marginTop: 2, textAlign: 'center' },
});
