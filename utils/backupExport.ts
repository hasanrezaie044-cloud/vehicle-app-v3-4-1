import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function exportBackup(data: any) {
  const fileName = `car_backup_${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.json`;
  const json = JSON.stringify(data, null, 2);
  if (FileSystem.StorageAccessFramework && FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync) {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permission.granted) {
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, fileName, 'application/json');
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      return fileUri;
    }
  }
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType:'application/json', dialogTitle:'ذخیره فایل پشتیبان' });
  return fileUri;
}
