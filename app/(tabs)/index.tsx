import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LogScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Log</ThemedText>
      <ThemedText>Start a workout or pick a template.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
