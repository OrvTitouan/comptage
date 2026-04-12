import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, PlayerScore } from '../../types';

interface SixQuiPrendGameScreenProps {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

const BUST_THRESHOLD = 66;
const GAME_COLOR = '#c0392b';
const WARNING_THRESHOLD = 50;

const PODIUM_COLORS = ['#f39c12', '#bdc3c7', '#cd6133'];
const PODIUM_ICONS: Array<'trophy' | 'medal' | 'medal-outline'> = ['trophy', 'medal', 'medal-outline'];

// Règle têtes de bœuf
const BULL_RULES = [
  { label: 'Doubles (11, 22…)', value: '5 🐂', color: '#e74c3c' },
  { label: 'Multiples de 5 (5, 15…)', value: '2 🐂', color: '#e67e22' },
  { label: 'Multiples de 10 (10, 20…)', value: '3 🐂', color: '#f39c12' },
  { label: 'Carte 55', value: '7 🐂', color: '#9b59b6' },
  { label: 'Toutes les autres', value: '1 🐂', color: 'rgba(255,255,255,0.4)' },
];

interface Round {
  heads: Record<string, number>;
}

export default function SixQuiPrendGameScreen({ players, onEnd, onGoHome, onMeta }: SixQuiPrendGameScreenProps) {
  const [totals, setTotals] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [rounds, setRounds] = useState<Round[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.id, '']))
  );
  const [showRules, setShowRules] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  const roundNumber = rounds.length + 1;

  // ── Sorted standings (low wins) ──────────────────────────────────
  const sorted = [...players].sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0));

  // ── Validate round ───────────────────────────────────────────────
  const handleValidate = () => {
    const heads: Record<string, number> = {};
    for (const p of players) {
      const val = parseInt(inputs[p.id] ?? '0', 10);
      heads[p.id] = isNaN(val) || val < 0 ? 0 : val;
    }

    const newTotals = { ...totals };
    for (const p of players) {
      newTotals[p.id] = (totals[p.id] ?? 0) + heads[p.id];
    }

    setRounds((prev) => [...prev, { heads }]);
    setTotals(newTotals);
    setInputs(Object.fromEntries(players.map((p) => [p.id, ''])));

    const scores: PlayerScore[] = players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: newTotals[p.id] ?? 0,
    }));
    onMeta(scores);

    // Check bust
    const busted = players.some((p) => (newTotals[p.id] ?? 0) >= BUST_THRESHOLD);
    if (busted) {
      const sortedByTotal = [...players].sort((a, b) => (newTotals[a.id] ?? 0) - (newTotals[b.id] ?? 0));
      setWinner(sortedByTotal[0]);
      setGameOver(true);
    }
  };

  const allFilled = players.every((p) => (inputs[p.id] ?? '').trim() !== '');

  // ── Undo last round ──────────────────────────────────────────────
  const handleUndo = () => {
    if (rounds.length === 0) return;
    const last = rounds[rounds.length - 1];
    const newTotals = { ...totals };
    for (const p of players) {
      newTotals[p.id] = Math.max(0, (totals[p.id] ?? 0) - (last.heads[p.id] ?? 0));
    }
    setTotals(newTotals);
    setRounds((prev) => prev.slice(0, -1));
    const scores: PlayerScore[] = players.map((p) => ({
      playerId: p.id, playerName: p.name, score: newTotals[p.id] ?? 0,
    }));
    onMeta(scores);
  };

  // ── Game over ────────────────────────────────────────────────────
  if (gameOver && winner) {
    const finalSorted = [...players].sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0));
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>6 qui prend !</Text>
        </View>

        <View style={styles.winnerSection}>
          <View style={styles.winnerCrown}>
            <MaterialCommunityIcons name="crown" size={48} color="#f39c12" />
          </View>
          <Text style={styles.winnerLabel}>Vainqueur</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <Text style={styles.winnerScore}>{totals[winner.id] ?? 0} 🐂</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Classement final</Text>
          {finalSorted.map((player, idx) => {
            const score = totals[player.id] ?? 0;
            const isWinner = player.id === winner.id;
            const color = PODIUM_COLORS[idx] ?? 'rgba(255,255,255,0.3)';
            return (
              <View key={player.id} style={[styles.resultRow, isWinner && styles.resultRowWinner]}>
                <View style={[styles.rankBadge, { backgroundColor: color + '22' }]}>
                  <MaterialCommunityIcons name={PODIUM_ICONS[idx] ?? 'numeric'} size={20} color={color} />
                </View>
                <Text style={styles.resultName}>{player.name}</Text>
                <View style={styles.resultScoreWrap}>
                  <Text style={[styles.resultScore, isWinner && { color: '#f39c12' }]}>{score}</Text>
                  <Text style={styles.resultUnit}>🐂</Text>
                </View>
              </View>
            );
          })}

          {/* Historique des manches */}
          {rounds.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Détail des manches</Text>
              <View style={styles.historyTable}>
                {/* Header */}
                <View style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.historyCellHeader, { flex: 0, width: 36 }]}>M.</Text>
                  {finalSorted.map((p) => (
                    <Text key={p.id} style={[styles.historyCell, styles.historyCellHeader]} numberOfLines={1}>{p.name}</Text>
                  ))}
                </View>
                {rounds.map((r, i) => (
                  <View key={i} style={[styles.historyRow, i % 2 === 1 && styles.historyRowAlt]}>
                    <Text style={[styles.historyCell, { flex: 0, width: 36, color: 'rgba(255,255,255,0.4)' }]}>{i + 1}</Text>
                    {finalSorted.map((p) => (
                      <Text key={p.id} style={[styles.historyCell, (r.heads[p.id] ?? 0) > 5 && styles.historyCellHigh]}>
                        {r.heads[p.id] ?? 0}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.endButton} onPress={onEnd} activeOpacity={0.85}>
            <MaterialCommunityIcons name="flag-checkered" size={22} color="#fff" />
            <Text style={styles.endButtonText}>Terminer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Game screen ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>6 qui prend !</Text>
        <TouchableOpacity onPress={onGoHome} style={styles.homeBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Standings */}
      <View style={styles.standings}>
        {sorted.map((p, idx) => {
          const total = totals[p.id] ?? 0;
          const progress = Math.min(total / BUST_THRESHOLD, 1);
          const danger = total >= WARNING_THRESHOLD;
          return (
            <View key={p.id} style={styles.standingRow}>
              <Text style={styles.standingRank}>#{idx + 1}</Text>
              <Text style={styles.standingName} numberOfLines={1}>{p.name}</Text>
              <View style={styles.standingBarWrap}>
                <View style={[
                  styles.standingBar,
                  { width: `${progress * 100}%` as any, backgroundColor: danger ? '#e74c3c' : GAME_COLOR },
                ]} />
              </View>
              <Text style={[styles.standingScore, danger && styles.standingScoreDanger]}>
                {total}🐂
              </Text>
              {danger && <MaterialCommunityIcons name="alert" size={14} color="#e74c3c" />}
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Règles repliables */}
          <TouchableOpacity style={styles.rulesToggle} onPress={() => setShowRules((v) => !v)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="cow" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.rulesToggleText}>Valeur des cartes</Text>
            <MaterialCommunityIcons name={showRules ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          {showRules && (
            <View style={styles.rulesPanel}>
              {BULL_RULES.map((rule) => (
                <View key={rule.label} style={styles.ruleRow}>
                  <Text style={[styles.ruleValue, { color: rule.color }]}>{rule.value}</Text>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Manche N */}
          <Text style={styles.roundTitle}>Manche {roundNumber}</Text>
          <Text style={styles.roundSub}>Entrez les têtes de bœuf ramassées</Text>

          {players.map((player) => {
            const total = totals[player.id] ?? 0;
            const danger = total >= WARNING_THRESHOLD;
            return (
              <View key={player.id} style={[styles.playerRow, danger && styles.playerRowDanger]}>
                <View style={[styles.avatar, danger && styles.avatarDanger]}>
                  <Text style={styles.avatarText}>{player.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={[styles.playerTotal, danger && styles.playerTotalDanger]}>Total : {total} 🐂</Text>
                </View>
                <TextInput
                  style={[styles.headsInput, danger && styles.headsInputDanger]}
                  value={inputs[player.id] ?? ''}
                  onChangeText={(t) => {
                    if (/^\d*$/.test(t)) setInputs((prev) => ({ ...prev, [player.id]: t }));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  selectTextOnFocus
                  returnKeyType="done"
                />
              </View>
            );
          })}

          <View style={styles.actionRow}>
            {rounds.length > 0 && (
              <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} activeOpacity={0.8}>
                <MaterialCommunityIcons name="undo" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={styles.undoBtnText}>Annuler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.validateBtn, !allFilled && styles.validateBtnDisabled]}
              onPress={handleValidate}
              disabled={!allFilled}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.validateBtnText}>Valider la manche</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.bust}>La partie s'arrête dès qu'un joueur atteint {BUST_THRESHOLD} 🐂</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, position: 'relative',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  homeBtn: {
    position: 'absolute', right: 20, top: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },

  // Standings
  standings: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16, borderRadius: 14, padding: 12, gap: 8, marginBottom: 8,
  },
  standingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  standingRank: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', width: 22 },
  standingName: { fontSize: 13, fontWeight: '600', color: '#fff', width: 72 },
  standingBarWrap: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
  },
  standingBar: { height: '100%', borderRadius: 3 },
  standingScore: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)', width: 52, textAlign: 'right' },
  standingScoreDanger: { color: '#e74c3c' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Règles
  rulesToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
  },
  rulesToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  rulesPanel: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 12, marginBottom: 8, gap: 6,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleValue: { fontSize: 14, fontWeight: '800', width: 56 },
  ruleLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', flex: 1 },

  // Manche
  roundTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 12, marginBottom: 2 },
  roundSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14 },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    padding: 14, marginBottom: 10,
  },
  playerRowDanger: { backgroundColor: 'rgba(231,76,60,0.08)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: GAME_COLOR, justifyContent: 'center', alignItems: 'center',
  },
  avatarDanger: { backgroundColor: '#e74c3c' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  playerTotal: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  playerTotalDanger: { color: '#e74c3c', fontWeight: '700' },
  headsInput: {
    width: 64, height: 52, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', padding: 0,
  },
  headsInputDanger: { borderColor: 'rgba(231,76,60,0.5)', backgroundColor: 'rgba(231,76,60,0.08)' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  undoBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  validateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GAME_COLOR, borderRadius: 14, paddingVertical: 14,
  },
  validateBtnDisabled: { opacity: 0.4 },
  validateBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  bust: { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 16, fontStyle: 'italic' },

  // Game over
  winnerSection: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  winnerCrown: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(243,156,18,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  winnerLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  winnerName: { fontSize: 30, fontWeight: '900', color: '#fff' },
  winnerScore: { fontSize: 16, color: '#f39c12', fontWeight: '700', marginTop: 2 },

  resultsContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 8, gap: 14,
  },
  resultRowWinner: { backgroundColor: 'rgba(243,156,18,0.1)', borderWidth: 1, borderColor: 'rgba(243,156,18,0.3)' },
  rankBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  resultScoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  resultScore: { fontSize: 24, fontWeight: '900', color: '#fff' },
  resultUnit: { fontSize: 16 },

  // History table
  historyTable: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 },
  historyRowAlt: { backgroundColor: 'rgba(255,255,255,0.03)' },
  historyCell: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  historyCellHeader: { fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  historyCellHigh: { color: '#e74c3c', fontWeight: '800' },

  endButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2ecc71', borderRadius: 16, padding: 18, marginTop: 20,
  },
  endButtonText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
