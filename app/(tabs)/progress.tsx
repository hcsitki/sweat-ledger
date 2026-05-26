import { useCallback, useMemo, useState } from 'react';
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
import { getDailyTonnage, getWeeklyTonnage, type DailyTonnage, type WeeklyTonnage } from '@/db/queries/history';
import { BodyCompositionChart } from '@/components/BodyCompositionChart';
import { BodyFatChart } from '@/components/BodyFatChart';
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';
import { WeightSparkline } from '@/components/WeightSparkline';
import { WeeklyVolumeChart } from '@/components/WeeklyVolumeChart';

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const { weightLbs, bodyFatPercent, heightM, isAuthorized, isLoading, hasAttempted } = useHealthData();
  const { points, weightSamples30d, bfSamples, delta30d, isLoading: isChartLoading, timeRange, setTimeRange } =
    useHealthHistory(isAuthorized);
  const [dailyTonnage, setDailyTonnage] = useState<DailyTonnage[]>([]);
  const [weeklyTonnage, setWeeklyTonnage] = useState<WeeklyTonnage[]>([]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        getDailyTonnage(db).then(setDailyTonnage),
        getWeeklyTonnage(db).then(setWeeklyTonnage),
      ]);
    }, [db])
  );

  const currentLeanMass =
    weightLbs != null && bodyFatPercent != null
      ? weightLbs * (1 - bodyFatPercent / 100)
      : null;

  const ffmi = useMemo(() => {
    if (currentLeanMass == null || heightM == null || heightM === 0) return null;
    const leanKg = currentLeanMass / 2.20462;
    return leanKg / (heightM * heightM);
  }, [currentLeanMass, heightM]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Body Metrics ─────────────────────────────────────── */}
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
            <>
              <View style={styles.metricsRow}>
                <MetricCard
                  label="Weight"
                  value={weightLbs != null ? weightLbs.toFixed(1) : null}
                  unit="lbs"
                  delta={delta30d.weightDelta}
                  deltaUnit="lbs"
                  positiveIsGood={false}
                />
                <MetricCard
                  label="Body Fat"
                  value={bodyFatPercent != null ? bodyFatPercent.toFixed(1) : null}
                  unit="%"
                  delta={delta30d.bfDelta}
                  deltaUnit="%"
                  positiveIsGood={false}
                />
              </View>
              <View style={[styles.metricsRow, { marginTop: 12 }]}>
                <MetricCard
                  label="Lean Mass"
                  value={currentLeanMass != null ? currentLeanMass.toFixed(1) : null}
                  unit="lbs"
                  delta={delta30d.leanMassDelta}
                  deltaUnit="lbs"
                  positiveIsGood={true}
                />
                <MetricCard
                  label="FFMI"
                  value={ffmi != null ? ffmi.toFixed(1) : null}
                  unit=""
                  ffmiLabel={ffmi != null ? ffmiCategory(ffmi) : null}
                />
              </View>
            </>
          )}
        </View>

        {/* ── 7-Day Weight Trend ───────────────────────────────── */}
        {isAuthorized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Weight Trend</Text>
            <Text style={styles.sectionSubtitle}>Daily weight · bold line = rolling 7-day avg</Text>
            <WeightSparkline samples={weightSamples30d} isLoading={isChartLoading} />
          </View>
        )}

        {/* ── Body Composition ─────────────────────────────────── */}
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

        {/* ── Body Fat Trend ───────────────────────────────────── */}
        {isAuthorized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Fat Trend</Text>
            <Text style={styles.sectionSubtitle}>Body fat % over time</Text>
            <BodyFatChart
              samples={bfSamples}
              isLoading={isChartLoading}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </View>
        )}

        {/* ── Weekly Volume Load ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Volume Load</Text>
          <Text style={styles.sectionSubtitle}>Last 12 weeks · total lbs lifted per week</Text>
          <WeeklyVolumeChart data={weeklyTonnage} />
        </View>

        {/* ── Training Activity ────────────────────────────────── */}
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
  delta,
  deltaUnit,
  positiveIsGood,
  ffmiLabel,
}: {
  label: string;
  value: string | null;
  unit: string;
  delta?: number | null;
  deltaUnit?: string;
  positiveIsGood?: boolean;
  ffmiLabel?: string | null;
}) {
  const deltaColor = useMemo(() => {
    if (delta == null) return '#636366';
    const good = positiveIsGood ? delta > 0 : delta < 0;
    return good ? '#30D158' : '#FF453A';
  }, [delta, positiveIsGood]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      {value != null ? (
        <>
          <View style={styles.cardValueRow}>
            <Text style={styles.cardValue}>{value}</Text>
            {unit.length > 0 && <Text style={styles.cardUnit}>{unit}</Text>}
          </View>
          {ffmiLabel != null && (
            <Text style={styles.ffmiCategory}>{ffmiLabel}</Text>
          )}
          {delta != null && deltaUnit != null && (
            <Text style={[styles.cardDelta, { color: deltaColor }]}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}{deltaUnit} vs 30d
            </Text>
          )}
          {delta == null && ffmiLabel == null && (
            <Text style={styles.cardDeltaPlaceholder}>— vs 30d</Text>
          )}
        </>
      ) : (
        <Text style={styles.cardNoData}>No data</Text>
      )}
    </View>
  );
}

function ffmiCategory(ffmi: number): string {
  if (ffmi < 18) return 'Below avg';
  if (ffmi < 20) return 'Average';
  if (ffmi < 22) return 'Above avg';
  if (ffmi < 24) return 'Excellent';
  if (ffmi < 26) return 'Elite';
  return 'Exceptional';
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
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  cardLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  cardValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  cardValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  cardUnit: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  cardDelta: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardDeltaPlaceholder: { fontSize: 12, color: '#3A3A3C', marginTop: 2 },
  ffmiCategory: { fontSize: 12, color: '#8E8E93', fontWeight: '500', marginTop: 1 },
  cardNoData: { fontSize: 15, color: '#636366', fontStyle: 'italic', marginTop: 4 },
});
