import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function csvEscape(v: any) { const s = String(v ?? ''); return `"${s.replace(/"/g,'""')}"`; }

export async function exportReportFiles(data: { services: any[]; fuels: any[]; maintenances: any[]; periodLabel: string }) {
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const csv = [
    ['نوع','تاریخ','سرویس','کیلومتر','ساعت','مبدا','مقصد','سرنشین','شماره درخواست','درآمد'].map(csvEscape).join(','),
    ...data.services.map(s => [ 'سرویس', s.date, s.type, s.km, s.hours, s.origin, s.destination, s.passengers, s.requestNumber, s.income ].map(csvEscape).join(',')),
    ...data.fuels.map(f => [ 'سوخت', f.date, f.type, '', '', '', '', '', '', -f.total ].map(csvEscape).join(',')),
    ...data.maintenances.map(m => [ 'هزینه', m.date, m.typeText || m.type, '', '', '', '', '', '', -m.cost ].map(csvEscape).join(',')),
  ].join('\n');
  const csvUri = `${base}vehicle_report_${stamp}.csv`;
  await FileSystem.writeAsStringAsync(csvUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(csvUri, { mimeType: 'text/csv', dialogTitle: `گزارش ${data.periodLabel}` });
  return csvUri;
}
