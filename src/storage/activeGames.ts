import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveGameState } from '../types';

const KEY = 'comptage_active_games';

export async function loadActiveGames(): Promise<ActiveGameState[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveActiveGames(games: ActiveGameState[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(games));
  } catch {}
}

export async function clearActiveGames(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
