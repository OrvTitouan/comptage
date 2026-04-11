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
import { Player, GameResult, PlayerResult, PlayerScore } from '../../types';
import { saveResult } from '../../storage/stats';

const COLOR = '#00ACC1';
const COLOR_DARK = '#007C91';
const GAME_OVER_THRESHOLD = 100;

// ── Types ────────────────────────────────────────────────────────

interface RoundScore {
  playerId: string;
  rawScore: number;
  finalScore: number;
  doubled: boolean;
}

interface SkyjoRound {
  roundNumber: number;
  closerId: string;
  scores: RoundScore[];
}

interface InputState {
  sign: 1 | -1;
  abs: string;
}

// ── Props ────────────────────────────────────────────────────────

interface Props {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function initInputs(players: Player[]): Record<string, InputState> {
  return Object.fromEntries(players.map((p) => [p.id, { sign: 1 as const, abs: '' }]));
}

function parseScore(inp: InputState): number {
  return inp.sign * (parseInt(inp.abs) || 0);
}

// ── Main component ───────────────────────────────────────────────

export default function SkyjoGameScreen({ players, onEnd, onGoHome, onMeta }: Props) {
  const [rounds, setRounds] = useState<SkyjoRound[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0])),
  );
  const [closerId, setCloserId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, InputState>>(initInputs(players));
  const [phase, setPhase] = useState<'round' | 'gameover'>('round');
  const [saving, setSaving] = useState(false);

  // ── Live calcul ─────────────────────────────────────────────

  const rawScores = Object.fromEntries(players.map((p) => [p.id, parseScore(inputs[p.id])]));
  const allEntered = players.every((p) => inputs[p.id].abs !== '');
  const minRawScore = allEntered ? Math.min(...players.map((p) => rawScores[p.id])) : null;
  const closerWouldDouble =
    closerId !== null &&
    allEntered &&
    minRawScore !== null &&
    rawScores[closerId] > minRawScore;

  // Classement courant (bas = bon)
  const sortedPlayers = [...players].sort((a, b) => totals[a.id] - totals[b.id]);

  // ── Handlers ────────────────────────────────────────────────

  const updateSign = (playerId: string, sign: 1 | -1) =>
    setInputs((prev) => ({ ...prev, [playerId]: { ...prev[playerId], sign } }));

  const updateAbs = (playerId: string, abs: string) =>
    setInputs((prev) => ({ ...prev, [playerId]: { ...prev[playerId], abs } }));

  const handleValidate = () => {
    if (!closerId || !allEntered) return;

    const min = Math.min(...players.map((p) => rawScores[p.id]));

    const roundScores: RoundScore[] = players.map((p) => {
      const raw = rawScores[p.id];
      const doubled = p.id === closerId && raw > min;
      return { playerId: p.id, rawScore: raw, finalScore: doubled ? raw * 2 : raw, doubled };
    });

    const newTotals = { ...totals };
    roundScores.forEach((s) => { newTotals[s.playerId] += s.finalScore; });

    const newRound: SkyjoRound = {
      roundNumber: rounds.length + 1,
      closerId,
      scores: roundScores,
    };

    setRounds((prev) => [...prev, newRound]);
    setTotals(newTotals);
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: newTotals[p.id] })));

    if (players.some((p) => newTotals[p.id] >= GAME_OVER_THRESHOLD)) {
      setPhase('gameover');
    } else {
      setCloserId(null);
      setInputs(initInputs(players));
    }
  };

  const handleUndo = () => {
    if (rounds.length === 0) return;
    const last = rounds[rounds.length - 1];
    const newTotals = { ...totals };
    last.scores.forEach((s) => { newTotals[s.playerId] -= s.finalScore; });
    setRounds((prev) => prev.slice(0, -1));
    setTotals(newTotals);
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: newTotals[p.id] })));
    if (phase === 'gameover') setPhase('round');
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);

    const sorted = [...players].sort((a, b) => totals[a.id] - totals[b.id]);
    const winner = sorted[0];

    const result: GameResult = {
      id: Date.now().toString(),
      gameId: 'skyjo',
      gameName: 'Skyjo',
      date: new Date().toISOString(),
      rounds: rounds.length,
      playerResults: players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: totals[p.id],
        winner: p.id === winner.id,
      })),
    };

    try { await saveResult(result); } catch {}
    onEnd();
  };

  // ── Game over screen ────────────────────────────────────────

  if (phase === 'gameover') {
    const sorted = [...players].sort((a, b) => totals[a.id] - totals[b.id]);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Fin de partie !</Text>
            <Text style={styles.headerSub}>Skyjo · {rounds.length} manche{rounds.length > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <MaterialCommunityIcons name="undo" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {sorted.map((p, idx) => (
            <View key={p.id} style={[styles.resultRow, idx === 0 && styles.resultRowFirst]}>
              <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                {idx === 0
                  ? <MaterialCommunityIcons name="crown" size={18} color="#1a1a2e" />
                  : <Text style={styles.rankText}>#{idx + 1}</Text>}
              </View>
              <Text style={[styles.resultName, idx === 0 && styles.resultNameFirst]}>{p.name}</Text>
              <Text style={[styles.resultScore, idx === 0 && styles.resultScoreFirst]}>
                {totals[p.id]} pts
              </Text>
            </View>
          ))}

          {/* Historique des manches */}
          <Text style={styles.sectionLabel}>Historique des manches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tablePlayerCell, styles.tableCellHeader]}>Joueur</Text>
                {rounds.map((r) => (
                  <Text key={r.roundNumber} style={[styles.tableCell, styles.tableCellHeader]}>
                    M{r.roundNumber}
                  </Text>
                ))}
                <Text style={[styles.tableCell, styles.tableTotalCell, styles.tableCellHeader]}>Total</Text>
              </View>
              {players.map((p) => {
                let cumul = 0;
                return (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tablePlayerCell]} numberOfLines={1}>{p.name}</Text>
                    {rounds.map((r) => {
                      const s = r.scores.find((x) => x.playerId === p.id)!;
                      cumul += s.finalScore;
                      return (
                        <View key={r.roundNumber} style={styles.tableCellWrap}>
                          <Text style={[styles.tableCell, s.finalScore < 0 && styles.negScore, s.doubled && styles.doubledScore]}>
                            {s.finalScore > 0 ? '+' : ''}{s.finalScore}
                          </Text>
                          {s.doubled && <Text style={styles.doubledBadge}>×2</Text>}
                        </View>
                      );
                    })}
                    <Text style={[styles.tableCell, styles.tableTotalCell, totals[p.id] >= GAME_OVER_THRESHOLD && styles.overThreshold]}>
                      {totals[p.id]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleFinish} activeOpacity={0.85} disabled={saving}>
            <MaterialCommunityIcons name="trophy" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Terminer la partie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Round input screen ──────────────────────────────────────

  const canValidate = closerId !== null && allEntered;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.backButton}>
          <MaterialCommunityIcons name="home-outline" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Manche {rounds.length + 1}</Text>
          <Text style={styles.headerSub}>Skyjo · fin à {GAME_OVER_THRESHOLD} pts</Text>
        </View>
        <TouchableOpacity
          onPress={handleUndo}
          style={[styles.undoBtn, rounds.length === 0 && styles.undoBtnDisabled]}
          disabled={rounds.length === 0}
        >
          <MaterialCommunityIcons name="undo" size={22} color={rounds.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Classement courant */}
          {rounds.length > 0 && (
            <View style={styles.standingsCard}>
              <Text style={styles.standingsTitle}>Classement actuel</Text>
              {sortedPlayers.map((p, idx) => (
                <View key={p.id} style={styles.standingRow}>
                  <Text style={styles.standingRank}>#{idx + 1}</Text>
                  <Text style={styles.standingName}>{p.name}</Text>
                  <Text style={[styles.standingScore, totals[p.id] >= 80 && styles.standingScoreWarn]}>
                    {totals[p.id]} pts
                  </Text>
                  {/* Mini barre de progression vers 100 */}
                  <View style={styles.progressTrack}>
                    <View style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, Math.max(0, totals[p.id]))}%` as any,
                        backgroundColor: totals[p.id] >= 80 ? '#e74c3c' : COLOR,
                      },
                    ]} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sélection du joueur qui a fermé */}
          <Text style={styles.sectionLabel}>Qui a terminé en premier ?</Text>
          <View style={styles.closerRow}>
            {players.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.closerChip, closerId === p.id && styles.closerChipActive]}
                onPress={() => setCloserId(p.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closerChipText, closerId === p.id && styles.closerChipTextActive]}>
                  {p.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Saisie des scores */}
          <Text style={styles.sectionLabel}>Scores de la manche</Text>
          {players.map((p) => {
            const isCloser = p.id === closerId;
            const raw = rawScores[p.id];
            const wouldDouble = isCloser && closerWouldDouble;

            return (
              <View key={p.id} style={[styles.playerRow, isCloser && styles.playerRowCloser]}>
                <View style={[styles.avatar, { backgroundColor: isCloser ? COLOR : 'rgba(255,255,255,0.15)' }]}>
                  <Text style={styles.avatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{p.name}</Text>

                {isCloser && (
                  <MaterialCommunityIcons name="flag-checkered" size={14} color={COLOR} style={{ marginRight: 2 }} />
                )}

                {/* Signe +/- */}
                <TouchableOpacity
                  style={[styles.signBtn, inputs[p.id].sign === 1 && styles.signBtnPos]}
                  onPress={() => updateSign(p.id, 1)}
                >
                  <Text style={[styles.signBtnText, inputs[p.id].sign === 1 && styles.signBtnPosText]}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.signBtn, inputs[p.id].sign === -1 && styles.signBtnNeg]}
                  onPress={() => updateSign(p.id, -1)}
                >
                  <Text style={[styles.signBtnText, inputs[p.id].sign === -1 && styles.signBtnNegText]}>−</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.scoreInput}
                  value={inputs[p.id].abs}
                  onChangeText={(v) => updateAbs(p.id, v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />

                {/* Indicateur de doublement */}
                {wouldDouble ? (
                  <View style={styles.doubleBadge}>
                    <Text style={styles.doubleBadgeText}>×2 = {raw * 2}</Text>
                  </View>
                ) : (
                  <Text style={[styles.scorePreview, raw < 0 && styles.negScore]}>
                    {inputs[p.id].abs !== '' ? (raw > 0 ? `+${raw}` : `${raw}`) : ''}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Info règle de doublement */}
          {closerId && (
            <View style={styles.ruleHint}>
              <MaterialCommunityIcons name="information-outline" size={14} color="rgba(255,255,255,0.35)" />
              <Text style={styles.ruleHintText}>
                Si {players.find((p) => p.id === closerId)?.name} n'a pas le score le plus bas, ses points sont doublés.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {rounds.length > 0 && (
          <TouchableOpacity style={styles.undoRoundBtn} onPress={handleUndo} activeOpacity={0.8}>
            <MaterialCommunityIcons name="undo" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={styles.undoRoundBtnText}>Corriger la manche {rounds.length}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, !canValidate && styles.actionBtnDisabled]}
          onPress={handleValidate}
          activeOpacity={0.85}
          disabled={!canValidate}
        >
          <Text style={styles.actionBtnText}>Valider la manche</Text>
          <MaterialCommunityIcons name="check" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  undoBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  undoBtnDisabled: { opacity: 0.4 },

  scrollContent: { padding: 20, gap: 12, paddingBottom: 40 },

  // Classement
  standingsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, gap: 10,
  },
  standingsTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 2,
  },
  standingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  standingRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', width: 22 },
  standingName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  standingScore: { fontSize: 14, fontWeight: '800', color: COLOR, minWidth: 52, textAlign: 'right' },
  standingScoreWarn: { color: '#e74c3c' },
  progressTrack: {
    width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 4,
  },

  // Sélecteur de fermeture
  closerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  closerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  closerChipActive: { backgroundColor: COLOR + '33', borderColor: COLOR },
  closerChipText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  closerChipTextActive: { color: '#fff' },

  // Ligne joueur
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12,
  },
  playerRowCloser: {
    borderWidth: 1.5, borderColor: COLOR + '55',
    backgroundColor: COLOR + '11',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sign buttons
  signBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  signBtnPos: { backgroundColor: 'rgba(46,204,113,0.15)', borderColor: '#2ecc71' },
  signBtnNeg: { backgroundColor: 'rgba(231,76,60,0.15)', borderColor: '#e74c3c' },
  signBtnText: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.3)' },
  signBtnPosText: { color: '#2ecc71' },
  signBtnNegText: { color: '#e74c3c' },

  scoreInput: {
    width: 64, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 7,
    fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  scorePreview: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', minWidth: 44, textAlign: 'right',
  },
  negScore: { color: '#2ecc71' },

  doubleBadge: {
    backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.4)',
  },
  doubleBadgeText: { fontSize: 12, fontWeight: '800', color: '#e74c3c' },

  ruleHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12,
  },
  ruleHintText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 18 },

  // Footer
  footer: { padding: 16, paddingBottom: 28, gap: 8 },
  undoRoundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  undoRoundBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  actionBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: COLOR_DARK, borderRadius: 16, padding: 18,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Game over / résultats
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  resultRowFirst: { backgroundColor: COLOR + '22', borderWidth: 1, borderColor: COLOR + '55' },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  rankBadgeFirst: { backgroundColor: '#f39c12' },
  rankText: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  resultName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  resultNameFirst: { fontWeight: '900' },
  resultScore: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  resultScoreFirst: { color: '#f39c12' },

  // Tableau historique
  table: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tableHeaderRow: { backgroundColor: 'rgba(255,255,255,0.04)' },
  tableCell: {
    width: 52, paddingVertical: 10, paddingHorizontal: 4,
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  },
  tableCellHeader: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', paddingVertical: 8 },
  tableCellWrap: { width: 52, alignItems: 'center', justifyContent: 'center' },
  tablePlayerCell: { width: 86, textAlign: 'left', paddingLeft: 10, fontSize: 13 },
  tableTotalCell: { fontWeight: '900', color: '#fff', width: 58 },
  doubledScore: { color: '#e74c3c', fontWeight: '900' },
  doubledBadge: { fontSize: 9, fontWeight: '800', color: '#e74c3c' },
  overThreshold: { color: '#e74c3c' },
});
