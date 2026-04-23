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
import PlayerAvatar from '../../components/PlayerAvatar';

const TOTAL_ROUNDS = 8;
const TOTAL_SCORING = 9; // 8 régions + 1 sanctuaires
const GREEN = '#2ecc71';
const GREEN_DARK = '#27ae60';

interface FarwayGameScreenProps {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

function initInputs(players: Player[]) {
  return Object.fromEntries(players.map((p) => [p.id, '']));
}

export default function FarwayGameScreen({ players, onEnd, onGoHome, onMeta }: FarwayGameScreenProps) {
  const [totals, setTotals] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [inputs, setInputs] = useState<Record<string, string>>(initInputs(players));
  // 1-8 = régions (tour 8→1), 9 = sanctuaires
  const [scoringRound, setScoringRound] = useState(1);
  const [tiebreakers, setTiebreakers] = useState<Record<string, string>>(initInputs(players));
  // Historique des contributions par tour pour pouvoir annuler
  const [roundHistory, setRoundHistory] = useState<Record<string, number>[]>([]);

  const isSanctuaires = scoringRound === TOTAL_SCORING;
  const gameTurnLabel = TOTAL_ROUNDS - scoringRound + 1;

  const sortedPlayers = [...players].sort(
    (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0)
  );

  const handleValidate = async () => {
    const hasEmpty = players.some((p) => inputs[p.id].trim() === '');
    if (hasEmpty) {
      Alert.alert('Saisie incomplète', 'Renseignez la renommée de tous les joueurs avant de valider.');
      return;
    }

    const contrib = Object.fromEntries(players.map((p) => [p.id, parseInt(inputs[p.id]) || 0]));
    const newTotals = { ...totals };
    players.forEach((p) => {
      newTotals[p.id] = (newTotals[p.id] ?? 0) + contrib[p.id];
    });
    setTotals(newTotals);
    setRoundHistory((prev) => [...prev, contrib]);
    // Mettre à jour les scores pour l'accueil et les stats
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: newTotals[p.id] ?? 0 })));

    if (isSanctuaires) {
      const withTotals = players.map((p) => ({
        player: p,
        total: newTotals[p.id],
        minTime: parseInt(tiebreakers[p.id]) || 999,
      }));

      withTotals.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.minTime - b.minTime;
      });

      const winner = withTotals[0];
      const playerResults: PlayerResult[] = withTotals.map((x) => ({
        playerId: x.player.id,
        playerName: x.player.name,
        score: x.total,
        winner: x.player.id === winner.player.id,
      }));

      const result: GameResult = {
        id: Date.now().toString(),
        gameId: 'farway',
        gameName: 'Farway',
        date: new Date().toISOString(),
        rounds: TOTAL_ROUNDS,
        playerResults,
      };

      await saveResult(result);
      onEnd();
    } else {
      setScoringRound((r) => r + 1);
      setInputs(initInputs(players));
    }
  };

  const handleBack = () => {
    if (scoringRound === 1) {
      onGoHome();
    } else {
      // Annuler les scores du tour précédent
      const lastContrib = roundHistory[roundHistory.length - 1];
      if (lastContrib) {
        const restoredTotals = { ...totals };
        players.forEach((p) => {
          restoredTotals[p.id] = (restoredTotals[p.id] ?? 0) - (lastContrib[p.id] ?? 0);
        });
        setTotals(restoredTotals);
        setRoundHistory((prev) => prev.slice(0, -1));
        onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: restoredTotals[p.id] ?? 0 })));
      }
      setScoringRound((r) => r - 1);
      setInputs(initInputs(players));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {isSanctuaires ? 'Sanctuaires' : `Région — Tour ${gameTurnLabel}`}
          </Text>
          <Text style={styles.headerSub}>{scoringRound} / {TOTAL_SCORING}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((scoringRound - 1) / TOTAL_SCORING) * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Classement provisoire */}
          <View style={styles.leaderboard}>
            <Text style={styles.sectionLabel}>Classement provisoire</Text>
            {sortedPlayers.map((p, i) => (
              <View key={p.id} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>#{i + 1}</Text>
                <View style={[styles.miniAvatar, { backgroundColor: i === 0 ? '#f39c12' : 'rgba(255,255,255,0.15)' }]}>
                  <Text style={styles.miniAvatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.leaderName}>{p.name}</Text>
                <Text style={[styles.leaderScore, i === 0 && styles.leaderScoreFirst]}>
                  {totals[p.id] ?? 0} pts
                </Text>
              </View>
            ))}
          </View>

          {/* Saisie renommée */}
          <Text style={styles.sectionLabel}>
            {isSanctuaires ? 'Renommée des Sanctuaires' : `Renommée de la carte Région (Tour ${gameTurnLabel})`}
          </Text>

          {players.map((p) => (
            <View key={p.id} style={styles.inputCard}>
              <PlayerAvatar name={p.name} photoUri={p.photoUri} size={44} color={GREEN_DARK} />
              <Text style={styles.inputCardName}>{p.name}</Text>
              <TextInput
                style={styles.renownInput}
                value={inputs[p.id]}
                onChangeText={(v) =>
                  setInputs((prev) => ({ ...prev, [p.id]: v.replace(/[^0-9]/g, '') }))
                }
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
              <Text style={styles.inputUnit}>pts</Text>
            </View>
          ))}

          {/* Tiebreaker (uniquement sur la manche Sanctuaires) */}
          {isSanctuaires && (
            <View style={styles.tiebreakerSection}>
              <View style={styles.tiebreakerHeader}>
                <MaterialCommunityIcons name="timer-outline" size={16} color="rgba(255,255,255,0.4)" />
                <Text style={styles.tiebreakerTitle}>Départage ex-æquo</Text>
              </View>
              <Text style={styles.tiebreakerDesc}>
                En cas d'égalité, le joueur avec le plus petit temps d'exploration l'emporte.
              </Text>
              {players.map((p) => (
                <View key={p.id} style={styles.tiebreakerRow}>
                  <Text style={styles.tiebreakerName}>{p.name}</Text>
                  <TextInput
                    style={styles.tiebreakerInput}
                    value={tiebreakers[p.id]}
                    onChangeText={(v) =>
                      setTiebreakers((prev) => ({ ...prev, [p.id]: v.replace(/[^0-9]/g, '') }))
                    }
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, isSanctuaires && styles.tealBtn]}
          onPress={handleValidate}
          activeOpacity={0.85}
        >
          {isSanctuaires && <MaterialCommunityIcons name="trophy" size={22} color="#fff" />}
          <Text style={styles.actionBtnText}>
            {isSanctuaires ? 'Terminer la partie' : 'Valider'}
          </Text>
          {!isSanctuaires && <MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  progressBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20, borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: GREEN, borderRadius: 2 },

  scrollContent: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },

  leaderboard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, gap: 10,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaderRank: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.3)', width: 24 },
  miniAvatar: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  miniAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  leaderScore: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  leaderScoreFirst: { color: '#f39c12' },

  inputCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GREEN_DARK, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  inputCardName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  renownInput: {
    width: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  inputUnit: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)', width: 24 },

  tiebreakerSection: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tiebreakerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiebreakerTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  tiebreakerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 18 },
  tiebreakerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tiebreakerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  tiebreakerInput: {
    width: 64, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  footer: { padding: 16, paddingBottom: 28 },
  actionBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: GREEN_DARK, borderRadius: 16, padding: 18,
  },
  tealBtn: { backgroundColor: '#1abc9c' },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
