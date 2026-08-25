import { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { Card, Badge } from '@/components/ui/UI';
import { getDaySummary, getRecentAverage, evaluateDayVsAverage, getKmSinceLastOilChange } from '@/utils/analytics';
import { getOilChangeStatus, scheduleTodaySummaryNotification, scheduleLoanReminders } from '@/utils/notifications';
import PersonnelModal from '@/components/PersonnelModal';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { services, fuels, maintenances, loans, personnel, rates, formatNumber, getTodayJalali } = useApp();
  const { colors, isDark } = useTheme();
  const today = getTodayJalali();
  const currentYear = Number(today.split('/')[0]);
  const availableYears = useMemo(() => Array.from(new Set([currentYear, ...services.map(s=>Number(s.date.split('/')[0])), ...fuels.map(f=>Number(f.date.split('/')[0])), ...maintenances.map(m=>Number(m.date.split('/')[0]))])).sort((a,b)=>b-a), [currentYear, services, fuels, maintenances]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [insuranceDate, setInsuranceDate] = useState('');
  const [vehicleInsuranceDate, setVehicleInsuranceDate] = useState('');
  const [hideIncome, setHideIncome] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem('car_monthly_income_goal'), AsyncStorage.getItem('car_insurance_expiry'),
      AsyncStorage.getItem('car_vehicle_insurance_expiry'), AsyncStorage.getItem('car_income_hidden') ]).then(([goal, insurance, vehicleInsurance, hidden]) => {
      setMonthlyGoal(Number(goal || 0)); setInsuranceDate(insurance || ''); setVehicleInsuranceDate(vehicleInsurance || ''); setHideIncome(hidden !== 'false');
    }).catch(() => {});
  }, []);

  const yearData = useMemo(() => ({
    services: services.filter(s=>Number(s.date.split('/')[0])===selectedYear),
    fuels: fuels.filter(f=>Number(f.date.split('/')[0])===selectedYear),
    maintenances: maintenances.filter(m=>Number(m.date.split('/')[0])===selectedYear),
  }), [services, fuels, maintenances, selectedYear]);

  const stats = useMemo(() => {
    const totalIncome = yearData.services.reduce((sum, s) => sum + s.income, 0);
    const totalFuel = yearData.fuels.reduce((sum, f) => sum + f.total, 0);
    const totalMaintenance = yearData.maintenances.reduce((sum, m) => sum + m.cost, 0);
    const netIncome = totalIncome - totalFuel - totalMaintenance;
    const totalKm = yearData.services.reduce((sum, s) => sum + s.km, 0);
    const totalHours = yearData.services.reduce((sum, s) => sum + s.hours, 0);
    const totalLiters = yearData.fuels.reduce((sum, f) => sum + f.liters, 0);
    return { totalIncome,totalFuel,totalMaintenance,netIncome,totalKm,totalHours,totalLiters,serviceCount:yearData.services.length };
  }, [yearData]);

  // خلاصه امروز و مقایسه با میانگین اخیر
  const todaySummary = useMemo(() => getDaySummary(services, today), [services, today]);
  const recentAvg = useMemo(() => getRecentAverage(services, today, 14), [services, today]);
  const evaluation = useMemo(() => evaluateDayVsAverage(todaySummary, recentAvg), [todaySummary, recentAvg]);

  // به‌روزرسانی اعلان خلاصه امروز (با درآمد واقعی و خوب/بد بودن روز) و یادآوری اقساط وام هر بار برنامه باز می‌شود
  useEffect(() => {
    scheduleTodaySummaryNotification(
      { totalIncome: todaySummary.totalIncome, count: todaySummary.count, verdict: evaluation.verdict },
      formatNumber
    );
  }, [todaySummary.totalIncome, todaySummary.count, evaluation.verdict, formatNumber]);

  useEffect(() => {
    scheduleLoanReminders(loans, formatNumber);
  }, [loans, formatNumber]);

  // وضعیت تعویض روغن
  const oilInfo = useMemo(() => getKmSinceLastOilChange(services, maintenances), [services, maintenances]);
  const oilStatus = useMemo(() => getOilChangeStatus(oilInfo.kmSince, rates.oilChangeKmInterval || 10000), [oilInfo, rates.oilChangeKmInterval]);

  const carTypeLabel = rates.defaultCarType === 'tara' ? 'تارا' : 'سورن';
  const monthlyIncome = useMemo(() => services.filter(s => s.date.startsWith(`${today.split('/')[0]}/${today.split('/')[1]}`)).reduce((sum,s)=>sum+s.income,0), [services, today]);
  const goalProgress = monthlyGoal > 0 ? Math.min(100, Math.round((monthlyIncome / monthlyGoal) * 100)) : 0;
  const reminderDates = [
    insuranceDate && { label: 'بیمه بدنه', date: insuranceDate, icon: 'shield-checkmark-outline' },
    vehicleInsuranceDate && { label: 'بیمه خودرو', date: vehicleInsuranceDate, icon: 'car-outline' },
  ].filter(Boolean) as any[];
  const privateValue = (value: number | string) => hideIncome ? '••••••' : formatNumber(Number(value) || 0);
  const privateMetric = (value: number | string, unit = '') => hideIncome ? '••••••' : `${formatNumber(Number(value) || 0)}${unit ? ` ${unit}` : ''}`;
  const toggleIncomePrivacy = () => { const next = !hideIncome; setHideIncome(next); AsyncStorage.setItem('car_income_hidden', String(next)).catch(() => {}); };
  const urgentReminders = reminderDates.filter(x => x.date && x.date <= today).length;
  const topPadding = insets.top + (Platform.OS === 'web' ? 20 : 8);

  const evalMeta: Record<string, { text: string; color: string; soft: string; icon: any }> = {
    great: { text: 'امروز عالی بود! 🎉', color: colors.success, soft: colors.successSoft, icon: 'trending-up' },
    good: { text: 'امروز خوب بود', color: colors.success, soft: colors.successSoft, icon: 'thumbs-up' },
    average: { text: 'امروز در حد معمول بود', color: colors.info, soft: colors.infoSoft, icon: 'remove-circle-outline' },
    low: { text: 'امروز کمتر از حد معمول بود', color: colors.warning, soft: colors.warningSoft, icon: 'trending-down' },
    insufficient: { text: 'برای مقایسه، داده کافی هنوز ثبت نشده', color: colors.textMuted, soft: colors.surfaceAlt, icon: 'information-circle-outline' },
  };
  const evalInfo = evalMeta[evaluation.verdict];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>داشبورد</Text>
              <Text style={[styles.headerDate, { color: colors.textMuted }]}>{today}  •  {hideIncome ? 'مبالغ مخفی' : 'مبالغ قابل مشاهده'}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={toggleIncomePrivacy} style={[styles.privacyButton, { backgroundColor: colors.surface, borderColor: colors.border }]} hitSlop={8}>
                <Ionicons name={hideIncome ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.accent} />
              </Pressable>
              <View style={[styles.carBadge, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="car-sport" size={15} color={colors.accent} />
              <Text style={[styles.carBadgeText, { color: colors.accentText }]}>{carTypeLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* کارت خلاصه امروز */}
          <Card style={styles.todayCard}>
            <View style={styles.todayHeaderRow}>
              <View style={[styles.evalIconWrap, { backgroundColor: evalInfo.soft }]}>
                <Ionicons name={evalInfo.icon} size={20} color={evalInfo.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.todayTitle, { color: colors.text }]}>{evalInfo.text}</Text>
                <Text style={[styles.todaySubtitle, { color: colors.textMuted }]}>
                  {todaySummary.count > 0 ? `${todaySummary.count} سرویس ثبت شده` : 'هنوز سرویسی امروز ثبت نشده'}
                </Text>
              </View>
            </View>
            <View style={[styles.todayStatsRow, { borderTopColor: colors.borderSoft }]}>
              <View style={styles.todayStatItem}>
                <Text style={[styles.todayStatValue, { color: colors.text }]}>{privateMetric(todaySummary.totalHours)}</Text>
                <Text style={[styles.todayStatLabel, { color: colors.textMuted }]}>ساعت کار امروز</Text>
              </View>
              <View style={[styles.todayStatDivider, { backgroundColor: colors.borderSoft }]} />
              <View style={styles.todayStatItem}>
                <Text style={[styles.todayStatValue, { color: colors.text }]}>{privateMetric(todaySummary.totalKm)}</Text>
                <Text style={[styles.todayStatLabel, { color: colors.textMuted }]}>کیلومتر امروز</Text>
              </View>
              <View style={[styles.todayStatDivider, { backgroundColor: colors.borderSoft }]} />
              <View style={styles.todayStatItem}>
                <Text style={[styles.todayStatValue, { color: colors.accentText }]}>{privateValue(todaySummary.totalIncome)}</Text>
                <Text style={[styles.todayStatLabel, { color: colors.textMuted }]}>درآمد امروز</Text>
              </View>
            </View>
          </Card>

          {/* هشدار تعویض روغن */}
          {oilStatus.level !== 'ok' && (
            <Pressable onPress={() => router.push('/(tabs)/costs')}>
              <Card style={[styles.oilCard, { borderColor: oilStatus.level === 'overdue' ? colors.danger : colors.warning }] as any}>
                <View style={styles.oilRow}>
                  <View style={[styles.evalIconWrap, { backgroundColor: oilStatus.level === 'overdue' ? colors.dangerSoft : colors.warningSoft }]}>
                    <Ionicons name="water" size={20} color={oilStatus.level === 'overdue' ? colors.danger : colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.todayTitle, { color: colors.text }]}>
                      {oilStatus.level === 'overdue' ? 'زمان تعویض روغن گذشته!' : oilStatus.level === 'due' ? 'وقت تعویض روغن نزدیک است' : 'به‌زودی وقت تعویض روغن می‌رسد'}
                    </Text>
                    <Text style={[styles.todaySubtitle, { color: colors.textMuted }]}>
                      {oilStatus.level === 'overdue'
                        ? `${formatNumber(Math.abs(oilStatus.remaining))} کیلومتر از موعد گذشته`
                        : `${formatNumber(oilStatus.remaining)} کیلومتر تا موعد باقی مانده`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.progressFill, { width: `${oilStatus.percent}%`, backgroundColor: oilStatus.level === 'overdue' ? colors.danger : colors.warning }]} />
                </View>
              </Card>
            </Pressable>
          )}

          {monthlyGoal > 0 && (
            <Card style={[styles.goalCard, { borderColor: colors.accent }]}>
              <View style={styles.goalHeader}>
                <View style={[styles.evalIconWrap,{backgroundColor:colors.accentSoft}]}><Ionicons name="flag" size={20} color={colors.accent} /></View>
                <View style={{flex:1}}><Text style={[styles.todayTitle,{color:colors.text}]}>هدف درآمد ماهانه</Text><Text style={[styles.todaySubtitle,{color:colors.textMuted}]}>پیشرفت نسبت به هدف ماهانه تنظیم‌شده</Text></View>
                <Text style={[styles.goalPercent,{color:colors.accent}]}>{goalProgress}%</Text>
              </View>
              <View style={[styles.progressBg,{backgroundColor:colors.surfaceAlt}]}><View style={[styles.progressFill,{width:`${goalProgress}%`,backgroundColor:colors.accent}]} /></View>
              <Text style={[styles.goalText,{color:colors.textMuted}]}>درآمد این ماه: {privateValue(monthlyIncome)} — هدف: {privateValue(monthlyGoal)} تومان</Text>
            </Card>
          )}

          {reminderDates.length > 0 && (
            <Card style={[styles.reminderCard, { borderColor: urgentReminders ? colors.warning : colors.border }]}>
              <View style={styles.goalHeader}><View style={[styles.evalIconWrap,{backgroundColor:urgentReminders?colors.warningSoft:colors.accentSoft}]}><Ionicons name="calendar-outline" size={20} color={urgentReminders?colors.warning:colors.accent} /></View><View style={{flex:1}}><Text style={[styles.todayTitle,{color:colors.text}]}>یادآوری مدارک خودرو</Text><Text style={[styles.todaySubtitle,{color:colors.textMuted}]}>تاریخ‌های مهم را از تنظیمات مدیریت کنید.</Text></View></View>
              <View style={styles.reminderList}>{reminderDates.map(item=><View key={item.label} style={[styles.reminderItem,{backgroundColor:item.date<=today?colors.warningSoft:colors.surfaceAlt}]}><Ionicons name={item.icon} size={16} color={item.date<=today?colors.warning:colors.accent} /><Text style={[styles.reminderLabel,{color:colors.text}]}>{item.label}</Text><Text style={[styles.reminderDate,{color:item.date<=today?colors.warning:colors.textMuted}]}>{item.date}{item.date<=today?' — نیاز به بررسی':''}</Text></View>)}</View>
            </Card>
          )}

          <View style={[styles.yearBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.yearTitle, { color: colors.textMuted }]}>آمار سال</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
              {availableYears.map(year=>{
                const active = selectedYear === year;
                return (
                  <Pressable key={year} onPress={()=>setSelectedYear(year)} style={[styles.yearChip, { backgroundColor: active ? colors.accent : colors.surfaceAlt }]}>
                    <Text style={[styles.yearChipText, { color: active ? colors.textOnAccent : colors.textSecondary }]}>{year}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Pressable onPress={() => setShowPersonnel(true)} style={({ pressed }) => [styles.personnelCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.evalIconWrap, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="id-card" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.todayTitle, { color: colors.text }]}>شناسنامه کارکنان</Text>
              <Text style={[styles.todaySubtitle, { color: colors.textMuted }]}>
                {personnel.length > 0 ? `${personnel.length} سرنشین ثبت شده` : 'ثبت نام، کد پرسنلی، مرکز هزینه و موبایل'}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.cardGrid}>
            <SummaryCard onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'income', year: String(selectedYear) } })}
              icon="trending-up" color={colors.accent} soft={colors.accentSoft} label="درآمد کل" value={privateValue(stats.totalIncome)} unit="تومان" colors={colors} />
            <SummaryCard onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'net', year: String(selectedYear) } })}
              icon="checkmark-circle" color={colors.success} soft={colors.successSoft} label="سود خالص" value={privateValue(stats.netIncome)} unit="تومان" colors={colors} />
            <SummaryCard onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'fuel', year: String(selectedYear) } })}
              icon="flame" color={colors.warning} soft={colors.warningSoft} label="هزینه سوخت" value={formatNumber(stats.totalFuel)} unit="تومان" colors={colors} />
            <SummaryCard onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'maintenance', year: String(selectedYear) } })}
              icon="build" color={colors.danger} soft={colors.dangerSoft} label="هزینه تعمیرات" value={formatNumber(stats.totalMaintenance)} unit="تومان" colors={colors} />
          </View>

          <View style={[styles.quickStatsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setShowQuickStats(v => !v)}
              style={({ pressed }) => [styles.quickStatsHeader, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.evalIconWrap, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="stats-chart" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>آمار کلی {selectedYear}</Text>
                <Text style={[styles.todaySubtitle, { color: colors.textMuted }]}>برای مشاهده و جزئیات هرکدام لمس کنید</Text>
              </View>
              <Ionicons name={showQuickStats ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
            </Pressable>
            {showQuickStats && (
              <View style={styles.quickStatsGrid}>
                <QuickStat onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'count', year: String(selectedYear) } })}
                  icon="list" color={colors.accent} soft={colors.accentSoft} value={formatNumber(stats.serviceCount)} label="تعداد سرویس" colors={colors} />
                <QuickStat onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'income', year: String(selectedYear) } })}
                  icon="trending-up" color={colors.accent} soft={colors.accentSoft} value={privateValue(Math.round(stats.totalIncome))} label="درآمد کل" colors={colors} />
                <QuickStat onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'expenses', year: String(selectedYear) } })}
                  icon="trending-down" color={colors.danger} soft={colors.dangerSoft} value={privateValue(Math.round(stats.totalFuel + stats.totalMaintenance))} label="هزینه‌های کل" colors={colors} />
                <QuickStat onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'km', year: String(selectedYear) } })}
                  icon="speedometer" color={colors.warning} soft={colors.warningSoft} value={privateMetric(stats.totalKm)} label="کل کیلومتر" colors={colors} />
                <QuickStat onPress={() => router.push({ pathname: '/stats-detail', params: { type: 'hours', year: String(selectedYear) } })}
                  icon="time" color={colors.info} soft={colors.infoSoft} value={privateMetric(stats.totalHours)} label="کل ساعت" colors={colors} />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <PersonnelModal visible={showPersonnel} onClose={() => setShowPersonnel(false)} />
    </View>
  );
}

function SummaryCard({ onPress, icon, color, soft, label, value, unit, colors }: any) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.cardIcon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.cardValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.cardUnit, { color: colors.textMuted }]}>{unit}</Text>
    </Pressable>
  );
}

function QuickStat({ onPress, icon, color, soft, value, label, colors }: any) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickStat, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.quickStatIcon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.quickStatValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerContent: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  privacyButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  headerDate: { fontSize: 13, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  carBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, gap: 6 },
  carBadgeText: { fontSize: 12.5, fontWeight: '700' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 110, gap: spacing.md },
  todayCard: { gap: spacing.md },
  goalCard: { gap: 10, borderWidth: 1.2 },
  goalHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  goalPercent: { fontSize: 20, fontWeight: '900' },
  goalText: { fontSize: 10.5, textAlign: 'right', writingDirection: 'rtl' },
  reminderCard: { gap: 10, borderWidth: 1.2 },
  reminderList: { gap: 7 },
  reminderItem: { minHeight: 40, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  reminderLabel: { fontSize: 12, fontWeight: '800' },
  reminderDate: { flex: 1, fontSize: 11, textAlign: 'left' },
  todayHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  evalIconWrap: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  todayTitle: { fontSize: 15.5, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  todaySubtitle: { fontSize: 12.5, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  todayStatsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: spacing.md },
  todayStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  todayStatDivider: { width: 1 },
  todayStatValue: { fontSize: 16, fontWeight: '800' },
  todayStatLabel: { fontSize: 11, writingDirection: 'rtl' },
  oilCard: { gap: spacing.sm, borderWidth: 1.5 },
  oilRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  progressBg: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  yearBar: { borderRadius: radii.lg, padding: 12, borderWidth: 1 },
  yearTitle: { fontSize: 12, textAlign: 'right', marginBottom: 8, fontWeight: '700', writingDirection: 'rtl' },
  yearScroll: { flexDirection: 'row-reverse', gap: 8 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  yearChipText: { fontWeight: '700' },
  personnelCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  summaryCard: { borderRadius: radii.lg, padding: spacing.md, width: '48%', borderWidth: 1, gap: 6, alignItems: 'flex-end' },
  cardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  cardValue: { fontSize: 17, fontWeight: '800', textAlign: 'right' },
  cardUnit: { fontSize: 10.5, textAlign: 'right' },
  quickStatsContainer: { marginTop: spacing.sm, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  quickStatsHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', textAlign: 'right', marginBottom: 14, writingDirection: 'rtl' },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  quickStat: { borderRadius: radii.lg, padding: 14, width: '48%', alignItems: 'center', borderWidth: 1, gap: 6 },
  quickStatIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  quickStatValue: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 11.5, writingDirection: 'rtl' },
});
