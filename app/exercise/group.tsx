import { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getExercisesByBaseName,
  getExerciseGroupStats,
  getExerciseGroupHistory,
} from '@/db/queries/exercises';
import { ExerciseStatsCard } from '@/components/exercises/ExerciseStatsCard';
import { OneRMChart } from '@/components/exercises/OneRMChart';
import { ExerciseHistorySession } from '@/components/exercises/ExerciseHistorySession';
import type { Exercise, ExerciseStats, ExerciseGroupHistorySession } from '@/db/types';

export default function ExerciseGroupScreen() {
  const { baseName } = useLocalSearchParams<{ baseName: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [variants, setVariants] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [history, setHistory] = useState<ExerciseGroupHistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (baseName) navigation.setOptions({ title: baseName });
  }, [baseName, navigation]);

  useEffect(() => {
    async function load() {
      const [v, s, h] = await Promise.all([
        getExercisesByBaseName(db, baseName),
        getExerciseGroupStats(db, baseName),
        getExerciseGroupHistory(db, baseName),
      ]);
      setVariants(v);
      setStats(s);
      setHistory(h);
      setLoading(false);
    }
    load();
  }, [db, baseName]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const hasHistory = history.length > 0;
  const chartData = history
    .filter((s) => s.session_1rm != null)
    .map((s) => ({ date: s.started_at, value: s.session_1rm! }));
  const displayHistory = [...history].reverse();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{baseName}</Text>
        {variants[0] && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{variants[0].muscle_group}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Variations</Text>
        <View style={styles.variantList}>
          {variants.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.variantRow}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: v.id } })}
            >
              <View style={styles.variantMain}>
                <Text style={styles.variantEquipment}>{v.equipment_type}</Text>
                {v.is_custom === 1 && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addVariationRow}
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/exercise/create',
              params: { baseName: baseName, muscleGroup: variants[0]?.muscle_group },
            })}
          >
            <Text style={styles.addVariationText}>+ Add variation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasHistory && stats ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Bests (all variations)</Text>
            <ExerciseStatsCard stats={stats} />
          </View>

          <View style={styles.sessionCountRow}>
            <Text style={styles.sessionCountText}>
              {history.length} {history.length === 1 ? 'session' : 'sessions'} logged
            </Text>
          </View>

          {chartData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1RM Progression</Text>
              <OneRMChart data={chartData} />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session History</Text>
            <View style={styles.historyList}>
              {displayHistory.map((session) => (
                <ExerciseHistorySession
                  key={session.workout_exercise_id}
                  session={session}
                  isBodyweight={session.is_bodyweight === 1}
                  subtitle={variants.length > 1 ? session.equipment_type : undefined}
                />
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.emptyStats}>
            No sets logged yet. Personal bests will appear here after your first session.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1C1C1E' },
  content: { padding: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E' },
  header: { gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantList: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  variantMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  variantEquipment: { fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  customBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  customBadgeText: { fontSize: 11, color: '#007AFF' },
  chevron: { fontSize: 20, color: '#636366' },
  addVariationRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  addVariationText: { fontSize: 15, color: '#007AFF', fontWeight: '500' },
  sessionCountRow: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  sessionCountText: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  historyList: { gap: 10 },
  emptyStats: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 12 },
});
