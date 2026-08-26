import { Service, Maintenance, Rates } from '@/contexts/AppContext';

// خلاصه کارکرد یک روز خاص (بر اساس تاریخ جلالی رشته‌ای مثل ۱۴۰۴/۰۶/۰۱)
export function getDaySummary(services: Service[], date: string) {
  const todays = services.filter(s => s.date === date);
  const totalKm = todays.reduce((sum, s) => sum + (s.km || 0), 0);
  const totalHours = todays.reduce((sum, s) => sum + (s.hours || 0), 0);
  const totalIncome = todays.reduce((sum, s) => sum + (s.income || 0), 0);
  return { count: todays.length, totalKm, totalHours, totalIncome, services: todays };
}

// میانگین کارکرد روزانه در N روز اخیر (برای مقایسه با امروز و اعلام «خوب بود یا نه»)
export function getRecentAverage(services: Service[], excludeDate: string, days = 14) {
  const byDate: Record<string, { km: number; hours: number; income: number }> = {};
  for (const s of services) {
    if (s.date === excludeDate) continue;
    if (!byDate[s.date]) byDate[s.date] = { km: 0, hours: 0, income: 0 };
    byDate[s.date].km += s.km || 0;
    byDate[s.date].hours += s.hours || 0;
    byDate[s.date].income += s.income || 0;
  }
  const dates = Object.keys(byDate).sort().slice(-days);
  if (dates.length === 0) return { avgKm: 0, avgHours: 0, avgIncome: 0, sampleSize: 0 };
  const totals = dates.reduce((acc, d) => ({
    km: acc.km + byDate[d].km,
    hours: acc.hours + byDate[d].hours,
    income: acc.income + byDate[d].income,
  }), { km: 0, hours: 0, income: 0 });
  return {
    avgKm: totals.km / dates.length,
    avgHours: totals.hours / dates.length,
    avgIncome: totals.income / dates.length,
    sampleSize: dates.length,
  };
}

// ارزیابی کیفی روز نسبت به میانگین اخیر
export function evaluateDayVsAverage(today: { totalIncome: number; totalHours: number }, avg: { avgIncome: number; sampleSize: number }) {
  if (avg.sampleSize < 3) return { verdict: 'insufficient' as const, ratio: 1 };
  const ratio = avg.avgIncome > 0 ? today.totalIncome / avg.avgIncome : 1;
  let verdict: 'great' | 'good' | 'average' | 'low' = 'average';
  if (ratio >= 1.25) verdict = 'great';
  else if (ratio >= 1.05) verdict = 'good';
  else if (ratio < 0.75) verdict = 'low';
  return { verdict, ratio };
}

// کیلومتر طی‌شده از آخرین تعویض روغن، بر اساس آخرین رکورد نگهداری و مجموع کیلومترهای سرویس پس از آن
export function getKmSinceLastOilChange(services: Service[], maintenances: Maintenance[]): { kmSince: number; lastChangeDate: string | null } {
  const oilChanges = maintenances.filter(m => m.type === 'oil-change').sort((a, b) => a.date.localeCompare(b.date));
  const last = oilChanges[oilChanges.length - 1];
  if (!last) {
    // بدون رکورد قبلی: مجموع کل کیلومتر ثبت‌شده را برمی‌گرداند
    const totalKm = services.reduce((sum, s) => sum + (s.km || 0), 0);
    return { kmSince: totalKm, lastChangeDate: null };
  }
  const kmSince = services
    .filter(s => s.date > last.date)
    .reduce((sum, s) => sum + (s.km || 0), 0);
  return { kmSince, lastChangeDate: last.date };
}

// آمار هفته/ماه اخیر برای اعلان‌های خلاصه
export function getRangeSummary(services: Service[], fromDate: string, toDate: string) {
  const inRange = services.filter(s => s.date >= fromDate && s.date <= toDate);
  return {
    count: inRange.length,
    totalKm: inRange.reduce((sum, s) => sum + (s.km || 0), 0),
    totalHours: inRange.reduce((sum, s) => sum + (s.hours || 0), 0),
    totalIncome: inRange.reduce((sum, s) => sum + (s.income || 0), 0),
  };
}
