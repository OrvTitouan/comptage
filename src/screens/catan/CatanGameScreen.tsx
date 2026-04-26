import React, { useState } from 'react';
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
import { Player, PlayerScore } from '../../types';
import PlayerAvatar from '../../components/PlayerAvatar';
import { confirmAlert } from '../../utils/confirm';

interface CatanGameScreenProps {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

const WIN_SCORE = 10;
const GAME_COLOR = '#e67e22';

export default function CatanGameScreen({ players, onEnd, onGoHome, onMeta }: CatanGameScreenProps) {
  const [vp, setVp] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────

  const changeVp = (playerId: string, delta: number) => {
    setVp((prev) => {
      const next = { ...prev, [playerId]: Math.max(0, (prev[playerId] ?? 0) + delta) };
      const scores: PlayerScore[] = players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: next[p.id] ?? 0,
      }));
      onMeta(scores);

      // Auto-fin si quelqu'un atteint WIN_SCORE
      if (next[playerId] >= WIN_SCORE) {
        const sorted = [...players].sort((a, b) => (next[b.id] ?? 0) - (next[a.id] ?? 0));
        setWinner(sorted[0]);
        setGameOver(true);
      }

      return next;
    });
  };

  const handleEndGame = () => {
    const sorted = [...players].sort((a, b) => (vp[b.id] ?? 0) - (vp[a.id] ?? 0));
    const scores: PlayerScore[] = players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: vp[p.id] ?? 0,
    }));
    onMeta(scores);
    setWinner(sorted[0]);
    setGameOver(true);
  };

  const confirmEnd = () => {
    confirmAlert('Terminer la partie ?', 'Le joueur avec le plus de points de victoire gagne.', handleEndGame, 'Terminer');
  };

  // ── Sorted standings ─────────────────────────────────────────────

  const sorted = [...players].sort((a, b) => (vp[b.id] ?? 0) - (vp[a.id] ?? 0));

  const PODIUM_COLORS = ['#f39c12', '#bdc3c7', '#cd6133'];
  const PODIUM_ICONS: Array<'trophy' | 'medal' | 'medal-outline'> = ['trophy', 'medal', 'medal-outline'];

  // ── Game over screen ────────────────────────────────────────────

  if (gameOver && winner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fin de partie</Text>
        </View>

        {/* Winner */}
        <View style={styles.winnerSection}>
          <View style={styles.winnerCrown}>
            <MaterialCommunityIcons name="crown" size={48} color="#f39c12" />
          </View>
          <Text style={styles.winnerLabel}>Vainqueur</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <Text style={styles.winnerScore}>{vp[winner.id] ?? 0} pts de victoire</Text>
        </View>

        {/* Final standings */}
        <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Classement final</Text>
          {sorted.map((player, idx) => {
            const score = vp[player.id] ?? 0;
            const isWinner = player.id === winner.id;
            const color = PODIUM_COLORS[idx] ?? 'rgba(255,255,255,0.3)';
            return (
              <View key={player.id} style={[styles.resultRow, isWinner && styles.resultRowWinner]}>
                <View style={[styles.rankBadge, { backgroundColor: color + '22' }]}>
                  <MaterialCommunityIcons
                    name={PODIUM_ICONS[idx] ?? 'numeric'}
                    size={20}
                    color={color}
                  />
                </View>
                <Text style={styles.resultName}>{player.name}</Text>
                <View style={styles.resultScoreWrap}>
                  <Text style={[styles.resultScore, isWinner && { color: '#f39c12' }]}>{score}</Text>
                  <Text style={styles.resultScoreLabel}>PV</Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.endButton} onPress={onEnd} activeOpacity={0.85}>
            <MaterialCommunityIcons name="flag-checkered" size={22} color="#fff" />
            <Text style={styles.endButtonText}>Terminer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Game screen ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catan</Text>
        <TouchableOpacity onPress={onGoHome} style={styles.homeBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Objectif : {WIN_SCORE} points de victoire</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sorted.map((player, idx) => {
          const score = vp[player.id] ?? 0;
          const progress = Math.min(score / WIN_SCORE, 1);
          const isLeader = idx === 0 && score > 0;

          return (
            <View key={player.id} style={styles.playerCard}>
              {/* Name row */}
              <View style={styles.playerHeader}>
                <PlayerAvatar name={player.name} photoUri={player.photoUri} size={48} color="#e67e22" />
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {isLeader && (
                      <View style={styles.leaderBadge}>
                        <MaterialCommunityIcons name="crown" size={12} color="#f39c12" />
                        <Text style={styles.leaderText}>Leader</Text>
                      </View>
                    )}
                  </View>
                  {/* Progress bar */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%` as any,
                          backgroundColor: score >= WIN_SCORE ? '#2ecc71' : GAME_COLOR,
                        },
                      ]}
                    />
                    <Text style={styles.progressLabel}>{WIN_SCORE} PV</Text>
                  </View>
                </View>
              </View>

              {/* Score controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() => changeVp(player.id, -1)}
                  disabled={score === 0}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={22}
                    color={score === 0 ? 'rgba(255,255,255,0.2)' : '#fff'}
                  />
                </TouchableOpacity>

                <View style={styles.scoreDisplay}>
                  <Text style={[styles.scoreValue, score >= WIN_SCORE && styles.scoreValueWin]}>
                    {score}
                  </Text>
                  <Text style={styles.scoreUnit}>PV</Text>
                </View>

                <TouchableOpacity
                  style={[styles.plusBtn, { backgroundColor: GAME_COLOR }]}
                  onPress={() => changeVp(player.id, 1)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.endBtn} onPress={confirmEnd} activeOpacity={0.85}>
          <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
          <Text style={styles.endBtnText}>Terminer la partie</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    position: 'relative',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  homeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
    fontWeight: '600',
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },

  playerCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e67e22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  playerInfo: { flex: 1, gap: 8 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(243,156,18,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  leaderText: { fontSize: 11, fontWeight: '700', color: '#f39c12' },

  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  progressLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minusBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 54,
  },
  scoreValueWin: { color: '#2ecc71' },
  scoreUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plusBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footer: { padding: 20, paddingBottom: 32 },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2ecc71',
    borderRadius: 16,
    padding: 18,
  },
  endBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Game over
  winnerSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  winnerCrown: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(243,156,18,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  winnerLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  winnerName: { fontSize: 32, fontWeight: '900', color: '#fff' },
  winnerScore: { fontSize: 15, color: '#f39c12', fontWeight: '700', marginTop: 4 },

  resultsContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 14,
  },
  resultRowWinner: { backgroundColor: 'rgba(243,156,18,0.1)', borderWidth: 1, borderColor: 'rgba(243,156,18,0.3)' },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  resultScoreWrap: { alignItems: 'flex-end' },
  resultScore: { fontSize: 24, fontWeight: '900', color: '#fff' },
  resultScoreLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8 },

  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2ecc71',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  endButtonText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
