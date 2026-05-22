import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  SectionList,
  TextInput,
  Text,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/store/workout';
import { getExercises } from '@/db/queries/exercises';
import { addWorkoutExercise } from '@/db/queries/sets';
import { FilterBar } from '@/components/exercises/FilterBar';
import { useTemplateEditorStore } from '@/store/template-editor';
import type { Exercise } from '@/db/types';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

type Section = { title: string; data: Exercise[] };

export default function AddExerciseScreen() {
  const db = useSQLiteContext();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const isTemplateMode = returnTo === 'template';

  const sessionId = useWorkoutStore((s) => s.sessionId);
  const workoutExercises = useWorkoutStore((s) => s.workoutExercises);
  const addExerciseToSession = useWorkoutStore((s) => s.addExerciseToSession);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  useEffect(() => {
    getExercises(
      db,
      selectedGroup !== 'All' ? { muscleGroup: selectedGroup } : undefined
    ).then(setExercises);
  }, [db, selectedGroup]);

  const sections = useMemo<Section[]>(() => {
    const source = search
      ? exercises.filter(
          (e) =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.base_name.toLowerCase().includes(search.toLowerCase())
        )
      : exercises;

    const map = new Map<string, Exercise[]>();
    for (const ex of source) {
      const key = ex.base_name || ex.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ex);
    }

    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [exercises, search]);

  const setPendingExercise = useTemplateEditorStore((s) => s.setPendingExercise);

  const handleSelect = async (exercise: Exercise) => {
    if (isTemplateMode) {
      setPendingExercise({
        id: exercise.id,
        name: exercise.name,
        isBodyweight: exercise.is_bodyweight === 1,
      });
      router.back();
      return;
    }
    if (sessionId == null) return;
    const orderIndex = workoutExercises.length;
    const workoutExerciseId = await addWorkoutExercise(db, sessionId, exercise.id, orderIndex);
    addExerciseToSession({
      workoutExerciseId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      isBodyweight: exercise.is_bodyweight === 1,
      orderIndex,
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises…"
        placeholderTextColor="#636366"
        value={search}
        onChangeText={setSearch}
        autoFocus
        returnKeyType="search"
      />
      <FilterBar options={MUSCLE_GROUPS} selected={selectedGroup} onSelect={setSelectedGroup} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) =>
          section.data.length > 1 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          ) : null
        }
        renderItem={({ item, section }) => (
          <TouchableOpacity
            style={[styles.row, section.data.length > 1 && styles.rowIndented]}
            onPress={() => handleSelect(item)}
          >
            <Text style={styles.exerciseName}>
              {section.data.length > 1 ? item.equipment_type : item.name}
            </Text>
            <Text style={styles.exerciseMeta}>
              {item.muscle_group}
              {section.data.length === 1 ? ` · ${item.equipment_type}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exercises found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E' },
  search: {
    margin: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#3A3A3C',
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
    backgroundColor: '#2C2C2E',
  },
  rowIndented: {
    paddingLeft: 24,
  },
  exerciseName: { fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  exerciseMeta: { color: '#8E8E93', fontSize: 13, marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 40 },
});
