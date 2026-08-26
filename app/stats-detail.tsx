import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, PERSIAN_MONTHS } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { useMemo, useState } from 'react';

const LABELS: Record<string, string> = {
  count: 'تعداد سرویس‌ها', income: 'درآمد کل', expenses: 'هزینه‌های کل',
  km: 'کیلومتر کل', net: 'سود خالص', fuel: 'هزینه سوخت', maintenance: 'هزینه تعمیرات',
};
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  count: 'list', income: 'trending-up', expenses: 'trending-down',
  km: 'speedometer', net: 'checkmark-circle', fuel: 'flame', maintenance: 'build',
};

export default function StatsDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ type: string; year?: string }>();
  const { services, fuels, maintenances, formatNumber, getTodayJalali } = useApp();

  const currentYear = Number(getTodayJalali().split('/')[0]);
  const years = useMemo(() => Array.from(new Set([
    currentYear,
    ...services.map(s => +s.date.split('/')[0]),
    ...fuels.map(f => +f.date.split('/')[0]),
    ...maintenances.map(m => +m.date.split('/')[0]),
  ])).sort((a, b) => b - a), [currentYear, services, fuels, maintenances]);

  const [year, setYear] = useState(Number(params.year) || currentYear);
  const type = params.type || 'income';
  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  const TYPE_COLOR: Record<string, string> = {
    count: colors.accent, income: colors.success, expenses: colors.danger,
    km: colors.warning, net: colors.success, fuel: colors.warning, maintenance: colors.danger,
  };
  const color = TYPE_COLOR[type] || colors.accent;

  const data = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, monthName: PERSIAN_MONTHS[i],
      count: 0, income: 0, expenses: 0, km: 0, fuel: 0, maintenance: 0, hours: 0,
    }));
    services.filter(s => +s.date.split('/')[0] === year).forEach(s => {
      const m = +s.date.split('/')[1] - 1;
      if (rows[m]) { rows[m].count++; rows[m].income += s.income || 0; rows[m].km += s.km || 0; rows[m].hours += s.hours || 0; }
    });
    fuels.filter(f => +f.date.split('/')[0] === year).forEach(f => {
      const m = +f.date.split('/')[1] - 1;
      if (rows[m]) { rows[m].fuel += f.total || 0; rows[m].expenses += f.total || 0; }
    });
    maintenances.filter(x => +x.date.split('/')[0] === year).forEach(x => {
      const m = +x.date.split('/')[1] - 1;
      if (rows[m]) { rows[m].maintenance += x.cost || 0; rows[m].expenses += x.cost || 0; }
    });
    return rows;
  }, [services, fuels, maintenances, year]);

  const getValue = (m: any) => type === 'net' ? m.income - m.expenses : type === 'fuel' ? m.fuel : type === 'maintenance' ? m.maintenance : m[type] ?? 0;
  const total = data.reduce((a, m) => a + getValue(m), 0);
  const max = Math.max(...data.map(getValue), 1);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: topInset }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderSoft }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-forward" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{LABELS[type] || 'آمار'}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.yearCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.yearLabel, { color: colors.textMuted }]}>سال مورد بررسی</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
              {years.map(y => (
                <TouchableOpacity key={y} onPress={() => setYear(y)} style={[styles.yearChip, { backgroundColor: year === y ? color : colors.surfaceAlt }]}>
                  <Text style={[styles.yearText, { color: year === y ? '#fff' : colors.textSecondary }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.totalIcon, { backgroundColor: `${color}22` }]}>
              <Ionicons name={ICONS[type] || 'information-circle'} size={30} color={color} />
            </View>
            <Text style={[styles.totalLabel, { color }]}>مجموع {LABELS[type] || 'آمار'} در سال {year}</Text>
            <Text style={[styles.totalValue, { color }]}>{formatNumber(Math.round(total))}</Text>
            <Text style={[styles.totalUnit, { color: colors.textMuted }]}>{type === 'count' ? 'سرویس' : type === 'km' ? 'کیلومتر' : 'تومان'}</Text>
          </View>

          <View style={[styles.extraCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>جزئیات بیشتر</Text>
            <View style={styles.extraGrid}>
              <Info colors={colors} label="تعداد سرویس" value={formatNumber(data.reduce((a, m) => a + m.count, 0))} />
              <Info colors={colors} label="ساعت کارکرد" value={formatNumber(data.reduce((a, m) => a + m.hours, 0))} />
              <Info colors={colors} label="کیلومتر" value={formatNumber(data.reduce((a, m) => a + m.km, 0))} />
              <Info colors={colors} label="سوخت" value={formatNumber(data.reduce((a, m) => a + m.fuel, 0)) + ' تومان'} />
            </View>
          </View>

          <View style={styles.months}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>توزیع ماهانه</Text>
            {data.map(m => {
              const v = getValue(m);
              const pct = v > 0 ? (v / max) * 100 : 0;
              return (
                <View key={m.month} style={[styles.monthRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.monthLeft}>
                    <Text style={[styles.monthName, { color: colors.text }]}>{m.monthName}</Text>
                    <Text style={[styles.monthSub, { color: colors.textMuted }]}>{m.count} سرویس</Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.monthValue, { color }]}>{formatNumber(Math.round(v))}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function Info({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.info, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  yearCard: { margin: spacing.lg, marginBottom: 0, borderRadius: radii.lg, padding: 12, borderWidth: 1 },
  yearLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  yearRow: { flexDirection: 'row-reverse', gap: 8 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  yearText: { fontWeight: '800' },
  totalCard: { margin: spacing.lg, borderRadius: radii.xl, padding: 24, alignItems: 'center', borderWidth: 1 },
  totalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 13.5, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  totalValue: { fontSize: 30, fontWeight: '900', marginBottom: 3 },
  totalUnit: { fontSize: 12 },
  extraCard: { marginHorizontal: spacing.lg, borderRadius: radii.lg, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 15.5, fontWeight: '800', textAlign: 'right', marginBottom: 12, writingDirection: 'rtl' },
  extraGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  info: { width: '48%', borderRadius: radii.md, padding: 12, alignItems: 'center' },
  infoValue: { fontSize: 15, fontWeight: '800' },
  infoLabel: { fontSize: 11, marginTop: 4 },
  months: { margin: spacing.lg, marginTop: 14, marginBottom: 40 },
  monthRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, padding: 11, marginBottom: 9, gap: 10, borderWidth: 1 },
  monthLeft: { width: 78 },
  monthName: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  monthSub: { fontSize: 10, textAlign: 'right', marginTop: 2 },
  barBg: { flex: 1, height: 8, borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 5 },
  monthValue: { width: 74, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
