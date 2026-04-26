import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'comptage_custom_game_names';

export async function loadCustomGameNames(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveCustomGameName(name: string): Promise<{ names: string[]; limitReached: boolean }> {
  const trimmed = name.trim();
  if (!trimmed) return { names: await loadCustomGameNames(), limitReached: false };
  const existing = await loadCustomGameNames();
  const filtered = existing.filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
  const limitReached = filtered.length >= 20;
  const updated = [trimmed, ...filtered].slice(0, 20);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return { names: updated, limitReached };
}

export async function deleteCustomGameName(name: string): Promise<string[]> {
  const existing = await loadCustomGameNames();
  const updated = existing.filter((n) => n !== name);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
