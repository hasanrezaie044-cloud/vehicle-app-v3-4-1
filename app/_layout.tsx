import { Stack, useRouter, useNavigationContainerRef } from 'expo-router';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect } from 'react';
import { Alert, BackHandler, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupNotifications, scheduleDailyReminders, DEFAULT_REMINDER_PREFS } from '@/utils/notifications';

const REMINDER_PREFS_KEY = 'car_reminder_prefs';

function RootStack() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setupNotifications().then(async granted => {
      if (!granted) return;
      let prefs = DEFAULT_REMINDER_PREFS;
      try {
        const saved = await AsyncStorage.getItem(REMINDER_PREFS_KEY);
        if (saved) prefs = { ...DEFAULT_REMINDER_PREFS, ...JSON.parse(saved) };
      } catch {}
      scheduleDailyReminders(prefs);
    });
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // اگر صفحه‌ای برای برگشتن در پشته وجود دارد (مثلاً جزئیات آمار، فرم ویرایش و...)
      // دکمه برگشت گوشی باید همان کار فلش بالا را انجام دهد، نه بستن برنامه.
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      // فقط وقتی کاربر در ریشه ناوبری (تب‌ها) است، درباره خروج از برنامه بپرس.
      Alert.alert('خروج از برنامه', 'آیا می‌خواهید خارج شوید؟', [
        { text: 'خیر', style: 'cancel' },
        { text: 'بله، خارج شو', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stats-detail" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppProvider>
              <RootStack />
            </AppProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
