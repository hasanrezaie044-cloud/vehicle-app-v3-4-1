import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList, Modal, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Service, Fuel, Maintenance, PERSIAN_MONTHS } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { radii, spacing, serviceMeta } from '@/constants/theme';
import { ScreenHeader, EmptyState } from '@/components/ui/UI';
import { PURCHASE_CATEGORIES } from '@/utils/finance';

const PERSIAN_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function jalaliToGregorianCal(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy > 979 ? 1600 : 621;
  jy -= jy > 979 ? 979 : 0;
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4) + 78 + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const gd_m = [0,31,gy%4===0&&(gy%100!==0||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm = 0;
  for (gm = 0; gm < 13 && days >= gd_m[gm]; gm++) days -= gd_m[gm];
  return [gy, gm, days + 1];
}

const jalaliToDayOfWeek = (year: number, month: number, day: number): number => {
  const [gy, gm, gd] = jalaliToGregorianCal(year, month, day);
  const d = new Date(gy, gm - 1, gd);
  const dow = d.getDay();
  return (dow + 1) % 7;
};

export default function ServiceCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { services, fuels, maintenances, formatNumber, getTodayJalali, deleteService, deleteFuel, deleteMaintenance, personalExpenses, deletePersonalExpense } = useApp();
  const router = useRouter();

  const TYPE_COLOR: Record<string, { color: string; soft: string }> = {
    night: { color: colors.night, soft: colors.nightSoft },
    holiday: { color: colors.holiday, soft: colors.holidaySoft },
    request: { color: colors.request, soft: colors.requestSoft },
    available: { color: colors.available, soft: colors.availableSoft },
    fixed: { color: colors.fixed, soft: colors.fixedSoft },
    mission: { color: colors.mission, soft: colors.missionSoft },
  };

  const [selectedDate, setSelectedDate] = useState(getTodayJalali());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<Fuel | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);

  const today = getTodayJalali();
  const todayParts = today.split('/');
  const [currentYear, setCurrentYear] = useState(parseInt(todayParts[0]));
  const [currentMonth, setCurrentMonth] = useState(parseInt(todayParts[1]));

  const getDaysInJalaliMonth = (year: number, month: number) => {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    const breaks = [1,5,9,13,17,22,26,30,34,38,43,47,51,55,59,63,67,71,76,80,84,88,92,97,101,105,109,113,117,122,126,130];
    return breaks.includes(year % 132) ? 30 : 29;
  };

  const daysInMonth = getDaysInJalaliMonth(currentYear, currentMonth);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    date: `${currentYear}/${currentMonth.toString().padStart(2, '0')}/${(i + 1).toString().padStart(2, '0')}`,
  }));

  const selectedDateServices = useMemo(() => services.filter(s => s.date === selectedDate), [services, selectedDate]);
  const selectedDateExpenses = useMemo(() => personalExpenses.filter(e => e.date === selectedDate), [personalExpenses, selectedDate]);
  const selectedDateFuels = useMemo(() => fuels.filter(f => f.date === selectedDate), [fuels, selectedDate]);
  const selectedDateMaintenances = useMemo(() => maintenances.filter(m => m.date === selectedDate), [maintenances, selectedDate]);
  const selectedDateFuelTotal = useMemo(() => selectedDateFuels.reduce((sum, f) => sum + f.total, 0), [selectedDateFuels]);
  const selectedDateMaintenanceTotal = useMemo(() => selectedDateMaintenances.reduce((sum, m) => sum + m.cost, 0), [selectedDateMaintenances]);
  const selectedDateExpensesTotal = useMemo(() => selectedDateExpenses.reduce((sum, e) => sum + e.amount, 0), [selectedDateExpenses]);
  const selectedDateVehicleTotal = selectedDateFuelTotal + selectedDateMaintenanceTotal;
  const selectedDateServiceIncome = useMemo(() => selectedDateServices.reduce((sum, s) => sum + (Number(s.income) || 0), 0), [selectedDateServices]);
  const selectedDateTotalExpenses = selectedDateVehicleTotal + selectedDateExpensesTotal;
  const expenseTableRows = useMemo(() => {
    const rows: { key: string; date: string; title: string; amount: number; description: string; deletableId?: string }[] = [];
    selectedDateFuels.forEach(f => rows.push({
      key: `fuel-${f.id}`, date: f.date, title: 'بنزین',
      amount: f.total,
      description: `${formatNumber(f.liters)} لیتر • ${f.type === 'gov' ? 'دولتی' : f.type === 'semi' ? 'نیمه‌آزاد' : 'آزاد'}`,
    }));
    selectedDateMaintenances.forEach(m => rows.push({
      key: `maintenance-${m.id}`, date: m.date, title: m.typeText, amount: m.cost, description: m.description || '',
    }));
    selectedDateExpenses.forEach(e => {
      const cat = PURCHASE_CATEGORIES.find(c => c.key === e.category);
      rows.push({ key: `expense-${e.id}`, date: e.date, title: cat?.label || e.category, amount: e.amount, description: e.title || '', deletableId: e.id });
    });
    return rows;
  }, [selectedDateFuels, selectedDateMaintenances, selectedDateExpenses, formatNumber]);
  const monthServices = useMemo(
    () => services.filter(s => {
      const [y, m] = s.date.split('/');
      return Number(y) === currentYear && Number(m) === currentMonth;
    }),
    [services, currentYear, currentMonth]
  );
  const monthKm = useMemo(() => monthServices.reduce((sum, s) => sum + (s.km || 0), 0), [monthServices]);
  const monthHours = useMemo(() => monthServices.reduce((sum, s) => sum + (s.hours || 0), 0), [monthServices]);
  const getServicesForDate = (date: string) => services.filter(s => s.date === date);
  const hasServices = (date: string) => getServicesForDate(date).length > 0;
  const hasExpenses = (date: string) =>
    personalExpenses.some(e => e.date === date) ||
    fuels.some(f => f.date === date) ||
    maintenances.some(m => m.date === date);

  React.useEffect(() => { setExpensesExpanded(false); }, [selectedDate]);

  const handleDeleteExpense = (id: string) => {
    Alert.alert('حذف', 'آیا از حذف این هزینه مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePersonalExpense(id) },
    ]);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const topInset = Platform.OS === 'web' ? 20 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: topInset }}>
          <ScreenHeader title="تقویم سرویس‌ها" icon="calendar" subtitle="مشاهده سرویس‌های ثبت شده" />
        </View>

        <View style={styles.content}>
          <View style={[styles.monthStatsCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.monthStatsCompactPill}>
              <Ionicons name="speedometer-outline" size={14} color={colors.warning} />
              <Text style={[styles.monthStatsCompactValue, { color: colors.text }]}>{formatNumber(monthKm)}</Text>
              <Text style={[styles.monthStatsCompactLabel, { color: colors.textMuted }]}>کیلومتر</Text>
            </View>
            <View style={[styles.monthStatsCompactDivider, { backgroundColor: colors.borderSoft }]} />
            <View style={styles.monthStatsCompactPill}>
              <Ionicons name="time-outline" size={14} color={colors.info} />
              <Text style={[styles.monthStatsCompactValue, { color: colors.text }]}>{formatNumber(monthHours)}</Text>
              <Text style={[styles.monthStatsCompactLabel, { color: colors.textMuted }]}>ساعت</Text>
            </View>
            <View style={[styles.monthStatsCompactDivider, { backgroundColor: colors.borderSoft }]} />
            <View style={styles.monthStatsCompactPill}>
              <Ionicons name="car-outline" size={14} color={colors.accent} />
              <Text style={[styles.monthStatsCompactValue, { color: colors.text }]}>{monthServices.length}</Text>
              <Text style={[styles.monthStatsCompactLabel, { color: colors.textMuted }]}>سرویس</Text>
            </View>
            <Text style={[styles.monthStatsCompactTitle, { color: colors.textSecondary }]}>خلاصه کارکرد ماه</Text>
          </View>

          <View style={[styles.monthNavigator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="chevron-forward" size={22} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.monthYear, { color: colors.text }]}>{PERSIAN_MONTHS[currentMonth - 1]} {currentYear}</Text>
            <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.weekHeaderRow}>
              {PERSIAN_DAYS.map((day, index) => {
                const weekend = index === 5 || index === 6;
                return (
                  <View key={day} style={[styles.dayHeaderCell, weekend && { backgroundColor: colors.dangerSoft, borderRadius: 8 }]}>
                    <Text style={[styles.dayHeaderText, { color: weekend ? colors.danger : colors.textSecondary }]}>{day}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.calendarGrid}>
              {(() => {
                const firstDayOfMonth = jalaliToDayOfWeek(currentYear, currentMonth, 1);
                const daysArray: (typeof calendarDays[0] | null)[] = [];
                for (let i = 0; i < firstDayOfMonth; i++) daysArray.push(null);
                daysArray.push(...calendarDays);

                return daysArray.map((dayObj, index) => {
                  if (!dayObj) return <View key={`empty-${index}`} style={styles.dayCell} />;
                  const { day, date } = dayObj;
                  const dayOfWeek = jalaliToDayOfWeek(currentYear, currentMonth, day);
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                  const dayHasServices = hasServices(date);
                  const dayHasExpenses = hasExpenses(date);
                  const isSelected = date === selectedDate;
                  const isToday = date === today;

                  let bg = 'transparent';
                  let borderW = 0;
                  let borderC = 'transparent';
                  if (isSelected) bg = colors.accent;
                  else if (isToday) { bg = colors.surfaceAlt; borderW = 2; borderC = colors.accent; }
                  else if (isWeekend) bg = colors.dangerSoft;
                  else if (dayHasServices) bg = colors.surfaceAlt;

                  let textColor = colors.textSecondary;
                  if (isSelected) textColor = colors.textOnAccent;
                  else if (isToday) textColor = colors.accentText;
                  else if (isWeekend) textColor = colors.danger;

                  return (
                    <TouchableOpacity
                      key={date}
                      style={[styles.dayCell, { backgroundColor: bg, borderWidth: borderW, borderColor: borderC }]}
                      onPress={() => setSelectedDate(date)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayNumber, { color: textColor }]}>{day}</Text>
                      <View style={styles.dotsRow}>
                        {dayHasServices && (
                          <View style={[styles.serviceDot, { backgroundColor: isSelected ? colors.textOnAccent : colors.warning }]} />
                        )}
                        {dayHasExpenses && (
                          <View style={[styles.serviceDot, { backgroundColor: isSelected ? colors.textOnAccent : colors.danger }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </View>

          <View style={[styles.servicesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>سرویس‌های {selectedDate}</Text>
              <View style={styles.sectionHeaderActions}>
                <TouchableOpacity
                  style={[styles.quickAddBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={() => router.push({ pathname: '/(tabs)/services', params: { quick: '1', quickDate: selectedDate } })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={14} color={colors.accent} />
                  <Text style={[styles.quickAddBtnText, { color: colors.accentText }]}>ثبت سریع سرویس</Text>
                </TouchableOpacity>
                <View style={[styles.serviceBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.serviceBadgeText, { color: colors.textOnAccent }]}>{selectedDateServices.length}</Text>
                </View>
              </View>
            </View>

            {selectedDateServices.length === 0 ? (
              <EmptyState icon="calendar-outline" title="هیچ سرویسی برای این تاریخ ثبت نشده است" />
            ) : (
              <FlatList
                data={selectedDateServices}
                keyExtractor={s => s.id}
                scrollEnabled={false}
                renderItem={({ item: service }) => {
                  const typeInfo = serviceMeta[service.type];
                  const c = TYPE_COLOR[service.type] || { color: colors.textMuted, soft: colors.surfaceAlt };
                  return (
                    <TouchableOpacity
                      style={[styles.serviceItem, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => { setSelectedService(service); setShowDetail(true); }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.serviceIcon, { backgroundColor: c.soft }]}>
                        <Ionicons name={(typeInfo?.icon as any) || 'help'} size={19} color={c.color} />
                      </View>
                      <View style={styles.serviceInfo}>
                        <View style={styles.serviceRow}>
                          <Text style={[styles.serviceType, { color: colors.text }]}>{typeInfo?.label}</Text>
                          <Text style={[styles.serviceIncome, { color: c.color }]}>+{formatNumber(service.income)}</Text>
                        </View>
                        <View style={styles.serviceDetails}>
                          <Text style={[styles.serviceDetail, { color: colors.textMuted }]}>
                            {service.km > 0 ? `${service.km} کیلومتر` : ''}
                            {service.km > 0 && service.hours > 0 ? ' | ' : ''}
                            {service.hours > 0 ? `${service.hours} ساعت` : ''}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {selectedDateServices.length > 0 && (
              <View style={[styles.expenseTotalRow, { borderTopColor: colors.borderSoft }]}>
                <Text style={[styles.expenseTotalLabel, { color: colors.textMuted }]}>مجموع درآمد سرویس‌ها</Text>
                <Text style={[styles.expenseTotalValue, { color: colors.success }]}>{formatNumber(selectedDateServiceIncome)} تومان</Text>
              </View>
            )}
          </View>

          <View style={[styles.servicesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpensesExpanded(v => !v)}
              activeOpacity={0.7}
              disabled={expenseTableRows.length === 0}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>هزینه‌ها</Text>
              <View style={styles.sectionHeaderActions}>
                <Text style={[styles.expenseCollapsedTotal, { color: colors.danger }]}>{formatNumber(selectedDateTotalExpenses)} تومان</Text>
                {expenseTableRows.length > 0 && (
                  <Ionicons name={expensesExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                )}
              </View>
            </TouchableOpacity>

            {expenseTableRows.length === 0 ? (
              <EmptyState icon="wallet-outline" title="برای این تاریخ هزینه‌ای ثبت نشده است" />
            ) : expensesExpanded ? (
              <View style={[styles.expenseTable, { borderColor: colors.borderSoft }]}>
                <View style={[styles.expenseTableRow, styles.expenseTableHeaderRow, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.borderSoft }]}>
                  <Text style={[styles.expenseTableCell, styles.expenseColDate, styles.expenseTableHeaderText, { color: colors.textSecondary }]}>تاریخ</Text>
                  <Text style={[styles.expenseTableCell, styles.expenseColTitle, styles.expenseTableHeaderText, { color: colors.textSecondary }]}>نوع هزینه</Text>
                  <Text style={[styles.expenseTableCell, styles.expenseColAmount, styles.expenseTableHeaderText, { color: colors.textSecondary }]}>مبلغ</Text>
                  <Text style={[styles.expenseTableCell, styles.expenseColDesc, styles.expenseTableHeaderText, { color: colors.textSecondary }]}>توضیحات</Text>
                </View>
                {expenseTableRows.map((row, idx) => {
                  const RowWrapper: any = row.deletableId ? TouchableOpacity : View;
                  return (
                    <RowWrapper
                      key={row.key}
                      style={[
                        styles.expenseTableRow,
                        { borderBottomColor: colors.borderSoft },
                        idx === expenseTableRows.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      {...(row.deletableId ? { onPress: () => handleDeleteExpense(row.deletableId!), activeOpacity: 0.6 } : {})}
                    >
                      <Text style={[styles.expenseTableCell, styles.expenseColDate, { color: colors.textMuted }]} numberOfLines={1}>{row.date}</Text>
                      <Text style={[styles.expenseTableCell, styles.expenseColTitle, { color: colors.text }]} numberOfLines={1}>{row.title}</Text>
                      <Text style={[styles.expenseTableCell, styles.expenseColAmount, { color: colors.danger, fontWeight: '700' }]} numberOfLines={1}>-{formatNumber(row.amount)}</Text>
                      <Text style={[styles.expenseTableCell, styles.expenseColDesc, { color: colors.textMuted }]} numberOfLines={2}>{row.description || (row.deletableId ? 'برای حذف لمس کنید' : '—')}</Text>
                    </RowWrapper>
                  );
                })}
                <View style={[styles.expenseTotalRow, { borderTopColor: colors.borderSoft }]}>
                  <Text style={[styles.expenseTotalLabel, { color: colors.textMuted }]}>مجموع هزینه‌ها</Text>
                  <Text style={[styles.expenseTotalValue, { color: colors.danger }]}>{formatNumber(selectedDateTotalExpenses)} تومان</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {selectedService && (
        <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
          <View style={[styles.detailOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.detailContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.detailHeader, { borderBottomColor: colors.borderSoft }]}>
                <TouchableOpacity onPress={() => setShowDetail(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: colors.text }]}>جزئیات سرویس</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                {(() => {
                  const typeInfo = serviceMeta[selectedService.type];
                  const c = TYPE_COLOR[selectedService.type] || { color: colors.textMuted, soft: colors.surfaceAlt };
                  return (
                    <>
                      <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: c.color }]}>
                        <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>نوع سرویس</Text>
                          <View style={[styles.detailBadge, { backgroundColor: c.soft }]}>
                            <Ionicons name={(typeInfo?.icon as any) || 'help'} size={15} color={c.color} />
                            <Text style={[styles.detailBadgeText, { color: c.color }]}>{typeInfo?.label}</Text>
                          </View>
                        </View>
                        <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>تاریخ</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.date}</Text>
                        </View>
                        <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>درآمد</Text>
                          <Text style={[styles.detailValue, { color: colors.success, fontWeight: '700' }]}>{formatNumber(selectedService.income)} تومان</Text>
                        </View>
                      </View>

                      <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.accent }]}>
                        <Text style={[styles.cardTitle, { color: colors.accentText }]}>وسیله نقلیه</Text>
                        <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>نوع خودرو</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.carType === 'soren' ? 'سورن' : 'تارا'}</Text>
                        </View>
                        {selectedService.km > 0 && (
                          <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>کیلومتر</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.km} کیلومتر</Text>
                          </View>
                        )}
                        {selectedService.hours > 0 && (
                          <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>ساعت</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.hours} ساعت</Text>
                          </View>
                        )}
                      </View>

                      {(selectedService.origin || selectedService.destination) && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.accent }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>مسیر</Text>
                          {selectedService.origin && (
                            <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>مبدا</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.origin}</Text>
                            </View>
                          )}
                          {selectedService.destination && (
                            <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>مقصد</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.destination}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {selectedService.passengers && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.mission }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>سرنشین</Text>
                          <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>نام سرنشینان</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.passengers}</Text>
                          </View>
                        </View>
                      )}

                      {(selectedService.startTime || selectedService.endTime) && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.accent }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>زمان‌ها</Text>
                          {selectedService.startTime && (
                            <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>شروع</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.startTime}</Text>
                            </View>
                          )}
                          {selectedService.endTime && (
                            <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>پایان</Text>
                              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.endTime}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {selectedService.tollCount > 0 && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.warning }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>جزئیات هزینه</Text>
                          <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>تعداد عوارضی</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.tollCount} مورد</Text>
                          </View>
                        </View>
                      )}

                      {(selectedService.missionFood > 0 || selectedService.missionToll > 0 || selectedService.missionFine > 0) && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.mission }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>ماموریت</Text>
                          {selectedService.missionFood > 0 && <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>غذا</Text><Text style={[styles.detailValue, { color: colors.text }]}>{formatNumber(selectedService.missionFood)} تومان</Text></View>}
                          {selectedService.missionToll > 0 && <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>عوارض ماموریت</Text><Text style={[styles.detailValue, { color: colors.text }]}>{formatNumber(selectedService.missionToll)} تومان</Text></View>}
                          {selectedService.missionFine > 0 && <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>جریمه</Text><Text style={[styles.detailValue, { color: colors.text }]}>{formatNumber(selectedService.missionFine)} تومان</Text></View>}
                        </View>
                      )}

                      {selectedService.requestNumber && (
                        <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.accent }]}>
                          <Text style={[styles.cardTitle, { color: colors.accentText }]}>درخواست</Text>
                          <View style={[styles.detailRow, { borderBottomColor: colors.borderSoft }]}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>شماره درخواست</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedService.requestNumber}</Text>
                          </View>
                        </View>
                      )}
                    </>
                  );
                })()}
              </ScrollView>

              <View style={[styles.detailActions, { paddingBottom: Math.max(insets.bottom, 14) + 4 }]}>
                <TouchableOpacity
                  style={[styles.detailActionButton, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    const id = selectedService.id;
                    setShowDetail(false);
                    setSelectedService(null);
                    router.push({ pathname: '/(tabs)/services', params: { editId: id } });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={19} color={colors.textOnAccent} />
                  <Text style={[styles.detailActionText, { color: colors.textOnAccent }]}>ویرایش سرویس</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailActionButton, { backgroundColor: colors.dangerSoft, borderColor: colors.danger, borderWidth: 1 }]}
                  onPress={() => Alert.alert('حذف سرویس', 'آیا از حذف این سرویس مطمئن هستید؟', [
                    { text: 'انصراف', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: () => { deleteService(selectedService.id); setShowDetail(false); setSelectedService(null); } },
                  ])}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  <Text style={[styles.detailActionText, { color: colors.danger }]}>حذف سرویس</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // خلاصه کارکرد ماه: نسخه فشرده، یک ردیف کوچک در بالای تقویم (روشن/تیره سازگار)
  monthStatsCompact: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: radii.md, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, marginBottom: spacing.md, gap: 6 },
  monthStatsCompactPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  monthStatsCompactValue: { fontSize: 12.5, fontWeight: '800' },
  monthStatsCompactLabel: { fontSize: 10.5 },
  monthStatsCompactDivider: { width: 1, height: 14, marginHorizontal: 2 },
  monthStatsCompactTitle: { flex: 1, fontSize: 10.5, fontWeight: '700', textAlign: 'left', writingDirection: 'rtl' },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 120 },
  monthNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radii.lg, borderWidth: 1 },
  monthYear: { fontSize: 16, fontWeight: '700' },
  calendarContainer: { borderRadius: radii.lg, padding: 12, marginBottom: spacing.lg, borderWidth: 1 },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderCell: { width: '14.28%', height: 36, justifyContent: 'center', alignItems: 'center' },
  dayHeaderText: { fontSize: 12, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 5, borderRadius: 10, position: 'relative' },
  dayNumber: { fontSize: 14, fontWeight: '600' },
  dotsRow: { position: 'absolute', bottom: 5, flexDirection: 'row', gap: 3 },
  serviceDot: { width: 5, height: 5, borderRadius: 3 },
  servicesSection: { borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  sectionHeaderActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  serviceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 32, alignItems: 'center' },
  serviceBadgeText: { fontSize: 12, fontWeight: '700' },
  quickAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  quickAddBtnText: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  expenseCollapsedTotal: { fontSize: 14, fontWeight: '800' },
  expenseTable: { borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
  expenseTableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 6 },
  expenseTableHeaderRow: { borderBottomWidth: 1, paddingVertical: 9 },
  expenseTableHeaderText: { fontWeight: '800', fontSize: 11 },
  expenseTableCell: { fontSize: 11.5, textAlign: 'right', writingDirection: 'rtl', paddingHorizontal: 3 },
  expenseColDate: { width: 68 },
  expenseColTitle: { width: 78 },
  expenseColAmount: { width: 74, textAlign: 'left' },
  expenseColDesc: { flex: 1 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: radii.md, marginBottom: 10, gap: 12 },
  serviceIcon: { width: 38, height: 38, borderRadius: radii.sm, justifyContent: 'center', alignItems: 'center' },
  serviceInfo: { flex: 1 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  serviceType: { fontSize: 14, fontWeight: '700' },
  serviceIncome: { fontSize: 14, fontWeight: '700' },
  serviceDetails: { flexDirection: 'row' },
  serviceDetail: { fontSize: 12 },
  expenseTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 6, borderTopWidth: 1 },
  expenseTotalLabel: { fontSize: 12.5, writingDirection: 'rtl' },
  expenseTotalValue: { fontSize: 15, fontWeight: '800' },
  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  detailTitle: { fontSize: 18, fontWeight: '700' },
  detailActions: { flexDirection: 'row-reverse', gap: 10, padding: 16, paddingTop: 8 },
  detailActionButton: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  detailActionText: { fontSize: 13, fontWeight: '800' },
  detailBody: { paddingHorizontal: 20, paddingVertical: 16, maxHeight: '80%' },
  detailCard: { borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, borderLeftWidth: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  detailBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  detailBadgeText: { fontSize: 12, fontWeight: '600' },
});
