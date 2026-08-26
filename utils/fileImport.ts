
import * as DocumentPicker from 'expo-document-picker';

export async function importJsonFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true
  });

  if (result.canceled) return null;

  const response = await fetch(result.assets[0].uri);
  const text = await response.text();
  return JSON.parse(text);
}
