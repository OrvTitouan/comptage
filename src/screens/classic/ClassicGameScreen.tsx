import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, PlayerScore } from '../../types';

interface ClassicGameScreenProps {
  players: Player[];
  gameName: string;
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

const INCREMENTS = [1, 5, 10, 25, 50];
const GAME_COLOR = '#546e7a';
const PODIUM_COLORS = ['#f39c12', '#bdc3c7', '#cd6133'];
const PODIUM_ICONS: Array<'trophy' | 'medal' | 'medal-outline'> = ['trophy', 'medal', 'medal-outline'];

export default function ClassicGameScreen({ players, gameName, onEnd, onGoHome, onMeta }: ClassicGameScreenProps) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  // Valeurs texte en cours de frappe (peuvent être vides ou partielles)
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.id, '0']))
  );
  const [increment, setIncrement] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────

  const applyScore = (playerId: string, newScore: number) => {
    setScores((prev) => {
      const next = { ...prev, [playerId]: newScore };
      const playerScores: PlayerScore[] = players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        score: next[p.id] ?? 0,
      }));
      onMeta(playerScores);
      return next;
    });
    setDrafts((prev) => ({ ...prev, [playerId]: String(newScore) }));
  };

  const changeScore = (playerId: string, delta: number) => {
    const next = (scores[playerId] ?? 0) + delta;
    applyScore(playerId, next);
  };

  const handleDraftChange = (playerId: string, text: string) => {
    // Autoriser chiffres et signe moins en début
    if (/^-?\d*$/.test(text)) {
      setDrafts((prev) => ({ ...prev, [playerId]: text }));
    }
  };

  const handleDraftBlur = (playerId: string) => {
    const parsed = parseInt(drafts[playerId] ?? '0', 10);
    const value = isNaN(parsed) ? 0 : parsed;
    applyScore(playerId, value);
  };

  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  const handleEndGame = () => {
    const playerScores: PlayerScore[] = players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: scores[p.id] ?? 0,
    }));
    onMeta(playerScores);
    setWinner(sorted[0]);
    setGameOver(true);
  };

  const confirmEnd = () => {
    Alert.alert(
      'Terminer la partie ?',
      'Le joueur avec le score le plus élevé gagne.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', onPress: handleEndGame },
      ]
    );
  };

  // ── Game over ────────────────────────────────────────────────────

  if (gameOver && winner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{gameName}</Text>
        </View>

        <View style={styles.winnerSection}>
          <View style={styles.winnerCrown}>
            <MaterialCommunityIcons name="crown" size={48} color="#f39c12" />
          </View>
          <Text style={styles.winnerLabel}>Vainqueur</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <Text style={styles.winnerScore}>{scores[winner.id] ?? 0} pts</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Classement final</Text>
          {sorted.map((player, idx) => {
            const score = scores[player.id] ?? 0;
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
                <Text style={[styles.resultScore, isWinner && { color: '#f39c12' }]}>{score}</Text>
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

  // ── Game screen ──────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{gameName || 'Compteur'}</Text>
        <TouchableOpacity onPress={onGoHome} style={styles.homeBtn}>
          <MaterialCommunityIcons name="home-outline" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Sélecteur d'incrément */}
      <View style={styles.incrementRow}>
        <Text style={styles.incrementLabel}>Valeur</Text>
        <View style={styles.incrementBtns}>
          {INCREMENTS.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.incrementBtn, increment === v && styles.incrementBtnActive]}
              onPress={() => setIncrement(v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.incrementBtnText, increment === v && styles.incrementBtnTextActive]}>
                +{v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste des joueurs */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {sorted.map((player, idx) => {
          const score = scores[player.id] ?? 0;
          const isLeader = idx === 0 && score > 0;

          return (
            <View key={player.id} style={styles.playerCard}>
              {/* Avatar + nom */}
              <View style={styles.playerLeft}>
                <View style={[styles.avatar, isLeader && styles.avatarLeader]}>
                  <Text style={styles.avatarText}>
                    {player.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {isLeader && (
                    <View style={styles.leaderBadge}>
                      <MaterialCommunityIcons name="crown" size={11} color="#f39c12" />
                      <Text style={styles.leaderText}>Leader</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Score + contrôles */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() => changeScore(player.id, -increment)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="minus" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <TextInput
                  style={styles.scoreInput}
                  value={drafts[player.id] ?? '0'}
                  onChangeText={(t) => handleDraftChange(player.id, t)}
                  onBlur={() => handleDraftBlur(player.id)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[styles.plusBtn, { backgroundColor: GAME_COLOR }]}
                  onPress={() => changeScore(player.id, increment)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>

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
    paddingBottom: 12,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
    maxWidth: '75%',
    textAlign: 'center',
  },
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

  // Incrément
  incrementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  incrementLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  incrementBtns: { flexDirection: 'row', gap: 8, flex: 1 },
  incrementBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  incrementBtnActive: { backgroundColor: GAME_COLOR },
  incrementBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  incrementBtnTextActive: { color: '#fff' },

  // Joueurs
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLeader: { backgroundColor: '#f39c12' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  playerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  leaderText: { fontSize: 11, fontWeight: '700', color: '#f39c12' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  minusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    minWidth: 64,
    textAlign: 'center',
    padding: 0,
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  resultScore: { fontSize: 24, fontWeight: '900', color: '#fff' },

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
