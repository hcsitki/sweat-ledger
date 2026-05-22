import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { saveWorkoutAsTemplate } from '@/db/queries/templates';

export default function SaveFromWorkoutScreen() {
  const db = useSQLiteContext();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this template.');
      return;
    }
    setSaving(true);
    try {
      await saveWorkoutAsTemplate(db, Number(sessionId), name.trim());
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Save as Template</Text>
          <Text style={styles.subtitle}>
            Give this template a name. Exercises and set counts will be saved with the reps from
            this session as targets.
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day"
            placeholderTextColor="#636366"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Template'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1C1C1E' },
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },

  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#8E8E93', lineHeight: 21 },

  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    backgroundColor: '#3A3A3C',
    color: '#FFFFFF',
  },

  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(0, 122, 255, 0.4)' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#8E8E93', fontSize: 16 },
});
