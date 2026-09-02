// محاسبه تفکیک ساعت کارکرد بر اساس بازه‌های زمانی «درصد شب» و «درصد سحرگاه».
//
// قوانین بازه‌ها (دقیق، بدون هم‌پوشانی و بدون شمارش دوباره در نقاط مرزی):
//   قبل از ۱۷:۳۰            → عادی
//   ۱۷:۳۰ تا ۲۰:۰۰           → درصد شب
//   ۲۰:۰۰ تا ۰۶:۰۰ (روز بعد) → درصد سحرگاه
//   بعد از ۰۶:۰۰             → عادی
//
// این ماژول فقط مسئول «تفکیک زمانی» است؛ نرخ پایه ساعتی و اعمال درصدها
// در contexts/AppContext.tsx (منبع اصلی نرخ‌ها) انجام می‌شود تا از محاسبه
// دوباره یا جابه‌جایی با نرخ کیلومتر جلوگیری شود.

const DAY_MINUTES = 24 * 60;
export const SAHAR_END_MIN = 6 * 60;      // 06:00
export const NIGHT_START_MIN = 17 * 60 + 30; // 17:30
export const NIGHT_END_MIN = 20 * 60;     // 20:00

export type TimeSliceCategory = 'normal' | 'night' | 'sahar';

export interface TimeSliceHours {
  normal: number;
  night: number;
  sahar: number;
}

function timeToMinutes(t: string): number | null {
  if (!t || typeof t !== 'string') return null;
  const parts = t.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// طبقه‌بندی یک لحظه از شبانه‌روز (بر حسب دقیقه، مقدار به‌صورت mod 1440 در نظر گرفته می‌شود)
function classifyMinute(minuteOfDay: number): TimeSliceCategory {
  const m = ((minuteOfDay % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  if (m >= NIGHT_START_MIN && m < NIGHT_END_MIN) return 'night';
  if (m >= NIGHT_END_MIN || m < SAHAR_END_MIN) return 'sahar';
  return 'normal';
}

/**
 * مدت زمان بین دو ساعت (HH:MM) را بر اساس بازه‌های زمانی به سه دسته
 * عادی/شب/سحرگاه تفکیک می‌کند. عبور از نیمه‌شب به‌درستی پشتیبانی می‌شود
 * (مثلاً ۲۲:۰۰ → ۰۲:۰۰). خروجی بر حسب ساعت (اعشاری) است.
 */
export function splitDurationByTimeRanges(startTime: string, endTime: string): TimeSliceHours {
  const totals: TimeSliceHours = { normal: 0, night: 0, sahar: 0 };
  const startRaw = timeToMinutes(startTime);
  const endRaw = timeToMinutes(endTime);
  if (startRaw === null || endRaw === null) return totals;

  let start = startRaw;
  let end = endRaw;
  if (end <= start) end += DAY_MINUTES; // عبور از نیمه‌شب (یا پایان == شروع → صفر)
  if (end === start) return totals;

  // نقاط مرزی (۰۶:۰۰ / ۱۷:۳۰ / ۲۰:۰۰) را برای تمام دوره‌های شبانه‌روزی که
  // بازه [start, end) را پوشش می‌دهند جمع می‌کنیم تا بازه به قطعات بدون
  // هم‌پوشانی تقسیم شود.
  const boundaries = [SAHAR_END_MIN, NIGHT_START_MIN, NIGHT_END_MIN];
  const cuts = new Set<number>([start, end]);
  const kMin = Math.floor(start / DAY_MINUTES) - 1;
  const kMax = Math.ceil(end / DAY_MINUTES) + 1;
  for (let k = kMin; k <= kMax; k++) {
    for (const b of boundaries) {
      const point = b + k * DAY_MINUTES;
      if (point > start && point < end) cuts.add(point);
    }
  }

  const sorted = Array.from(cuts).sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b <= a) continue;
    const mid = (a + b) / 2;
    const category = classifyMinute(mid);
    totals[category] += (b - a) / 60;
  }
  return totals;
}

export interface HourlyBreakdown {
  normalHours: number;
  nightHours: number;
  saharHours: number;
  normalAmount: number;
  nightAmount: number;
  saharAmount: number;
  totalAmount: number;
}

/**
 * درآمد ساعتی سرویس را با اعمال درصد شب/سحرگاه فقط روی سهم واقعی هر بازه
 * محاسبه می‌کند. اگر ساعت شروع/پایان ثبت نشده باشد (رکوردهای قدیمی یا
 * سرویس‌های بدون زمان دقیق)، کل مدت به‌صورت «عادی» محاسبه می‌شود تا رفتار
 * قبلی برنامه حفظ شود.
 *
 * توجه: مجموع ساعت شب/سحرگاه/عادی متناسب با مقدار «hours» ثبت‌شده توسط
 * کاربر مقیاس‌بندی می‌شود (نه مدت خام start→end) تا فیلد ساعت کارکرد که
 * منبع اصلی محسوب می‌شود، دست‌نخورده بماند و فقط «نسبت» تفکیک از روی
 * ساعت شروع/پایان استخراج شود.
 */
export function computeHourlyBreakdown(
  hours: number,
  startTime: string | undefined,
  endTime: string | undefined,
  hourlyBaseRate: number,
  nightPercent: number,
  saharPercent: number
): HourlyBreakdown {
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const nightMultiplier = 1 + (Number.isFinite(nightPercent) ? nightPercent : 0) / 100;
  const saharMultiplier = 1 + (Number.isFinite(saharPercent) ? saharPercent : 0) / 100;

  let normalHours = safeHours;
  let nightHours = 0;
  let saharHours = 0;

  if (safeHours > 0 && startTime && endTime) {
    const slice = splitDurationByTimeRanges(startTime, endTime);
    const sliceTotal = slice.normal + slice.night + slice.sahar;
    if (sliceTotal > 0) {
      normalHours = safeHours * (slice.normal / sliceTotal);
      nightHours = safeHours * (slice.night / sliceTotal);
      saharHours = safeHours * (slice.sahar / sliceTotal);
    }
  }

  const rate = Number.isFinite(hourlyBaseRate) ? hourlyBaseRate : 0;
  const normalAmount = normalHours * rate;
  const nightAmount = nightHours * rate * nightMultiplier;
  const saharAmount = saharHours * rate * saharMultiplier;

  return {
    normalHours,
    nightHours,
    saharHours,
    normalAmount,
    nightAmount,
    saharAmount,
    totalAmount: normalAmount + nightAmount + saharAmount,
  };
}
