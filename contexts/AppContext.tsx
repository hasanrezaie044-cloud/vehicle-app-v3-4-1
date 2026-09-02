import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { addMonthsJalali } from '@/utils/jalali';
import { computeHourlyBreakdown, HourlyBreakdown } from '@/utils/timeRates';

export interface Service {
  id: string;
  date: string;
  type: 'night' | 'holiday' | 'request' | 'available' | 'fixed' | 'mission';
  carType: string;
  km: number;
  hours: number;
  workHours: number;
  startTime: string;
  endTime: string;
  origin: string;
  destination: string;
  passengers: string;
  requestNumber: string;
  tollCount: number;
  missionFood: number;
  missionToll: number;
  missionFine: number;
  income: number;
  timestamp: string;
}

export interface Fuel {
  id: string;
  date: string;
  type: 'gov' | 'semi' | 'free';
  liters: number;
  total: number;
  carType: string;
  timestamp: string;
}

export interface Maintenance {
  id: string;
  date: string;
  type: 'oil-change' | 'repair' | 'tire' | 'wash' | 'spark-plug' | 'brake-pad' | 'other';
  typeText: string;
  cost: number;
  km: number;
  carType: string;
  description: string;
  timestamp: string;
}

export interface Loan {
  id: string;
  title: string;
  totalAmount: number;
  interestPercent: number;
  date: string; // تاریخ دریافت وام (جلالی)
  installmentsCount: number;
  paidInstallments: number[]; // شماره اقساط پرداخت‌شده (از ۱)
  timestamp: string;
}

export type PurchaseCategory = 'cigarette' | 'coffee' | 'restaurant' | 'clothing' | 'other';

export interface PersonalExpense {
  id: string;
  date: string;
  category: PurchaseCategory;
  title: string; // توضیح اختیاری، برای «سایر» عنوان دلخواه
  amount: number;
  timestamp: string;
}

export type PersonalIncomeCategory = 'bonus' | 'gift' | 'extra-work' | 'other';

export interface PersonalIncome {
  id: string;
  date: string;
  category: PersonalIncomeCategory;
  title: string; // توضیح اختیاری، برای «سایر» عنوان دلخواه
  amount: number;
  timestamp: string;
}

export interface Personnel {
  id: string;
  name: string;
  personnelCode: string;
  costCenter: string; // فقط عدد
  phone: string;
  timestamp: string;
}

export interface Rates {
  nightKm: number;
  holidayKm: number;
  fixedRequestKm: number;
  hour: number;
  fuelPriceGov: number;
  fuelPriceSemi: number;
  fuelPriceFree: number;
  toll: number;
  defaultCarType: 'soren' | 'tara';
  oilChangeKmInterval?: number;
  timingBeltKmInterval?: number;
  // درصد افزایش زمانی (نه نرخ پایه جدید؛ ضریبی روی نرخ پایه ساعتی موجود).
  // بازه شب: ۱۷:۳۰ تا ۲۰:۰۰ — بازه سحرگاه: ۲۰:۰۰ تا ۰۶:۰۰
  nightPercent: number;
  saharPercent: number;
}

const DEFAULT_RATES: Rates = {
  nightKm: 9500,
  holidayKm: 11000,
  fixedRequestKm: 10000,
  hour: 50000,
  fuelPriceGov: 1500,
  fuelPriceSemi: 3000,
  fuelPriceFree: 5000,
  toll: 5000,
  defaultCarType: 'soren',
  oilChangeKmInterval: 10000,
  timingBeltKmInterval: 80000,
  nightPercent: 10,
  saharPercent: 20,
};

function normalizeRates(raw: any): Rates {
  const r = raw || {};
  // Migrate v2.2 rate names to the compact v3 model.
  return {
    ...DEFAULT_RATES,
    ...r,
    nightKm: Number(r.nightKm ?? r.night ?? DEFAULT_RATES.nightKm),
    holidayKm: Number(r.holidayKm ?? r.holiday ?? DEFAULT_RATES.holidayKm),
    fixedRequestKm: Number(r.fixedRequestKm ?? r.fixedKm ?? r.request ?? DEFAULT_RATES.fixedRequestKm),
    hour: Number(r.hour ?? r.available ?? r.fixedHour ?? r.nightHour ?? DEFAULT_RATES.hour),
    // رکوردهای قدیمی این دو مقدار را ندارند؛ مقدار پیش‌فرض ایمن اعمال می‌شود
    // (۰ یعنی کاربر آگاهانه افزایش زمانی را غیرفعال کرده، پس فقط undefined/null جایگزین می‌شود).
    nightPercent: Number(r.nightPercent ?? DEFAULT_RATES.nightPercent),
    saharPercent: Number(r.saharPercent ?? DEFAULT_RATES.saharPercent),
  };
}

export const PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const STORAGE_KEYS = {
  services: 'car_services',
  fuels: 'car_fuels',
  maintenances: 'car_maintenances',
  rates: 'car_rates',
  pin: 'car_pin_hash',
  suggestions: 'car_suggestions',
  loans: 'car_loans',
  personalExpenses: 'car_personal_expenses',
  personalIncomes: 'car_personal_incomes',
  personnel: 'car_personnel',
  lockEnabled: 'car_lock_enabled',
};

// Hash PIN with SHA256 for security
async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin + 'car_salt_2024');
}

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

// Validate imported data structure
function validateImportData(data: any): boolean {
  if (typeof data !== 'object' || data === null) return false;
  if (data.services !== undefined && !Array.isArray(data.services)) return false;
  if (data.fuels !== undefined && !Array.isArray(data.fuels)) return false;
  if (data.maintenances !== undefined && !Array.isArray(data.maintenances)) return false;
  return true;
}

interface AppContextValue {
  services: Service[];
  fuels: Fuel[];
  maintenances: Maintenance[];
  loans: Loan[];
  personalExpenses: PersonalExpense[];
  personalIncomes: PersonalIncome[];
  personnel: Personnel[];
  rates: Rates;
  isAuthenticated: boolean;
  isLoading: boolean;
  addService: (service: Omit<Service, 'id' | 'timestamp'>) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addFuel: (fuel: Omit<Fuel, 'id' | 'timestamp'>) => void;
  deleteFuel: (id: string) => void;
  addMaintenance: (maintenance: Omit<Maintenance, 'id' | 'timestamp'>) => void;
  deleteMaintenance: (id: string) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'timestamp' | 'paidInstallments'>) => void;
  updateLoan: (id: string, loan: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  toggleLoanInstallmentPaid: (loanId: string, installmentIndex: number) => void;
  addPersonalExpense: (expense: Omit<PersonalExpense, 'id' | 'timestamp'>) => void;
  deletePersonalExpense: (id: string) => void;
  addPersonalIncome: (income: Omit<PersonalIncome, 'id' | 'timestamp'>) => void;
  deletePersonalIncome: (id: string) => void;
  addPersonnel: (personnel: Omit<Personnel, 'id' | 'timestamp'>) => void;
  updatePersonnel: (id: string, personnel: Partial<Personnel>) => void;
  deletePersonnel: (id: string) => void;
  updateRates: (newRates: Partial<Rates>) => void;
  recalculateAllServices: () => void;
  changePin: (newPin: string) => Promise<void>;
  needsPinSetup: boolean;
  completeFirstPinSetup: (newPin: string) => Promise<void>;
  login: (pin: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  logout: () => void;
  lockEnabled: boolean;
  setLockEnabled: (enabled: boolean) => Promise<void>;
  calculateServiceIncome: (
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    startTime?: string,
    endTime?: string
  ) => number;
  calculateServiceIncomeWithRates: (
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    customRates: Rates,
    startTime?: string,
    endTime?: string
  ) => number;
  getServiceCalculationBreakdown: (
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    startTime: string | undefined,
    endTime: string | undefined,
    customRates?: Rates
  ) => {
    kmRate: number;
    hourRate: number;
    kmAmount: number;
    hourly: HourlyBreakdown;
    nightPercent: number;
    saharPercent: number;
    extrasAmount: number;
    finalAmount: number;
  };
  formatNumber: (num: number) => string;
  getTodayJalali: () => string;
  exportAllData: () => string;
  importAllData: (jsonString: string) => { success: boolean; message: string };
  getSuggestions: (field: 'origin' | 'destination' | 'passengers') => string[];
  addSuggestion: (field: 'origin' | 'destination' | 'passengers', value: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>([]);
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [personalIncomes, setPersonalIncomes] = useState<PersonalIncome[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [pinHash, setPinHash] = useState<string>('');
  const [needsPinSetup, setNeedsPinSetup] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [lockEnabled, setLockEnabledState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<{ origin: string[]; destination: string[]; passengers: string[] }>({
    origin: [],
    destination: [],
    passengers: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          storedServices,
          storedFuels,
          storedMaintenances,
          storedRates,
          storedPinHash,
          storedSuggestions,
          storedLoans,
          storedPersonalExpenses,
          storedPersonalIncomes,
          storedPersonnel,
          storedLockEnabled,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.services),
          AsyncStorage.getItem(STORAGE_KEYS.fuels),
          AsyncStorage.getItem(STORAGE_KEYS.maintenances),
          AsyncStorage.getItem(STORAGE_KEYS.rates),
          AsyncStorage.getItem(STORAGE_KEYS.pin),
          AsyncStorage.getItem(STORAGE_KEYS.suggestions),
          AsyncStorage.getItem(STORAGE_KEYS.loans),
          AsyncStorage.getItem(STORAGE_KEYS.personalExpenses),
          AsyncStorage.getItem(STORAGE_KEYS.personalIncomes),
          AsyncStorage.getItem(STORAGE_KEYS.personnel),
          AsyncStorage.getItem(STORAGE_KEYS.lockEnabled),
        ]);

        if (storedServices) setServices(JSON.parse(storedServices));
        if (storedFuels) setFuels(JSON.parse(storedFuels));
        if (storedMaintenances) setMaintenances(JSON.parse(storedMaintenances));
        if (storedRates) setRates(normalizeRates(JSON.parse(storedRates)));
        else setRates(DEFAULT_RATES);
        if (storedSuggestions) setSuggestions(JSON.parse(storedSuggestions));
        if (storedLoans) {
          const todayJalali = (() => {
            const now = new Date();
            const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
            return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
          })();
          const rawLoans = JSON.parse(storedLoans);
          // اقساطی که موعدشان گذشته است به‌صورت خودکار پرداخت‌شده علامت می‌خورند.
          // این کار فقط برای اقساطی انجام می‌شود که هنوز تیک نخورده‌اند.
          const normalizedLoans = Array.isArray(rawLoans) ? rawLoans.map((loan: Loan) => {
            const paid = new Set<number>(loan.paidInstallments || []);
            try {
              // جدول اقساط را بدون وابستگی به state محاسبه می‌کنیم.
              const count = Math.max(1, loan.installmentsCount || 1);
              for (let i = 1; i <= count; i++) {
                const due = addMonthsJalali(loan.date, i);
                if (due < todayJalali) paid.add(i);
              }
            } catch {}
            return { ...loan, paidInstallments: Array.from(paid).sort((a,b) => a-b) };
          }) : [];
          setLoans(normalizedLoans);
          if (JSON.stringify(normalizedLoans) !== JSON.stringify(rawLoans)) {
            await AsyncStorage.setItem(STORAGE_KEYS.loans, JSON.stringify(normalizedLoans));
          }
        }
        if (storedPersonalExpenses) setPersonalExpenses(JSON.parse(storedPersonalExpenses));
        if (storedPersonalIncomes) setPersonalIncomes(JSON.parse(storedPersonalIncomes));
        if (storedPersonnel) setPersonnel(JSON.parse(storedPersonnel));

        if (storedPinHash) {
          setPinHash(storedPinHash);
        } else {
          // اولین اجرا: کاربر باید خودش رمز عبور تعیین کند (بدون رمز پیش‌فرض)
          setNeedsPinSetup(true);
        }

        // «قفل ورود به برنامه»: پیش‌فرض روشن است تا رفتار قبلی برنامه حفظ شود.
        // اگر کاربر آن را خاموش کرده باشد، ورود با پین/اثر انگشت درخواست نمی‌شود
        // و برنامه مستقیماً باز می‌شود (مکانیزم احراز هویت موجود دست‌نخورده می‌ماند).
        const isLockEnabled = storedLockEnabled === null ? true : storedLockEnabled === 'true';
        setLockEnabledState(isLockEnabled);
        if (!isLockEnabled) {
          setNeedsPinSetup(false);
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Load failed - use defaults
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.services, JSON.stringify(services)).catch(() => {});
  }, [services, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.fuels, JSON.stringify(fuels)).catch(() => {});
  }, [fuels, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.maintenances, JSON.stringify(maintenances)).catch(() => {});
  }, [maintenances, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.rates, JSON.stringify(rates)).catch(() => {});
  }, [rates, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.suggestions, JSON.stringify(suggestions)).catch(() => {});
  }, [suggestions, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.loans, JSON.stringify(loans)).catch(() => {});
  }, [loans, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.personalExpenses, JSON.stringify(personalExpenses)).catch(() => {});
  }, [personalExpenses, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.personalIncomes, JSON.stringify(personalIncomes)).catch(() => {});
  }, [personalIncomes, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    AsyncStorage.setItem(STORAGE_KEYS.personnel, JSON.stringify(personnel)).catch(() => {});
  }, [personnel, isInitialized]);

  const addService = useCallback((service: Omit<Service, 'id' | 'timestamp'>) => {
    const newService: Service = {
      ...service,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setServices(prev => [...prev, newService]);
  }, []);

  const updateService = useCallback((id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteService = useCallback((id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  }, []);

  const addFuel = useCallback((fuel: Omit<Fuel, 'id' | 'timestamp'>) => {
    const newFuel: Fuel = {
      ...fuel,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setFuels(prev => [...prev, newFuel]);
  }, []);

  const deleteFuel = useCallback((id: string) => {
    setFuels(prev => prev.filter(f => f.id !== id));
  }, []);

  const addMaintenance = useCallback((maintenance: Omit<Maintenance, 'id' | 'timestamp'>) => {
    const newMaintenance: Maintenance = {
      ...maintenance,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setMaintenances(prev => [...prev, newMaintenance]);
  }, []);

  const deleteMaintenance = useCallback((id: string) => {
    setMaintenances(prev => prev.filter(m => m.id !== id));
  }, []);

  const addLoan = useCallback((loan: Omit<Loan, 'id' | 'timestamp' | 'paidInstallments'>) => {
    const newLoan: Loan = {
      ...loan,
      paidInstallments: [],
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setLoans(prev => [...prev, newLoan]);
  }, []);

  const updateLoan = useCallback((id: string, updates: Partial<Loan>) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const deleteLoan = useCallback((id: string) => {
    setLoans(prev => prev.filter(l => l.id !== id));
  }, []);

  const toggleLoanInstallmentPaid = useCallback((loanId: string, installmentIndex: number) => {
    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      const has = l.paidInstallments.includes(installmentIndex);
      return {
        ...l,
        paidInstallments: has
          ? l.paidInstallments.filter(i => i !== installmentIndex)
          : [...l.paidInstallments, installmentIndex],
      };
    }));
  }, []);

  const addPersonalExpense = useCallback((expense: Omit<PersonalExpense, 'id' | 'timestamp'>) => {
    const newExpense: PersonalExpense = {
      ...expense,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setPersonalExpenses(prev => [...prev, newExpense]);
  }, []);

  const deletePersonalExpense = useCallback((id: string) => {
    setPersonalExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const addPersonalIncome = useCallback((income: Omit<PersonalIncome, 'id' | 'timestamp'>) => {
    const newIncome: PersonalIncome = {
      ...income,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setPersonalIncomes(prev => [...prev, newIncome]);
  }, []);

  const deletePersonalIncome = useCallback((id: string) => {
    setPersonalIncomes(prev => prev.filter(e => e.id !== id));
  }, []);

  const addPersonnel = useCallback((p: Omit<Personnel, 'id' | 'timestamp'>) => {
    const newPersonnel: Personnel = {
      ...p,
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setPersonnel(prev => [...prev, newPersonnel]);
  }, []);

  const updatePersonnel = useCallback((id: string, updates: Partial<Personnel>) => {
    setPersonnel(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePersonnel = useCallback((id: string) => {
    setPersonnel(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateRates = useCallback((newRates: Partial<Rates>) => {
    setRates(prev => ({ ...prev, ...newRates }));
  }, []);

  // بخش کیلومتری درآمد بر اساس نوع سرویس (منبع اصلی: نرخ‌های کیلومتری موجود؛
  // این تابع بدون تغییر معماری قبلی، فقط سهم کیلومتر را جدا می‌کند تا با
  // بخش ساعتی (که اکنون ممکن است بر اساس ساعت شروع/پایان تفکیک شود) مخلوط نشود).
  const getKmRateForType = useCallback((serviceType: Service['type'], customRates: Rates): number => {
    switch (serviceType) {
      case 'night': return customRates.nightKm;
      case 'holiday': return customRates.holidayKm;
      case 'request': return customRates.fixedRequestKm;
      case 'fixed': return customRates.fixedRequestKm;
      case 'mission': return customRates.fixedRequestKm;
      case 'available': return 0;
      default: return 0;
    }
  }, []);

  // Calculate income using specific rates object.
  // نرخ پایه ساعتی، کیلومتری، ثابت و درخواست دست‌نخورده باقی می‌مانند؛
  // درصد شب/سحرگاه فقط به‌صورت ضریب روی سهم واقعی ساعت کارکردِ داخل هر
  // بازه زمانی اعمال می‌شود (نگاه کنید به utils/timeRates.ts).
  const calculateServiceIncomeWithRates = useCallback((
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    customRates: Rates,
    startTime?: string,
    endTime?: string
  ): number => {
    const kmAmount = km * getKmRateForType(serviceType, customRates);
    const hourly = computeHourlyBreakdown(hours, startTime, endTime, customRates.hour, customRates.nightPercent, customRates.saharPercent);
    let income = kmAmount + hourly.totalAmount;
    if (serviceType === 'mission') {
      if (missionFood) income += missionFood;
      if (missionToll) income += missionToll;
      if (missionFine) income += missionFine;
    }
    if (tollCount) income += tollCount * customRates.toll;
    return Math.round(income);
  }, [getKmRateForType]);

  // جزئیات کامل محاسبه برای نمایش اختیاری در فرم ثبت سرویس (بدون تغییر
  // در مقدار نهایی؛ فقط شفاف‌سازی همان محاسبه‌ای که calculateServiceIncomeWithRates انجام می‌دهد).
  const getServiceCalculationBreakdown = useCallback((
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    startTime: string | undefined,
    endTime: string | undefined,
    customRates?: Rates
  ) => {
    const r = customRates || rates;
    const kmRate = getKmRateForType(serviceType, r);
    const kmAmount = km * kmRate;
    const hourly = computeHourlyBreakdown(hours, startTime, endTime, r.hour, r.nightPercent, r.saharPercent);
    let extrasAmount = 0;
    if (serviceType === 'mission') extrasAmount += (missionFood || 0) + (missionToll || 0) + (missionFine || 0);
    if (tollCount) extrasAmount += tollCount * r.toll;
    return {
      kmRate,
      hourRate: r.hour,
      kmAmount,
      hourly,
      nightPercent: r.nightPercent,
      saharPercent: r.saharPercent,
      extrasAmount,
      finalAmount: Math.round(kmAmount + hourly.totalAmount + extrasAmount),
    };
  }, [rates, getKmRateForType]);

  // Recalculate all services with current rates
  const recalculateAllServices = useCallback(() => {
    setServices(prev => prev.map(service => {
      const newIncome = calculateServiceIncomeWithRates(
        service.type,
        service.km,
        service.hours,
        service.tollCount,
        service.missionFood,
        service.missionToll,
        service.missionFine,
        rates,
        service.startTime,
        service.endTime
      );
      return { ...service, income: newIncome };
    }));
  }, [rates, calculateServiceIncomeWithRates]);

  const calculateServiceIncome = useCallback((
    serviceType: Service['type'],
    km: number,
    hours: number,
    tollCount: number,
    missionFood: number,
    missionToll: number,
    missionFine: number,
    startTime?: string,
    endTime?: string
  ): number => {
    return calculateServiceIncomeWithRates(serviceType, km, hours, tollCount, missionFood, missionToll, missionFine, rates, startTime, endTime);
  }, [rates, calculateServiceIncomeWithRates]);

  const changePin = useCallback(async (newPin: string) => {
    const hashed = await hashPin(newPin);
    setPinHash(hashed);
    await AsyncStorage.setItem(STORAGE_KEYS.pin, hashed);
  }, []);

  // اولین اجرای برنامه: کاربر رمز عبور دلخواه خودش را تعیین می‌کند (بدون رمز پیش‌فرض ناامن)
  const completeFirstPinSetup = useCallback(async (newPin: string) => {
    const hashed = await hashPin(newPin);
    setPinHash(hashed);
    await AsyncStorage.setItem(STORAGE_KEYS.pin, hashed);
    setNeedsPinSetup(false);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (inputPin: string): Promise<boolean> => {
    try {
      const inputHash = await hashPin(inputPin);
      if (inputHash === pinHash) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [pinHash]);

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) return false;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأیید هویت برای ورود به مدیریت خودرو',
        cancelLabel: 'انصراف',
        disableDeviceFallback: false,
      });
      if (result.success) { setIsAuthenticated(true); return true; }
      return false;
    } catch { return false; }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  // روشن/خاموش کردن «قفل ورود به برنامه». این تنظیم ماندگار است و مکانیزم
  // احراز هویت موجود (پین/اثر انگشت) را جایگزین نمی‌کند، فقط تعیین می‌کند
  // که آیا در دفعه بعدی باز شدن برنامه، آن مکانیزم درخواست می‌شود یا نه.
  const setLockEnabled = useCallback(async (enabled: boolean) => {
    setLockEnabledState(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.lockEnabled, enabled ? 'true' : 'false').catch(() => {});
  }, []);

  const formatNumber = useCallback((num: number): string => {
    if (isNaN(num) || num === undefined || num === null) return '0';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, []);

  const getTodayJalali = useCallback((): string => {
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
  }, []);

  const exportAllData = useCallback((): string => {
    // Export without PIN hash for security
    return JSON.stringify({
      services,
      fuels,
      maintenances,
      loans,
      personalExpenses,
      personalIncomes,
      personnel,
      rates,
      suggestions,
      exportDate: new Date().toISOString(),
      version: '3.3.1',
      backupScope: 'full-app-data',
      backupNote: 'پشتیبان کامل داده‌های ثبت‌شده برنامه؛ PIN برای امنیت وارد نمی‌شود.',
    }, null, 2);
  }, [services, fuels, maintenances, loans, personalExpenses, personalIncomes, personnel, rates, suggestions]);

  const importAllData = useCallback((jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);

      if (!validateImportData(data)) {
        return { success: false, message: 'ساختار فایل نامعتبر است' };
      }

      if (data.services && Array.isArray(data.services)) setServices(data.services);
      if (data.fuels && Array.isArray(data.fuels)) setFuels(data.fuels);
      if (data.maintenances && Array.isArray(data.maintenances)) setMaintenances(data.maintenances);
      if (data.loans && Array.isArray(data.loans)) setLoans(data.loans);
      if (data.personalExpenses && Array.isArray(data.personalExpenses)) setPersonalExpenses(data.personalExpenses);
      if (data.personalIncomes && Array.isArray(data.personalIncomes)) setPersonalIncomes(data.personalIncomes);
      if (data.personnel && Array.isArray(data.personnel)) setPersonnel(data.personnel);
      if (data.rates && typeof data.rates === 'object') setRates(normalizeRates(data.rates));
      // Note: PIN is intentionally NOT imported for security

      return { success: true, message: 'داده‌ها با موفقیت بازیابی شدند' };
    } catch (e) {
      return { success: false, message: 'فرمت JSON نامعتبر است' };
    }
  }, []);

  const getSuggestions = useCallback((field: 'origin' | 'destination' | 'passengers'): string[] => {
    return suggestions[field] || [];
  }, [suggestions]);

  const addSuggestion = useCallback((field: 'origin' | 'destination' | 'passengers', value: string) => {
    if (!value || value.trim().length < 2) return;
    const trimmed = value.trim();
    setSuggestions(prev => {
      const existing = prev[field] || [];
      if (existing.includes(trimmed)) return prev;
      const updated = [trimmed, ...existing].slice(0, 20); // keep max 20
      return { ...prev, [field]: updated };
    });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    services,
    fuels,
    maintenances,
    loans,
    personalExpenses,
    personalIncomes,
    personnel,
    rates,
    isAuthenticated,
    isLoading,
    addService,
    updateService,
    deleteService,
    addFuel,
    deleteFuel,
    addMaintenance,
    deleteMaintenance,
    addLoan,
    updateLoan,
    deleteLoan,
    toggleLoanInstallmentPaid,
    addPersonalExpense,
    deletePersonalExpense,
    addPersonalIncome,
    deletePersonalIncome,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    updateRates,
    recalculateAllServices,
    changePin,
    needsPinSetup,
    completeFirstPinSetup,
    login,
    loginWithBiometric,
    logout,
    lockEnabled,
    setLockEnabled,
    calculateServiceIncome,
    calculateServiceIncomeWithRates,
    getServiceCalculationBreakdown,
    formatNumber,
    getTodayJalali,
    exportAllData,
    importAllData,
    getSuggestions,
    addSuggestion,
  }), [
    services, fuels, maintenances, loans, personalExpenses, personalIncomes, personnel, rates, isAuthenticated, isLoading,
    addService, updateService, deleteService, addFuel, deleteFuel,
    addMaintenance, deleteMaintenance, addLoan, updateLoan, deleteLoan, toggleLoanInstallmentPaid,
    addPersonalExpense, deletePersonalExpense, addPersonalIncome, deletePersonalIncome, addPersonnel, updatePersonnel, deletePersonnel,
    updateRates, recalculateAllServices,
    changePin, needsPinSetup, completeFirstPinSetup, login, loginWithBiometric, logout, lockEnabled, setLockEnabled,
    calculateServiceIncome, calculateServiceIncomeWithRates, getServiceCalculationBreakdown,
    formatNumber, getTodayJalali, exportAllData, importAllData,
    getSuggestions, addSuggestion,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
