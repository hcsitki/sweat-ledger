import { useCallback, useLayoutEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getCompletedWorkouts } from '@/db/queries/history';
import { WorkoutHistoryItem } from '@/components/history/WorkoutHistoryItem';
import type { CompletedWorkoutSummary } from '@/db/types';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState<CompletedWorkoutSummary[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/import/' as any)} style={{ marginRight: 4 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>Import</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void getCompletedWorkouts(db).then(setWorkouts);
    }, [db])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <WorkoutHistoryItem
            workout={item}
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No workouts yet. Finish your first session to see history here.
          </Text>
        }
        contentContainerStyle={workouts.length === 0 ? styles.emptyContainer : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, lineHeight: 22 },
});
