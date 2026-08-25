import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 3,
          borderTopColor: colors.accent,
          elevation: 0,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0 : 0.06,
          shadowRadius: 8,
          height: (Platform.OS === 'web' ? 84 : 72) + Math.max(insets.bottom ?? 0, 10),
          paddingBottom: Math.max(insets.bottom ?? 0, 10),
          paddingTop: 8,
        },
        tabBarLabelStyle: { writingDirection: 'rtl', textAlign: 'center', fontSize: 11, marginTop: 2, fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'داشبورد',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="calendar" options={{
        title: 'تقویم',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="services" options={{
        title: 'سرویس‌ها',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'car' : 'car-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="costs" options={{
        title: 'هزینه‌ها',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="finance" options={{
        title: 'مالی',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'cash' : 'cash-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="reports" options={{
        title: 'گزارش‌ها',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={23} color={color} />
        ),
      }} />

      <Tabs.Screen name="settings" options={{
        title: 'تنظیمات',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} />
        ),
      }} />
    </Tabs>
  );
}
