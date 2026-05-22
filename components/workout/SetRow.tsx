import { useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, TextInput, Text, TouchableOpacity,
  InputAccessoryView, Platform, Keyboard,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Set } from '@/db/types';

interface SetRowProps {
  set: Set;
  previousSet?: Set;
  isBodyweight?: boolean;
  onUpdate: (setId: number, updates: { weightLbs?: number | null; reps?: number | null }) => void;
  onDelete: (setId: number) => void;
  onNext?: () => void;
  onRegisterFirstInput?: (input: TextInput | null) => void;
  done?: boolean;
  onToggleDone?: (setId: number) => void;
}

export function SetRow({ set, previousSet, isBodyweight, onUpdate, onDelete, onNext, onRegisterFirstInput, done, onToggleDone }: SetRowProps) {
  const focusedFieldRef = useRef<'weight' | 'reps' | null>(null);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const onRegisterRef = useRef(onRegisterFirstInput);
  onRegisterRef.current = onRegisterFirstInput;
  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  useEffect(() => {
    const firstInput = !isBodyweight ? weightRef.current : repsRef.current;
    onRegisterRef.current?.(firstInput);
    return () => { onRegisterRef.current?.(null); };
  }, [isBodyweight]);

  const accessoryId = `set-input-${set.id}`;

  // Use onPressIn (fires at touch-start) so focus transfers before the native blur event
  // that would otherwise dismiss the keyboard.
  const handleAccessoryNext = useCallback(() => {
    if (!isBodyweight && focusedFieldRef.current !== 'reps') {
      repsRef.current?.focus();
    } else if (onNextRef.current) {
      onNextRef.current();
    } else {
      Keyboard.dismiss();
    }
  }, [isBodyweight]);

  const accessoryLabel = isBodyweight || focusedFieldRef.current === 'reps' ? (onNext ? 'Next' : 'Done') : 'Next';

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
          keyboardType="decimal-pad"
          value={set.weight_lbs != null ? String(set.weight_lbs) : ''}
          placeholder={previousSet?.weight_lbs != null ? String(previousSet.weight_lbs) : '—'}
          placeholderTextColor="#636366"
          onChangeText={(v) => onUpdate(set.id, { weightLbs: v ? Number(v) : null })}
          returnKeyType="next"
          blurOnSubmit={false}
          onFocus={() => { focusedFieldRef.current = 'weight'; }}
          onSubmitEditing={() => repsRef.current?.focus()}
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        />
      )}
      <TextInput
        ref={repsRef}
        style={styles.input}
        keyboardType="number-pad"
        value={set.reps != null ? String(set.reps) : ''}
        placeholder={previousSet?.reps != null ? String(previousSet.reps) : '—'}
        placeholderTextColor="#636366"
        onChangeText={(v) => onUpdate(set.id, { reps: v ? Number(v) : null })}
        returnKeyType={onNext ? 'next' : 'done'}
        blurOnSubmit={!onNext}
        onFocus={() => { focusedFieldRef.current = 'reps'; }}
        onSubmitEditing={() => onNextRef.current?.()}
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
      />
      <TouchableOpacity
        style={[styles.checkCircle, done && styles.checkCircleDone]}
        onPress={() => onToggleDone?.(set.id)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Text style={[styles.checkMark, done && styles.checkMarkDone]}>✓</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity onPressIn={handleAccessoryNext} style={styles.accessoryBtn}>
              <Text style={styles.accessoryText}>{accessoryLabel}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
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
  prev: { color: '#8E8E93', fontSize: 12, flex: 1 },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  accessoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accessoryText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
