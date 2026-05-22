import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getExercises } from '@/db/queries/exercises';
import { useImportStore } from '@/store/import';
import type { Exercise } from '@/db/types';

function normalizeForMatching(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function jaccardScore(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function suggestMatch(csvName: string, exercises: Exercise[]): number | null {
  const csvWords = normalizeForMatching(csvName);
  let bestScore = 0;
  let bestId: number | null = null;
  for (const ex of exercises) {
    const score = jaccardScore(csvWords, normalizeForMatching(ex.name));
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestId = ex.id;
    }
  }
  return bestId;
}

interface ExercisePickerModalProps {
  visible: boolean;
  exercises: Exercise[];
  selectedId: number | null | undefined;
  onSelect: (exerciseId: number | null) => void;
  onClose: () => void;
}

function ExercisePickerModal({
  visible,
  exercises,
  selectedId,
  onSelect,
  onClose,
}: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');

  const filtered =
    query.trim().length === 0
      ? exercises
      : exercises.filter((e) =>
          e.name.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <KeyboardAvoidingView
          style={pickerStyles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={pickerStyles.sheet}>
            <View style={pickerStyles.handle} />
            <View style={pickerStyles.searchRow}>
              <TextInput
                style={pickerStyles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises…"
                autoFocus
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              <TouchableOpacity onPress={onClose} style={pickerStyles.cancelBtn}>
                <Text style={pickerStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    pickerStyles.optionRow,
                    selectedId === null && pickerStyles.optionRowSelected,
                  ]}
                  onPress={() => { onSelect(null); onClose(); }}
                >
                  <View>
                    <Text style={pickerStyles.optionName}>Create as new exercise</Text>
                    <Text style={pickerStyles.optionMeta}>Adds a custom exercise with this name</Text>
                  </View>
                  {selectedId === null && <Text style={pickerStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    pickerStyles.optionRow,
                    selectedId === item.id && pickerStyles.optionRowSelected,
                  ]}
                  onPress={() => { onSelect(item.id); onClose(); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.optionName}>{item.name}</Text>
                    <Text style={pickerStyles.optionMeta}>
                      {item.muscle_group} · {item.equipment_type}
                      {item.is_custom === 1 ? ' · Custom' : ''}
                    </Text>
                  </View>
                  {selectedId === item.id && <Text style={pickerStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={pickerStyles.separator} />}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function MapExercisesScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { uniqueExerciseNames, exerciseMapping, setExerciseMapping } = useImportStore();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null); // csvName being edited

  useEffect(() => {
    getExercises(db).then(setExercises);
  }, [db]);

  // Auto-suggest matches once exercises are loaded
  useEffect(() => {
    if (exercises.length === 0) return;
    for (const name of uniqueExerciseNames) {
      if (exerciseMapping[name] !== undefined) continue; // already mapped
      const suggested = suggestMatch(name, exercises);
      setExerciseMapping(name, suggested); // null if no match → create new
    }
  }, [exercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const allMapped = uniqueExerciseNames.every((n) => exerciseMapping[n] !== undefined);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: allMapped
        ? () => (
            <TouchableOpacity onPress={() => router.push('/import/confirm' as any)} style={{ marginRight: 4 }}>
              <Text style={{ color: '#007AFF', fontSize: 17 }}>Next</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [allMapped, navigation]);

  const getLabel = useCallback(
    (csvName: string) => {
      const mapped = exerciseMapping[csvName];
      if (mapped === undefined) return 'Tap to assign…';
      if (mapped === null) return 'Create as new exercise';
      return exercises.find((e) => e.id === mapped)?.name ?? 'Unknown';
    },
    [exerciseMapping, exercises]
  );

  const isMapped = (csvName: string) => exerciseMapping[csvName] !== undefined;

  return (
    <>
      <FlatList
        style={styles.list}
        data={uniqueExerciseNames}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Match each exercise from your import to one in your library, or create it as a new custom exercise.
          </Text>
        }
        renderItem={({ item: csvName }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setPickerOpen(csvName)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.csvName}>{csvName}</Text>
              <Text
                style={[styles.mappedName, !isMapped(csvName) && styles.unmapped]}
                numberOfLines={1}
              >
                {getLabel(csvName)}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          allMapped ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.push('/import/confirm' as any)}
            >
              <Text style={styles.continueText}>Review Import →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.mappingHint}>
              {uniqueExerciseNames.filter((n) => exerciseMapping[n] === undefined).length} exercise
              {uniqueExerciseNames.filter((n) => exerciseMapping[n] === undefined).length !== 1 ? 's' : ''} still need a mapping.
            </Text>
          )
        }
      />

      <ExercisePickerModal
        visible={pickerOpen !== null}
        exercises={exercises}
        selectedId={pickerOpen ? exerciseMapping[pickerOpen] : undefined}
        onSelect={(id) => {
          if (pickerOpen) setExerciseMapping(pickerOpen, id);
        }}
        onClose={() => setPickerOpen(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { paddingBottom: 40 },
  hint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, gap: 3 },
  csvName: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  mappedName: { fontSize: 13, color: '#007AFF' },
  unmapped: { color: '#999' },
  chevron: { fontSize: 20, color: '#ccc', marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5e5', marginLeft: 16 },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    margin: 16,
    marginTop: 24,
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  mappingHint: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
    marginTop: 24,
    paddingHorizontal: 16,
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: { maxHeight: '85%' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '100%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { color: '#007AFF', fontSize: 16 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionRowSelected: { backgroundColor: '#F0F8FF' },
  optionName: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  optionMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  checkmark: { fontSize: 18, color: '#007AFF', marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e5e5', marginLeft: 16 },
});
