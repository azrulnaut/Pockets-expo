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

export function MainScreen() {
  const db = useSQLiteContext();
  const loadState = useAppStore((s) => s.loadState);

  useEffect(() => {
    loadState(db);
  }, [db]);

  return (
    <View style={styles.container}>
      <BalanceHeader />
      <TabBar />
      <AddBar />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <DimensionList />
      </ScrollView>
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
