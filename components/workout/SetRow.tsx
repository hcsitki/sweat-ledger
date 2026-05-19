import { useState } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity, Alert } from 'react-native';
import type { Set } from '@/db/types';

interface SetRowProps {
  set: Set;
  previousSet?: Set;
  isBodyweight?: boolean;
  onUpdate: (setId: number, updates: { weightLbs?: number | null; reps?: number | null; notes?: string | null }) => void;
  onDelete: (setId: number) => void;
}

export function SetRow({ set, previousSet, isBodyweight, onUpdate, onDelete }: SetRowProps) {
  const [showNotes, setShowNotes] = useState(!!set.notes);

  const handleDelete = () => {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(set.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.setNum}>{set.set_number}</Text>
      {!isBodyweight && (
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={set.weight_lbs != null ? String(set.weight_lbs) : ''}
          placeholder={previousSet?.weight_lbs != null ? String(previousSet.weight_lbs) : '—'}
          onChangeText={(v) => onUpdate(set.id, { weightLbs: v ? Number(v) : null })}
          returnKeyType="done"
        />
      )}
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={set.reps != null ? String(set.reps) : ''}
        placeholder={previousSet?.reps != null ? String(previousSet.reps) : '—'}
        onChangeText={(v) => onUpdate(set.id, { reps: v ? Number(v) : null })}
        returnKeyType="done"
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
});
