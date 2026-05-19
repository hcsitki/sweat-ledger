import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { migrateDb } from '@/db/schema';
import { requestNotificationPermissions } from '@/utils/notifications';
import { SessionRestorer } from '@/components/workout/SessionRestorer';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <SQLiteProvider databaseName="sweat-ledger.db" onInit={migrateDb}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionRestorer />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="workout/active" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/add-exercise"
            options={{ title: 'Add Exercise', presentation: 'modal' }}
          />
          <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
          <Stack.Screen
            name="exercise/create"
            options={{ title: 'New Exercise', presentation: 'modal' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
