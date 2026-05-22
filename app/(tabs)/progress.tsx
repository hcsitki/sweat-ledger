import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useHealthData } from '@/hooks/use-health-data';
import { useHealthHistory } from '@/hooks/use-health-history';
import { getDailyTonnage, type DailyTonnage } from '@/db/queries/history';
import { BodyCompositionChart } from '@/components/BodyCompositionChart';
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const { weightLbs, bodyFatPercent, isAuthorized, isLoading, hasAttempted } = useHealthData();
  const { points, isLoading: isChartLoading, timeRange, setTimeRange } = useHealthHistory(isAuthorized);
  const [dailyTonnage, setDailyTonnage] = useState<DailyTonnage[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getDailyTonnage(db).then(setDailyTonnage);
    }, [db])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          <Text style={styles.sectionSubtitle}>From Apple Health</Text>

          {isLoading ? (
            <ActivityIndicator style={styles.spinner} />
          ) : !isAuthorized ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Apple Health Access Required</Text>
              {hasAttempted ? (
                <>
                  <Text style={styles.emptyBody}>
                    Access was denied. Enable it in Settings to see your body metrics and log workouts
                    to Apple Health.
                  </Text>
                  <TouchableOpacity
                    style={styles.connectBtn}
                    onPress={() => Linking.openURL('app-settings:')}
                  >
                    <Text style={styles.connectBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.emptyBody}>
                  Unable to connect to Apple Health. Make sure you are on an iPhone with iOS 16.4 or
                  later.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.metricsRow}>
              <MetricCard
                label="Weight"
                value={weightLbs != null ? weightLbs.toFixed(1) : null}
                unit="lbs"
              />
              <MetricCard
                label="Body Fat"
                value={bodyFatPercent != null ? bodyFatPercent.toFixed(1) : null}
                unit="%"
              />
            </View>
          )}
        </View>

        {isAuthorized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Composition</Text>
            <Text style={styles.sectionSubtitle}>Weight & lean mass over time · lbs</Text>
            <BodyCompositionChart
              points={points}
              isLoading={isChartLoading}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Activity</Text>
          <Text style={styles.sectionSubtitle}>Last 16 weeks · darker = more volume</Text>
          <WorkoutHeatmap data={dailyTonnage} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | null;
  unit: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      {value != null ? (
        <View style={styles.cardValueRow}>
          <Text style={styles.cardValue}>{value}</Text>
          <Text style={styles.cardUnit}>{unit}</Text>
        </View>
      ) : (
        <Text style={styles.cardNoData}>No data</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  scroll: { paddingBottom: 48 },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#8E8E93', marginBottom: 16 },
  spinner: { marginTop: 32 },
  emptyCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20 },
  connectBtn: {
    marginTop: 8,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  connectBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  cardLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  cardValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  cardValue: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  cardUnit: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  cardNoData: { fontSize: 15, color: '#636366', fontStyle: 'italic' },
});
