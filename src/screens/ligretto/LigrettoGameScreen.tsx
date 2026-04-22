import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, PlayerScore } from '../../types';

const WIN_SCORE = 99;

function getLeaderEmoji(name: string): string {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/^(michelle|mich|miche)$/.test(n)) return '🐷';
  if (/^(capucine|capu)$/.test(n)) return '🐄';
  if (/^manon$/.test(n)) return '🦆';
  if (/^come$/.test(n)) return '🐀';
  return '👑';
}

interface LigrettoGameScreenProps {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

export default function LigrettoGameScreen({
  players,
  onEnd,
  onGoHome,
  onMeta,
}: LigrettoGameScreenProps) {
  const [totals, setTotals] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [roundInputs, setRoundInputs] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.id, '']))
  );
  const [roundHistory, setRoundHistory] = useState<{ playerId: string; delta: number }[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const roundNumber = roundHistory.length + 1;

  const emitMeta = (t: Record<string, number>) => {
    onMeta(
      players.map((p) => ({ playerId: p.id, playerName: p.name, score: t[p.id] }))
    );
  };

  const handleValidateRound = () => {
    const deltas: Record<string, number> = {};
    for (const p of players) {
      const raw = roundInputs[p.id].trim();
      deltas[p.id] = raw === '' || raw === '-' ? 0 : parseInt(raw) || 0;
    }

    const newTotals = { ...totals };
    const roundEntry: { playerId: string; delta: number }[] = [];
    for (const p of players) {
      newTotals[p.id] += deltas[p.id];
      roundEntry.push({ playerId: p.id, delta: deltas[p.id] });
    }

    setTotals(newTotals);
    setRoundHistory((prev) => [...prev, roundEntry]);
    setRoundInputs(Object.fromEntries(players.map((p) => [p.id, ''])));
    emitMeta(newTotals);

    // Check win condition
    const winners = players.filter((p) => newTotals[p.id] >= WIN_SCORE);
    if (winners.length > 0) {
      const topScore = Math.max(...winners.map((p) => newTotals[p.id]));
      const w = winners.find((p) => newTotals[p.id] === topScore) ?? winners[0];
      setWinner(w);
      setGameOver(true);
    }
  };

  const handleUndo = () => {
    if (roundHistory.length === 0) return;
    const last = roundHistory[roundHistory.length - 1];
    const newTotals = { ...totals };
    for (const entry of last) {
      newTotals[entry.playerId] -= entry.delta;
    }
    setTotals(newTotals);
    setRoundHistory((prev) => prev.slice(0, -1));
    emitMeta(newTotals);
  };

  const canValidate = players.some((p) => {
    const raw = roundInputs[p.id].trim();
    return raw !== '' && raw !== '-' && raw !== '0' && raw !== '-0';
  });

  const sortedPlayers = [...players].sort((a, b) => totals[b.id] - totals[a.id]);

  // ── End screen ────────────────────────────────────────────────────────────

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#b71c1c" />
        <ScrollView contentContainerStyle={styles.endScroll}>
          <Text style={styles.endTitle}>Partie terminée !</Text>
          <Text style={styles.endSubtitle}>
            {winner?.name} a atteint {WIN_SCORE} points !
          </Text>

          <View style={styles.podium}>
            {sortedPlayers.map((p, i) => (
              <View key={p.id} style={[styles.podiumRow, i === 0 && styles.podiumFirst]}>
                <Text style={styles.podiumRank}>#{i + 1}</Text>
                <Text style={styles.podiumName}>{p.name}</Text>
                <Text style={[styles.podiumScore, i === 0 && styles.podiumScoreFirst]}>
                  {totals[p.id]} pts
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.endButton} onPress={onEnd}>
            <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
            <Text style={styles.endButtonText}>Enregistrer et quitter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={onGoHome}>
            <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Game screen ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#b71c1c" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.headerBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Ligretto</Text>
          <Text style={styles.subtitle}>Manche {roundNumber} · Premier à {WIN_SCORE}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scores actuels */}
          <View style={styles.scoreBoard}>
            {sortedPlayers.map((p, i) => {
              const pct = Math.min(totals[p.id] / WIN_SCORE, 1);
              const isLeader = i === 0 && totals[p.id] > 0;
              return (
                <View key={p.id} style={styles.scoreRow}>
                  <View style={styles.scoreLeft}>
                    <Text style={[styles.scoreRank, isLeader && styles.scoreRankLeader]}>
                      {isLeader ? getLeaderEmoji(p.name) : `#${i + 1}`}
                    </Text>
                    <Text style={styles.scoreName}>{p.name}</Text>
                  </View>
                  <View style={styles.scoreRight}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct * 100}%` as any }]} />
                    </View>
                    <Text style={[styles.scoreValue, totals[p.id] >= WIN_SCORE && styles.scoreWin]}>
                      {totals[p.id]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Saisie de la manche */}
          <Text style={styles.sectionLabel}>Manche {roundNumber}</Text>
          {players.map((p) => (
            <View key={p.id} style={styles.inputRow}>
              <View style={styles.inputAvatar}>
                <Text style={styles.inputAvatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.inputName}>{p.name}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={roundInputs[p.id]}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9-]/g, '');
                    // Autoriser seulement un tiret en début
                    const safe = clean.startsWith('-')
                      ? '-' + clean.slice(1).replace(/-/g, '')
                      : clean.replace(/-/g, '');
                    setRoundInputs((prev) => ({ ...prev, [p.id]: safe }));
                  }}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  selectTextOnFocus
                  maxLength={4}
                />
              </View>
            </View>
          ))}

          {/* Historique */}
          {roundHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionLabel}>Historique</Text>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyCell, styles.historyCellLabel]}>M.</Text>
                {players.map((p) => (
                  <Text key={p.id} style={[styles.historyCell, styles.historyCellName]} numberOfLines={1}>
                    {p.name.slice(0, 5)}
                  </Text>
                ))}
              </View>
              {[...roundHistory].reverse().map((round, ri) => {
                const idx = roundHistory.length - ri;
                return (
                  <View key={idx} style={[styles.historyRow, ri % 2 === 1 && styles.historyRowAlt]}>
                    <Text style={[styles.historyCell, styles.historyCellLabel]}>{idx}</Text>
                    {players.map((p) => {
                      const entry = round.find((e) => e.playerId === p.id);
                      const delta = entry?.delta ?? 0;
                      return (
                        <Text
                          key={p.id}
                          style={[
                            styles.historyCell,
                            delta > 0 && styles.historyCellPos,
                            delta < 0 && styles.historyCellNeg,
                          ]}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.validateButton, !canValidate && styles.validateButtonDisabled]}
            onPress={handleValidateRound}
            activeOpacity={0.85}
          >
            <Text style={styles.validateButtonText}>Valider la manche</Text>
            <MaterialCommunityIcons name="check" size={22} color="#fff" />
          </TouchableOpacity>
          {roundHistory.length > 0 && (
            <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
              <MaterialCommunityIcons name="undo" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.undoButtonText}>Annuler la manche {roundHistory.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnDisabled: { opacity: 0.4 },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // Scoreboard
  scoreBoard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 110,
  },
  scoreRank: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  scoreRankLeader: { color: '#f39c12' },
  scoreName: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  scoreRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e53935',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    width: 36,
    textAlign: 'right',
  },
  scoreWin: { color: '#f39c12' },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Round inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  inputName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  inputWrapper: {},
  input: {
    width: 72,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  // History
  historySection: { marginTop: 8 },
  historyHeader: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRadius: 6,
  },
  historyRowAlt: { backgroundColor: 'rgba(255,255,255,0.04)' },
  historyCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  historyCellLabel: { flex: 0.5, color: 'rgba(255,255,255,0.3)' },
  historyCellName: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  historyCellPos: { color: '#2ecc71', fontWeight: '700' },
  historyCellNeg: { color: '#e74c3c', fontWeight: '700' },

  // Footer
  footer: { padding: 20, paddingBottom: 28, gap: 10 },
  validateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e53935',
    borderRadius: 16,
    padding: 18,
  },
  validateButtonDisabled: { opacity: 0.4 },
  validateButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  undoButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  undoButtonText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },

  // End screen
  endScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  endTitle: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center' },
  endSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  podium: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  podiumFirst: {
    backgroundColor: 'rgba(243,156,18,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  podiumRank: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  podiumName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  podiumScore: { fontSize: 18, fontWeight: '800', color: '#fff' },
  podiumScoreFirst: { color: '#f39c12' },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e53935',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  endButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  homeButton: { paddingVertical: 12 },
  homeButtonText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
});
