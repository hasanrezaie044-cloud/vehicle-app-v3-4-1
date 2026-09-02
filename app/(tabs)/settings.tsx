import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { ScreenHeader } from '@/components/ui/UI';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import JalaliDatePicker from '@/components/JalaliDatePicker';
import { exportBackup } from '@/utils/backupExport';
import { sendTestNotification, scheduleDailyReminders, cancelAllReminders, DEFAULT_REMINDER_PREFS } from '@/utils/notifications';

const REMINDER_PREFS_KEY = 'car_reminder_prefs';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    rates, updateRates, changePin, logout, exportAllData, importAllData,
    formatNumber, services, fuels, maintenances, loans, personalExpenses, recalculateAllServices,
    lockEnabled, setLockEnabled,
  } = useApp();
  const { colors, mode, setMode, isDark } = useTheme();

  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const [showRates, setShowRates] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');
  const [vehicleInsuranceDate, setVehicleInsuranceDate] = useState('');

  const [oilChangeInterval, setOilChangeInterval] = useState(rates.oilChangeKmInterval?.toString() || '10000');
  const [timingBeltInterval, setTimingBeltInterval] = useState(rates.timingBeltKmInterval?.toString() || '80000');

  const [nightRate, setNightRate] = useState(rates.nightKm.toString());
  const [holidayRate, setHolidayRate] = useState(rates.holidayKm.toString());
  const [fixedRequestRate, setFixedRequestRate] = useState(rates.fixedRequestKm.toString());
  const [hourRate, setHourRate] = useState(rates.hour.toString());
  const [fuelGovRate, setFuelGovRate] = useState(rates.fuelPriceGov.toString());
  const [fuelSemiRate, setFuelSemiRate] = useState(rates.fuelPriceSemi.toString());
  const [fuelFreeRate, setFuelFreeRate] = useState(rates.fuelPriceFree.toString());
  const [tollRate, setTollRate] = useState(rates.toll.toString());
  const [nightPercent, setNightPercent] = useState(rates.nightPercent.toString());
  const [saharPercent, setSaharPercent] = useState(rates.saharPercent.toString());
  const [carType, setCarType] = useState<'soren' | 'tara'>(rates.defaultCarType);

  const [reminderPrefs, setReminderPrefs] = useState(DEFAULT_REMINDER_PREFS);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(REMINDER_PREFS_KEY),
      AsyncStorage.getItem('car_monthly_income_goal'),
      AsyncStorage.getItem('car_insurance_expiry'),
      AsyncStorage.getItem('car_vehicle_insurance_expiry'),
     ]).then(([saved, goal, insurance, vehicleInsurance]) => {
      if (saved) { try { setReminderPrefs({ ...DEFAULT_REMINDER_PREFS, ...JSON.parse(saved) }); } catch {} }
      if (goal) setMonthlyGoal(goal);
      if (insurance) setInsuranceDate(insurance);
      if (vehicleInsurance) setVehicleInsuranceDate(vehicleInsurance);
    }).catch(() => {});
  }, []);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const buildRates = () => ({
    nightKm: parseInt(nightRate) || 0,
    holidayKm: parseInt(holidayRate) || 0,
    fixedRequestKm: parseInt(fixedRequestRate) || 0,
    hour: parseInt(hourRate) || 0,
    fuelPriceGov: parseInt(fuelGovRate) || 0,
    fuelPriceSemi: parseInt(fuelSemiRate) || 0,
    fuelPriceFree: parseInt(fuelFreeRate) || 0,
    toll: parseInt(tollRate) || 0,
    // درصد شب/سحرگاه فقط ضریبی روی نرخ پایه ساعتی موجود هستند (نه نرخ پایه جدید).
    // مقدار ۰ یعنی افزایش زمانی به‌طور کامل غیرفعال است، نه حذف قابلیت.
    nightPercent: nightPercent.trim() === '' ? 0 : (parseInt(nightPercent) || 0),
    saharPercent: saharPercent.trim() === '' ? 0 : (parseInt(saharPercent) || 0),
    defaultCarType: carType,
  });

  const handleSaveRates = () => {
    updateRates(buildRates());
    showMsg('نرخ‌ها با موفقیت ذخیره شدند');
  };

  const handleSaveAndRecalculate = () => {
    Alert.alert(
      'به‌روزرسانی قیمت‌ها',
      `آیا می‌خواهید نرخ‌های جدید ذخیره شوند و درآمد تمام ${services.length} سرویس ثبت‌شده بر اساس نرخ‌های جدید محاسبه مجدد شوند؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله، به‌روزرسانی کن',
          onPress: () => {
            updateRates(buildRates());
            setTimeout(() => {
              recalculateAllServices();
              showMsg(`نرخ‌ها ذخیره و ${services.length} سرویس بازمحاسبه شدند ✓`);
            }, 100);
          },
        },
      ]
    );
  };

  const handleChangePin = async () => {
    setPinError('');
    setPinSuccess('');
    if (newPin.length !== 5) { setPinError('رمز جدید باید ۵ رقم باشد'); return; }
    if (newPin !== confirmPin) { setPinError('رمز جدید و تکرار آن یکسان نیست'); return; }
    if (!/^\d{5}$/.test(newPin)) { setPinError('رمز باید فقط عدد باشد'); return; }
    setIsChangingPin(true);
    try {
      await changePin(newPin);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      setPinSuccess('رمز عبور با موفقیت تغییر کرد');
    } catch {
      setPinError('خطا در تغییر رمز، دوباره تلاش کنید');
    } finally {
      setIsChangingPin(false);
    }
  };

  const handleExport = async () => {
    try {
      const base = JSON.parse(exportAllData());
      const [themeMode, reminderPrefsRaw, monthlyGoalRaw, insuranceRaw, vehicleInsuranceRaw] = await Promise.all([
        AsyncStorage.getItem('car_theme_mode'),
        AsyncStorage.getItem(REMINDER_PREFS_KEY),
        AsyncStorage.getItem('car_monthly_income_goal'),
        AsyncStorage.getItem('car_insurance_expiry'),
        AsyncStorage.getItem('car_vehicle_insurance_expiry'),
      ]);
      base.appSettings = {
        themeMode: themeMode || 'system',
        reminderPrefs: reminderPrefsRaw ? JSON.parse(reminderPrefsRaw) : DEFAULT_REMINDER_PREFS,
        monthlyIncomeGoal: monthlyGoalRaw || '0',
        insuranceExpiry: insuranceRaw || '',
        vehicleInsuranceExpiry: vehicleInsuranceRaw || '',
      };
      await exportBackup(base);
      showMsg('پشتیبان کامل برنامه با موفقیت ذخیره شد ✓');
    } catch {
      showMsg('ذخیره پشتیبان انجام نشد؛ دسترسی پوشه را تأیید کنید', 'error');
    }
  };

  const handleSmartImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        try {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
          const parsed = JSON.parse(fileContent);
          const importResult = importAllData(fileContent);
          if (importResult.success && parsed.appSettings) {
            const cfg = parsed.appSettings;
            if (cfg.themeMode === 'light' || cfg.themeMode === 'dark' || cfg.themeMode === 'system') {
              await AsyncStorage.setItem('car_theme_mode', cfg.themeMode);
            }
            if (cfg.reminderPrefs) {
              await AsyncStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify({ ...DEFAULT_REMINDER_PREFS, ...cfg.reminderPrefs }));
              setReminderPrefs({ ...DEFAULT_REMINDER_PREFS, ...cfg.reminderPrefs });
            }
            await AsyncStorage.setItem('car_monthly_income_goal', String(cfg.monthlyIncomeGoal ?? '0'));
            await AsyncStorage.setItem('car_insurance_expiry', String(cfg.insuranceExpiry ?? ''));
            await AsyncStorage.setItem('car_vehicle_insurance_expiry', String(cfg.vehicleInsuranceExpiry ?? ''));
          }
          showMsg(importResult.message + (importResult.success ? ' ✓' : ''), importResult.success ? 'success' : 'error');
        } catch {
          showMsg('خطا در خواندن فایل', 'error');
        }
      }
    } catch {
      showMsg('خطا در انتخاب فایل', 'error');
    }
  };

  const confirmClear = () => {
    importAllData(JSON.stringify({ services: [], fuels: [], maintenances: [], loans: [], personalExpenses: [], personnel: [], suggestions: {} }));
    setShowClearConfirm(false);
    showMsg('تمام داده‌ها پاک شدند');
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const saveReminderPrefs = async (next: typeof reminderPrefs) => {
    setReminderPrefs(next);
    await AsyncStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify(next)).catch(() => {});
    const anyOn = Object.values(next).some(Boolean);
    if (anyOn) await scheduleDailyReminders(next);
    else await cancelAllReminders();
  };

  const savePlanning = async () => {
    await AsyncStorage.setItem('car_monthly_income_goal', monthlyGoal || '0');
    await AsyncStorage.setItem('car_insurance_expiry', insuranceDate || '');
    await AsyncStorage.setItem('car_vehicle_insurance_expiry', vehicleInsuranceDate || '');
    showMsg('هدف درآمد و تاریخ‌های یادآوری ذخیره شد ✓');
  };

  const renderRateInput = (label: string, value: string, setter: (v: string) => void) => (
    <View style={styles.rateRow} key={label}>
      <FormattedNumberInput style={[styles.rateInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]} value={value} onChangeText={setter} textAlign="center" />
      <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderSection = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    isOpen: boolean,
    toggle: () => void,
    content: React.ReactNode
  ) => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.7}>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        <View style={styles.sectionHeaderContent}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <View style={[styles.sectionIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
        </View>
      </TouchableOpacity>
      {isOpen && <View style={styles.sectionContent}>{content}</View>}
    </View>
  );

  const ToggleRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
      <View style={[styles.toggleTrack, { backgroundColor: value ? colors.accent : colors.surfaceAlt }]}>
        <View style={[styles.toggleThumb, { backgroundColor: '#fff', alignSelf: value ? 'flex-start' : 'flex-end' }]} />
      </View>
      <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        bottomOffset={40}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: topInset }}>
          <ScreenHeader title="تنظیمات" icon="settings" subtitle="مدیریت نرخ‌ها، ظاهر و داده‌ها" />
        </View>

        <View style={styles.content}>
          {message !== '' && (
            <View style={[styles.messageBox, { backgroundColor: messageType === 'error' ? colors.dangerSoft : colors.successSoft }]}>
              <Ionicons name={messageType === 'error' ? 'close-circle' : 'checkmark-circle'} size={18} color={messageType === 'error' ? colors.danger : colors.success} />
              <Text style={[styles.messageText, { color: messageType === 'error' ? colors.danger : colors.success }]}>{message}</Text>
            </View>
          )}

          {/* APPEARANCE */}
          {renderSection('ظاهر برنامه', 'color-palette', showAppearance, () => setShowAppearance(!showAppearance), (
            <View>
              <Text style={[styles.groupTitle, { color: colors.accentText, borderBottomColor: colors.borderSoft }]}>حالت نمایش</Text>
              <View style={styles.themeRow}>
                {[
                  { key: 'light', label: 'روشن', icon: 'sunny' as const },
                  { key: 'dark', label: 'تیره', icon: 'moon' as const },
                  { key: 'system', label: 'سیستم', icon: 'phone-portrait' as const },
                ].map(opt => {
                  const active = mode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.themeBtn, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surfaceAlt }]}
                      onPress={() => setMode(opt.key as any)}
                    >
                      <Ionicons name={opt.icon} size={20} color={active ? colors.accent : colors.textMuted} />
                      <Text style={[styles.themeBtnText, { color: active ? colors.accentText : colors.textMuted }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* RATES */}
          {renderSection('تنظیم نرخ‌ها', 'calculator', showRates, () => setShowRates(!showRates), (
            <View>
              <Text style={[styles.groupTitle, { color: colors.accentText, borderBottomColor: colors.borderSoft }]}>نرخ سرویس‌ها (تومان)</Text>
              <Text style={[styles.groupHint, { color: colors.textMuted }]}>مدل نرخ‌گذاری ساده شده: سه نرخ کیلومتری + یک نرخ مشترک برای تمام ساعت‌ها.</Text>
              {renderRateInput('شب — هر کیلومتر', nightRate, setNightRate)}
              {renderRateInput('تعطیل — هر کیلومتر', holidayRate, setHolidayRate)}
              {renderRateInput('ثابت و درخواست — هر کیلومتر', fixedRequestRate, setFixedRequestRate)}
              {renderRateInput('تمام ساعت‌ها — هر ساعت', hourRate, setHourRate)}

              <Text style={[styles.groupTitle, { marginTop: 16, color: colors.accentText, borderBottomColor: colors.borderSoft }]}>نرخ سوخت (تومان/لیتر)</Text>
              {renderRateInput('دولتی', fuelGovRate, setFuelGovRate)}
              {renderRateInput('نیمه آزاد', fuelSemiRate, setFuelSemiRate)}
              {renderRateInput('آزاد', fuelFreeRate, setFuelFreeRate)}

              <Text style={[styles.groupTitle, { marginTop: 16, color: colors.accentText, borderBottomColor: colors.borderSoft }]}>سایر</Text>
              {renderRateInput('عوارض — هر بار', tollRate, setTollRate)}

              <Text style={[styles.groupTitle, { marginTop: 16, color: colors.accentText, borderBottomColor: colors.borderSoft }]}>افزایش زمانی ساعت کارکرد (٪)</Text>
              <Text style={[styles.groupHint, { color: colors.textMuted }]}>
                این درصدها نرخ پایه ساعتی را جایگزین نمی‌کنند؛ فقط روی سهمی از ساعت کارکرد که در بازه زمانی مربوطه قرار می‌گیرد اعمال می‌شوند. مقدار ۰ یعنی افزایش برای همان بازه کاملاً غیرفعال است.
              </Text>
              {renderRateInput('درصد شب (۱۷:۳۰ تا ۲۰:۰۰)', nightPercent, setNightPercent)}
              {renderRateInput('درصد سحرگاه (۲۰:۰۰ تا ۰۶:۰۰)', saharPercent, setSaharPercent)}

              <Text style={[styles.groupTitle, { marginTop: 16, color: colors.accentText, borderBottomColor: colors.borderSoft }]}>نوع خودرو پیش‌فرض</Text>
              <View style={styles.carTypeRow}>
                <TouchableOpacity
                  style={[styles.carTypeBtn, { borderColor: carType === 'soren' ? colors.accent : colors.border, backgroundColor: carType === 'soren' ? colors.accentSoft : colors.surfaceAlt }]}
                  onPress={() => setCarType('soren')}
                >
                  <Text style={[styles.carTypeBtnText, { color: carType === 'soren' ? colors.accentText : colors.textMuted, fontWeight: carType === 'soren' ? '700' : '500' }]}>سورن</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.carTypeBtn, { borderColor: carType === 'tara' ? colors.accent : colors.border, backgroundColor: carType === 'tara' ? colors.accentSoft : colors.surfaceAlt }]}
                  onPress={() => setCarType('tara')}
                >
                  <Text style={[styles.carTypeBtnText, { color: carType === 'tara' ? colors.accentText : colors.textMuted, fontWeight: carType === 'tara' ? '700' : '500' }]}>تارا</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSaveRates} activeOpacity={0.8}>
                <Ionicons name="checkmark" size={20} color={colors.textOnAccent} />
                <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>ذخیره نرخ‌ها</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.recalcBtn, { backgroundColor: colors.mission }]} onPress={handleSaveAndRecalculate} activeOpacity={0.8}>
                <Ionicons name="refresh-circle" size={22} color="#fff" />
                <Text style={styles.recalcBtnText}>ذخیره و به‌روزرسانی قیمت تمام سرویس‌ها</Text>
              </TouchableOpacity>
              <Text style={[styles.recalcHint, { color: colors.textSecondary, backgroundColor: colors.missionSoft }]}>
                این گزینه نرخ‌ها را ذخیره کرده و درآمد تمام {services.length} سرویس ثبت‌شده را بر اساس نرخ‌های جدید محاسبه مجدد می‌کند.
              </Text>
            </View>
          ))}

          {/* PLANNING */}
          {renderSection('هدف و یادآوری‌های خودرو', 'flag', showPlanning, () => setShowPlanning(!showPlanning), (
            <View>
              <Text style={[styles.groupHint, { color: colors.textMuted }]}>برای هدف درآمد ماهانه و یادآوری بیمه بدنه و بیمه خودرو تاریخ تعیین کنید.</Text>
              <Text style={[styles.groupTitle, { color: colors.accentText, borderBottomColor: colors.borderSoft }]}>هدف درآمد ماهانه (تومان)</Text>
              <FormattedNumberInput style={[styles.rateInputFull, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]} value={monthlyGoal} onChangeText={setMonthlyGoal} placeholder="مثلاً ۷۰,۰۰۰,۰۰۰" textAlign="right" />
              <View style={styles.dateSingle}>
                <JalaliDatePicker value={insuranceDate} onSelect={setInsuranceDate} label="بیمه بدنه" />
                <JalaliDatePicker value={vehicleInsuranceDate} onSelect={setVehicleInsuranceDate} label="بیمه خودرو" />
              </View>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={savePlanning} activeOpacity={0.8}>
                <Ionicons name="save-outline" size={20} color={colors.textOnAccent} />
                <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>ذخیره برنامه و یادآوری‌ها</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* PIN */}
          {renderSection('تغییر رمز عبور و قفل برنامه', 'lock-closed', showPin, () => setShowPin(!showPin), (
            <View>
              <ToggleRow
                label="قفل ورود به برنامه"
                value={lockEnabled}
                onChange={(v) => {
                  setLockEnabled(v);
                  showMsg(v ? 'قفل ورود فعال شد؛ از دفعه بعد رمز/اثر انگشت درخواست می‌شود' : 'قفل ورود غیرفعال شد؛ برنامه بدون درخواست رمز باز می‌شود');
                }}
              />
              <Text style={[styles.groupHint, { color: colors.textMuted, marginBottom: 12 }]}>
                {lockEnabled
                  ? 'در باز شدن بعدی برنامه، رمز عبور یا اثر انگشت درخواست می‌شود.'
                  : 'در باز شدن بعدی برنامه، بدون درخواست رمز یا اثر انگشت مستقیماً وارد می‌شوید.'}
              </Text>
              <View style={styles.pinRow}>
                <TextInput
                  style={[styles.pinInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  value={newPin} onChangeText={setNewPin} placeholder="رمز جدید (۵ رقم)" placeholderTextColor={colors.textMuted}
                  secureTextEntry maxLength={5} keyboardType="number-pad" textAlign="right"
                />
                <Ionicons name="lock-open" size={18} color={colors.textMuted} />
              </View>
              <View style={styles.pinRow}>
                <TextInput
                  style={[styles.pinInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]}
                  value={confirmPin} onChangeText={setConfirmPin} placeholder="تکرار رمز جدید" placeholderTextColor={colors.textMuted}
                  secureTextEntry maxLength={5} keyboardType="number-pad" textAlign="right"
                />
                <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
              </View>
              {pinError !== '' && <Text style={[styles.errorText, { color: colors.danger }]}>{pinError}</Text>}
              {pinSuccess !== '' && <Text style={[styles.successText, { color: colors.success }]}>{pinSuccess}</Text>}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }, isChangingPin && { opacity: 0.6 }]}
                onPress={handleChangePin} activeOpacity={0.8} disabled={isChangingPin}
              >
                <Ionicons name="checkmark" size={20} color={colors.textOnAccent} />
                <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>تغییر رمز</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* BACKUP */}
          {renderSection('پشتیبان‌گیری', 'cloud', showBackup, () => setShowBackup(!showBackup), (
            <View>
              <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>سرویس‌ها: {services.length}</Text>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>سوخت‌گیری: {fuels.length}</Text>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>تعمیرات: {maintenances.length}</Text>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>وام‌ها: {loans.length}</Text>
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>خریدها و هزینه‌های شخصی: {personalExpenses.length}</Text>
              </View>

              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.success }]} onPress={handleExport} activeOpacity={0.8}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.exportBtnText}>پشتیبان JSON / ارسال به Google Drive</Text>
              </TouchableOpacity>

              <Text style={[styles.importLabel, { color: colors.textSecondary }]}>بازیابی از فایل:</Text>
              <TouchableOpacity style={[styles.importBtn, { backgroundColor: colors.info }]} onPress={handleSmartImport} activeOpacity={0.8}>
                <Ionicons name="folder-open" size={18} color="#fff" />
                <Text style={styles.importBtnText}>انتخاب فایل JSON</Text>
              </TouchableOpacity>

              <Text style={[styles.importHint, { color: colors.warning, backgroundColor: colors.warningSoft }]}>
                ⚠️ رمز عبور از فایل پشتیبان وارد نمی‌شود و رمز فعلی شما حفظ می‌ماند.
              </Text>

              {showClearConfirm ? (
                <View style={[styles.confirmBox, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
                  <Text style={[styles.confirmText, { color: colors.text }]}>آیا مطمئن هستید؟ تمام داده‌ها پاک خواهند شد!</Text>
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity style={[styles.confirmYes, { backgroundColor: colors.danger }]} onPress={confirmClear}>
                      <Text style={styles.confirmYesText}>بله، پاک کن</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.confirmNo, { backgroundColor: colors.surfaceAlt }]} onPress={() => setShowClearConfirm(false)}>
                      <Text style={[styles.confirmNoText, { color: colors.text }]}>انصراف</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={[styles.dangerBtn, { borderColor: colors.danger }]} onPress={() => setShowClearConfirm(true)} activeOpacity={0.8}>
                  <Ionicons name="trash" size={20} color={colors.danger} />
                  <Text style={[styles.dangerBtnText, { color: colors.danger }]}>پاک کردن تمام داده‌ها</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* NOTIFICATIONS */}
          {renderSection('اعلان‌ها و یادآوری‌ها', 'notifications', showNotifications, () => setShowNotifications(!showNotifications), (
            <View>
              <Text style={[styles.groupTitle, { color: colors.accentText, borderBottomColor: colors.borderSoft }]}>یادآوری‌های هوشمند</Text>
              <ToggleRow label="یادآوری ثبت سرویس روزانه" value={reminderPrefs.dailyLogReminder} onChange={(v) => saveReminderPrefs({ ...reminderPrefs, dailyLogReminder: v })} />
              <ToggleRow label="خلاصه کارکرد هر روز (ساعت/کیلومتر)" value={reminderPrefs.dailySummary} onChange={(v) => saveReminderPrefs({ ...reminderPrefs, dailySummary: v })} />
              <ToggleRow label="خلاصه هفتگی" value={reminderPrefs.weeklySummary} onChange={(v) => saveReminderPrefs({ ...reminderPrefs, weeklySummary: v })} />
              <ToggleRow label="خلاصه ماهانه" value={reminderPrefs.monthlySummary} onChange={(v) => saveReminderPrefs({ ...reminderPrefs, monthlySummary: v })} />
              <ToggleRow label="هشدار تعویض روغن بر اساس کیلومتر" value={reminderPrefs.oilChangeAlert} onChange={(v) => saveReminderPrefs({ ...reminderPrefs, oilChangeAlert: v })} />

              <Text style={[styles.groupTitle, { marginTop: 16, color: colors.accentText, borderBottomColor: colors.borderSoft }]}>بازه‌های نگهداری خودرو</Text>
              <View style={styles.notifRow}>
                <FormattedNumberInput style={[styles.notifInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]} value={oilChangeInterval} onChangeText={setOilChangeInterval} placeholder="10000" />
                <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>فاصله تعویض روغن (کیلومتر)</Text>
              </View>
              <View style={styles.notifRow}>
                <FormattedNumberInput style={[styles.notifInput, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.text }]} value={timingBeltInterval} onChangeText={setTimingBeltInterval} placeholder="80000" />
                <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>فاصله تعمیر تسمه تایمینگ (کیلومتر)</Text>
              </View>

              <TouchableOpacity style={[styles.testNotifBtn, { backgroundColor: colors.mission }]} onPress={async () => {
                const ok = await sendTestNotification();
                showMsg(ok ? 'یک اعلان آزمایشی تا چند ثانیه دیگر نمایش داده می‌شود ✓' : 'اجازه اعلان داده نشد؛ تنظیمات اعلان گوشی را بررسی کنید', ok ? 'success' : 'error');
              }} activeOpacity={0.8}>
                <Ionicons name="notifications" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>فعال‌سازی و تست اعلان‌ها</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  updateRates({
                    oilChangeKmInterval: parseInt(oilChangeInterval) || 10000,
                    timingBeltKmInterval: parseInt(timingBeltInterval) || 80000,
                  });
                  showMsg('تنظیمات یادآوری ذخیره شدند ✓');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color={colors.textOnAccent} />
                <Text style={[styles.saveBtnText, { color: colors.textOnAccent }]}>ذخیره</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* ABOUT */}
          {renderSection('درباره برنامه', 'information-circle', showAbout, () => setShowAbout(!showAbout), (
            <View style={styles.aboutContent}>
              <View style={[styles.aboutIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="car-sport" size={48} color={colors.accent} />
              </View>
              <Text style={[styles.aboutTitle, { color: colors.text }]}>سیستم مدیریت خودرو</Text>
              <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>نسخه ۳.۴.۱</Text>
              <Text style={[styles.aboutDesc, { color: colors.textSecondary }]}>مدیریت کامل سرویس‌ها، سوخت و تعمیرات با گزارش‌های مالی و یادآوری‌های هوشمند</Text>
              <View style={[styles.authorCard, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="code-slash" size={20} color={colors.accent} />
                <Text style={[styles.authorText, { color: colors.accentText }]}>طراحی و توسعه توسط حسن رضائی خولنجانی</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.privacyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/privacy-policy')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <Text style={[styles.privacyBtnText, { color: colors.text }]}>حریم خصوصی</Text>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.danger }]} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out" size={22} color={colors.danger} />
            <Text style={[styles.logoutBtnText, { color: colors.danger }]}>خروج از حساب</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120 },
  messageBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: 12, borderRadius: radii.md, marginBottom: 12 },
  messageText: { fontSize: 14, fontWeight: '500', writingDirection: 'rtl', flex: 1, textAlign: 'right' },
  section: { borderRadius: radii.lg, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionHeaderContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  groupTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right', marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, writingDirection: 'rtl' },
  groupHint: { fontSize: 11.5, textAlign: 'right', marginBottom: 10, lineHeight: 17, writingDirection: 'rtl' },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: { flex: 1, borderWidth: 1.5, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', gap: 6 },
  themeBtnText: { fontSize: 12.5, fontWeight: '700' },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 },
  rateLabel: { flex: 1, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  rateInput: { width: 120, height: 42, borderWidth: 1, borderRadius: 10, fontSize: 15, textAlign: 'center' },
  rateInputFull: { height: 46, borderWidth: 1, borderRadius: 10, fontSize: 15, paddingHorizontal: 12, marginBottom: 12 },
  datePair: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  carTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 16, justifyContent: 'flex-end' },
  carTypeBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  carTypeBtnText: { fontSize: 14 },
  saveBtn: { paddingVertical: 14, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '700' },
  recalcBtn: { paddingVertical: 14, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  recalcBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  recalcHint: { fontSize: 12, textAlign: 'right', marginTop: 8, lineHeight: 18, padding: 10, borderRadius: 8, writingDirection: 'rtl' },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pinInput: { flex: 1, height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  errorText: { fontSize: 13, textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  successText: { fontSize: 13, textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  statsRow: { borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  statsLabel: { fontSize: 13 },
  exportBtn: { paddingVertical: 14, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  importLabel: { fontSize: 14, textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  importBtn: { paddingVertical: 14, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  importHint: { fontSize: 12, padding: 10, borderRadius: 8, textAlign: 'right', marginBottom: 16, lineHeight: 18, writingDirection: 'rtl' },
  dangerBtn: { borderWidth: 1.5, paddingVertical: 14, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dangerBtnText: { fontSize: 15, fontWeight: '700' },
  confirmBox: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginTop: 10 },
  confirmText: { fontSize: 14, textAlign: 'right', marginBottom: 12, lineHeight: 22, writingDirection: 'rtl' },
  confirmButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  confirmYes: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  confirmYesText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  confirmNo: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  confirmNoText: { fontSize: 14, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10 },
  toggleLabel: { flex: 1, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 },
  notifLabel: { flex: 1, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  notifInput: { width: 110, height: 42, borderWidth: 1, borderRadius: 8, fontSize: 15, textAlign: 'center' },
  testNotifBtn: { paddingVertical: 13, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  aboutContent: { alignItems: 'center', paddingVertical: 10 },
  aboutIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  aboutTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  aboutVersion: { fontSize: 13, marginBottom: 10 },
  aboutDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, writingDirection: 'rtl' },
  authorCard: { marginTop: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  authorText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  privacyBtn: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radii.lg, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 24 },
  privacyBtnText: { flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  logoutBtn: { borderWidth: 1.5, paddingVertical: 16, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 20 },
  logoutBtnText: { fontSize: 16, fontWeight: '700' },
});
