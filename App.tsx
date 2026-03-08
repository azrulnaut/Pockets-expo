import React, { Suspense } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
            Database initialization failed
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider databaseName="pockets.db" onInit={initializeDatabase} useSuspense>
          <SafeAreaProvider>
            <MainScreen />
          </SafeAreaProvider>
        </SQLiteProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
