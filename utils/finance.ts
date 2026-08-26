import { Loan } from '@/contexts/AppContext';
import { addMonthsJalali } from './jalali';

export interface LoanInstallment {
  index: number;
  dueDate: string;
  amount: number;
  paid: boolean;
}

// مبلغ کل وام به همراه سود (سود ساده روی کل مبلغ)
export function loanTotalWithInterest(totalAmount: number, interestPercent: number): number {
  const amount = Number(totalAmount);
  const interest = Number(interestPercent || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * (1 + (Number.isFinite(interest) ? interest : 0) / 100));
}

// محاسبه جدول اقساط وام بر اساس تاریخ دریافت، تعداد اقساط و سود
export function computeLoanSchedule(loan: Loan): LoanInstallment[] {
  // داده‌های قدیمی/ناقص نباید باعث Crash شدن تب مالی شوند.
  if (!loan || typeof loan.date !== 'string' || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(loan.date)) return [];
  const count = Math.max(1, Number(loan.installmentsCount) || 1);
  const totalWithInterest = loanTotalWithInterest(Number(loan.totalAmount), Number(loan.interestPercent));
  const perInstallment = Math.round(totalWithInterest / count);
  const paidSet = new Set<number>(Array.isArray(loan.paidInstallments) ? loan.paidInstallments : []);
  const schedule: LoanInstallment[] = [];
  let allocated = 0;
  for (let i = 1; i <= count; i++) {
    let dueDate = '';
    try { dueDate = addMonthsJalali(loan.date, i); } catch { return []; }
    const amount = i === count ? totalWithInterest - allocated : perInstallment;
    allocated += amount;
    schedule.push({ index: i, dueDate, amount, paid: paidSet.has(i) });
  }
  return schedule;
}

export function loanSummary(loan: Loan) {
  const schedule = computeLoanSchedule(loan);
  const totalWithInterest = loanTotalWithInterest(loan.totalAmount, loan.interestPercent);
  const paidCount = schedule.filter(s => s.paid).length;
  const paidAmount = schedule.filter(s => s.paid).reduce((sum, s) => sum + s.amount, 0);
  const remainingAmount = totalWithInterest - paidAmount;
  const nextInstallment = schedule.find(s => !s.paid) || null;
  return { schedule, totalWithInterest, paidCount, paidAmount, remainingAmount, nextInstallment, isCompleted: schedule.length > 0 && paidCount >= schedule.length };
}

export const PURCHASE_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'cigarette', label: 'دخانیات', icon: 'flame-outline' },
  { key: 'coffee', label: 'قهوه', icon: 'cafe-outline' },
  { key: 'restaurant', label: 'رستوران', icon: 'restaurant-outline' },
  { key: 'clothing', label: 'لباس', icon: 'shirt-outline' },
  { key: 'other', label: 'سایر', icon: 'pricetag-outline' },
];

export const PERSONAL_INCOME_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'bonus', label: 'پاداش', icon: 'gift-outline' },
  { key: 'gift', label: 'هدیه', icon: 'happy-outline' },
  { key: 'extra-work', label: 'کار جانبی', icon: 'briefcase-outline' },
  { key: 'other', label: 'سایر', icon: 'add-circle-outline' },
];
