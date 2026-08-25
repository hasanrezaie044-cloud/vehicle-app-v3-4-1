import { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Modal,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Loan, PurchaseCategory, PersonalIncomeCategory, PERSIAN_MONTHS } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing } from '@/constants/theme';
import { ScreenHeader, Segmented, EmptyState } from '@/components/ui/UI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import JalaliDatePicker from '@/components/JalaliDatePicker';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import { computeLoanSchedule, loanSummary, loanTotalWithInterest, PURCHASE_CATEGORIES, PERSONAL_INCOME_CATEGORIES } from '@/utils/finance';

type FinTab = 'overview' | 'loans' | 'purchases';

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    services, fuels, maintenances, loans, personalExpenses, personalIncomes, formatNumber, getTodayJalali,
    addLoan, deleteLoan, toggleLoanInstallmentPaid,
    addPersonalExpense, deletePersonalExpense,
    addPersonalIncome, deletePersonalIncome,
  } = useApp();

  const [tab, setTab] = useState<FinTab>('overview');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [showFinanceDetail, setShowFinanceDetail] = useState<'income' | 'expenses' | null>(null);
  const [showLoanStats, setShowLoanStats] = useState(false);

  const today = getTodayJalali();
  const [curYear, curMonth] = today.split('/').map(Number);
  const [selYear, setSelYear] = useState(curYear);
  const [selMonth, setSelMonth] = useState(curMonth);

  const topInset = Platform.OS === 'web' ? 20 : insets.top;
  const safeServices = Array.isArray(services) ? services : [];
  const safeFuels = Array.isArray(fuels) ? fuels : [];
  const safeMaintenances = Array.isArray(maintenances) ? maintenances : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safePersonalExpenses = Array.isArray(personalExpenses) ? personalExpenses : [];
  const safePersonalIncomes = Array.isArray(personalIncomes) ? personalIncomes : [];

  const navigateMonth = (dir: number) => {
    let m = selMonth + dir, y = selYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelMonth(m); setSelYear(y);
  };

  // --- خلاصه ماه انتخاب‌شده ---
  const monthServices = useMemo(() => safeServices.filter(s => {
    const [y, m] = s.date.split('/').map(Number);
    return y === selYear && m === selMonth;
  }), [services, selYear, selMonth]);

  const monthFuels = useMemo(() => safeFuels.filter(f => {
    const [y, m] = f.date.split('/').map(Number);
    return y === selYear && m === selMonth;
  }), [fuels, selYear, selMonth]);

  const monthMaintenances = useMemo(() => safeMaintenances.filter(m => {
    const [y, mo] = m.date.split('/').map(Number);
    return y === selYear && mo === selMonth;
  }), [maintenances, selYear, selMonth]);

  const monthExpenses = useMemo(() => safePersonalExpenses.filter(e => {
    const [y, m] = e.date.split('/').map(Number);
    return y === selYear && m === selMonth;
  }), [personalExpenses, selYear, selMonth]);

  const monthIncomes = useMemo(() => safePersonalIncomes.filter(inc => {
    const [y, m] = inc.date.split('/').map(Number);
    return y === selYear && m === selMonth;
  }), [personalIncomes, selYear, selMonth]);

  const monthLoanInstallments = useMemo(() => {
    const list: { loan: Loan; index: number; amount: number; dueDate: string; paid: boolean }[] = [];
    safeLoans.forEach(loan => {
      const schedule = computeLoanSchedule(loan);
      schedule.forEach(inst => {
        const [y, m] = inst.dueDate.split('/').map(Number);
        if (y === selYear && m === selMonth) list.push({ loan, index: inst.index, amount: inst.amount, dueDate: inst.dueDate, paid: inst.paid });
      });
    });
    return list;
  }, [safeLoans, selYear, selMonth]);

  const monthServiceIncome = useMemo(() => monthServices.reduce((sum, s) => sum + (Number(s.income) || 0), 0), [monthServices]);
  const monthExtraIncome = useMemo(() => monthIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [monthIncomes]);
  const monthIncome = monthServiceIncome + monthExtraIncome;
  const monthPurchasesTotal = useMemo(() => monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [monthExpenses]);
  const monthFuelTotal = useMemo(() => monthFuels.reduce((sum, f) => sum + (Number(f.total) || 0), 0), [monthFuels]);
  const monthMaintenanceTotal = useMemo(() => monthMaintenances.reduce((sum, m) => sum + (Number(m.cost) || 0), 0), [monthMaintenances]);
  const monthLoanDue = useMemo(() => monthLoanInstallments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [monthLoanInstallments]);
  const monthLoanPaid = useMemo(() => monthLoanInstallments.filter(i => i.paid).reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [monthLoanInstallments]);
  const totalExpenses = monthPurchasesTotal + monthFuelTotal + monthMaintenanceTotal + monthLoanDue;
  const remaining = monthIncome - totalExpenses;

  const purchasesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [monthExpenses]);

  const handleDeletePurchase = useCallback((id: string) => {
    Alert.alert('حذف', 'آیا از حذف این خرید مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePersonalExpense(id) },
    ]);
  }, [deletePersonalExpense]);

  const handleDeleteIncome = useCallback((id: string) => {
    Alert.alert('حذف', 'آیا از حذف این درآمد مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePersonalIncome(id) },
    ]);
  }, [deletePersonalIncome]);

  const loanStats = useMemo(() => {
    let totalWithInterest = 0, totalPaid = 0, totalRemaining = 0, activeCount = 0;
    safeLoans.forEach(loan => {
      const s = loanSummary(loan);
      totalWithInterest += s.totalWithInterest;
      totalPaid += s.paidAmount;
      totalRemaining += s.remainingAmount;
      if (!s.isCompleted) activeCount++;
    });
    return { totalWithInterest, totalPaid, totalRemaining, activeCount };
  }, [safeLoans]);

  const sortedLoans = useMemo(() => {
    return [...safeLoans].sort((a, b) => {
      const sa = loanSummary(a), sb = loanSummary(b);
      const da = sa.nextInstallment?.dueDate || '9999/99/99';
      const db = sb.nextInstallment?.dueDate || '9999/99/99';
      return da.localeCompare(db);
    });
  }, [safeLoans]);

  const handleDeleteLoan = useCallback((id: string) => {
    Alert.alert('حذف وام', 'آیا از حذف این وام و تمام اقساط آن مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteLoan(id) },
    ]);
  }, [deleteLoan]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: topInset }}>
          <ScreenHeader title="مدیریت مالی" icon="wallet" subtitle="درآمد، هزینه‌ها، وام‌ها و خریدها" />
        </View>

        <View style={styles.content}>
          <Segmented
            options={[
              { label: 'خلاصه', value: 'overview' },
              { label: 'وام‌ها', value: 'loans' },
              { label: 'خریدها', value: 'purchases' },
            ] as const}
            value={tab}
            onChange={setTab}
          />

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn} hitSlop={8}>
              <Ionicons name="chevron-forward" size={22} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.monthNavText, { color: colors.text }]}>{PERSIAN_MONTHS[selMonth - 1]} {selYear}</Text>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {tab === 'overview' && (
            <View style={{ gap: spacing.md }}>
              <View style={[styles.remainingCard, { backgroundColor: remaining >= 0 ? colors.successSoft : colors.dangerSoft, borderColor: remaining >= 0 ? colors.success : colors.danger }]}>
                <Ionicons name={remaining >= 0 ? 'checkmark-circle' : 'alert-circle'} size={26} color={remaining >= 0 ? colors.success : colors.danger} />
                <Text style={[styles.remainingLabel, { color: colors.textSecondary }]}>باقیمانده از حقوق این ماه</Text>
                <Text style={[styles.remainingValue, { color: remaining >= 0 ? colors.success : colors.danger }]}>{formatNumber(remaining)} تومان</Text>
              </View>

              <View style={styles.summaryRow}>
                <TouchableOpacity onPress={() => setShowFinanceDetail('income')} style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="trending-up" size={18} color={colors.accent} />
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>درآمد ماه</Text>
                  <Text style={[styles.summaryBoxValue, { color: colors.accentText }]}>{formatNumber(monthIncome)}</Text>
                  <Text style={[styles.tapHint, { color: colors.textMuted }]}>مشاهده جزئیات</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowFinanceDetail('expenses')} style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="trending-down" size={18} color={colors.danger} />
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>هزینه‌های ماه</Text>
                  <Text style={[styles.summaryBoxValue, { color: colors.danger }]}>{formatNumber(totalExpenses)}</Text>
                  <Text style={[styles.tapHint, { color: colors.textMuted }]}>مشاهده جزئیات</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.incomeCardHeader}>
                  <TouchableOpacity onPress={() => setShowIncomeModal(true)} style={[styles.smallAddBtn, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="add" size={16} color={colors.accent} />
                    <Text style={[styles.smallAddBtnText, { color: colors.accent }]}>درآمد اضافی</Text>
                  </TouchableOpacity>
                  <Text style={[styles.detailCardTitle, { color: colors.text, marginBottom: 0 }]}>درآمدهای اضافی ماه</Text>
                </View>
                {monthIncomes.length === 0 ? (
                  <Text style={[styles.noIncomeText, { color: colors.textMuted }]}>پاداش یا درآمد اضافی برای این ماه ثبت نشده است</Text>
                ) : (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {monthIncomes.map(inc => {
                      const cat = PERSONAL_INCOME_CATEGORIES.find(c => c.key === inc.category);
                      return (
                        <View key={inc.id} style={[styles.detailMiniRow, { backgroundColor: colors.surfaceAlt }]}>
                          <Text style={[styles.detailMiniTitle, { color: colors.text }]} numberOfLines={1}>
                            {inc.title || cat?.label || 'درآمد'} • {inc.date}
                          </Text>
                          <View style={styles.incomeMiniRight}>
                            <Text style={[styles.detailMiniValue, { color: colors.success }]}>{formatNumber(inc.amount)} تومان</Text>
                            <TouchableOpacity onPress={() => handleDeleteIncome(inc.id)} hitSlop={8}>
                              <Ionicons name="trash-outline" size={16} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailCardTitle, { color: colors.text }]}>ترکیب هزینه‌های ماه</Text>
                <Row label="اقساط وام سررسیدشده" value={monthLoanDue} colors={colors} />
                <Row label="از اقساط بالا پرداخت‌شده" value={monthLoanPaid} colors={colors} muted />
                <Row label="خریدهای شخصی" value={monthPurchasesTotal} colors={colors} />
                {PURCHASE_CATEGORIES.map(c => purchasesByCategory[c.key] ? (
                  <Row key={c.key} label={`— ${c.label}`} value={purchasesByCategory[c.key]} colors={colors} muted small />
                ) : null)}
              </View>

              {monthLoanInstallments.filter(i => !i.paid).length > 0 && (
                <View style={[styles.detailCard, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
                  <Text style={[styles.detailCardTitle, { color: colors.text }]}>اقساط سررسید این ماه</Text>
                  {monthLoanInstallments.filter(i => !i.paid).map(i => (
                    <Row key={`${i.loan.id}-${i.index}`} label={`${i.loan.title} (قسط ${i.index})`} value={i.amount} colors={colors} dateLabel={i.dueDate} />
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'loans' && (
            <View style={{ gap: spacing.md }}>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => setShowLoanModal(true)}>
                <Ionicons name="add-circle-outline" size={19} color={colors.textOnAccent} />
                <Text style={[styles.addBtnText, { color: colors.textOnAccent }]}>ثبت وام جدید</Text>
              </TouchableOpacity>

              {safeLoans.length === 0 ? (
                <EmptyState icon="cash-outline" title="هیچ وامی ثبت نشده است" />
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowLoanStats(v => !v)}
                    style={[styles.loanStatsCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
                  >
                    <View style={styles.loanStatsHeaderRow}>
                      <Ionicons name={showLoanStats ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.loanStatsTitle, { color: colors.text }]}>آمار کلی وام‌ها</Text>
                        <Text style={[styles.loanStatsSub, { color: colors.textSecondary }]}>
                          {loanStats.activeCount} وام فعال • سررسید این ماه {formatNumber(monthLoanDue)} تومان
                        </Text>
                      </View>
                      <View style={[styles.evalIconWrap, { backgroundColor: colors.accent }]}>
                        <Ionicons name="stats-chart" size={18} color={colors.textOnAccent} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {showLoanStats && (
                    <View style={styles.loanStatsGrid}>
                      <View style={[styles.miniStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>وام‌های فعال</Text>
                        <Text style={[styles.miniStatValue, { color: colors.text }]}>{loanStats.activeCount.toString()}</Text>
                      </View>
                      <View style={[styles.miniStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>مجموع وام (با سود)</Text>
                        <Text style={[styles.miniStatValue, { color: colors.text }]}>{formatNumber(loanStats.totalWithInterest)}</Text>
                      </View>
                      <View style={[styles.miniStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>پرداخت‌شده</Text>
                        <Text style={[styles.miniStatValue, { color: colors.success }]}>{formatNumber(loanStats.totalPaid)}</Text>
                      </View>
                      <View style={[styles.miniStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>باقی‌مانده کل</Text>
                        <Text style={[styles.miniStatValue, { color: colors.danger }]}>{formatNumber(loanStats.totalRemaining)}</Text>
                      </View>
                      <View style={[styles.miniStatCard, styles.miniStatCardWide, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>سررسید این ماه</Text>
                        <Text style={[styles.miniStatValue, { color: colors.warning }]}>{formatNumber(monthLoanDue)} تومان</Text>
                      </View>
                    </View>
                  )}

                  {sortedLoans.map(loan => {
                  const s = loanSummary(loan);
                  const expanded = expandedLoanId === loan.id;
                  return (
                    <View key={loan.id} style={[styles.loanCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TouchableOpacity style={styles.loanHeaderRow} onPress={() => setExpandedLoanId(expanded ? null : loan.id)} activeOpacity={0.75}>
                        <View style={[styles.evalIconWrap, { backgroundColor: colors.accentSoft }]}>
                          <Ionicons name="cash" size={19} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.loanTitle, { color: colors.text }]}>{loan.title}</Text>
                          <Text style={[styles.loanSub, { color: colors.textMuted }]}>
                            {s.isCompleted ? 'تسویه شده ✓' : s.nextInstallment ? `قسط بعدی: ${s.nextInstallment.dueDate} — ${formatNumber(s.nextInstallment.amount)} تومان` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteLoan(loan.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                      </TouchableOpacity>


                      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt, marginTop: 10 }]}>
                        <View style={[styles.progressFill, { width: `${s.schedule.length ? Math.round((s.paidCount / s.schedule.length) * 100) : 0}%`, backgroundColor: colors.accent }]} />
                      </View>
                      <Text style={[styles.loanProgressText, { color: colors.textMuted }]}>
                        {s.paidCount} از {s.schedule.length} قسط پرداخت شده — باقیمانده: {formatNumber(s.remainingAmount)} تومان
                      </Text>

                      {expanded && (
                        <View style={{ marginTop: 10, gap: 6 }}>
                          <View style={[styles.loanDetailSummary, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }]}>
                            <Row label="اصل وام" value={loan.totalAmount} colors={colors} />
                            <Row label="درصد سود" value={loan.interestPercent || 0} colors={colors} suffix="٪" />
                            <Row label="کل با سود" value={s.totalWithInterest} colors={colors} />
                            <Row label="پرداخت‌شده" value={s.paidAmount} colors={colors} />
                            <Row label="باقی‌مانده" value={s.remainingAmount} colors={colors} />
                          </View>
                          {s.schedule.map(inst => (
                            <TouchableOpacity
                              key={inst.index}
                              style={[styles.installmentRow, { backgroundColor: inst.paid ? colors.successSoft : colors.surfaceAlt }]}
                              onPress={() => toggleLoanInstallmentPaid(loan.id, inst.index)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name={inst.paid ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={inst.paid ? colors.success : colors.textMuted} />
                              <Text style={[styles.installmentText, { color: colors.text }]}>قسط {inst.index} — {inst.dueDate}</Text>
                              <Text style={[styles.installmentAmount, { color: colors.text }]}>{formatNumber(inst.amount)} تومان</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                </>
              )}
            </View>
          )}

          {tab === 'purchases' && (
            <View style={{ gap: spacing.md }}>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => setShowPurchaseModal(true)}>
                <Ionicons name="add-circle-outline" size={19} color={colors.textOnAccent} />
                <Text style={[styles.addBtnText, { color: colors.textOnAccent }]}>ثبت خرید جدید</Text>
              </TouchableOpacity>

              <View style={[styles.summaryCardRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>جمع خریدهای {PERSIAN_MONTHS[selMonth - 1]}</Text>
                <Text style={[styles.summaryBoxValue, { color: colors.danger }]}>{formatNumber(monthPurchasesTotal)} تومان</Text>
              </View>

              {monthExpenses.length === 0 ? (
                <EmptyState icon="bag-outline" title="خریدی برای این ماه ثبت نشده است" />
              ) : (
                [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date)).map(exp => {
                  const cat = PURCHASE_CATEGORIES.find(c => c.key === exp.category);
                  return (
                    <View key={exp.id} style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.listCardRow}>
                        <View style={styles.listCardInfo}>
                          <Ionicons name={(cat?.icon as any) || 'pricetag-outline'} size={16} color={colors.accent} />
                          <Text style={[styles.listCardDate, { color: colors.textSecondary }]}>{exp.date}</Text>
                          <Text style={[styles.catLabel, { color: colors.text }]}>{cat?.label || exp.category}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeletePurchase(exp.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                      {exp.title ? <Text style={[styles.descText, { color: colors.textMuted }]}>{exp.title}</Text> : null}
                      <Text style={[styles.expenseAmount, { color: colors.text }]}>{formatNumber(exp.amount)} تومان</Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>


      {showFinanceDetail && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowFinanceDetail(null)}>
          <View style={[styles.detailOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              <View style={[styles.detailHeader, { borderBottomColor: colors.borderSoft }]}>
                <TouchableOpacity onPress={() => setShowFinanceDetail(null)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  {showFinanceDetail === 'income' ? 'جزئیات درآمد' : 'جزئیات هزینه‌ها'}
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 8 }} showsVerticalScrollIndicator={false}>
                {showFinanceDetail === 'income' ? (
                  <>
                    <Row label="درآمد سرویس‌ها" value={monthServiceIncome} colors={colors} />
                    <Row label="درآمد اضافی (پاداش و غیره)" value={monthExtraIncome} colors={colors} />
                    <Row label="تعداد سرویس" value={monthServices.length} colors={colors} rawValue />
                    <Row label="کیلومتر کارکرد" value={monthServices.reduce((n,s) => n + (s.km || 0), 0)} colors={colors} suffix=" کیلومتر" />
                    <Row label="مجموع درآمد" value={monthIncome} colors={colors} />
                  </>
                ) : (
                  <>
                    <Row label="اقساط وام" value={monthLoanDue} colors={colors} />
                    <Row label="بنزین" value={monthFuelTotal} colors={colors} />
                    <Row label="تعمیرات" value={monthMaintenanceTotal} colors={colors} />
                    <Row label="خریدهای شخصی" value={monthPurchasesTotal} colors={colors} />
                    <Row label="کل هزینه" value={totalExpenses} colors={colors} />
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <LoanFormModal visible={showLoanModal} onClose={() => setShowLoanModal(false)} onSubmit={addLoan} getTodayJalali={getTodayJalali} formatNumber={formatNumber} />
      <PurchaseFormModal visible={showPurchaseModal} onClose={() => setShowPurchaseModal(false)} onSubmit={addPersonalExpense} getTodayJalali={getTodayJalali} />
      <IncomeFormModal visible={showIncomeModal} onClose={() => setShowIncomeModal(false)} onSubmit={addPersonalIncome} getTodayJalali={getTodayJalali} />
    </View>
  );
}

function LoanFormModal({ visible, onClose, onSubmit, getTodayJalali, formatNumber }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (loan: { title: string; totalAmount: number; interestPercent: number; date: string; installmentsCount: number }) => void;
  getTodayJalali: () => string;
  formatNumber: (n: number) => string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [totalAmount, setTotalAmount] = useState('');
  const [interestPercent, setInterestPercent] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setDate(getTodayJalali());
    setTotalAmount('');
    setInterestPercent('');
    setInstallmentsCount('');
  }, [getTodayJalali]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const count = Math.max(1, Number(installmentsCount) || 1);
  const totalWithInterest = loanTotalWithInterest(Number(totalAmount) || 0, Number(interestPercent) || 0);
  const perInstallment = count > 0 ? Math.round(totalWithInterest / count) : 0;

  const handleSubmit = () => {
    if (!title.trim()) { Alert.alert('خطا', 'عنوان وام را وارد کنید'); return; }
    if (!(Number(totalAmount) > 0)) { Alert.alert('خطا', 'مبلغ وام را وارد کنید'); return; }
    if (!(Number(installmentsCount) > 0)) { Alert.alert('خطا', 'تعداد اقساط را وارد کنید'); return; }
    onSubmit({
      title: title.trim(),
      totalAmount: Number(totalAmount) || 0,
      interestPercent: Number(interestPercent) || 0,
      date,
      installmentsCount: count,
    });
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[modalStyles.header, { borderBottomColor: colors.borderSoft }]}>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[modalStyles.title, { color: colors.text }]}>ثبت وام جدید</Text>
            <View style={{ width: 24 }} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[modalStyles.body, { paddingBottom: insets.bottom + 100 }]}
            bottomOffset={40}
            showsVerticalScrollIndicator={false}
          >
              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>عنوان وام</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={title} onChangeText={setTitle} placeholder="مثلاً وام خرید خودرو" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <JalaliDatePicker value={date} onSelect={setDate} label="تاریخ دریافت وام" />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>مبلغ کل وام (تومان)</Text>
              <FormattedNumberInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={totalAmount} onChangeText={setTotalAmount} placeholder="0" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>درصد سود</Text>
              <FormattedNumberInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={interestPercent} onChangeText={setInterestPercent} placeholder="0" placeholderTextColor={colors.textMuted} textAlign="right" decimals={2}
              />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>تعداد اقساط</Text>
              <FormattedNumberInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={installmentsCount} onChangeText={setInstallmentsCount} placeholder="مثلاً 12" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              {Number(totalAmount) > 0 && Number(installmentsCount) > 0 && (
                <View style={[modalStyles.calcBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                  <Text style={[modalStyles.calcLine, { color: colors.accentText }]}>کل با سود: {formatNumber(totalWithInterest)} تومان</Text>
                  <Text style={[modalStyles.calcLine, { color: colors.accentText }]}>هر قسط: {formatNumber(perInstallment)} تومان</Text>
                </View>
              )}

              <TouchableOpacity style={[modalStyles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
                <Text style={[modalStyles.submitBtnText, { color: colors.textOnAccent }]}>ثبت وام</Text>
              </TouchableOpacity>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

function PurchaseFormModal({ visible, onClose, onSubmit, getTodayJalali }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (expense: { date: string; category: PurchaseCategory; title: string; amount: number }) => void;
  getTodayJalali: () => string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(getTodayJalali());
  const [category, setCategory] = useState<PurchaseCategory>(PURCHASE_CATEGORIES[0].key as PurchaseCategory);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const resetForm = useCallback(() => {
    setDate(getTodayJalali());
    setCategory(PURCHASE_CATEGORIES[0].key as PurchaseCategory);
    setTitle('');
    setAmount('');
  }, [getTodayJalali]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = () => {
    if (!(Number(amount) > 0)) { Alert.alert('خطا', 'مبلغ خرید را وارد کنید'); return; }
    onSubmit({ date, category, title: title.trim(), amount: Number(amount) || 0 });
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[modalStyles.header, { borderBottomColor: colors.borderSoft }]}>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[modalStyles.title, { color: colors.text }]}>ثبت خرید جدید</Text>
            <View style={{ width: 24 }} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[modalStyles.body, { paddingBottom: insets.bottom + 100 }]}
            bottomOffset={40}
            showsVerticalScrollIndicator={false}
          >
              <JalaliDatePicker value={date} onSelect={setDate} label="تاریخ" />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>دسته‌بندی</Text>
              <View style={modalStyles.chipsRow}>
                {PURCHASE_CATEGORIES.map(c => {
                  const active = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[modalStyles.chip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.surfaceAlt }]}
                      onPress={() => setCategory(c.key as PurchaseCategory)}
                    >
                      <Ionicons name={c.icon as any} size={14} color={active ? colors.textOnAccent : colors.textSecondary} />
                      <Text style={[modalStyles.chipText, { color: active ? colors.textOnAccent : colors.textSecondary }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>توضیح (اختیاری)</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={title} onChangeText={setTitle} placeholder="توضیح دلخواه" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>مبلغ (تومان)</Text>
              <FormattedNumberInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <TouchableOpacity style={[modalStyles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
                <Text style={[modalStyles.submitBtnText, { color: colors.textOnAccent }]}>ثبت خرید</Text>
              </TouchableOpacity>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

function IncomeFormModal({ visible, onClose, onSubmit, getTodayJalali }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (income: { date: string; category: PersonalIncomeCategory; title: string; amount: number }) => void;
  getTodayJalali: () => string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(getTodayJalali());
  const [category, setCategory] = useState<PersonalIncomeCategory>(PERSONAL_INCOME_CATEGORIES[0].key as PersonalIncomeCategory);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const resetForm = useCallback(() => {
    setDate(getTodayJalali());
    setCategory(PERSONAL_INCOME_CATEGORIES[0].key as PersonalIncomeCategory);
    setTitle('');
    setAmount('');
  }, [getTodayJalali]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = () => {
    if (!(Number(amount) > 0)) { Alert.alert('خطا', 'مبلغ درآمد را وارد کنید'); return; }
    onSubmit({ date, category, title: title.trim(), amount: Number(amount) || 0 });
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[modalStyles.header, { borderBottomColor: colors.borderSoft }]}>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[modalStyles.title, { color: colors.text }]}>ثبت درآمد اضافی</Text>
            <View style={{ width: 24 }} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[modalStyles.body, { paddingBottom: insets.bottom + 100 }]}
            bottomOffset={40}
            showsVerticalScrollIndicator={false}
          >
              <JalaliDatePicker value={date} onSelect={setDate} label="تاریخ" />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>دسته‌بندی</Text>
              <View style={modalStyles.chipsRow}>
                {PERSONAL_INCOME_CATEGORIES.map(c => {
                  const active = category === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[modalStyles.chip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.surfaceAlt }]}
                      onPress={() => setCategory(c.key as PersonalIncomeCategory)}
                    >
                      <Ionicons name={c.icon as any} size={14} color={active ? colors.textOnAccent : colors.textSecondary} />
                      <Text style={[modalStyles.chipText, { color: active ? colors.textOnAccent : colors.textSecondary }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>توضیح (اختیاری)</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={title} onChangeText={setTitle} placeholder="توضیح دلخواه" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>مبلغ (تومان)</Text>
              <FormattedNumberInput
                style={[modalStyles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.textMuted} textAlign="right"
              />

              <TouchableOpacity style={[modalStyles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
                <Text style={[modalStyles.submitBtnText, { color: colors.textOnAccent }]}>ثبت درآمد</Text>
              </TouchableOpacity>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, colors, muted, small, dateLabel, suffix = ' تومان', rawValue = false }: { label: string; value: number; colors: any; muted?: boolean; small?: boolean; dateLabel?: string; suffix?: string; rawValue?: boolean }) {
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.borderSoft }]}>
      <Text style={[rowStyles.label, { color: muted ? colors.textMuted : colors.textSecondary, fontSize: small ? 12 : 13 }]}>{label}{dateLabel ? ` — ${dateLabel}` : ''}</Text>
      <Text style={[rowStyles.value, { color: muted ? colors.textMuted : colors.text, fontSize: small ? 12.5 : 14 }]}>{value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{rawValue ? '' : suffix}</Text>
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1 },
  label: { flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  value: { fontWeight: '700', marginLeft: 8, textAlign: 'left' },
});

const styles = StyleSheet.create({
  tapHint: { fontSize: 9.5, marginTop: 3, fontWeight: '600' },
  loanGroupHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 2 },
  loanGroupIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  loanGroupTitle: { flex: 1, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  serviceBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  serviceBadgeText: { fontSize: 12, fontWeight: '700' },
  loanStatsCard: { borderRadius: radii.lg, borderWidth: 1.5, padding: 14 },
  loanStatsHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  loanStatsTitle: { fontSize: 14.5, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  loanStatsSub: { fontSize: 11.5, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  loanStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStatCard: { flexBasis: '47%', flexGrow: 1, borderRadius: radii.md, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  miniStatCardWide: { flexBasis: '100%' },
  miniStatLabel: { fontSize: 11.5, textAlign: 'center', writingDirection: 'rtl' },
  miniStatValue: { fontSize: 15, fontWeight: '800' },
  incomeCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  smallAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  smallAddBtnText: { fontSize: 11.5, fontWeight: '700' },
  noIncomeText: { fontSize: 12, textAlign: 'center', writingDirection: 'rtl', paddingVertical: 10 },
  incomeMiniRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailModal: { maxHeight: '90%', minHeight: '45%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  detailTitle: { fontSize: 18, fontWeight: '800' },
  detailMiniRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 11, marginTop: 2 },
  detailMiniTitle: { flex: 1, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  detailMiniValue: { fontSize: 12.5, fontWeight: '800', marginLeft: 8 },
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  monthNavBtn: { padding: 6 },
  monthNavText: { fontSize: 16, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  remainingCard: { borderRadius: radii.lg, borderWidth: 1.5, padding: 18, alignItems: 'center', gap: 6 },
  remainingLabel: { fontSize: 13, fontWeight: '600' },
  remainingValue: { fontSize: 24, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryBox: { flex: 1, borderRadius: radii.lg, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  summaryCardRow: { borderRadius: radii.lg, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryBoxLabel: { fontSize: 12, writingDirection: 'rtl' },
  summaryBoxValue: { fontSize: 16, fontWeight: '800' },
  detailCard: { borderRadius: radii.lg, borderWidth: 1, padding: 14 },
  detailCardTitle: { fontSize: 14.5, fontWeight: '700', textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.md, paddingVertical: 14 },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  loanCard: { borderRadius: radii.lg, borderWidth: 1, padding: 14 },
  loanHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  evalIconWrap: { width: 38, height: 38, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  loanTitle: { fontSize: 14.5, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  loanSub: { fontSize: 11.5, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  progressBg: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  loanProgressText: { fontSize: 11.5, textAlign: 'right', marginTop: 6, writingDirection: 'rtl' },
  installmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 9 },
  installmentText: { flex: 1, fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  installmentAmount: { fontSize: 12.5, fontWeight: '700' },
  loanDetailSummary: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2 },
  listCard: { borderRadius: radii.md, padding: 14, borderWidth: 1, gap: 6 },
  listCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listCardDate: { fontSize: 12.5 },
  catLabel: { fontSize: 13.5, fontWeight: '700' },
  descText: { fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  expenseAmount: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', minHeight: '60%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800', writingDirection: 'rtl' },
  body: { padding: spacing.lg, paddingBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 6, marginTop: 10, writingDirection: 'rtl' },
  input: { borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, borderWidth: 1, textAlign: 'right', writingDirection: 'rtl' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1 },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  calcBox: { borderRadius: radii.md, padding: 14, marginTop: 14, borderWidth: 1, gap: 4 },
  calcLine: { fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
  submitBtn: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
});
