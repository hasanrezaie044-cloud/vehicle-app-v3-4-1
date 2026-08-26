// توابع مشترک تاریخ جلالی: تبدیل به میلادی، افزودن ماه/روز، تعداد روزهای ماه

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    1, 5, 9, 13, 17, 22, 26, 30, 34, 38, 43, 47, 51, 55, 59, 63, 67, 71, 76,
    80, 84, 88, 92, 97, 101, 105, 109, 113, 117, 122, 126, 130,
  ];
  return breaks.includes(jy % 132);
}

export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

// تبدیل تاریخ جلالی (رشته "1404/06/01") به شیء Date میلادی
export function jalaliToGregorian(dateStr: string): Date {
  const parts = dateStr.split('/').map(Number);
  let [jy, jm, jd] = parts;
  let gy = jy > 979 ? 1600 : 621;
  jy -= jy > 979 ? 979 : 0;
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd +
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
  const gd_m = [0, 31, gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && days >= gd_m[gm]; gm++) days -= gd_m[gm];
  return new Date(gy, gm - 1, days + 1);
}

// افزودن N ماه به تاریخ جلالی؛ روز در صورت نیاز به آخرین روز ماه مقصد محدود می‌شود
export function addMonthsJalali(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('/').map(Number);
  let newYear = y;
  let newMonth = m + months;
  while (newMonth > 12) { newMonth -= 12; newYear += 1; }
  while (newMonth < 1) { newMonth += 12; newYear -= 1; }
  const maxDay = getDaysInJalaliMonth(newYear, newMonth);
  const newDay = Math.min(d, maxDay);
  return `${newYear}/${newMonth.toString().padStart(2, '0')}/${newDay.toString().padStart(2, '0')}`;
}

export function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
