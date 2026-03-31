import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Käytetään teeman värejä, mutta varmistetaan selkeys
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarButton: HapticTab,
        // Lisää pientä tyyliä alareunaan
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Aluevalvonta',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="shield-checkmark" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Raportointi',
          // Vaihdettu ikoni clipboardiksi, sopii paremmin raportointiin
          tabBarIcon: ({ color }) => <Ionicons size={26} name="clipboard" color={color} />,
        }}
      />
    </Tabs>
  );
}