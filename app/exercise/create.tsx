import { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createCustomExercise,
  updateCustomExercise,
  getExerciseById,
} from '@/db/queries/exercises';
import { FilterBar } from '@/components/exercises/FilterBar';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

const EQUIPMENT_TYPES = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Band',
];


export default function CreateExerciseScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const isEditing = editId != null;

  useLayoutEffect(() => {
    if (isEditing) navigation.setOptions({ title: 'Edit Exercise' });
  }, [isEditing, navigation]);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [equipmentType, setEquipmentType] = useState(EQUIPMENT_TYPES[0]);
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    getExerciseById(db, Number(editId)).then((ex) => {
      if (!ex) return;
      setName(ex.name);
      setMuscleGroup(ex.muscle_group);
      setEquipmentType(ex.equipment_type);
      setIsBodyweight(ex.is_bodyweight === 1);
      setInstructions(ex.instructions ?? '');
    });
  }, [db, editId, isEditing]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name for the exercise.');
      return;
    }

    const data = {
      name: trimmed,
      muscleGroup,
      equipmentType,
      isBodyweight,
      instructions: instructions.trim() || undefined,
    };

    try {
      if (isEditing) {
        await updateCustomExercise(db, Number(editId), data);
      } else {
        await createCustomExercise(db, data);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save the exercise. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Cable Fly"
            placeholderTextColor="#636366"
            returnKeyType="done"
            autoFocus={!isEditing}
          />
        </View>

        <FilterBar label="Muscle Group" options={MUSCLE_GROUPS} selected={muscleGroup} onSelect={setMuscleGroup} />

        <FilterBar label="Equipment" options={EQUIPMENT_TYPES} selected={equipmentType} onSelect={setEquipmentType} />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Bodyweight exercise</Text>
            <Text style={styles.switchSub}>Reps-only; weight field is optional added weight</Text>
          </View>
          <Switch value={isBodyweight} onValueChange={setIsBodyweight} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Instructions (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Describe how to perform this exercise correctly…"
            placeholderTextColor="#636366"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>{isEditing ? 'Save Changes' : 'Create Exercise'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#1C1C1E' },
  content: { padding: 16, gap: 20 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  textArea: { height: 110, paddingTop: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  switchLabel: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  switchSub: { fontSize: 12, color: '#8E8E93', marginTop: 2, maxWidth: 220 },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
