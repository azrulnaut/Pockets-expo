import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Text, View, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export function Toast() {
  const toastMessage = useAppStore((s) => s.toastMessage);
  const opacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      setModalVisible(true);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setModalVisible(false);
      });
    } else {
      opacity.setValue(0);
      setModalVisible(false);
    }
  }, [toastMessage]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View pointerEvents="none" style={styles.overlay}>
        <Animated.View style={[styles.toast, { opacity }]}>
          <Text style={styles.text}>{toastMessage}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    maxWidth: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  text: {
    color: '#f8fafc',
    fontSize: 14,
    textAlign: 'center',
  },
});
