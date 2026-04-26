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
import { Player, PlayerScore, Team } from '../../types';
import PlayerAvatar from '../../components/PlayerAvatar';
import { confirmAlert } from '../../utils/confirm';

interface ClassicGameScreenProps {
  players: Player[];
  gameName: string;
  teams?: Team[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

const INCREMENTS = [1, 5, 10, 25, 50];
const GAME_COLOR = '#546e7a';
const TEAM_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
const PODIUM_COLORS = ['#f39c12', '#bdc3c7', '#cd6133'];
const PODIUM_ICONS: Array<'trophy' | 'medal' | 'medal-outline'> = ['trophy', 'medal', 'medal-outline'];

export default function ClassicGameScreen({ players, gameName, teams, onEnd, onGoHome, onMeta }: ClassicGameScreenProps) {
  // Keys are teamId (teams mode) or playerId (individual mode)
  const entityIds = teams ? teams.map((t) => t.id) : players.map((p) => p.id);

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(entityIds.map((id) => [id, 0]))
  );
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(entityIds.map((id) => [id, '0']))
  );
  const [increment, setIncrement] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // ── Emit meta ────────────────────────────────────────────────────

  const emitMeta = (s: Record<string, number>) => {
    if (teams) {
      const ps: PlayerScore[] = players.map((p) => {
        const team = teams.find((t) => t.memberIds.includes(p.id));
        return { playerId: p.id, playerName: p.name, score: team ? (s[team.id] ?? 0) : 0 };
      });
      onMeta(ps);
    } else {
      onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: s[p.id] ?? 0 })));
    }
  };

  // ── Score helpers ────────────────────────────────────────────────

  const applyScore = (id: string, newScore: number) => {
    setScores((prev) => {
      const next = { ...prev, [id]: newScore };
      emitMeta(next);
      return next;
    });
    setDrafts((prev) => ({ ...prev, [id]: String(newScore) }));
  };

  const changeScore = (id: string, delta: number) => applyScore(id, (scores[id] ?? 0) + delta);

  const handleDraftChange = (id: string, text: string) => {
    if (/^-?\d*$/.test(text)) setDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleDraftBlur = (id: string) => {
    const parsed = parseInt(drafts[id] ?? '0', 10);
    applyScore(id, isNaN(parsed) ? 0 : parsed);
  };

  // ── Sorted entities ──────────────────────────────────────────────

  const sortedIds = [...entityIds].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  const getLabel = (id: string) => {
    if (teams) return teams.find((t) => t.id === id)?.name ?? id;
    return players.find((p) => p.id === id)?.name ?? id;
  };

  const getMembers = (id: string): string => {
    if (!teams) return '';
    const team = teams.find((t) => t.id === id);
    if (!team) return '';
    return team.memberIds
      .map((mid) => players.find((p) => p.id === mid)?.name ?? '')
      .filter(Boolean)
      .join(', ');
  };

  const getTeamColor = (id: string) => {
    if (!teams) return GAME_COLOR;
    const idx = teams.findIndex((t) => t.id === id);
    return TEAM_COLORS[idx % TEAM_COLORS.length];
  };

  // ── End game ─────────────────────────────────────────────────────

  const handleEndGame = () => {
    emitMeta(scores);
    setWinnerId(sortedIds[0]);
    setGameOver(true);
  };

  const confirmEnd = () => {
    const msg = teams ? "L'équipe avec le score le plus élevé gagne." : 'Le joueur avec le score le plus élevé gagne.';
    confirmAlert('Terminer la partie ?', msg, handleEndGame, 'Terminer');
  };

  // ── Game over ────────────────────────────────────────────────────

  if (gameOver && winnerId !== null) {
    const winnerLabel = getLabel(winnerId);
    const winnerScore = scores[winnerId] ?? 0;
    const winnerMembers = getMembers(winnerId);

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
          <Text style={styles.winnerLabel}>{teams ? 'Équipe gagnante' : 'Vainqueur'}</Text>
          <Text style={styles.winnerName}>{winnerLabel}</Text>
          {winnerMembers ? <Text style={styles.winnerMembers}>{winnerMembers}</Text> : null}
          <Text style={styles.winnerScore}>{winnerScore} pts</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Classement final</Text>
          {sortedIds.map((id, idx) => {
            const score = scores[id] ?? 0;
            const isWinner = id === winnerId;
            const podiumColor = PODIUM_COLORS[idx] ?? 'rgba(255,255,255,0.3)';
            const members = getMembers(id);
            return (
              <View key={id} style={[styles.resultRow, isWinner && styles.resultRowWinner]}>
                <View style={[styles.rankBadge, { backgroundColor: podiumColor + '22' }]}>
                  <MaterialCommunityIcons name={PODIUM_ICONS[idx] ?? 'numeric'} size={20} color={podiumColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{getLabel(id)}</Text>
                  {members ? <Text style={styles.resultMembers}>{members}</Text> : null}
                </View>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {sortedIds.map((id, idx) => {
            const score = scores[id] ?? 0;
            const isLeader = idx === 0 && score > 0;
            const color = getTeamColor(id);
            const members = getMembers(id);

            return (
              <View key={id} style={[styles.playerCard, teams && { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={styles.playerLeft}>
                  <PlayerAvatar
                    name={getLabel(id)}
                    photoUri={!teams ? players.find(p => p.id === id)?.photoUri : undefined}
                    size={50}
                    color={color}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName} numberOfLines={1}>{getLabel(id)}</Text>
                    {members ? (
                      <Text style={styles.memberNames} numberOfLines={1}>{members}</Text>
                    ) : null}
                    {isLeader && (
                      <View style={styles.leaderBadge}>
                        <MaterialCommunityIcons name="crown" size={11} color="#f39c12" />
                        <Text style={styles.leaderText}>Leader</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.controls}>
                  <TouchableOpacity
                    style={styles.minusBtn}
                    onPress={() => changeScore(id, -increment)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.scoreInput}
                    value={drafts[id] ?? '0'}
                    onChangeText={(t) => handleDraftChange(id, t)}
                    onBlur={() => handleDraftBlur(id)}
                    keyboardType="numeric"
                    selectTextOnFocus
                    returnKeyType="done"
                  />

                  <TouchableOpacity
                    style={[styles.plusBtn, { backgroundColor: color }]}
                    onPress={() => changeScore(id, increment)}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, position: 'relative',
  },
  headerTitle: {
    fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 0.3,
    maxWidth: '75%', textAlign: 'center',
  },
  homeBtn: {
    position: 'absolute', right: 20, top: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },

  incrementRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12,
  },
  incrementLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  incrementBtns: { flexDirection: 'row', gap: 8, flex: 1 },
  incrementBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  incrementBtnActive: { backgroundColor: GAME_COLOR },
  incrementBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  incrementBtnTextActive: { color: '#fff' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  playerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 16, marginBottom: 12,
    overflow: 'hidden',
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: GAME_COLOR, justifyContent: 'center', alignItems: 'center',
  },
  avatarLeader: { borderWidth: 2, borderColor: '#f39c12' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  playerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberNames: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  leaderText: { fontSize: 11, fontWeight: '700', color: '#f39c12' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  minusBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center',
  },
  scoreInput: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    minWidth: 64, textAlign: 'center', padding: 0,
  },
  plusBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  footer: { padding: 20, paddingBottom: 32 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2ecc71', borderRadius: 16, padding: 18,
  },
  endBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Game over
  winnerSection: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  winnerCrown: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(243,156,18,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  winnerLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  winnerName: { fontSize: 32, fontWeight: '900', color: '#fff' },
  winnerMembers: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  winnerScore: { fontSize: 15, color: '#f39c12', fontWeight: '700', marginTop: 4 },

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
  resultName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resultMembers: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  resultScore: { fontSize: 24, fontWeight: '900', color: '#fff' },
  endButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2ecc71', borderRadius: 16, padding: 18, marginTop: 16,
  },
  endButtonText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
