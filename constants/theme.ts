// سیستم طراحی برنامه مدیریت خودرو
// پالت رنگی بر پایه سبز-آبی نفتی (Petrol) برای حالت روشن و تیره

export interface ThemeColors {
  // پس‌زمینه‌ها
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderSoft: string;

  // متن‌ها
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;

  // رنگ اصلی برند
  accent: string;
  accentSoft: string;
  accentText: string;

  // رنگ‌های وضعیت
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // رنگ‌های سرویس (برای نمودار/تقویم/برچسب‌ها)
  night: string;
  nightSoft: string;
  holiday: string;
  holidaySoft: string;
  request: string;
  requestSoft: string;
  available: string;
  availableSoft: string;
  fixed: string;
  fixedSoft: string;
  mission: string;
  missionSoft: string;

  shadow: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  statusBar: 'light' | 'dark';
}

// حالت روشن: کرم گرم و سبز نفتی تیره به عنوان لهجه
const lightColors: ThemeColors = {
  bg: '#F6F8FC',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3FA',
  border: '#DCE5F0',
  borderSoft: '#E8EEF6',

  text: '#172033',
  textSecondary: '#536174',
  textMuted: '#7B8798',
  textOnAccent: '#FFFFFF',

  accent: '#00A6A6',
  accentSoft: '#DDF8F5',
  accentText: '#008B8B',

  success: '#16A878',
  successSoft: '#DFF8ED',
  warning: '#F59E0B',
  warningSoft: '#FFF3D8',
  danger: '#EF476F',
  dangerSoft: '#FFE4EC',
  info: '#3B82F6',
  infoSoft: '#E6F0FF',

  night: '#6366F1',
  nightSoft: '#EDEBFF',
  holiday: '#EF476F',
  holidaySoft: '#FFE4EC',
  request: '#F59E0B',
  requestSoft: '#FFF3D8',
  available: '#3B82F6',
  availableSoft: '#E6F0FF',
  fixed: '#16A878',
  fixedSoft: '#DFF8ED',
  mission: '#A855F7',
  missionSoft: '#F3E8FF',

  shadow: 'rgba(20, 45, 80, 0.12)',
  overlay: 'rgba(20, 22, 19, 0.55)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#DCE5F0',
  statusBar: 'dark',
};

// حالت تیره: سبز-نفتی خیلی تیره با لهجه طلایی-سبز روشن
const darkColors: ThemeColors = {
  bg: '#0E1512',
  bgElevated: '#16201B',
  surface: '#16201B',
  surfaceAlt: '#1E2A23',
  border: '#28362E',
  borderSoft: '#202C25',

  text: '#EDF2EE',
  textSecondary: '#A9B5AE',
  textMuted: '#748079',
  textOnAccent: '#0E1512',

  accent: '#35E6D0',
  accentSoft: '#103F3A',
  accentText: '#70F7E0',

  success: '#4ADEB0',
  successSoft: '#153A2D',
  warning: '#FFC857',
  warningSoft: '#3E3010',
  danger: '#FF6B8A',
  dangerSoft: '#431B2A',
  info: '#5CA9FF',
  infoSoft: '#132C47',

  night: '#9B8AFB',
  nightSoft: '#27214D',
  holiday: '#FF6B8A',
  holidaySoft: '#431B2A',
  request: '#FFC857',
  requestSoft: '#3E3010',
  available: '#5CA9FF',
  availableSoft: '#132C47',
  fixed: '#4ADEB0',
  fixedSoft: '#153A2D',
  mission: '#C084FC',
  missionSoft: '#35204D',

  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  tabBar: '#111A26',
  tabBarBorder: '#294055',
  statusBar: 'light',
};

export const themes = { light: lightColors, dark: darkColors };

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '800' as const },
  title: { fontSize: 20, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14.5, fontWeight: '400' as const },
  caption: { fontSize: 12.5, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
};

export const serviceMeta: Record<string, { label: string; icon: string }> = {
  night: { label: 'شب', icon: 'moon' },
  holiday: { label: 'تعطیل', icon: 'sunny' },
  request: { label: 'درخواست', icon: 'call' },
  available: { label: 'در اختیار', icon: 'time' },
  fixed: { label: 'ثابت', icon: 'repeat' },
  mission: { label: 'ماموریت', icon: 'briefcase' },
};
