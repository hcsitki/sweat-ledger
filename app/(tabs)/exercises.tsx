import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ExercisesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Exercises</ThemedText>
      <ThemedText>Your exercise library lives here.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
