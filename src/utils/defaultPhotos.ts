import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const RULES: { patterns: string[]; asset: any }[] = [
  { patterns: ['capu', 'capucine'], asset: require('../../pp/capucine.jpeg') },
  { patterns: ['manon'], asset: require('../../pp/manon.jpeg') },
  { patterns: ['michelle', 'mich', 'miche'], asset: require('../../pp/michelle.jpeg') },
  { patterns: ['aurel', 'aurelien'], asset: require('../../pp/aurel.jpeg') },
  { patterns: ['sib', 'syb', 'sibylle'], asset: require('../../pp/sibylle.jpeg') },
];

function findAsset(name: string): any | null {
  const n = norm(name);
  return RULES.find((r) => r.patterns.includes(n))?.asset ?? null;
}

export async function getDefaultPhotoUri(name: string): Promise<string | null> {
  const asset = findAsset(name);
  if (!asset) return null;
  try {
    const [loaded] = await Asset.loadAsync(asset);
    const uri = loaded.localUri ?? loaded.uri;
    if (!uri) return null;
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 256 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return `data:image/jpeg;base64,${resized.base64}`;
  } catch {
    return null;
  }
}

export function hasDefaultPhoto(name: string): boolean {
  return findAsset(name) !== null;
}
