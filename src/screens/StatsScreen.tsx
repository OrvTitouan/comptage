import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GameResult, GameId } from '../types';
import { loadResults, computeStats, PlayerStats } from '../storage/stats';
import { GAMES } from '../constants/games';

interface StatsScreenProps {
  onBack: () => void;
}

type Tab = 'history' | 'trophies' | 'games';

const GAME_COLORS: Record<GameId, string> = {
  flip7: '#e74c3c',
  papayoo: '#f39c12',
  skulking: '#8e44ad',
};

const GAME_ICONS: Record<GameId, string> = {
  flip7: 'cards-playing-outline',
  papayoo: 'dice-multiple',
  skulking: 'skull',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function StatsScreen({ onBack }: StatsScreenProps) {
  const [tab, setTab] = useState<Tab>('trophies');
  const [results, setResults] = useState<GameResult[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);

  useEffect(() => {
    loadResults().then((r) => {
      setResults(r);
      setStats(computeStats(r));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Statistiques</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'trophies' && styles.tabActive]}
          onPress={() => setTab('trophies')}
        >
          <MaterialCommunityIcons name="trophy" size={16} color={tab === 'trophies' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'trophies' && styles.tabTextActive]}>Trophées</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'games' && styles.tabActive]}
          onPress={() => setTab('games')}
        >
          <MaterialCommunityIcons name="account-group" size={16} color={tab === 'games' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'games' && styles.tabTextActive]}>Parties</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <MaterialCommunityIcons name="history" size={16} color={tab === 'history' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ---- TROPHÉES ---- */}
        {tab === 'trophies' && (
          <>
            {stats.length === 0 ? (
              <EmptyState icon="trophy-outline" text="Aucune victoire enregistrée" sub="Terminez une partie pour voir les trophées" />
            ) : (
              stats.map((s, index) => (
                <View key={s.playerId} style={styles.card}>
                  <View style={styles.playerRow}>
                    {index === 0 && <MaterialCommunityIcons name="crown" size={18} color="#f39c12" style={{ marginRight: 4 }} />}
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{s.playerName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.playerName}>{s.playerName}</Text>
                    <View style={styles.totalWins}>
                      <MaterialCommunityIcons name="trophy" size={14} color="#f39c12" />
                      <Text style={styles.totalWinsText}>{s.wins} victoire{s.wins > 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {/* Détail par jeu */}
                  <View style={styles.gameBreakdown}>
                    {GAMES.filter(g => g.id !== 'skulking').map((game) => {
                      const wins = s.winsByGame[game.id] ?? 0;
                      if (wins === 0) return null;
                      return (
                        <View key={game.id} style={[styles.gameBadge, { backgroundColor: GAME_COLORS[game.id] + '33', borderColor: GAME_COLORS[game.id] + '88' }]}>
                          <MaterialCommunityIcons name={GAME_ICONS[game.id] as any} size={13} color={GAME_COLORS[game.id]} />
                          <Text style={[styles.gameBadgeText, { color: GAME_COLORS[game.id] }]}>
                            {game.name} ×{wins}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ---- PARTIES JOUÉES ---- */}
        {tab === 'games' && (
          <>
            {stats.length === 0 ? (
              <EmptyState icon="cards-outline" text="Aucune partie jouée" sub="Terminez une partie pour voir les stats" />
            ) : (
              stats
                .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                .map((s) => (
                  <View key={s.playerId} style={styles.card}>
                    <View style={styles.playerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{s.playerName.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.playerName}>{s.playerName}</Text>
                      <Text style={styles.gamesCount}>{s.gamesPlayed} partie{s.gamesPlayed > 1 ? 's' : ''}</Text>
                    </View>

                    <View style={styles.gameBreakdown}>
                      {GAMES.filter(g => g.id !== 'skulking').map((game) => {
                        const played = s.gamesByGame[game.id] ?? 0;
                        const wins = s.winsByGame[game.id] ?? 0;
                        if (played === 0) return null;
                        return (
                          <View key={game.id} style={[styles.gameBadge, { backgroundColor: GAME_COLORS[game.id] + '22', borderColor: GAME_COLORS[game.id] + '66' }]}>
                            <MaterialCommunityIcons name={GAME_ICONS[game.id] as any} size={13} color={GAME_COLORS[game.id]} />
                            <Text style={[styles.gameBadgeText, { color: GAME_COLORS[game.id] }]}>
                              {game.name} · {played}J / {wins}V
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
            )}
          </>
        )}

        {/* ---- HISTORIQUE ---- */}
        {tab === 'history' && (
          <>
            {results.length === 0 ? (
              <EmptyState icon="history" text="Aucune partie terminée" sub="L'historique apparaîtra ici" />
            ) : (
              results.map((result) => {
                const winner = result.playerResults.find((p) => p.winner);
                const sorted = [...result.playerResults].sort((a, b) => {
                  if (result.gameId === 'papayoo') return a.score - b.score;
                  return b.score - a.score;
                });
                return (
                  <View key={result.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={[styles.gameIcon, { backgroundColor: GAME_COLORS[result.gameId] }]}>
                        <MaterialCommunityIcons name={GAME_ICONS[result.gameId] as any} size={18} color="#fff" />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyGame}>{result.gameName}</Text>
                        <Text style={styles.historyMeta}>
                          {formatDate(result.date)} · {result.rounds} manche{result.rounds > 1 ? 's' : ''}
                        </Text>
                      </View>
                      {winner && (
                        <View style={styles.historyWinner}>
                          <MaterialCommunityIcons name="trophy" size={13} color="#f39c12" />
                          <Text style={styles.historyWinnerName}>{winner.playerName}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.historyScores}>
                      {sorted.map((pr, i) => (
                        <View key={pr.playerId} style={styles.historyScoreRow}>
                          <Text style={styles.historyRank}>#{i + 1}</Text>
                          <Text style={styles.historyPlayerName}>{pr.playerName}</Text>
                          <Text style={[styles.historyScore, pr.winner && styles.historyScoreWinner]}>
                            {pr.score} pts
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <View style={emptyStyles.container}>
      <MaterialCommunityIcons name={icon as any} size={64} color="rgba(255,255,255,0.15)" />
      <Text style={emptyStyles.text}>{text}</Text>
      <Text style={emptyStyles.sub}>{sub}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 80, gap: 10 },
  text: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.25)' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.15)', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  // Trophées & Parties
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, gap: 12,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  totalWins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalWinsText: { fontSize: 14, fontWeight: '700', color: '#f39c12' },
  gamesCount: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  gameBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gameBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  gameBadgeText: { fontSize: 12, fontWeight: '700' },

  // Historique
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  gameIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  historyInfo: { flex: 1 },
  historyGame: { fontSize: 15, fontWeight: '800', color: '#fff' },
  historyMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  historyWinner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(243,156,18,0.15)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  historyWinnerName: { fontSize: 12, fontWeight: '700', color: '#f39c12' },
  historyScores: { padding: 12, gap: 6 },
  historyScoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 4,
  },
  historyRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', width: 24 },
  historyPlayerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  historyScore: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  historyScoreWinner: { color: '#f39c12' },
});
