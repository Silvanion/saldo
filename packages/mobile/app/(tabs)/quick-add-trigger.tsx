import React from 'react';
import { View } from 'react-native';

// Pusty komponent zastępczy – kliknięcie w ten tab jest przechwytywane przez tabBarButton w TabLayout
export default function QuickAddTriggerScreen() {
  return <View style={{ flex: 1, backgroundColor: '#020617' }} />;
}

