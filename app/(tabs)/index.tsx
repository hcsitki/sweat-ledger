import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useWorkoutStore } from '@/store/workout';
import { createWorkoutSession } from '@/db/queries/workouts';
import { getTemplates } from '@/db/queries/templates';
import { startWorkoutFromTemplate } from '@/utils/start-from-template';
import type { WorkoutTemplate } from '@/db/types';
import { useSyncStore } from '@/store/sync';
import { IconSymbol } from '@/components/ui/icon-symbol';

function formatSyncTime(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function SyncIndicator() {
  const { status, lastSyncedAt, errorMessage } = useSyncStore();

  if (status === 'syncing') {
    return (
      <View style={syncStyles.row}>
        <ActivityIndicator size="small" color="#8E8E93" />
        <Text style={syncStyles.text}>Syncing...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={syncStyles.row}>
        <IconSymbol name="exclamationmark.icloud.fill" size={14} color="#FF9F0A" />
        <Text style={[syncStyles.text, syncStyles.errorText]}>
          {errorMessage ?? 'Sync failed'}
        </Text>
      </View>
    );
  }

  if (lastSyncedAt) {
    return (
      <View style={syncStyles.row}>
        <IconSymbol name="checkmark.icloud.fill" size={14} color="#3A3A3C" />
        <Text style={syncStyles.text}>{formatSyncTime(lastSyncedAt)}</Text>
      </View>
    );
  }

  return null;
}

const syncStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 12, color: '#636366' },
  errorText: { color: '#FF9F0A' },
});

type TemplateListItem = WorkoutTemplate & { exercise_count: number };

export default function LogScreen() {
  const db = useSQLiteContext();
  const { justFinished } = useLocalSearchParams<{ justFinished?: string }>();
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const addExerciseToSession = useWorkoutStore((s) => s.addExerciseToSession);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getTemplates(db).then(setTemplates);

      if (justFinished) {
        const sessionIdNum = Number(justFinished);
        // Clear param before showing alert so it doesn't re-trigger on next focus
        router.setParams({ justFinished: undefined });
        Alert.alert(
          'Save as Template?',
          'Would you like to save this workout as a reusable template?',
          [
            { text: 'Skip', style: 'cancel' },
            {
              text: 'Save as Template',
              onPress: () =>
                router.push(
                  `/template/save-from-workout?sessionId=${sessionIdNum}` as Href
                ),
            },
          ]
        );
      }
    }, [db, justFinished])
  );

  const handleStartEmpty = async () => {
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const name = `${dayName} Workout`;
    const { id, startedAt } = await createWorkoutSession(db, name);
    startWorkout(id, name, startedAt);
    router.push('/workout/active');
  };

  const handleStartFromTemplate = async (templateId: number) => {
    const ok = await startWorkoutFromTemplate(db, { startWorkout, addExerciseToSession }, templateId);
    if (ok) router.push('/workout/active');
  };

if (sessionId != null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerTitle}>Workout in Progress</Text>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={() => router.push('/workout/active')}
          >
            <Text style={styles.btnText}>Resume Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={templates}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>Log</Text>
              <SyncIndicator />
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartEmpty}>
              <Text style={styles.btnText}>Start Empty Workout</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Templates</Text>
              <TouchableOpacity onPress={() => router.push('/template/create' as Href)}>
                <Text style={styles.newBtn}>+ New</Text>
              </TouchableOpacity>
            </View>

            {templates.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No templates yet.</Text>
                <Text style={styles.emptySubtext}>
                  Create a template to quickly start a structured workout.
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.templateCard}
            onPress={() => router.push(`/template/${item.id}` as Href)}
          >
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{item.name}</Text>
              <Text style={styles.templateMeta}>
                {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.startTemplateBtn}
              onPress={() => handleStartFromTemplate(item.id)}
              hitSlop={8}
            >
              <Text style={styles.startTemplateBtnText}>Start</Text>
            </TouchableOpacity>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1C1C1E' },
  listContent: { padding: 20, gap: 12 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },

  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  newBtn: { fontSize: 16, color: '#007AFF', fontWeight: '500' },

  emptyState: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#8E8E93' },
  emptySubtext: { fontSize: 14, color: '#636366', textAlign: 'center' },

  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  templateMeta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },

  startTemplateBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startTemplateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  bannerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  bannerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  resumeBtn: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
});
