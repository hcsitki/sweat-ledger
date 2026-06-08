import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getWorkoutDetail, getBestEpley1RMBeforeSession, deleteWorkout, updateSessionTemplate } from '@/db/queries/history';
import { deleteSessionFromCloud } from '@/lib/sync';
import { calculateEpley1RM, formatDuration } from '@/utils/calculations';
import {
  WorkoutDetailExercise,
  type EnrichedSet,
} from '@/components/history/WorkoutDetailExercise';
import type { WorkoutHistoryDetail, WorkoutHistoryExercise } from '@/db/types';
import { useWorkoutStore } from '@/store/workout';
import { startWorkoutFromSession } from '@/utils/start-from-session';
import { getTemplates, saveWorkoutAsTemplate } from '@/db/queries/templates';

interface EnrichedExercise {
  workout_exercise_id: number;
  exercise_name: string;
  is_bodyweight: number;
  sets: EnrichedSet[];
}

type TemplatePick = { id: number | null; name: string };

function enrichExercises(
  exercises: WorkoutHistoryExercise[],
  priorBests: number[]
): EnrichedExercise[] {
  return exercises.map((ex, i) => {
    const priorBest = priorBests[i];
    let bestSetIndex = -1;
    let bestEpley = 0;

    const sets: EnrichedSet[] = ex.sets.map((s, idx) => {
      const e1rm = calculateEpley1RM(s.weight_lbs ?? 0, s.reps ?? 0);
      if (e1rm !== null && e1rm > bestEpley) {
        bestEpley = e1rm;
        bestSetIndex = idx;
      }
      return {
        ...s,
        is_best_set: false,
        is_pr: e1rm !== null && e1rm > priorBest,
      };
    });

    if (bestSetIndex >= 0) sets[bestSetIndex].is_best_set = true;

    return {
      workout_exercise_id: ex.workout_exercise_id,
      exercise_name: ex.exercise_name,
      is_bodyweight: ex.is_bodyweight,
      sets,
    };
  });
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [detail, setDetail] = useState<WorkoutHistoryDetail | null>(null);
  const [enriched, setEnriched] = useState<EnrichedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [pickerTemplates, setPickerTemplates] = useState<TemplatePick[]>([]);

  function handleDelete() {
    Alert.alert(
      'Delete Workout',
      'This workout will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            void deleteSessionFromCloud(db, Number(id));
            await deleteWorkout(db, Number(id));
            router.back();
          },
        },
      ]
    );
  }

  function handlePerformAgain() {
    const activeSessionId = useWorkoutStore.getState().sessionId;
    if (activeSessionId != null) {
      Alert.alert(
        'Workout in Progress',
        'You have an active workout. Cancel it to start this one?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Anyway',
            style: 'destructive',
            onPress: async () => {
              const { clearWorkout, startWorkout, addExerciseToSession } = useWorkoutStore.getState();
              clearWorkout();
              const ok = await startWorkoutFromSession(db, { startWorkout, addExerciseToSession }, Number(id));
              if (ok) router.push('/workout/active');
            },
          },
        ]
      );
      return;
    }
    const { startWorkout, addExerciseToSession } = useWorkoutStore.getState();
    startWorkoutFromSession(db, { startWorkout, addExerciseToSession }, Number(id)).then((ok) => {
      if (ok) router.push('/workout/active');
    });
  }

  function handleSaveAsTemplate() {
    Alert.prompt(
      'Save as Template',
      'Enter a name for this template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            const templateName = (name ?? '').trim() || (detail?.name ?? 'My Template');
            await saveWorkoutAsTemplate(db, Number(id), templateName);
            Alert.alert('Saved', `Template "${templateName}" created.`);
          },
        },
      ],
      'plain-text',
      detail?.name ?? ''
    );
  }

  async function handleOpenTemplatePicker() {
    const templates = await getTemplates(db);
    setPickerTemplates([
      { id: null, name: 'None' },
      ...templates.map((t) => ({ id: t.id, name: t.name })),
    ]);
    setTemplatePickerVisible(true);
  }

  async function handleSelectTemplate(templateId: number | null) {
    await updateSessionTemplate(db, Number(id), templateId);
    const newName = templateId == null
      ? null
      : pickerTemplates.find((t) => t.id === templateId)?.name ?? null;
    setDetail((prev) => prev ? { ...prev, template_id: templateId, template_name: newName } : prev);
    setTemplatePickerVisible(false);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4 }}>
          <Text style={{ color: '#FF3B30', fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, id]);

  useEffect(() => {
    async function load() {
      const workout = await getWorkoutDetail(db, Number(id));
      if (!workout) {
        setLoading(false);
        return;
      }

      const priorBests = await Promise.all(
        workout.exercises.map((ex) =>
          getBestEpley1RMBeforeSession(db, ex.exercise_id, workout.started_at)
        )
      );

      setDetail(workout);
      setEnriched(enrichExercises(workout.exercises, priorBests));
      setLoading(false);
    }
    load();
  }, [db, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Workout not found.</Text>
      </View>
    );
  }

  const totalTonnage = detail.exercises
    .flatMap((ex) => ex.sets)
    .reduce((acc, s) => acc + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0);

  const date = new Date(detail.started_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.workoutName}>{detail.name}</Text>
          <Text style={styles.date}>{date}</Text>
          <TouchableOpacity style={styles.templateRow} onPress={handleOpenTemplatePicker}>
            <Text style={styles.templateLabel}>Template</Text>
            <Text style={[styles.templateValue, !detail.template_name && styles.templateValueEmpty]}>
              {detail.template_name ?? 'None'}
            </Text>
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(detail.duration_seconds)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalTonnage.toLocaleString()} lb</Text>
              <Text style={styles.statLabel}>Total tonnage</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{detail.exercises.length}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
          </View>
        </View>

        {enriched.map((ex) => (
          <WorkoutDetailExercise
            key={ex.workout_exercise_id}
            exercise_name={ex.exercise_name}
            is_bodyweight={ex.is_bodyweight}
            sets={ex.sets}
          />
        ))}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleSaveAsTemplate}
          >
            <Text style={styles.actionBtnSecondaryText}>Save as Template</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handlePerformAgain}
          >
            <Text style={styles.actionBtnPrimaryText}>Perform Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={templatePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Template</Text>
              <TouchableOpacity onPress={() => setTemplatePickerVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerTemplates}
              keyExtractor={(item) => String(item.id ?? 'none')}
              renderItem={({ item }) => {
                const isSelected = item.id === detail.template_id;
                return (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => handleSelectTemplate(item.id)}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1C1C1E' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E' },
  notFound: { color: '#8E8E93', fontSize: 16 },

  headerCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  workoutName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 14, color: '#8E8E93' },

  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    marginTop: 2,
  },
  templateLabel: { fontSize: 13, color: '#8E8E93' },
  templateValue: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  templateValueEmpty: { color: '#636366' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#8E8E93', textTransform: 'uppercase' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: '#38383A' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: '#007AFF' },
  actionBtnSecondary: {
    backgroundColor: '#2C2C2E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  actionBtnSecondaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  modalCancel: { fontSize: 16, color: '#007AFF' },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  pickerItemText: { fontSize: 16, color: '#FFFFFF' },
  pickerItemTextSelected: { color: '#007AFF' },
  pickerCheck: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
});
