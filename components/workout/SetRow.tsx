import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, TextInput, Text, TouchableOpacity, Alert,
  InputAccessoryView, Platform, Keyboard,
} from 'react-native';
import type { Set } from '@/db/types';

interface SetRowProps {
  set: Set;
  previousSet?: Set;
  isBodyweight?: boolean;
  onUpdate: (setId: number, updates: { weightLbs?: number | null; reps?: number | null; notes?: string | null }) => void;
  onDelete: (setId: number) => void;
  onNext?: () => void;
  onRegisterFirstInput?: (input: TextInput | null) => void;
}

export function SetRow({ set, previousSet, isBodyweight, onUpdate, onDelete, onNext, onRegisterFirstInput }: SetRowProps) {
  const [showNotes, setShowNotes] = useState(!!set.notes);
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

  const handleDelete = () => {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(set.id) },
    ]);
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.setNum}>{set.set_number}</Text>
      {!isBodyweight && (
        <TextInput
          ref={weightRef}
          style={styles.input}
          keyboardType="decimal-pad"
          value={set.weight_lbs != null ? String(set.weight_lbs) : ''}
          placeholder={previousSet?.weight_lbs != null ? String(previousSet.weight_lbs) : '—'}
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
        onChangeText={(v) => onUpdate(set.id, { reps: v ? Number(v) : null })}
        returnKeyType={onNext ? 'next' : 'done'}
        blurOnSubmit={!onNext}
        onFocus={() => { focusedFieldRef.current = 'reps'; }}
        onSubmitEditing={() => onNextRef.current?.()}
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
      />
      {previousSet != null && (
        <Text style={styles.prev} numberOfLines={1}>
          {previousSet.weight_lbs != null ? `${previousSet.weight_lbs} × ` : ''}
          {previousSet.reps ?? '—'}
        </Text>
      )}
      <TouchableOpacity onPress={() => setShowNotes((s) => !s)} style={styles.noteTap}>
        <Text style={styles.noteToggle}>Note</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDelete}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
      {showNotes && (
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Add note…"
          value={set.notes ?? ''}
          onChangeText={(v) => onUpdate(set.id, { notes: v || null })}
        />
      )}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  setNum: { width: 20, textAlign: 'center', color: '#666', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 64,
    textAlign: 'center',
    fontSize: 15,
  },
  notesInput: { width: 180 },
  prev: { color: '#999', fontSize: 12, flex: 1 },
  noteTap: { paddingHorizontal: 2 },
  noteToggle: { color: '#007AFF', fontSize: 12 },
  delete: { color: '#FF3B30', fontWeight: '600', paddingHorizontal: 4 },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f1f1f6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
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
