import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, ReceiptText, PieChart, Landmark, PlusCircle } from 'lucide-react-native';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
  const router = useRouter();

  const handleQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/modals/quick-add');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#38bdf8', // Sky 400
        tabBarInactiveTintColor: '#64748b', // Slate 500
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulpit',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Historia',
          tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="quick-add-trigger"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              onPress={handleQuickAdd}
              style={styles.floatingButtonContainer}
              activeOpacity={0.8}
            >
              <View style={styles.floatingButton}>
                <PlusCircle color="#0f172a" size={32} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budżet & Podatki',
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="networth"
        options={{
          title: 'Majątek',
          tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
});
