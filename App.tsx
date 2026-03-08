import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from './src/db/database';
import { MainScreen } from './src/screens/MainScreen';

export default function App() {
  return (
    <SQLiteProvider databaseName="pockets.db" onInit={initializeDatabase}>
      <SafeAreaProvider>
        <MainScreen />
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
