import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getExercises, getPerformedExerciseIds } from '@/db/queries/exercises';
import { FilterBar } from '@/components/exercises/FilterBar';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import type { Exercise } from '@/db/types';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

const EQUIPMENT_TYPES = [
  'All', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Band',
];

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [performedIds, setPerformedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('All');
  const [equipmentType, setEquipmentType] = useState('All');
  const [performedOnly, setPerformedOnly] = useState(false);

  const load = useCallback(async () => {
    const results = await getExercises(db, {
      muscleGroup: muscleGroup !== 'All' ? muscleGroup : undefined,
      equipmentType: equipmentType !== 'All' ? equipmentType : undefined,
      performedOnly,
    });
    setExercises(results);
  }, [db, muscleGroup, equipmentType, performedOnly]);

  const loadPerformedIds = useCallback(async () => {
    setPerformedIds(await getPerformedExerciseIds(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      void loadPerformedIds();
    }, [loadPerformedIds])
  );

  const filtered = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      <FilterBar options={MUSCLE_GROUPS} selected={muscleGroup} onSelect={setMuscleGroup} />
      <FilterBar options={EQUIPMENT_TYPES} selected={equipmentType} onSelect={setEquipmentType} />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Performed only</Text>
        <Switch value={performedOnly} onValueChange={setPerformedOnly} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExerciseListItem
            exercise={item}
            hasStats={performedIds.has(item.id)}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {performedOnly ? 'Log your first workout to see stats here.' : 'No exercises found.'}
          </Text>
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/exercise/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: {
    margin: 12,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  toggleLabel: { fontSize: 15, color: '#333' },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, marginTop: 40 },
  emptyContainer: { flex: 1 },
  listContent: { paddingBottom: 90 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' },
});
