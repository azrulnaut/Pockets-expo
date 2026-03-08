import { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from './src/db/database';
import { MainScreen } from './src/screens/MainScreen';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#3b82f6" size="large" />
    </View>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider databaseName="pockets.db" onInit={initializeDatabase} useSuspense>
        <SafeAreaProvider>
          <MainScreen />
        </SafeAreaProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
