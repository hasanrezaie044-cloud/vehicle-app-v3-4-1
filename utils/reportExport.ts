import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { serviceMeta } from '@/constants/theme';

export interface ExportService {
  date: string;
  type: string;
  startTime?: string;
  endTime?: string;
  km: number;
  hours: number;
  origin?: string;
  destination?: string;
  passengers?: string;
  requestNumber?: string;
  tollCount?: number;
  income: number;
}

export interface ExportFuel {
  date: string;
  type: 'gov' | 'semi' | 'free';
  liters: number;
  total: number;
}

export interface ExportMaintenance {
  date: string;
  typeText?: string;
  type?: string;
  km?: number;
  cost: number;
  description?: string;
}

const FUEL_TYPE_LABEL: Record<string, string> = { gov: 'دولتی', semi: 'نیمه‌آزاد', free: 'آزاد' };

function serviceTypeLabel(type: string) {
  return serviceMeta[type as keyof typeof serviceMeta]?.label || type;
}

// ستون‌های خروجی فقط بر اساس فیلدهایی است که واقعاً در مدل سرویس پروژه
// وجود دارد (Service در contexts/AppContext.tsx).
function buildServicesSheet(services: ExportService[]) {
  const header = [
    'ردیف', 'تاریخ', 'نوع سرویس', 'ساعت شروع', 'ساعت پایان',
    'کیلومتر', 'ساعت کارکرد', 'مبدا', 'مقصد', 'سرنشین',
    'شماره درخواست', 'تعداد عوارضی', 'درآمد (تومان)',
  ];
  const rows = services.map((s, i) => [
    i + 1,
    s.date || '',
    serviceTypeLabel(s.type),
    s.startTime || '',
    s.endTime || '',
    s.km || 0,
    s.hours || 0,
    s.origin || '',
    s.destination || '',
    s.passengers || '',
    s.requestNumber || '',
    s.tollCount || 0,
    s.income || 0,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 16 },
  ];
  (ws as any)['!views'] = [{ rightToLeft: true }];
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };
  return ws;
}

function buildFuelSheet(fuels: ExportFuel[]) {
  const header = ['ردیف', 'تاریخ', 'نوع سوخت', 'مقدار (لیتر)', 'هزینه (تومان)'];
  const rows = fuels.map((f, i) => [i + 1, f.date || '', FUEL_TYPE_LABEL[f.type] || f.type, f.liters || 0, f.total || 0]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  (ws as any)['!views'] = [{ rightToLeft: true }];
  return ws;
}

function buildMaintenanceSheet(maintenances: ExportMaintenance[]) {
  const header = ['ردیف', 'تاریخ', 'نوع تعمیر', 'کیلومتر', 'هزینه (تومان)', 'توضیحات'];
  const rows = maintenances.map((m, i) => [i + 1, m.date || '', m.typeText || m.type || '', m.km || '', m.cost || 0, m.description || '']);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 26 }];
  (ws as any)['!views'] = [{ rightToLeft: true }];
  return ws;
}

/**
 * خروجی اکسل واقعی (xlsx) از فهرست فعلی سرویس‌ها/سوخت/تعمیرات می‌سازد.
 * این تابع همیشه از داده‌های زنده‌ی برنامه (که قبلاً بر اساس فیلتر ماه/سال
 * انتخابی صفحه گزارش‌ها فیلتر شده‌اند) استفاده می‌کند، بنابراین هر تغییری
 * (افزودن/ویرایش/حذف سرویس) به‌صورت خودکار در خروجی بعدی منعکس می‌شود.
 */
export async function exportReportExcel(data: {
  services: ExportService[];
  fuels: ExportFuel[];
  maintenances: ExportMaintenance[];
  periodLabel: string;
}): Promise<string> {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildServicesSheet(data.services || []), 'سرویس‌ها');
  if (data.fuels && data.fuels.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildFuelSheet(data.fuels), 'سوخت');
  }
  if (data.maintenances && data.maintenances.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildMaintenanceSheet(data.maintenances), 'تعمیرات');
  }

  const wbBase64: string = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const uri = `${base}vehicle_report_${stamp}.xlsx`;

  await FileSystem.writeAsStringAsync(uri, wbBase64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `خروجی اکسل — ${data.periodLabel}`,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }

  return uri;
}
