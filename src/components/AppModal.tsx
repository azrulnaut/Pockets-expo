import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { AddModalContent } from './modals/AddModalContent';
import { EditModalContent } from './modals/EditModalContent';
import { RebalanceModalContent } from './modals/RebalanceModalContent';
import { AccountTransferModalContent } from './modals/AccountTransferModalContent';
import { PurposeTransferModalContent } from './modals/PurposeTransferModalContent';

const MODAL_TITLES: Record<string, string> = {
  add: 'Add',
  edit: 'Edit',
  rebalance: 'Rebalance',
  deposit: 'Deposit',
  spend: 'Spend',
  accountTransfer: 'Transfer Between Accounts',
  purposeTransfer: 'Re-tag Purpose',
};

function ModalContent() {
  const modal = useAppStore((s) => s.modal);
  switch (modal.type) {
    case 'add':
      return <AddModalContent />;
    case 'edit':
      return <EditModalContent />;
    case 'rebalance':
      return <RebalanceModalContent />;
    case 'deposit':
      return <RebalanceModalContent />;
    case 'spend':
      return <RebalanceModalContent />;
    case 'accountTransfer':
      return <AccountTransferModalContent />;
    case 'purposeTransfer':
      return <PurposeTransferModalContent />;
    default:
      return null;
  }
}

function getTitle(modal: ReturnType<typeof useAppStore.getState>['modal']): string {
  if (modal.type === 'add') {
    return `Add ${modal.payload?.type === 'purpose' ? 'Purpose' : 'Account'}`;
  }
  if (modal.type === 'edit') {
    return `Edit ${modal.payload?.type === 'purpose' ? 'Purpose' : 'Account'}: ${modal.payload?.label ?? ''}`;
  }
  if (modal.type === 'rebalance') {
    return `Rebalance: ${modal.payload?.label ?? ''}`;
  }
  if (modal.type === 'deposit') {
    return `Deposit → ${modal.payload?.label ?? ''}`;
  }
  if (modal.type === 'spend') {
    return `Spend ← ${modal.payload?.label ?? ''}`;
  }
  return MODAL_TITLES[modal.type] ?? '';
}

export function AppModal() {
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  const isVisible = modal.type !== 'none';
  const title = getTitle(modal);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <ModalContent />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  body: {
    padding: 20,
  },
});
