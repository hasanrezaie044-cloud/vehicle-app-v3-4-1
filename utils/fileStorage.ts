
import * as FileSystem from 'expo-file-system/legacy';

const APP_FOLDER = FileSystem.documentDirectory + 'VehicleManager/';

export async function ensureAppFolder() {
  const dirInfo = await FileSystem.getInfoAsync(APP_FOLDER);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(APP_FOLDER, { intermediates: true });
  }
}

export async function saveDataToFile(data: any) {
  await ensureAppFolder();
  const fileUri = APP_FOLDER + 'data.json';
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
}

export async function loadDataFromFile() {
  await ensureAppFolder();
  const fileUri = APP_FOLDER + 'data.json';
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) return null;
  const content = await FileSystem.readAsStringAsync(fileUri);
  return JSON.parse(content);
}
