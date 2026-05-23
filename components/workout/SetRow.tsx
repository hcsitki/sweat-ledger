import { useRef, useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Set } from '@/db/types';
import { useWorkoutKeyboard } from '@/context/WorkoutKeyboardContext';

interface SetRowProps {
  set: Set;
  previousSet?: Set;
  isBodyweight?: boolean;
  onUpdate: (setId: number, updates: { weightLbs?: number | null; reps?: number | null }) => void;
  onDelete: (setId: number) => void;
  onDoneFromNext?: () => void;
  onRegisterFirstInput?: (input: TextInput | null) => void;
  done?: boolean;
  onToggleDone?: (setId: number) => void;
}

export function SetRow({
  set, previousSet, isBodyweight,
  onUpdate, onDelete, onDoneFromNext, onRegisterFirstInput,
  done, onToggleDone,
}: SetRowProps) {
  const { showNumber, activeNodeRef } = useWorkoutKeyboard();

  // Local buffered values — synced from props only when the field is not focused
  const [localWeight, setLocalWeight] = useState(set.weight_lbs != null ? String(set.weight_lbs) : '');
  const [localReps, setLocalReps] = useState(set.reps != null ? String(set.reps) : '');
  const weightFocused = useRef(false);
  const repsFocused = useRef(false);

  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  const onRegisterRef = useRef(onRegisterFirstInput);
  onRegisterRef.current = onRegisterFirstInput;
  const onDoneFromNextRef = useRef(onDoneFromNext);
  onDoneFromNextRef.current = onDoneFromNext;

  // Sync from DB when not focused
  useEffect(() => {
    if (!weightFocused.current) {
      setLocalWeight(set.weight_lbs != null ? String(set.weight_lbs) : '');
    }
  }, [set.weight_lbs]);
  useEffect(() => {
    if (!repsFocused.current) {
      setLocalReps(set.reps != null ? String(set.reps) : '');
    }
  }, [set.reps]);

  useEffect(() => {
    const firstInput = !isBodyweight ? weightRef.current : repsRef.current;
    onRegisterRef.current?.(firstInput);
    return () => { onRegisterRef.current?.(null); };
  }, [isBodyweight]);

  const handleFocusWeight = useCallback(() => {
    weightFocused.current = true;
    activeNodeRef.current = weightRef.current;
    showNumber({
      onKey: (k) => {
        if (k === '.') {
          setLocalWeight((prev) => {
            if (prev.includes('.')) return prev;
            const next = prev + k;
            onUpdate(set.id, { weightLbs: Number(next) || null });
            return next;
          });
          return;
        }
        setLocalWeight((prev) => {
          const next = prev + k;
          onUpdate(set.id, { weightLbs: Number(next) || null });
          return next;
        });
      },
      onBackspace: () => {
        setLocalWeight((prev) => {
          const next = prev.slice(0, -1);
          onUpdate(set.id, { weightLbs: next ? Number(next) : null });
          return next;
        });
      },
      onIncrement: (delta) => {
        setLocalWeight((prev) => {
          const next = Math.max(0, (Number(prev) || 0) + delta);
          const str = Number.isInteger(next) ? String(next) : String(next);
          onUpdate(set.id, { weightLbs: next });
          return str;
        });
      },
      onNext: () => repsRef.current?.focus(),
    });
  }, [set.id, onUpdate, showNumber, activeNodeRef]);

  const handleFocusReps = useCallback(() => {
    repsFocused.current = true;
    activeNodeRef.current = repsRef.current;
    showNumber({
      onKey: (k) => {
        if (k === '.') return; // no decimals on reps
        setLocalReps((prev) => {
          const next = prev + k;
          onUpdate(set.id, { reps: Number(next) || null });
          return next;
        });
      },
      onBackspace: () => {
        setLocalReps((prev) => {
          const next = prev.slice(0, -1);
          onUpdate(set.id, { reps: next ? Number(next) : null });
          return next;
        });
      },
      onIncrement: (delta) => {
        setLocalReps((prev) => {
          const next = Math.max(0, Math.round((Number(prev) || 0) + delta));
          onUpdate(set.id, { reps: next });
          return String(next);
        });
      },
      onNext: () => onDoneFromNextRef.current?.(),
    });
  }, [set.id, onUpdate, showNumber, activeNodeRef]);

  const handleBlurWeight = useCallback(() => {
    weightFocused.current = false;
  }, []);

  const handleBlurReps = useCallback(() => {
    repsFocused.current = false;
  }, []);

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => onDelete(set.id)}>
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={[styles.container, done && styles.containerDone]}>
        <Text style={[styles.setNum, done && styles.setNumDone]}>{set.set_number}</Text>
        {previousSet != null ? (
          <Text style={styles.prev} numberOfLines={1}>
            {previousSet.weight_lbs != null ? `${previousSet.weight_lbs} × ` : ''}
            {previousSet.reps ?? '—'}
          </Text>
        ) : (
          <Text style={styles.prev}>—</Text>
        )}
        {!isBodyweight && (
          <TextInput
            ref={weightRef}
            style={styles.input}
            showSoftInputOnFocus={false}
            value={localWeight}
            placeholder={previousSet?.weight_lbs != null ? String(previousSet.weight_lbs) : '—'}
            placeholderTextColor="#636366"
            onFocus={handleFocusWeight}
            onBlur={handleBlurWeight}
            onChangeText={setLocalWeight}
            caretHidden={false}
          />
        )}
        <TextInput
          ref={repsRef}
          style={styles.input}
          showSoftInputOnFocus={false}
          value={localReps}
          placeholder={previousSet?.reps != null ? String(previousSet.reps) : '—'}
          placeholderTextColor="#636366"
          onFocus={handleFocusReps}
          onBlur={handleBlurReps}
          onChangeText={setLocalReps}
          caretHidden={false}
        />
        <TouchableOpacity
          style={[styles.checkCircle, done && styles.checkCircleDone]}
          onPress={() => onToggleDone?.(set.id)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text style={[styles.checkMark, done && styles.checkMarkDone]}>✓</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
  },
  containerDone: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  setNum: { width: 32, textAlign: 'center', color: '#8E8E93', fontWeight: '600' },
  setNumDone: { color: '#34C759' },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#636366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#636366',
    lineHeight: 16,
  },
  checkMarkDone: {
    color: '#fff',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 64,
    textAlign: 'center',
    fontSize: 15,
    backgroundColor: '#3A3A3C',
    color: '#FFFFFF',
  },
  prev: { color: '#8E8E93', fontSize: 12, flex: 1, textAlign: 'center' },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
