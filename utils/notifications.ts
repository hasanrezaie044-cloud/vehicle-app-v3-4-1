import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loan } from '@/contexts/AppContext';
import { computeLoanSchedule } from './finance';
import { jalaliToGregorian } from './jalali';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const CHANNEL_ID = 'vehicle-reminders';

// شناسه‌های ثابت برای اعلان‌های زمان‌بندی‌شده، تا هر بار دوباره‌سازی نشوند و تکراری نشوند
const IDS = {
  dailySummary: 'daily-summary-reminder',
  dailyLogReminder: 'daily-log-reminder',
  weeklySummary: 'weekly-summary-reminder',
  monthlySummary: 'monthly-summary-reminder',
};

export async function setupNotifications() {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'یادآوری‌های خودرو', importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250], lightColor: '#0F5C4C', sound: 'default',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    return status === 'granted';
  } catch { return false; }
}

export async function sendTestNotification() {
  const granted = await setupNotifications();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'مدیریت خودرو', body: 'اعلان‌ها با موفقیت فعال هستند ✓', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false, channelId: CHANNEL_ID },
  });
  return true;
}

// ارسال فوری یک اعلان دلخواه (برای هشدار تعویض روغن و خلاصه‌ها)
export async function sendInstantNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, repeats: false, channelId: CHANNEL_ID },
    });
  } catch {}
}

interface ReminderPrefs {
  dailySummary: boolean;
  dailyLogReminder: boolean;
  weeklySummary: boolean;
  monthlySummary: boolean;
  oilChangeAlert: boolean;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  dailySummary: true,
  dailyLogReminder: true,
  weeklySummary: true,
  monthlySummary: true,
  oilChangeAlert: true,
};

// زمان‌بندی اعلان‌های تکرارشونده روزانه/هفتگی/ماهانه
export async function scheduleDailyReminders(prefs: ReminderPrefs = DEFAULT_REMINDER_PREFS) {
  if (Platform.OS === 'web') return false;
  try {
    const granted = await setupNotifications();
    if (!granted) return false;

    // شناسه‌ای که scheduleNotificationAsync برمی‌گرداند با شناسه‌های سفارشی بالا یکی نیست؛
    // بنابراین همه زمان‌بندی‌های قبلی را پاک می‌کنیم و فقط موارد فعال را دوباره می‌سازیم.
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (prefs.dailyLogReminder) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'یادآوری ثبت کارکرد', body: 'فراموش نکنید سرویس امروزتان را ثبت کنید 🚗', sound: 'default', data: { kind: 'dailyLog' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0, channelId: CHANNEL_ID },
      });
    }

    if (prefs.dailySummary) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'خلاصه امروز', body: 'برای دیدن خلاصه کارکرد امروزتان برنامه را باز کنید 📊', sound: 'default', data: { kind: 'dailySummary' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 22, minute: 0, channelId: CHANNEL_ID },
      });
    }

    if (prefs.weeklySummary) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'خلاصه هفتگی', body: 'گزارش هفتگی کارکرد و درآمدتان آماده است 📈', sound: 'default', data: { kind: 'weeklySummary' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 20, minute: 0, channelId: CHANNEL_ID },
      });
    }

    if (prefs.monthlySummary) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'خلاصه ماهانه', body: 'گزارش ماه گذشته آماده بررسی است 🗓️', sound: 'default', data: { kind: 'monthlySummary' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 9, minute: 0, channelId: CHANNEL_ID },
      });
    }

    return true;
  } catch {
    return false;
  }
}

const TODAY_SUMMARY_ID_KEY = 'car_today_summary_notif_id';
const LOAN_REMINDER_IDS_KEY = 'car_loan_reminder_notif_ids';

export interface DaySummaryForNotif {
  totalIncome: number;
  count: number;
  verdict: 'great' | 'good' | 'average' | 'low' | 'insufficient';
}

// زمان‌بندی اعلان پویای «خلاصه امروز» با محتوای واقعی (درآمد امروز و خوب/بد بودن روز)
// این تابع هر بار برنامه باز می‌شود فراخوانی می‌شود تا محتوا تازه بماند و در ساعت مشخص (پیش‌فرض ۲۲) ارسال شود
export async function scheduleTodaySummaryNotification(summary: DaySummaryForNotif, formatNumber: (n: number) => string, hour = 22, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    const granted = await setupNotifications();
    if (!granted) return;

    const prevId = await AsyncStorage.getItem(TODAY_SUMMARY_ID_KEY);
    if (prevId) { try { await Notifications.cancelScheduledNotificationAsync(prevId); } catch {} }

    const now = new Date();
    const fireDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    if (fireDate.getTime() <= now.getTime()) return; // ساعت امروز گذشته، منتظر روز بعد می‌مانیم

    const verdictText: Record<string, string> = {
      great: 'امروز عالی بود! 🎉',
      good: 'امروز خوب بود 👍',
      average: 'امروز در حد معمول بود',
      low: 'امروز کمتر از حد معمول بود',
      insufficient: 'خلاصه کارکرد امروز',
    };
    const title = verdictText[summary.verdict] || 'خلاصه امروز';
    const body = summary.count > 0
      ? `درآمد امروز: ${formatNumber(summary.totalIncome)} تومان — ${summary.count} سرویس ثبت شده`
      : 'امروز هنوز سرویسی ثبت نشده؛ برای دیدن جزئیات برنامه را باز کنید';

    const res = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data: { kind: 'dailySummary' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate, channelId: CHANNEL_ID },
    });
    await AsyncStorage.setItem(TODAY_SUMMARY_ID_KEY, res);
  } catch {}
}

// زمان‌بندی یادآوری اقساط وام، ۲ روز پیش از سررسید هر قسط پرداخت‌نشده
export async function scheduleLoanReminders(loans: Loan[], formatNumber: (n: number) => string) {
  if (Platform.OS === 'web') return;
  try {
    const granted = await setupNotifications();
    if (!granted) return;

    const prevIdsRaw = await AsyncStorage.getItem(LOAN_REMINDER_IDS_KEY);
    const prevIds: string[] = prevIdsRaw ? JSON.parse(prevIdsRaw) : [];
    for (const id of prevIds) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }

    const now = new Date();
    const newIds: string[] = [];

    for (const loan of loans) {
      const schedule = computeLoanSchedule(loan);
      for (const inst of schedule) {
        if (inst.paid) continue;
        const dueGregorian = jalaliToGregorian(inst.dueDate);
        const reminderDate = new Date(dueGregorian.getFullYear(), dueGregorian.getMonth(), dueGregorian.getDate() - 2, 9, 0, 0);
        if (reminderDate.getTime() <= now.getTime()) continue;
        try {
          const res = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'یادآوری قسط وام',
              body: `قسط شماره ${inst.index} وام «${loan.title}» به مبلغ ${formatNumber(inst.amount)} تومان، ۲ روز دیگر (${inst.dueDate}) سررسید می‌شود`,
              sound: 'default',
              data: { kind: 'loanReminder', loanId: loan.id, installment: inst.index },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate, channelId: CHANNEL_ID },
          });
          newIds.push(res);
        } catch {}
      }
    }
    await AsyncStorage.setItem(LOAN_REMINDER_IDS_KEY, JSON.stringify(newIds));
  } catch {}
}

// بررسی وضعیت تعویض روغن بر اساس کیلومتر طی‌شده از آخرین تعویض
export function getOilChangeStatus(kmSinceLastChange: number, interval: number) {
  const remaining = interval - kmSinceLastChange;
  const percent = Math.min(100, Math.round((kmSinceLastChange / interval) * 100));
  let level: 'ok' | 'soon' | 'due' | 'overdue' = 'ok';
  if (remaining <= 0) level = 'overdue';
  else if (remaining <= interval * 0.1) level = 'due';
  else if (remaining <= interval * 0.25) level = 'soon';
  return { remaining, percent, level };
}
