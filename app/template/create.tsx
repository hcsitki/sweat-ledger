import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTemplateEditorStore } from '@/store/template-editor';
import {
  createTemplate,
  addExerciseToTemplate,
  addSetToTemplateExercise,
  getTemplateWithDetails,
  updateTemplateName,
  updateTemplateSetReps,
  removeExerciseFromTemplate,
  deleteTemplateSet,
} from '@/db/queries/templates';
import { getLastSessionRepsForExercise } from '@/db/queries/templates';

interface LocalSet {
  id: number | null;
  setNumber: number;
  targetReps: string;
}

interface LocalExercise {
  key: string; // stable identity for FlatList
  templateExerciseId: number | null;
  exerciseId: number;
  exerciseName: string;
  isBodyweight: boolean;
  sets: LocalSet[];
}

let _keyCounter = 0;
const nextKey = () => String(++_keyCounter);

export default function TemplateCreateScreen() {
  const db = useSQLiteContext();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditMode = editId != null;

  const [templateId, setTemplateId] = useState<number | null>(
    isEditMode ? Number(editId) : null
  );
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  const takePendingExercise = useTemplateEditorStore((s) => s.takePendingExercise);

  useFocusEffect(
    useCallback(() => {
      // Load existing template once when entering edit mode
      if (isEditMode && !loadedRef.current) {
        loadedRef.current = true;
        getTemplateWithDetails(db, Number(editId)).then((t) => {
          if (!t) return;
          setName(t.name);
          setTemplateId(t.id);
          setExercises(
            t.exercises.map((ex) => ({
              key: nextKey(),
              templateExerciseId: ex.id,
              exerciseId: ex.exercise_id,
              exerciseName: ex.exercise_name,
              isBodyweight: ex.is_bodyweight === 1,
              sets: ex.sets.map((s) => ({
                id: s.id,
                setNumber: s.set_number,
                targetReps: s.target_reps != null ? String(s.target_reps) : '',
              })),
            }))
          );
        });
      }

      // Pick up exercise selected from the picker
      const pending = takePendingExercise();
      if (pending) {
        getLastSessionRepsForExercise(db, pending.id).then((reps) => {
          const defaultSets: LocalSet[] =
            reps.length > 0
              ? reps.map((r, i) => ({
                  id: null,
                  setNumber: i + 1,
                  targetReps: r > 0 ? String(r) : '',
                }))
              : [{ id: null, setNumber: 1, targetReps: '' }];

          setExercises((prev) => [
            ...prev,
            {
              key: nextKey(),
              templateExerciseId: null,
              exerciseId: pending.id,
              exerciseName: pending.name,
              isBodyweight: pending.isBodyweight,
              sets: defaultSets,
            },
          ]);
        });
      }
    }, [db, editId, isEditMode, takePendingExercise])
  );

  const handleAddExercise = () => {
    router.push('/workout/add-exercise?returnTo=template' as Href);
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIndex] };
      const lastReps = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].targetReps : '';
      ex.sets = [
        ...ex.sets,
        { id: null, setNumber: ex.sets.length + 1, targetReps: lastReps },
      ];
      updated[exerciseIndex] = ex;
      return updated;
    });
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIndex] };
      ex.sets = ex.sets
        .filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
      updated[exerciseIndex] = ex;
      return updated;
    });
  };

  const handleUpdateReps = (exerciseIndex: number, setIndex: number, value: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIndex] };
      ex.sets = ex.sets.map((s, i) => (i === setIndex ? { ...s, targetReps: value } : s));
      updated[exerciseIndex] = ex;
      return updated;
    });
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    Alert.alert('Remove Exercise', 'Remove this exercise from the template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          setExercises((prev) => prev.filter((_, i) => i !== exerciseIndex)),
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a template name.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to the template.');
      return;
    }

    setSaving(true);
    try {
      let tid = templateId;

      if (isEditMode && tid != null) {
        await updateTemplateName(db, tid, name.trim());

        const existingTemplate = await getTemplateWithDetails(db, tid);
        if (existingTemplate) {
          // Remove exercises deleted from UI
          for (const dbEx of existingTemplate.exercises) {
            const stillExists = exercises.some((e) => e.templateExerciseId === dbEx.id);
            if (!stillExists) {
              await removeExerciseFromTemplate(db, dbEx.id, tid);
            }
          }
        }

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          let teId = ex.templateExerciseId;

          if (teId == null) {
            const result = await addExerciseToTemplate(db, tid, ex.exerciseId, i);
            teId = result.id;
          }

          // Determine which set IDs existed before (from DB state)
          const originalSetIds = new Set(
            existingTemplate?.exercises
              .find((e) => e.id === ex.templateExerciseId)
              ?.sets.map((s) => s.id) ?? []
          );

          // Delete sets that were in DB but removed from UI
          const currentSetIds = new Set(ex.sets.map((s) => s.id).filter((id) => id != null));
          for (const origId of originalSetIds) {
            if (!currentSetIds.has(origId)) {
              await deleteTemplateSet(db, origId);
            }
          }

          for (const s of ex.sets) {
            if (s.id != null) {
              await updateTemplateSetReps(db, s.id, s.targetReps ? Number(s.targetReps) : null);
            } else {
              await addSetToTemplateExercise(
                db,
                teId,
                s.setNumber,
                s.targetReps ? Number(s.targetReps) : null
              );
            }
          }
        }
      } else {
        const result = await createTemplate(db, name.trim());
        tid = result.id;

        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          const { id: teId } = await addExerciseToTemplate(db, tid, ex.exerciseId, i);
          for (const s of ex.sets) {
            await addSetToTemplateExercise(
              db,
              teId,
              s.setNumber,
              s.targetReps ? Number(s.targetReps) : null
            );
          }
        }
      }

      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.label}>Template Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Push Day"
                autoFocus={!isEditMode}
                returnKeyType="done"
              />
            </View>
          }
          renderItem={({ item: ex, index: exIdx }) => (
            <View style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(exIdx)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.setHeaderRow}>
                <Text style={[styles.setCol, styles.setColNum]}>Set</Text>
                <Text style={[styles.setCol, styles.setColReps]}>Target Reps</Text>
                <View style={styles.setColAction} />
              </View>

              {ex.sets.map((s, sIdx) => (
                <View key={sIdx} style={styles.setRow}>
                  <Text style={[styles.setCol, styles.setColNum]}>{s.setNumber}</Text>
                  <TextInput
                    style={[styles.setCol, styles.setColReps, styles.repsInput]}
                    value={s.targetReps}
                    onChangeText={(v) => handleUpdateReps(exIdx, sIdx, v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="—"
                    maxLength={3}
                  />
                  <TouchableOpacity
                    style={styles.setColAction}
                    onPress={() => handleRemoveSet(exIdx, sIdx)}
                  >
                    <Text style={styles.removeSetText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(exIdx)}>
                <Text style={styles.addSetBtnText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddExercise}>
                <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Template'}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  listContent: { padding: 16, gap: 16 },

  header: { gap: 6, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    backgroundColor: '#f9f9f9',
  },

  exerciseCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: { fontSize: 16, fontWeight: '600', flex: 1 },
  removeText: { color: '#FF3B30', fontSize: 14 },

  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  setCol: { fontSize: 14 },
  setColNum: { width: 36, color: '#666' },
  setColReps: { flex: 1 },
  setColAction: { width: 32, alignItems: 'center' },

  repsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  removeSetText: { color: '#FF3B30', fontSize: 14 },

  addSetBtn: { marginTop: 4 },
  addSetBtnText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },

  footer: { gap: 12, marginTop: 8 },
  addExerciseBtn: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExerciseBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#99C2FF' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
