import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'comptage_favorites';

export async function loadFavorites(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

export async function toggleFavorite(id: string): Promise<string[]> {
  const current = await loadFavorites();
  const next = current.includes(id)
    ? current.filter((f) => f !== id)
    : [...current, id];
  await saveFavorites(next);
  return next;
}
