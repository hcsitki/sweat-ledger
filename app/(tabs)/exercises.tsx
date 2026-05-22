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
import { getExerciseGroups } from '@/db/queries/exercises';
import { FilterBar } from '@/components/exercises/FilterBar';
import type { ExerciseGroup } from '@/db/types';

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

const EQUIPMENT_TYPES = [
  'All', 'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Band',
];

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('All');
  const [equipmentType, setEquipmentType] = useState('All');
  const [performedOnly, setPerformedOnly] = useState(false);

  const load = useCallback(async () => {
    const results = await getExerciseGroups(db, {
      muscleGroup: muscleGroup !== 'All' ? muscleGroup : undefined,
      equipmentType: equipmentType !== 'All' ? equipmentType : undefined,
      performedOnly,
    });
    setGroups(results);
  }, [db, muscleGroup, equipmentType, performedOnly]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = search
    ? groups.filter((g) => g.base_name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises…"
        placeholderTextColor="#636366"
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
        keyExtractor={(item) => item.base_name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/exercise/group', params: { baseName: item.base_name } })}
          >
            <View style={styles.main}>
              <Text style={styles.name}>{item.base_name}</Text>
              <Text style={styles.meta}>
                {item.muscle_group}
                {item.variant_count > 1 ? ` · ${item.variant_count} variations` : ''}
              </Text>
            </View>
            <View style={styles.right}>
              {item.has_performed === 1 && <View style={styles.dot} />}
            </View>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#1C1C1E' },
  search: {
    margin: 12,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#3A3A3C',
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  toggleLabel: { fontSize: 15, color: '#FFFFFF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
    backgroundColor: '#2C2C2E',
  },
  main: { flex: 1 },
  name: { fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
  meta: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF' },
  empty: { textAlign: 'center', color: '#8E8E93', fontSize: 15, marginTop: 40 },
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
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' },
});
