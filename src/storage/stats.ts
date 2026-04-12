import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameResult, GameId } from '../types';

const STORAGE_KEY = 'comptage_game_results';

export async function loadResults(): Promise<GameResult[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveResult(result: GameResult): Promise<void> {
  const results = await loadResults();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...results]));
}

export async function clearResults(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function deleteResult(id: string): Promise<void> {
  const results = await loadResults();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(results.filter((r) => r.id !== id)));
}

export async function updateResultComment(id: string, comment: string): Promise<void> {
  const results = await loadResults();
  const updated = results.map((r) =>
    r.id === id ? { ...r, comment: comment.trim() || undefined } : r
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function importResults(incoming: GameResult[]): Promise<GameResult[]> {
  const existing = await loadResults();
  const existingIds = new Set(existing.map((r) => r.id));
  const newOnes = incoming.filter((r) => !existingIds.has(r.id));
  const merged = [...newOnes, ...existing].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

// --- Calculs de statistiques ---

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  winsByGame: Partial<Record<GameId, number>>;
  gamesByGame: Partial<Record<GameId, number>>;
}

export function computeStats(results: GameResult[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>();

  for (const result of results) {
    for (const pr of result.playerResults) {
      if (!map.has(pr.playerId)) {
        map.set(pr.playerId, {
          playerId: pr.playerId,
          playerName: pr.playerName,
          gamesPlayed: 0,
          wins: 0,
          winsByGame: {},
          gamesByGame: {},
        });
      }
      const stats = map.get(pr.playerId)!;
      stats.playerName = pr.playerName; // mise à jour si renommé
      stats.gamesPlayed += 1;
      stats.gamesByGame[result.gameId] = (stats.gamesByGame[result.gameId] ?? 0) + 1;
      if (pr.winner) {
        stats.wins += 1;
        stats.winsByGame[result.gameId] = (stats.winsByGame[result.gameId] ?? 0) + 1;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.wins - a.wins);
}
