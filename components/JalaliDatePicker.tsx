import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/constants/theme';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function getDaysInJalaliMonth(month: number, year: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  const isLeap = isJalaliLeapYear(year);
  return isLeap ? 30 : 29;
}

function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    1, 5, 9, 13, 17, 22, 26, 30, 34, 38, 43, 47, 51, 55, 59, 63, 67, 71, 76,
    80, 84, 88, 92, 97, 101, 105, 109, 113, 117, 122, 126, 130,
  ];
  const mod = jy % 132;
  return breaks.includes(mod);
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
    jy -= 0;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
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
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && days >= gd_m[gm]; gm++) {
    days -= gd_m[gm];
  }
  return [gy, gm, days + 1];
}

function getJalaliDayOfWeek(jy: number, jm: number, jd: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const d = new Date(gy, gm - 1, gd);
  const dow = d.getDay();
  return (dow + 1) % 7;
}

interface JalaliDatePickerProps {
  value: string;
  onSelect: (date: string) => void;
  label?: string;
}

export default function JalaliDatePicker({ value, onSelect, label }: JalaliDatePickerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [yearsPage, setYearsPage] = useState(0); // صفحه‌بندی شبکه سال‌ها (هر صفحه ۱۲ سال)

  const parsedDate = useMemo(() => {
    const parts = value.split('/');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0]) || 1404,
        month: parseInt(parts[1]) || 1,
        day: parseInt(parts[2]) || 1,
      };
    }
    return { year: 1404, month: 1, day: 1 };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedDate.year);
  const [viewMonth, setViewMonth] = useState(parsedDate.month);

  const daysInMonth = getDaysInJalaliMonth(viewMonth, viewYear);
  const firstDayOfWeek = getJalaliDayOfWeek(viewYear, viewMonth, 1);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dateStr = `${viewYear}/${viewMonth.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    onSelect(dateStr);
    setVisible(false);
  };

  const handleOpen = () => {
    setViewYear(parsedDate.year);
    setViewMonth(parsedDate.month);
    setYearsPage(Math.floor(parsedDate.year / 12));
    setViewMode('days');
    setVisible(true);
  };

  const handleSelectYear = (y: number) => {
    setViewYear(y);
    setViewMode('months');
  };

  const handleSelectMonth = (m: number) => {
    setViewMonth(m);
    setViewMode('days');
  };

  const yearsGrid = useMemo(() => {
    const start = yearsPage * 12;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [yearsPage]);

  const isSelected = (day: number) => {
    return day === parsedDate.day && viewMonth === parsedDate.month && viewYear === parsedDate.year;
  };

  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleOpen} activeOpacity={0.7}>
        <Ionicons name="calendar" size={20} color={colors.accent} />
        <Text style={[styles.dateButtonText, { color: colors.text }]}>{value || 'انتخاب تاریخ'}</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={viewMode === 'days' ? handleNextMonth : () => setYearsPage(p => p + 1)}
                style={[styles.navBtn, { backgroundColor: colors.accentSoft }]}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'days' ? 'months' : viewMode === 'months' ? 'years' : 'days')}
                style={styles.calTitleBtn}
                activeOpacity={0.6}
              >
                <Text style={[styles.calTitle, { color: colors.text }]}>
                  {viewMode === 'days' && `${PERSIAN_MONTHS[viewMonth - 1]} ${viewYear}`}
                  {viewMode === 'months' && `${viewYear}`}
                  {viewMode === 'years' && `${yearsGrid[0]} - ${yearsGrid[yearsGrid.length - 1]}`}
                </Text>
                <Ionicons name="chevron-down-outline" size={15} color={colors.textMuted} style={{ marginRight: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={viewMode === 'days' ? handlePrevMonth : () => setYearsPage(p => Math.max(0, p - 1))}
                style={[styles.navBtn, { backgroundColor: colors.accentSoft }]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>

            {viewMode === 'years' && (
              <View style={styles.yearsGrid}>
                {yearsGrid.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearCell, y === viewYear && { backgroundColor: colors.accent }]}
                    onPress={() => handleSelectYear(y)}
                  >
                    <Text style={[styles.yearText, { color: y === viewYear ? colors.textOnAccent : colors.text }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {viewMode === 'months' && (
              <View style={styles.monthsGrid}>
                {PERSIAN_MONTHS.map((mLabel, idx) => {
                  const m = idx + 1;
                  const active = m === viewMonth;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthCell, { backgroundColor: colors.surfaceAlt }, active && { backgroundColor: colors.accent }]}
                      onPress={() => handleSelectMonth(m)}
                    >
                      <Text style={[styles.monthText, { color: active ? colors.textOnAccent : colors.text }]}>{mLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {viewMode === 'days' && (
              <>
                <View style={styles.weekRow}>
                  {WEEK_DAYS.map((d, i) => (
                    <View key={i} style={styles.weekCell}>
                      <Text style={[styles.weekText, { color: colors.textMuted }, (i === 5 || i === 6) && [styles.weekTextHoliday, { color: colors.danger }]]}>{d}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {calendarDays.map((day, i) => (
                    <View key={i} style={styles.dayCell}>
                      {day !== null ? (
                        <TouchableOpacity
                          style={[
                            styles.dayBtn,
                            isSelected(day) && { backgroundColor: colors.accent },
                            (i % 7 === 5 || i % 7 === 6) && !isSelected(day) && { backgroundColor: colors.dangerSoft },
                          ]}
                          onPress={() => handleSelectDay(day)}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              { color: colors.text },
                              isSelected(day) && [styles.dayTextSelected, { color: colors.textOnAccent }],
                              (i % 7 === 5 || i % 7 === 6) && !isSelected(day) && { color: colors.danger, fontWeight: '600' },
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.calFooter}>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => setVisible(false)}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>بستن</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'right',
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  calTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  yearCell: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthCell: {
    width: '31%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 13.5,
    fontWeight: '700' as const,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  weekTextHoliday: {
    fontWeight: '700' as const,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  dayTextSelected: {
    fontWeight: '700' as const,
  },
  calFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  closeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
