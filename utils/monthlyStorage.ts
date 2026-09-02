
import * as FileSystem from 'expo-file-system/legacy';

const APP_FOLDER = FileSystem.documentDirectory + 'VehicleManager/';

async function ensureFolder() {
  const dirInfo = await FileSystem.getInfoAsync(APP_FOLDER);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(APP_FOLDER, { intermediates: true });
  }
}

function getMonthFileName() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `data-${year}-${month}.json`;
}

export async function saveMonthlyData(data: any) {
  await ensureFolder();
  const fileUri = APP_FOLDER + getMonthFileName();
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
}

export async function loadMonthlyData() {
  await ensureFolder();
  const fileUri = APP_FOLDER + getMonthFileName();
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) return null;
  const content = await FileSystem.readAsStringAsync(fileUri);
  return JSON.parse(content);
}
