import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { useGpsTripTracker, formatDuration } from '@/utils/gpsTracker';

// ابزار ثبت خودکار کیلومتر با GPS - برای فرم ثبت سرویس
// کاربر «شروع سفر» را می‌زند، در پایان «پایان و اعمال» را می‌زند تا کیلومتر واقعی طی‌شده در فیلد کیلومتر قرار بگیرد.
export default function GpsTripWidget({ onApplyKm }: { onApplyKm: (km: string) => void }) {
  const { colors } = useTheme();
  const tracker = useGpsTripTracker();

  const handleToggle = async () => {
    if (tracker.isTracking) {
      tracker.stop();
      if (tracker.distanceKm > 0) {
        Alert.alert(
          'پایان ردیابی',
          `${tracker.distanceKm} کیلومتر ثبت شد. در فیلد کیلومتر اعمال شود؟`,
          [
            { text: 'انصراف', style: 'cancel', onPress: () => tracker.reset() },
            { text: 'اعمال کن', onPress: () => { onApplyKm(String(tracker.distanceKm)); tracker.reset(); } },
          ]
        );
      }
      return;
    }
    const ok = await tracker.start();
    if (!ok) {
      Alert.alert('خطا', tracker.error || 'دسترسی به موقعیت مکانی امکان‌پذیر نشد. از تنظیمات گوشی دسترسی موقعیت مکانی را برای برنامه فعال کنید.');
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: tracker.isTracking ? colors.accent : colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="navigate" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {tracker.isTracking ? 'در حال ردیابی مسیر...' : 'ثبت خودکار کیلومتر با GPS'}
          </Text>
          {tracker.isTracking ? (
            <Text style={[styles.subtitle, { color: colors.accentText }]}>
              {tracker.distanceKm} کیلومتر  •  {formatDuration(tracker.durationSec)}
            </Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>مسافت واقعی طی‌شده را با موقعیت مکانی گوشی اندازه بگیرید</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: tracker.isTracking ? colors.danger : colors.accent }]}
          onPress={handleToggle}
        >
          <Ionicons name={tracker.isTracking ? 'stop' : 'play'} size={16} color={colors.textOnAccent} />
          <Text style={[styles.btnText, { color: colors.textOnAccent }]}>{tracker.isTracking ? 'پایان' : 'شروع سفر'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13.5, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 11.5, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  btn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8 },
  btnText: { fontSize: 12.5, fontWeight: '700' },
});
