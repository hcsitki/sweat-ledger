import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthData } from '@/hooks/use-health-data';

export default function ProgressScreen() {
  const { weightLbs, bodyFatPercent, isAuthorized, isLoading, hasAttempted } = useHealthData();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Metrics</Text>
        <Text style={styles.sectionSubtitle}>From Apple Health</Text>

        {isLoading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : !isAuthorized ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Apple Health Access Required</Text>
            {hasAttempted ? (
              // Permissions were denied — system won't re-prompt, must go to Settings
              <>
                <Text style={styles.emptyBody}>
                  Access was denied. Enable it in Settings to see your body metrics and log workouts to Apple Health.
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
                Unable to connect to Apple Health. Make sure you are on an iPhone with iOS 16.4 or later.
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
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#999', marginBottom: 16 },
  spinner: { marginTop: 32 },
  emptyCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#000', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
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
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  cardValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  cardValue: { fontSize: 32, fontWeight: '700', color: '#000' },
  cardUnit: { fontSize: 15, color: '#666', fontWeight: '500' },
  cardNoData: { fontSize: 15, color: '#bbb', fontStyle: 'italic' },
});
