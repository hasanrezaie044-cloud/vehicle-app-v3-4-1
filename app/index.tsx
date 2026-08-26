import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Keyboard, Image, ImageBackground, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithBiometric, isAuthenticated, isLoading, needsPinSetup, completeFirstPinSetup } = useApp();
  const { colors, isDark } = useTheme();
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [newPin, setNewPin] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [setupError, setSetupError] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const gradientColors = isDark ? ['#0E1512', '#16201B'] as const : ['#0F5C4C', '#0A3F35'] as const;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const checkBiometric = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch {
        setBiometricAvailable(false);
      }
    };
    checkBiometric();
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (pinInput.length !== 5) {
      setError('رمز عبور باید ۵ رقم باشد');
      return;
    }
    setIsLoggingIn(true);
    try {
      const success = await login(pinInput);
      if (!success) {
        setError('رمز عبور اشتباه است');
        setPinInput('');
      }
    } catch {
      setError('خطا در ورود، دوباره تلاش کنید');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSetupContinue = () => {
    Keyboard.dismiss();
    if (newPin.length !== 5) {
      setSetupError('رمز باید ۵ رقم باشد');
      return;
    }
    setSetupError('');
    setSetupStep('confirm');
  };

  const handleSetupConfirm = async () => {
    Keyboard.dismiss();
    if (confirmPinInput !== newPin) {
      setSetupError('رمزها با هم یکسان نیستند، دوباره تلاش کنید');
      setConfirmPinInput('');
      return;
    }
    setIsLoggingIn(true);
    try {
      await completeFirstPinSetup(newPin);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>در حال بارگذاری...</Text>
      </View>
    );
  }

  if (needsPinSetup) {
    return (
      <ImageBackground source={require('@/assets/images/login-background.png')} resizeMode="cover" style={[styles.container, { paddingTop: topInset }]}>
        <LinearGradient colors={['rgba(3,9,14,0.25)','rgba(3,9,14,0.82)']} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={topInset}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
            <Text style={styles.title}>خوش آمدید 👋</Text>
            <Text style={styles.subtitle}>برای امنیت اطلاعات، یک رمز عبور تعیین کنید</Text>
            <Text style={styles.tagline}>{setupStep === 'enter' ? 'یک رمز ۵ رقمی وارد کنید' : 'رمز را دوباره وارد کنید'}</Text>

            <View style={styles.glassCard}>
              <View style={styles.cardHeader}><Ionicons name="shield-checkmark" size={18} color="#52E3C2" /><Text style={styles.cardHeaderText}>تعیین رمز عبور</Text></View>
              {setupStep === 'enter' ? (
                <>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed" size={19} color="rgba(255,255,255,0.7)" />
                    <TextInput
                      style={styles.input}
                      value={newPin}
                      onChangeText={(t) => { setNewPin(t.replace(/\D/g, '').slice(0, 5)); setSetupError(''); }}
                      placeholder="رمز ۵ رقمی جدید"
                      placeholderTextColor="rgba(255,255,255,0.55)"
                      secureTextEntry maxLength={5} keyboardType="number-pad" textAlign="right"
                      onSubmitEditing={handleSetupContinue}
                      autoFocus
                    />
                  </View>
                  {setupError !== '' && <View style={styles.errorRow}><Ionicons name="alert-circle" size={16} color="#FF8D78" /><Text style={styles.errorText}>{setupError}</Text></View>}
                  <TouchableOpacity style={styles.loginBtn} onPress={handleSetupContinue} activeOpacity={0.85}>
                    <Text style={styles.loginBtnText}>ادامه</Text><Ionicons name="arrow-back-outline" size={22} color="#071016" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed" size={19} color="rgba(255,255,255,0.7)" />
                    <TextInput
                      style={styles.input}
                      value={confirmPinInput}
                      onChangeText={(t) => { setConfirmPinInput(t.replace(/\D/g, '').slice(0, 5)); setSetupError(''); }}
                      placeholder="تکرار رمز عبور"
                      placeholderTextColor="rgba(255,255,255,0.55)"
                      secureTextEntry maxLength={5} keyboardType="number-pad" textAlign="right"
                      onSubmitEditing={handleSetupConfirm}
                      autoFocus
                    />
                  </View>
                  {setupError !== '' && <View style={styles.errorRow}><Ionicons name="alert-circle" size={16} color="#FF8D78" /><Text style={styles.errorText}>{setupError}</Text></View>}
                  <TouchableOpacity style={styles.loginBtn} onPress={handleSetupConfirm} activeOpacity={0.85} disabled={isLoggingIn}>
                    {isLoggingIn ? <ActivityIndicator size="small" color="#071016" /> : <><Text style={styles.loginBtnText}>تأیید و ورود</Text><Ionicons name="checkmark-circle-outline" size={22} color="#071016" /></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => { setSetupStep('enter'); setConfirmPinInput(''); setSetupError(''); }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>بازگشت و تغییر رمز</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={styles.secureLine}><Ionicons name="shield-checkmark-outline" size={18} color="#52E3C2" /><Text style={styles.secureText}>این رمز فقط روی همین گوشی ذخیره می‌شود</Text></View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('@/assets/images/login-background.png')} resizeMode="cover" style={[styles.container, { paddingTop: topInset }]}>
      <LinearGradient colors={['rgba(3,9,14,0.25)','rgba(3,9,14,0.82)']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={topInset}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>مدیریت ناوگان</Text>
        <Text style={styles.subtitle}>کارکرد، سرویس، هزینه‌ها و گزارش‌ها</Text>
        <Text style={styles.tagline}>همه‌چیز در یک مسیر</Text>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}><Ionicons name="shield-checkmark" size={18} color="#52E3C2" /><Text style={styles.cardHeaderText}>ورود امن</Text></View>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed" size={19} color="rgba(255,255,255,0.7)" />
            <TextInput style={styles.input} value={pinInput} onChangeText={(t)=>{setPinInput(t.replace(/\D/g,'').slice(0,5));setError('');}} placeholder="رمز ۵ رقمی" placeholderTextColor="rgba(255,255,255,0.55)" secureTextEntry maxLength={5} keyboardType="number-pad" textAlign="right" onSubmitEditing={handleLogin} />
          </View>
          {error !== '' && <View style={styles.errorRow}><Ionicons name="alert-circle" size={16} color="#FF8D78" /><Text style={styles.errorText}>{error}</Text></View>}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85} disabled={isLoggingIn}>
            {isLoggingIn ? <ActivityIndicator size="small" color="#071016" /> : <><Text style={styles.loginBtnText}>ورود</Text><Ionicons name="log-in-outline" size={24} color="#071016" /></>}
          </TouchableOpacity>
          {biometricAvailable && <TouchableOpacity style={styles.biometricBtn} onPress={async()=>{setIsLoggingIn(true);const ok=await loginWithBiometric();if(!ok)setError('احراز هویت اثر انگشت انجام نشد');setIsLoggingIn(false);}} disabled={isLoggingIn} activeOpacity={0.8}>
            <Ionicons name="finger-print" size={34} color="#52E3C2" /><Text style={styles.biometricText}>ورود با اثر انگشت</Text>
          </TouchableOpacity>}
        </View>
        <View style={styles.secureLine}><Ionicons name="shield-checkmark-outline" size={18} color="#52E3C2" /><Text style={styles.secureText}>اطلاعات شما امن و فقط روی دستگاه ذخیره می‌شود</Text></View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15 },
  container: { flex: 1, backgroundColor: '#071016' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24, alignItems: 'center' },
  logo: { width: 104, height: 104, borderRadius: 28, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#52E3C2', fontWeight: '700', marginTop: 5, textAlign: 'center' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 4, marginBottom: 24 },
  glassCard: { width: '100%', borderRadius: 24, padding: 18, backgroundColor: 'rgba(5,13,18,0.72)', borderWidth: 1, borderColor: 'rgba(82,227,194,0.38)' },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12 },
  cardHeaderText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  inputRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14 },
  input: { flex: 1, height: 48, color: '#fff', fontSize: 18, letterSpacing: 7 },
  errorRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 9 },
  errorText: { color: '#FF8D78', fontSize: 12, flex: 1, textAlign: 'right' },
  loginBtn: { marginTop: 13, minHeight: 54, borderRadius: 16, backgroundColor: '#52E3C2', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loginBtnText: { color: '#071016', fontSize: 17, fontWeight: '900' },
  biometricBtn: { marginTop: 11, minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(82,227,194,0.42)', backgroundColor: 'rgba(82,227,194,0.08)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 10 },
  biometricText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secureLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 18 },
  secureText: { color: 'rgba(255,255,255,0.72)', fontSize: 11.5, textAlign: 'center' },
});
