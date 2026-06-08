import { useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
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
  updateTemplateExerciseOrderIndex,
  removeExerciseFromTemplate,
  deleteTemplateSet,
} from '@/db/queries/templates';
import { getLastSessionRepsForExercise } from '@/db/queries/templates';

// Collapsed card height (44px) + marginBottom (12px)
const DRAG_ITEM_HEIGHT = 56;
const SPRING_CFG = { damping: 20, stiffness: 250 };

interface LocalSet {
  id: number | null;
  setNumber: number;
  targetReps: string;
}

interface LocalExercise {
  key: string; // stable identity for list
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

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const frozenOrder = useRef<LocalExercise[]>([]);
  const draggingIndexSV = useSharedValue(-1);
  const hoveredIndexSV = useSharedValue(-1);
  const floatY = useSharedValue(0);

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

  const startDrag = useCallback(() => {
    frozenOrder.current = [...exercises];
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [exercises]);

  const endDrag = useCallback(
    (fromIndex: number, toIndex: number) => {
      draggingIndexSV.value = -1;
      hoveredIndexSV.value = -1;
      floatY.value = 0;
      const newOrder = [...frozenOrder.current];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      setIsDragging(false);
      setExercises(newOrder);
    },
    [draggingIndexSV, hoveredIndexSV, floatY]
  );

  // Stable refs so gesture worklets always call the latest version
  const startDragRef = useRef(startDrag);
  startDragRef.current = startDrag;
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;

  const stableStartDrag = useCallback(() => startDragRef.current(), []);
  const stableEndDrag = useCallback(
    (from: number, to: number) => endDragRef.current(from, to),
    []
  );

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
          } else {
            await updateTemplateExerciseOrderIndex(db, teId, i);
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

  const renderOrder = isDragging ? frozenOrder.current : exercises;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.label}>Template Name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Push Day"
              placeholderTextColor="#636366"
              autoFocus={!isEditMode}
              returnKeyType="done"
            />
          </View>

          <View>
            {renderOrder.map((ex, idx) => (
              <TemplateDraggableItem
                key={ex.key}
                exercise={ex}
                cardIndex={idx}
                totalCount={renderOrder.length}
                draggingIndexSV={draggingIndexSV}
                hoveredIndexSV={hoveredIndexSV}
                floatY={floatY}
                isDragging={isDragging}
                onDragStart={stableStartDrag}
                onDragEnd={stableEndDrag}
                onAddSet={() => handleAddSet(idx)}
                onRemoveSet={(sIdx) => handleRemoveSet(idx, sIdx)}
                onUpdateReps={(sIdx, val) => handleUpdateReps(idx, sIdx, val)}
                onRemoveExercise={() => handleRemoveExercise(idx)}
              />
            ))}
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface DraggableItemProps {
  exercise: LocalExercise;
  cardIndex: number;
  totalCount: number;
  draggingIndexSV: SharedValue<number>;
  hoveredIndexSV: SharedValue<number>;
  floatY: SharedValue<number>;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: (from: number, to: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onUpdateReps: (setIndex: number, value: string) => void;
  onRemoveExercise: () => void;
}

function TemplateDraggableItem({
  exercise: ex,
  cardIndex,
  totalCount,
  draggingIndexSV,
  hoveredIndexSV,
  floatY,
  isDragging,
  onDragStart,
  onDragEnd,
  onAddSet,
  onRemoveSet,
  onUpdateReps,
  onRemoveExercise,
}: DraggableItemProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart(() => {
          'worklet';
          if (draggingIndexSV.value !== -1) return;
          draggingIndexSV.value = cardIndex;
          hoveredIndexSV.value = cardIndex;
          floatY.value = 0;
          runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
          'worklet';
          if (draggingIndexSV.value !== cardIndex) return;
          floatY.value = e.translationY;
          const rawIdx = cardIndex + e.translationY / DRAG_ITEM_HEIGHT;
          hoveredIndexSV.value = Math.max(0, Math.min(totalCount - 1, Math.round(rawIdx)));
        })
        .onEnd(() => {
          'worklet';
          if (draggingIndexSV.value !== cardIndex) return;
          const from = draggingIndexSV.value;
          const to = hoveredIndexSV.value;
          runOnJS(onDragEnd)(from, to);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardIndex, totalCount]
  );

  const animStyle = useAnimatedStyle(() => {
    const activeDragIdx = draggingIndexSV.value;

    if (activeDragIdx === -1) {
      return { transform: [{ translateY: withSpring(0, SPRING_CFG) }] };
    }

    if (activeDragIdx === cardIndex) {
      return {
        transform: [{ translateY: floatY.value }],
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        opacity: 0.93,
      };
    }

    const hovered = hoveredIndexSV.value;
    let shift = 0;
    if (cardIndex > activeDragIdx && cardIndex <= hovered) shift = -1;
    else if (cardIndex < activeDragIdx && cardIndex >= hovered) shift = 1;

    return {
      transform: [{ translateY: withSpring(shift * DRAG_ITEM_HEIGHT, SPRING_CFG) }],
    };
  });

  return (
    <Animated.View style={[animStyle, { marginBottom: isDragging ? 12 : 16 }]}>
      <View style={[styles.exerciseCard, isDragging && styles.exerciseCardCollapsed]}>
        <View style={styles.exerciseHeader}>
          <GestureDetector gesture={gesture}>
            <View style={styles.dragHandle}>
              <Text style={styles.dragHandleIcon}>☰</Text>
            </View>
          </GestureDetector>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {ex.exerciseName}
          </Text>
          {!isDragging && (
            <TouchableOpacity onPress={onRemoveExercise}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isDragging && (
          <>
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
                  onChangeText={(v) => onUpdateReps(sIdx, v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor="#636366"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={styles.setColAction}
                  onPress={() => onRemoveSet(sIdx)}
                >
                  <Text style={styles.removeSetText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={onAddSet}>
              <Text style={styles.addSetBtnText}>+ Add Set</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1C1C1E' },
  flex: { flex: 1 },
  listContent: { padding: 16, gap: 16 },

  header: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  nameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    backgroundColor: '#3A3A3C',
    color: '#FFFFFF',
  },

  exerciseCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  exerciseCardCollapsed: {
    paddingTop: 0,
    paddingBottom: 0,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragHandle: {
    width: 28,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleIcon: {
    fontSize: 16,
    color: '#636366',
  },
  exerciseName: { fontSize: 16, fontWeight: '600', flex: 1, color: '#007AFF' },
  removeText: { color: '#FF3B30', fontSize: 14 },

  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  setCol: { fontSize: 14, color: '#FFFFFF' },
  setColNum: { width: 36, color: '#8E8E93' },
  setColReps: { flex: 1 },
  setColAction: { width: 32, alignItems: 'center' },

  repsInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#3A3A3C',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  removeSetText: { color: '#FF3B30', fontSize: 14 },

  addSetBtn: { marginTop: 4 },
  addSetBtnText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },

  footer: { gap: 12 },
  addExerciseBtn: {
    borderWidth: 1,
    borderColor: '#38383A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  addExerciseBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(0, 122, 255, 0.4)' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
