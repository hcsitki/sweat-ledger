import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/store/workout';
import { getExercises } from '@/db/queries/exercises';
import { addWorkoutExercise } from '@/db/queries/sets';
import type { Exercise } from '@/db/types';

const MUSCLE_GROUPS = ['All', 'Back', 'Chest', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function AddExerciseScreen() {
  const db = useSQLiteContext();
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

  const filtered = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  const handleSelect = async (exercise: Exercise) => {
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
        value={search}
        onChangeText={setSearch}
        autoFocus
        returnKeyType="search"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        {MUSCLE_GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, selectedGroup === g && styles.chipActive]}
            onPress={() => setSelectedGroup(g)}
          >
            <Text style={[styles.chipText, selectedGroup === g && styles.chipTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            <Text style={styles.exerciseMeta}>
              {item.muscle_group} · {item.equipment_type}
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
  container: { flex: 1, backgroundColor: '#fff' },
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipContent: { paddingHorizontal: 12, gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontSize: 14 },
  chipTextActive: { color: '#fff', fontSize: 14 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseName: { fontSize: 16, fontWeight: '500' },
  exerciseMeta: { color: '#888', fontSize: 13, marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
