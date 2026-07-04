import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type StoredPhoto = { uri: string; mimeType?: string; originalName?: string };

async function persist(asset: ImagePicker.ImagePickerAsset): Promise<StoredPhoto> {
  const directory = new Directory(Paths.document, 'proofvault', 'item-photos');
  directory.create({ idempotent: true, intermediates: true });
  const extension = asset.fileName?.split('.').pop() || asset.mimeType?.split('/').pop() || 'jpg';
  const destination = new File(directory, `photo_${Date.now()}.${extension}`);
  await new File(asset.uri).copy(destination);
  return { uri: destination.uri, mimeType: asset.mimeType, originalName: asset.fileName ?? undefined };
}

export async function takeItemPhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission was not granted.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
  return result.canceled ? undefined : persist(result.assets[0]);
}

export async function chooseItemPhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission was not granted.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: false });
  return result.canceled ? undefined : persist(result.assets[0]);
}
