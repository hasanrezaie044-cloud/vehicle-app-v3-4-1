import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, FlatList, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Fuel, Maintenance, PERSIAN_MONTHS } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { Segmented, EmptyState } from '@/components/ui/UI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import JalaliDatePicker from '@/components/JalaliDatePicker';
import MaintenanceTypeSelector from '@/components/MaintenanceTypeSelector';
import FormattedNumberInput from '@/components/FormattedNumberInput';

const FUEL_TYPES: { key: Fuel['type']; label: string }[] = [
  { key: 'gov', label: 'دولتی' },
  { key: 'semi', label: 'نیمه آزاد' },
  { key: 'free', label: 'آزاد' },
];

const MAINTENANCE_TYPE_MAP: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'oil-change': { label: 'تعویض روغن', icon: 'water' },
  'repair': { label: 'تعمیر موتور', icon: 'build' },
  'tire': { label: 'تعویض لاستیک', icon: 'ellipse' },
  'wash': { label: 'شستشو', icon: 'water-outline' },
  'spark-plug': { label: 'شمع', icon: 'flash' },
  'brake-pad': { label: 'لنت', icon: 'square' },
  'other': { label: 'سایر', icon: 'construct' },
};

const MAINTENANCE_TEXT_MAP: Record<string, string> = Object.fromEntries(Object.entries(MAINTENANCE_TYPE_MAP).map(([k, v]) => [k, v.label]));

export default function CostsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fuels, maintenances, addFuel, deleteFuel, addMaintenance, deleteMaintenance, rates, formatNumber, getTodayJalali } = useApp();

  const [activeTab, setActiveTab] = useState<'fuel' | 'maintenance'>('fuel');

  const [fuelDate, setFuelDate] = useState(getTodayJalali());
  const [fuelType, setFuelType] = useState<Fuel['type']>('gov');
  const [fuelLiters, setFuelLiters] = useState('');

  const [maintDate, setMaintDate] = useState(getTodayJalali());
  const [maintType, setMaintType] = useState<Maintenance['type']>('oil-change');
  const [maintCost, setMaintCost] = useState('');
  const [maintKm, setMaintKm] = useState('');
  const [maintDesc, setMaintDesc] = useState('');

  const todayJalali = getTodayJalali();
  const todayParts = todayJalali.split('/');
  const [fuelYear, setFuelYear] = useState(parseInt(todayParts[0]));
  const [fuelMonth, setFuelMonth] = useState(parseInt(todayParts[1]));
  const [maintYear, setMaintYear] = useState(parseInt(todayParts[0]));
  const [maintMonth, setMaintMonth] = useState(parseInt(todayParts[1]));

  const calculatedFuelTotal = useMemo(() => {
    const liters = parseFloat(fuelLiters) || 0;
    switch (fuelType) {
      case 'gov': return Math.round(liters * rates.fuelPriceGov);
      case 'semi': return Math.round(liters * rates.fuelPriceSemi);
      case 'free': return Math.round(liters * rates.fuelPriceFree);
      default: return 0;
    }
  }, [fuelType, fuelLiters, rates]);

  const resetFuelForm = useCallback(() => {
    setFuelDate(getTodayJalali()); setFuelType('gov'); setFuelLiters('');
  }, [getTodayJalali]);

  const resetMaintForm = useCallback(() => {
    setMaintDate(getTodayJalali()); setMaintType('oil-change');
    setMaintCost(''); setMaintKm(''); setMaintDesc('');
  }, [getTodayJalali]);

  const handleAddFuel = useCallback(() => {
    if (!fuelLiters || parseFloat(fuelLiters) <= 0) {
      Alert.alert('خطا', 'لطفاً مقدار لیتر را وارد کنید');
      return;
    }
    addFuel({ date: fuelDate, type: fuelType, liters: parseFloat(fuelLiters), total: calculatedFuelTotal, carType: '' });
    resetFuelForm();
  }, [fuelDate, fuelType, fuelLiters, calculatedFuelTotal, addFuel, resetFuelForm]);

  const handleAddMaintenance = useCallback(() => {
    if (!maintCost || parseFloat(maintCost) <= 0) {
      Alert.alert('خطا', 'لطفاً هزینه را وارد کنید');
      return;
    }
    addMaintenance({
      date: maintDate, type: maintType, typeText: MAINTENANCE_TEXT_MAP[maintType],
      cost: parseFloat(maintCost), km: parseFloat(maintKm) || 0, carType: '', description: maintDesc,
    });
    resetMaintForm();
  }, [maintDate, maintType, maintCost, maintKm, maintDesc, addMaintenance, resetMaintForm]);

  const handleDeleteFuel = useCallback((id: string) => {
    Alert.alert('حذف', 'آیا از حذف این رکورد مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteFuel(id) },
    ]);
  }, [deleteFuel]);

  const handleDeleteMaintenance = useCallback((id: string) => {
    Alert.alert('حذف', 'آیا از حذف این رکورد مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteMaintenance(id) },
    ]);
  }, [deleteMaintenance]);

  const filteredFuels = useMemo(() => fuels.filter(f => {
    const parts = f.date.split('/');
    return parseInt(parts[0]) === fuelYear && parseInt(parts[1]) === fuelMonth;
  }).sort((a, b) => b.date.localeCompare(a.date)), [fuels, fuelYear, fuelMonth]);

  const fuelSummary = useMemo(() => ({
    totalLiters: filteredFuels.reduce((sum, f) => sum + f.liters, 0),
    totalCost: filteredFuels.reduce((sum, f) => sum + f.total, 0),
  }), [filteredFuels]);

  const filteredMaintenances = useMemo(() => maintenances.filter(m => {
    const parts = m.date.split('/');
    return parseInt(parts[0]) === maintYear && parseInt(parts[1]) === maintMonth;
  }).sort((a, b) => b.date.localeCompare(a.date)), [maintenances, maintYear, maintMonth]);

  const maintSummary = useMemo(() => ({
    count: filteredMaintenances.length,
    totalCost: filteredMaintenances.reduce((sum, m) => sum + m.cost, 0),
  }), [filteredMaintenances]);

  const navigateFuelMonth = useCallback((dir: number) => {
    let newMonth = fuelMonth + dir, newYear = fuelYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setFuelMonth(newMonth); setFuelYear(newYear);
  }, [fuelMonth, fuelYear]);

  const navigateMaintMonth = useCallback((dir: number) => {
    let newMonth = maintMonth + dir, newYear = maintYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMaintMonth(newMonth); setMaintYear(newYear);
  }, [maintMonth, maintYear]);

  const topPadding = Platform.OS === 'web' ? 20 : insets.top;

  const fuelTypeColor = (type: string) => {
    const map: Record<string, string> = { gov: colors.success, semi: colors.warning, free: colors.danger };
    return map[type] || colors.textMuted;
  };

  const renderFuelItem = useCallback(({ item }: { item: Fuel }) => {
    const c = fuelTypeColor(item.type);
    const label = FUEL_TYPES.find(f => f.key === item.type)?.label || item.type;
    return (
      <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.listCardRow}>
          <View style={styles.listCardInfo}>
            <Text style={[styles.listCardDate, { color: colors.textSecondary }]}>{item.date}</Text>
            <View style={[styles.typeBadge, { backgroundColor: c }]}>
              <Text style={styles.typeBadgeText}>{label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDeleteFuel(item.id)} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <View style={styles.listCardDetails}>
          <Text style={[styles.detailText, { color: colors.textMuted }]}>{formatNumber(item.liters)} لیتر</Text>
          <Text style={[styles.detailCost, { color: colors.text }]}>{formatNumber(item.total)} تومان</Text>
        </View>
      </View>
    );
  }, [handleDeleteFuel, formatNumber, colors]);

  const renderMaintItem = useCallback(({ item }: { item: Maintenance }) => {
    const typeInfo = MAINTENANCE_TYPE_MAP[item.type];
    return (
      <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.listCardRow}>
          <View style={styles.listCardInfo}>
            <Text style={[styles.listCardDate, { color: colors.textSecondary }]}>{item.date}</Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name={typeInfo?.icon || 'construct'} size={12} color={colors.textOnAccent} style={{ marginLeft: 4 }} />
              <Text style={[styles.typeBadgeText, { color: colors.textOnAccent }]}>{typeInfo?.label || item.type}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDeleteMaintenance(item.id)} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <View style={styles.listCardDetails}>
          <Text style={[styles.detailCost, { color: colors.text }]}>{formatNumber(item.cost)} تومان</Text>
          {item.km > 0 && <Text style={[styles.detailText, { color: colors.textMuted }]}>{formatNumber(item.km)} کیلومتر</Text>}
        </View>
        {item.description ? <Text style={[styles.descText, { color: colors.textMuted }]}>{item.description}</Text> : null}
      </View>
    );
  }, [handleDeleteMaintenance, formatNumber, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: topPadding }]}>
      <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: 4 }}>
        <Segmented
          options={[{ label: 'سوخت', value: 'fuel' }, { label: 'تعمیرات', value: 'maintenance' }] as const}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {activeTab === 'fuel' ? (
        <KeyboardAwareScrollViewCompat
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          bottomOffset={40}
          showsVerticalScrollIndicator={false}
        >
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>ثبت سوخت</Text>
              <JalaliDatePicker value={fuelDate} onSelect={setFuelDate} label="تاریخ" />

              <Text style={[styles.label, { color: colors.textSecondary }]}>نوع سوخت</Text>
              <View style={styles.chipsRow}>
                {FUEL_TYPES.map(ft => {
                  const active = fuelType === ft.key;
                  const c = fuelTypeColor(ft.key);
                  return (
                    <TouchableOpacity
                      key={ft.key}
                      style={[styles.chip, { borderColor: active ? c : colors.border, backgroundColor: active ? c : colors.surfaceAlt }]}
                      onPress={() => setFuelType(ft.key)}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{ft.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>لیتر</Text>
              <FormattedNumberInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={fuelLiters} onChangeText={setFuelLiters} placeholder="0" decimals={2}
                placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <View style={[styles.totalBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                <Text style={[styles.totalLabel, { color: colors.textMuted }]}>مبلغ کل</Text>
                <Text style={[styles.totalValue, { color: colors.accentText }]}>{formatNumber(calculatedFuelTotal)} تومان</Text>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleAddFuel}>
                <Text style={[styles.submitBtnText, { color: colors.textOnAccent }]}>ثبت سوخت</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => navigateFuelMonth(1)} style={styles.monthNavBtn} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color={colors.accent} />
              </TouchableOpacity>
              <Text style={[styles.monthNavText, { color: colors.text }]}>{PERSIAN_MONTHS[fuelMonth - 1]} {fuelYear}</Text>
              <TouchableOpacity onPress={() => navigateFuelMonth(-1)} style={styles.monthNavBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>کل لیتر</Text>
                <Text style={[styles.summaryValue, { color: colors.accentText }]}>{formatNumber(fuelSummary.totalLiters)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.borderSoft }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>کل هزینه</Text>
                <Text style={[styles.summaryValue, { color: colors.accentText }]}>{formatNumber(fuelSummary.totalCost)} تومان</Text>
              </View>
            </View>

            <FlatList
              data={filteredFuels} keyExtractor={item => item.id} renderItem={renderFuelItem} scrollEnabled={false}
              ListEmptyComponent={<EmptyState icon="flame-outline" title="رکوردی یافت نشد" />}
            />
            <View style={{ height: 40 }} />
        </KeyboardAwareScrollViewCompat>
      ) : (
        <KeyboardAwareScrollViewCompat
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          bottomOffset={40}
          showsVerticalScrollIndicator={false}
        >
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>ثبت تعمیرات</Text>
              <JalaliDatePicker value={maintDate} onSelect={setMaintDate} label="تاریخ" />
              <MaintenanceTypeSelector value={maintType} onChange={setMaintType} style={styles.componentMargin} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>هزینه (تومان)</Text>
              <FormattedNumberInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={maintCost} onChangeText={setMaintCost} placeholder="0" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>کیلومتر</Text>
              <FormattedNumberInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={maintKm} onChangeText={setMaintKm} placeholder="اختیاری" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>توضیحات</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={maintDesc} onChangeText={setMaintDesc} placeholder="توضیحات اختیاری..." placeholderTextColor={colors.textMuted}
                multiline numberOfLines={3} textAlign="right" textAlignVertical="top"
              />

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleAddMaintenance}>
                <Text style={[styles.submitBtnText, { color: colors.textOnAccent }]}>ثبت تعمیرات</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => navigateMaintMonth(1)} style={styles.monthNavBtn} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color={colors.accent} />
              </TouchableOpacity>
              <Text style={[styles.monthNavText, { color: colors.text }]}>{PERSIAN_MONTHS[maintMonth - 1]} {maintYear}</Text>
              <TouchableOpacity onPress={() => navigateMaintMonth(-1)} style={styles.monthNavBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>تعداد</Text>
                <Text style={[styles.summaryValue, { color: colors.accentText }]}>{formatNumber(maintSummary.count)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.borderSoft }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>کل هزینه</Text>
                <Text style={[styles.summaryValue, { color: colors.accentText }]}>{formatNumber(maintSummary.totalCost)} تومان</Text>
              </View>
            </View>

            <FlatList
              data={filteredMaintenances} keyExtractor={item => item.id} renderItem={renderMaintItem} scrollEnabled={false}
              ListEmptyComponent={<EmptyState icon="build-outline" title="رکوردی یافت نشد" />}
            />
            <View style={{ height: 40 }} />
        </KeyboardAwareScrollViewCompat>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 32 },
  card: { borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1 },
  cardTitle: { fontSize: 16.5, fontWeight: '700', textAlign: 'right', marginBottom: 14, writingDirection: 'rtl' },
  componentMargin: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 6, marginTop: 8, writingDirection: 'rtl' },
  input: { borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, textAlign: 'right', writingDirection: 'rtl' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  totalBox: { borderRadius: radii.md, padding: 14, marginTop: 14, alignItems: 'center', borderWidth: 1 },
  totalLabel: { fontSize: 13, marginBottom: 4 },
  totalValue: { fontSize: 22, fontWeight: '800' },
  submitBtn: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 16 },
  monthNavBtn: { padding: 6 },
  monthNavText: { fontSize: 16, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  summaryCard: { borderRadius: radii.lg, padding: 14, flexDirection: 'row', marginBottom: 14, borderWidth: 1 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, marginVertical: 4 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  listCard: { borderRadius: radii.md, padding: 14, marginBottom: 10, borderWidth: 1 },
  listCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listCardDate: { fontSize: 13.5, fontWeight: '500' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  deleteBtn: { padding: 4 },
  listCardDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailText: { fontSize: 13.5 },
  detailCost: { fontSize: 15, fontWeight: '700' },
  descText: { fontSize: 13, textAlign: 'right', marginTop: 6, writingDirection: 'rtl' },
});
