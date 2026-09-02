import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, PERSIAN_MONTHS } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, ScreenHeader, SectionHeader, Segmented, EmptyState } from '@/components/ui/UI';
import { radii, spacing, serviceMeta } from '@/constants/theme';
import { exportReportExcel } from '@/utils/reportExport';

type Period = 'all' | 'year' | 'month';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { services, fuels, maintenances, formatNumber, getTodayJalali } = useApp();
  const { colors } = useTheme();
  const topInset = Platform.OS === 'web' ? 20 : insets.top;
  const [period, setPeriod] = useState<Period>('year');
  const [isExporting, setIsExporting] = useState(false);

  const today = getTodayJalali();
  const [curYear, curMonth] = today.split('/').map(Number);

  const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
    if (period === 'all') return items;
    return items.filter(it => {
      const [y, m] = it.date.split('/').map(Number);
      if (period === 'year') return y === curYear;
      return y === curYear && m === curMonth;
    });
  };

  const fServices = useMemo(() => filterByPeriod(services), [services, period, curYear, curMonth]);
  const fFuels = useMemo(() => filterByPeriod(fuels), [fuels, period, curYear, curMonth]);
  const fMaintenances = useMemo(() => filterByPeriod(maintenances), [maintenances, period, curYear, curMonth]);

  const totalIncome = useMemo(() => fServices.reduce((sum, s) => sum + s.income, 0), [fServices]);
  const totalFuelCost = useMemo(() => fFuels.reduce((sum, f) => sum + f.total, 0), [fFuels]);
  const totalMaintenanceCost = useMemo(() => fMaintenances.reduce((sum, m) => sum + m.cost, 0), [fMaintenances]);
  const netIncome = useMemo(() => totalIncome - totalFuelCost - totalMaintenanceCost, [totalIncome, totalFuelCost, totalMaintenanceCost]);
  const totalKm = useMemo(() => fServices.reduce((sum, s) => sum + s.km, 0), [fServices]);
  const totalHours = useMemo(() => fServices.reduce((sum, s) => sum + s.hours, 0), [fServices]);
  const totalLiters = useMemo(() => fFuels.reduce((sum, f) => sum + f.liters, 0), [fFuels]);

  const monthlyData = useMemo(() => {
    const grouped: Record<string, { income: number; expenses: number }> = {};
    fServices.forEach((s) => {
      const parts = s.date.split('/');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        if (!grouped[key]) grouped[key] = { income: 0, expenses: 0 };
        grouped[key].income += s.income;
      }
    });
    fFuels.forEach((f) => {
      const parts = f.date.split('/');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        if (!grouped[key]) grouped[key] = { income: 0, expenses: 0 };
        grouped[key].expenses += f.total;
      }
    });
    fMaintenances.forEach((m) => {
      const parts = m.date.split('/');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        if (!grouped[key]) grouped[key] = { income: 0, expenses: 0 };
        grouped[key].expenses += m.cost;
      }
    });
    const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const maxIncome = Math.max(...sorted.map(([, d]) => d.income), 1);
    return sorted.map(([key, data]) => {
      const monthIndex = parseInt(key.split('-')[1], 10) - 1;
      const monthName = PERSIAN_MONTHS[monthIndex] || key;
      return {
        key, monthName, income: data.income, net: data.income - data.expenses,
        widthPercent: (data.income / maxIncome) * 100,
        netWidthPercent: (Math.max(0, data.income - data.expenses) / maxIncome) * 100,
      };
    });
  }, [fServices, fFuels, fMaintenances]);

  const distribution = useMemo(() => {
    if (totalIncome === 0) return { net: 0, fuel: 0, maintenance: 0 };
    return {
      net: Math.round((netIncome / totalIncome) * 100),
      fuel: Math.round((totalFuelCost / totalIncome) * 100),
      maintenance: Math.round((totalMaintenanceCost / totalIncome) * 100),
    };
  }, [totalIncome, netIncome, totalFuelCost, totalMaintenanceCost]);

  const serviceTypeBreakdown = useMemo(() => {
    const grouped: Record<string, { count: number; income: number }> = {};
    fServices.forEach((s) => {
      if (!grouped[s.type]) grouped[s.type] = { count: 0, income: 0 };
      grouped[s.type].count += 1;
      grouped[s.type].income += s.income;
    });
    return Object.entries(grouped)
      .map(([type, data]) => ({ type, ...data, label: serviceMeta[type]?.label || type }))
      .sort((a, b) => b.income - a.income);
  }, [fServices]);

  const serviceTypeColor = (type: string): { color: string; soft: string } => {
    const map: Record<string, { color: string; soft: string }> = {
      night: { color: colors.night, soft: colors.nightSoft },
      holiday: { color: colors.holiday, soft: colors.holidaySoft },
      request: { color: colors.request, soft: colors.requestSoft },
      available: { color: colors.available, soft: colors.availableSoft },
      fixed: { color: colors.fixed, soft: colors.fixedSoft },
      mission: { color: colors.mission, soft: colors.missionSoft },
    };
    return map[type] || { color: colors.textMuted, soft: colors.surfaceAlt };
  };

  const efficiency = useMemo(() => ({
    incomePerKm: totalKm > 0 ? Math.round(totalIncome / totalKm) : 0,
    incomePerHour: totalHours > 0 ? Math.round(totalIncome / totalHours) : 0,
    fuelPer100km: totalKm > 0 ? Math.round((totalLiters / totalKm) * 100 * 10) / 10 : 0,
    costPerKm: totalKm > 0 ? Math.round((totalFuelCost + totalMaintenanceCost) / totalKm) : 0,
    averageIncomePerService: fServices.length > 0 ? Math.round(totalIncome / fServices.length) : 0,
  }), [totalIncome, totalKm, totalHours, totalLiters, totalFuelCost, totalMaintenanceCost, fServices.length]);

  const profitabilityAnalysis = useMemo(() => {
    if (fServices.length === 0) return { mostProfitable: null as any, leastProfitable: null as any };
    const typeIncome: Record<string, { income: number; count: number }> = {};
    fServices.forEach(s => {
      if (!typeIncome[s.type]) typeIncome[s.type] = { income: 0, count: 0 };
      typeIncome[s.type].income += s.income;
      typeIncome[s.type].count += 1;
    });
    const types = Object.entries(typeIncome)
      .map(([type, data]) => ({ type, avgIncome: Math.round(data.income / data.count), totalIncome: data.income, count: data.count }))
      .sort((a, b) => b.avgIncome - a.avgIncome);
    return { mostProfitable: types[0] || null, leastProfitable: types[types.length - 1] || null };
  }, [fServices]);

  const previousYear = curYear - 1;
  const previousYearIncome = useMemo(() => services.filter(s => Number(s.date.split('/')[0]) === previousYear).reduce((a,s)=>a+s.income,0), [services, previousYear]);
  const previousYearKm = useMemo(() => services.filter(s => Number(s.date.split('/')[0]) === previousYear).reduce((a,s)=>a+s.km,0), [services, previousYear]);
  const yoyIncome = previousYearIncome > 0 ? Math.round(((totalIncome - previousYearIncome) / previousYearIncome) * 100) : null;

  const recommendations = useMemo(() => {
    const items: { text: string; type: 'success' | 'warning' | 'info' }[] = [];
    if (efficiency.fuelPer100km > 10) items.push({ text: 'مصرف سوخت بالا است. بررسی وضعیت موتور یا لاستیک‌ها توصیه می‌شود.', type: 'warning' });
    if (totalIncome > 0 && (totalMaintenanceCost / totalIncome) > 0.2) items.push({ text: 'هزینه تعمیرات بیش از حد است. بررسی وضعیت خودرو توصیه می‌شود.', type: 'warning' });
    if (fServices.length < 5) items.push({ text: 'تعداد سرویس‌های این بازه کم است، برای گزارش دقیق‌تر بیشتر ثبت کنید.', type: 'info' });
    if (items.length === 0) items.push({ text: 'عملکرد شما در این بازه مناسب است.', type: 'success' });
    return items;
  }, [efficiency.fuelPer100km, totalIncome, totalMaintenanceCost, fServices.length]);

  const recColors: Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
    success: { bg: colors.successSoft, text: colors.success, icon: 'checkmark-circle' },
    warning: { bg: colors.warningSoft, text: colors.warning, icon: 'warning' },
    info: { bg: colors.infoSoft, text: colors.info, icon: 'information-circle' },
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg, paddingTop: topInset }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="گزارش‌ها" icon="bar-chart" subtitle="تحلیل عملکرد و درآمد" />

      <Segmented
        options={[{ label: 'همه', value: 'all' }, { label: 'امسال', value: 'year' }, { label: 'این ماه', value: 'month' }] as const}
        value={period}
        onChange={setPeriod}
      />

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn,{backgroundColor:colors.surface,borderColor:colors.border, opacity: isExporting ? 0.6 : 1}]}
          disabled={isExporting}
          onPress={async () => {
            setIsExporting(true);
            try {
              await exportReportExcel({
                services: fServices,
                fuels: fFuels,
                maintenances: fMaintenances,
                periodLabel: period === 'year' ? 'سال جاری' : period === 'month' ? 'ماه جاری' : 'همه',
              });
            } catch (e) {
              Alert.alert('خطا در ساخت فایل اکسل', 'ساخت خروجی اکسل با مشکل مواجه شد. لطفاً دوباره تلاش کنید.');
            } finally {
              setIsExporting(false);
            }
          }}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="document-text-outline" size={18} color={colors.accent} />
          )}
          <Text style={[styles.exportBtnText,{color:colors.text}]}>{isExporting ? 'در حال ساخت فایل...' : 'خروجی اکسل'}</Text>
        </TouchableOpacity>
      </View>

      {/* خلاصه اصلی: دو کارت بزرگ */}
      <View style={styles.heroRow}>
        <Card style={[styles.heroCard, { backgroundColor: colors.accent }] as any}>
          <Ionicons name="wallet" size={22} color={colors.textOnAccent} />
          <Text style={[styles.heroLabel, { color: colors.textOnAccent, opacity: 0.85 }]}>درآمد کل</Text>
          <Text style={[styles.heroValue, { color: colors.textOnAccent }]} numberOfLines={1}>{formatNumber(totalIncome)}</Text>
        </Card>
        <Card style={styles.heroCard}>
          <Ionicons name="trending-up" size={22} color={colors.success} />
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>سود خالص</Text>
          <Text style={[styles.heroValue, { color: colors.success }]} numberOfLines={1}>{formatNumber(netIncome)}</Text>
        </Card>
      </View>

      <View style={styles.miniRow}>
        <MiniStat label="سوخت" value={formatNumber(totalFuelCost)} icon="flame" color={colors.warning} colors={colors} />
        <MiniStat label="تعمیرات" value={formatNumber(totalMaintenanceCost)} icon="build" color={colors.danger} colors={colors} />
        <MiniStat label="ساعت کار" value={formatNumber(totalHours)} icon="time" color={colors.info} colors={colors} />
      </View>

      <Card style={styles.section}>
        <SectionHeader title="مقایسه سال‌به‌سال" subtitle={`امسال ${curYear} با ${previousYear}`} />
        <View style={styles.compareRow}>
          <CompareItem label="درآمد امسال" value={formatNumber(totalIncome)} colors={colors} />
          <CompareItem label="درآمد پارسال" value={formatNumber(previousYearIncome)} colors={colors} />
          <CompareItem label="تغییر درآمد" value={yoyIncome === null ? '—' : `${yoyIncome > 0 ? '+' : ''}${yoyIncome}%`} colors={colors} />
        </View>
        <Text style={[styles.compareHint,{color:colors.textMuted}]}>کیلومتر امسال: {formatNumber(totalKm)} — پارسال: {formatNumber(previousYearKm)}</Text>
      </Card>

      {/* روند ماهانه */}
      <Card style={styles.section}>
        <SectionHeader title="روند ماهانه" subtitle="۶ ماه اخیر" />
        {monthlyData.length === 0 ? (
          <EmptyState icon="bar-chart-outline" title="داده‌ای برای این بازه نیست" />
        ) : (
          <>
            {monthlyData.map((item) => (
              <View key={item.key} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.monthName}</Text>
                <View style={[styles.barContainer, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.bar, { width: `${item.widthPercent}%`, backgroundColor: colors.accent, opacity: 0.35 }]} />
                  <View style={[styles.barNet, { width: `${item.netWidthPercent}%`, backgroundColor: colors.success }]} />
                </View>
                <Text style={[styles.barAmount, { color: colors.text }]}>{formatNumber(item.income)}</Text>
              </View>
            ))}
            <View style={[styles.legendRow, { borderTopColor: colors.borderSoft }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent, opacity: 0.5 }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>درآمد</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>سود خالص</Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* توزیع درآمد/هزینه */}
      {totalIncome > 0 && (
        <Card style={styles.section}>
          <SectionHeader title="توزیع درآمد" />
          <DistRow label="سود خالص" percent={Math.max(0, distribution.net)} color={colors.success} colors={colors} />
          <DistRow label="سوخت" percent={distribution.fuel} color={colors.warning} colors={colors} />
          <DistRow label="تعمیرات" percent={distribution.maintenance} color={colors.danger} colors={colors} />
        </Card>
      )}

      {/* تجزیه سرویس‌ها */}
      <Card style={styles.section}>
        <SectionHeader title="تجزیه سرویس‌ها" />
        {serviceTypeBreakdown.length === 0 ? (
          <EmptyState icon="grid-outline" title="سرویسی برای این بازه ثبت نشده" />
        ) : (
          serviceTypeBreakdown.map((item) => {
            const c = serviceTypeColor(item.type);
            return (
              <View key={item.type} style={[styles.typeRow, { borderBottomColor: colors.borderSoft }]}>
                <View style={[styles.typeBadge, { backgroundColor: c.soft }]}>
                  <Text style={[styles.typeBadgeText, { color: c.color }]}>{item.label}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.typeCount, { color: colors.textMuted }]}>{formatNumber(item.count)} سرویس</Text>
                  <Text style={[styles.typeIncome, { color: colors.text }]}>{formatNumber(item.income)} تومان</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* شاخص‌های کارایی */}
      <Card style={styles.section}>
        <SectionHeader title="شاخص‌های کارایی" />
        <Metric icon="speedometer-outline" label="درآمد به ازای هر کیلومتر" value={`${formatNumber(efficiency.incomePerKm)} ت`} colors={colors} />
        <Metric icon="time-outline" label="درآمد به ازای هر ساعت" value={`${formatNumber(efficiency.incomePerHour)} ت`} colors={colors} />
        <Metric icon="flame-outline" label="مصرف سوخت (لیتر/۱۰۰کیلومتر)" value={formatNumber(efficiency.fuelPer100km)} colors={colors} />
        <Metric icon="wallet-outline" label="درآمد متوسط هر سرویس" value={`${formatNumber(efficiency.averageIncomePerService)} ت`} colors={colors} />
        <Metric icon="cash-outline" label="هزینه به ازای هر کیلومتر" value={`${formatNumber(efficiency.costPerKm)} ت`} last colors={colors} />
      </Card>

      {/* سودآوری */}
      {profitabilityAnalysis.mostProfitable && (
        <Card style={styles.section}>
          <SectionHeader title="سودآورترین سرویس" />
          <View style={styles.profitRow}>
            <View>
              <Text style={[styles.profitTitle, { color: colors.success }]}>بهترین میانگین</Text>
              <Text style={[styles.profitType, { color: colors.textMuted }]}>{serviceMeta[profitabilityAnalysis.mostProfitable.type]?.label || profitabilityAnalysis.mostProfitable.type}</Text>
            </View>
            <View style={[styles.profitBox, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.profitValue, { color: colors.success }]}>{formatNumber(profitabilityAnalysis.mostProfitable.avgIncome)}</Text>
              <Text style={[styles.profitUnit, { color: colors.textMuted }]}>تومان</Text>
            </View>
          </View>
          {profitabilityAnalysis.leastProfitable && profitabilityAnalysis.mostProfitable.type !== profitabilityAnalysis.leastProfitable.type && (
            <View style={[styles.profitRow, { borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 4 }]}>
              <View>
                <Text style={[styles.profitTitle, { color: colors.danger }]}>کمترین میانگین</Text>
                <Text style={[styles.profitType, { color: colors.textMuted }]}>{serviceMeta[profitabilityAnalysis.leastProfitable.type]?.label || profitabilityAnalysis.leastProfitable.type}</Text>
              </View>
              <View style={[styles.profitBox, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.profitValue, { color: colors.danger }]}>{formatNumber(profitabilityAnalysis.leastProfitable.avgIncome)}</Text>
                <Text style={[styles.profitUnit, { color: colors.textMuted }]}>تومان</Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* توصیه‌ها */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <SectionHeader title="توصیه‌ها" />
        {recommendations.map((rec, index) => {
          const cfg = recColors[rec.type];
          return (
            <View key={index} style={[styles.recCard, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={20} color={cfg.text} />
              <Text style={[styles.recText, { color: cfg.text }]}>{rec.text}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function CompareItem({ label, value, colors }: any) {
  return <View style={[styles.compareItem,{backgroundColor:colors.surfaceAlt}]}><Text style={[styles.compareValue,{color:colors.text}]} numberOfLines={1}>{value}</Text><Text style={[styles.compareLabel,{color:colors.textMuted}]}>{label}</Text></View>;
}

function MiniStat({ label, value, icon, color, colors }: any) {
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.miniStatValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function DistRow({ label, percent, color, colors }: any) {
  return (
    <View style={styles.distRow}>
      <Text style={[styles.distLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.distBarContainer, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.distBar, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.distPercent, { color }]}>{percent}%</Text>
    </View>
  );
}

function Metric({ icon, label, value, last, colors }: any) {
  return (
    <View style={[styles.metricRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  heroRow: { flexDirection: 'row', gap: 10 },
  heroCard: { flex: 1, alignItems: 'flex-end', gap: 6, padding: spacing.md },
  heroLabel: { fontSize: 12, writingDirection: 'rtl' },
  heroValue: { fontSize: 18, fontWeight: '800' },
  miniRow: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, borderRadius: radii.md, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  miniStatValue: { fontSize: 13, fontWeight: '800' },
  miniStatLabel: { fontSize: 10.5, writingDirection: 'rtl' },
  section: { marginTop: 4 },
  exportRow: { flexDirection: 'row-reverse', marginTop: 10 },
  exportBtn: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportBtnText: { fontSize: 13, fontWeight: '800' },
  compareRow: { flexDirection: 'row-reverse', gap: 8 },
  compareItem: { flex: 1, borderRadius: 13, padding: 10, alignItems: 'center' },
  compareValue: { fontSize: 14, fontWeight: '900' },
  compareLabel: { fontSize: 10.5, marginTop: 4, textAlign: 'center', writingDirection: 'rtl' },
  compareHint: { fontSize: 11, textAlign: 'right', writingDirection: 'rtl', marginTop: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 55, fontSize: 12, textAlign: 'right', fontWeight: '500', writingDirection: 'rtl' },
  barContainer: { flex: 1, height: 18, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  bar: { height: '100%', borderRadius: 6, position: 'absolute', right: 0, top: 0 },
  barNet: { height: '100%', borderRadius: 6, position: 'absolute', right: 0, top: 0 },
  barAmount: { width: 66, fontSize: 11, textAlign: 'left', fontWeight: '600' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 6, paddingTop: 10, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, writingDirection: 'rtl' },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  distLabel: { width: 65, fontSize: 13, textAlign: 'right', fontWeight: '500', writingDirection: 'rtl' },
  distBarContainer: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  distBar: { height: '100%', borderRadius: 7 },
  distPercent: { width: 40, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  typeCount: { fontSize: 12 },
  typeIncome: { fontSize: 14, fontWeight: '700' },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  metricLabel: { flex: 1, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  metricValue: { fontSize: 14, fontWeight: '700' },
  recCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.md, marginBottom: 8 },
  recText: { flex: 1, fontSize: 13, fontWeight: '500', textAlign: 'right', lineHeight: 21, writingDirection: 'rtl' },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  profitTitle: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  profitType: { fontSize: 12, fontWeight: '500', textAlign: 'right', marginTop: 2 },
  profitBox: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  profitValue: { fontSize: 16, fontWeight: '700' },
  profitUnit: { fontSize: 10, marginTop: 2 },
});
