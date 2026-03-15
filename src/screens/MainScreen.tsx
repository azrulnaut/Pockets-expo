import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../store/useAppStore';
import { BalanceHeader } from '../components/BalanceHeader';
import { TabBar } from '../components/TabBar';
import { AddBar } from '../components/AddBar';
import { DimensionList } from '../components/DimensionList';
import { Taskbar } from '../components/Taskbar';
import { AppModal } from '../components/AppModal';
import { Toast } from '../components/Toast';
import { EditModeScreen } from './EditModeScreen';

export function MainScreen() {
  const db = useSQLiteContext();
  const loadState = useAppStore((s) => s.loadState);
  const activeScreen = useAppStore((s) => s.activeScreen);

  useEffect(() => {
    loadState(db);
  }, [db]);

  return (
    <View style={styles.container}>
      {activeScreen === 'main' ? (
        <>
          <BalanceHeader />
          <TabBar />
          <AddBar />
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <DimensionList />
          </ScrollView>
        </>
      ) : (
        <EditModeScreen />
      )}
      <Taskbar />
      <AppModal />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
});
