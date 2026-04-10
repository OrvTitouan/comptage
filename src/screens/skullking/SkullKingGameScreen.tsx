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
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Player,
  SkullKingRound,
  SkullKingRoundScore,
  GameResult,
  PlayerResult,
  calcSkullKingRoundScore,
} from '../../types';
import { saveResult } from '../../storage/stats';
import SkullKingRoundScreen from './SkullKingRoundScreen';

const TOTAL_ROUNDS = 10;
const BLUE = '#2980b9';
const BLUE_DARK = '#1a5276';

interface Props {
  players: Player[];
  onEnd: () => void;
}

function getTotalScore(playerId: string, rounds: SkullKingRound[]): number {
  return rounds.reduce((sum, round) => {
    const score = round.scores.find((s) => s.playerId === playerId);
    if (!score) return sum;
    return sum + calcSkullKingRoundScore(score, round.roundNumber);
  }, 0);
}

function getRoundScore(playerId: string, round: SkullKingRound): number {
  const score = round.scores.find((s) => s.playerId === playerId);
  if (!score) return 0;
  return calcSkullKingRoundScore(score, round.roundNumber);
}

export default function SkullKingGameScreen({ players, onEnd }: Props) {
  const [rounds, setRounds] = useState<SkullKingRound[]>([]);
  const [enteringRound, setEnteringRound] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string; total: number } | null>(null);

  const currentRound = rounds.length + 1;
  const isFinished = rounds.length >= TOTAL_ROUNDS;

  const handleValidateRound = (scores: SkullKingRoundScore[]) => {
    setRounds((prev) => [...prev, { roundNumber: currentRound, scores }]);
    setEnteringRound(false);
  };

  const handleEndGame = async () => {
    const withTotals = players.map((p) => ({
      player: p,
      total: getTotalScore(p.id, rounds),
    }));
    withTotals.sort((a, b) => b.total - a.total);
    const top = withTotals[0];

    const playerResults: PlayerResult[] = withTotals.map((x) => ({
      playerId: x.player.id,
      playerName: x.player.name,
      score: x.total,
      winner: x.total === top.total,
    }));

    const result: GameResult = {
      id: Date.now().toString(),
      gameId: 'skull-king',
      gameName: 'Skull King',
      date: new Date().toISOString(),
      rounds: TOTAL_ROUNDS,
      playerResults,
    };

    try { await saveResult(result); } catch {}
    setWinnerInfo({ name: top.player.name, total: top.total });
  };

  const confirmQuit = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Quitter ? La partie sera abandonnée et non sauvegardée.')) onEnd();
    } else {
      Alert.alert('Quitter ?', 'La partie sera abandonnée et non sauvegardée.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: onEnd },
      ]);
    }
  };

  // Écran de victoire (remplace l'Alert, fonctionne sur web et mobile)
  if (winnerInfo) {
    const finalRanking = [...players].sort(
      (a, b) => getTotalScore(b.id, rounds) - getTotalScore(a.id, rounds)
    );
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <ScrollView contentContainerStyle={styles.winnerContent}>
          <Text style={styles.winnerEmoji}>🏴‍☠️</Text>
          <Text style={styles.winnerTitle}>Fin de partie !</Text>
          <Text style={styles.winnerSub}>
            {winnerInfo.name} remporte la victoire avec {winnerInfo.total > 0 ? '+' : ''}{winnerInfo.total} pts
          </Text>
          <View style={styles.winnerRanking}>
            {finalRanking.map((p, i) => {
              const total = getTotalScore(p.id, rounds);
              return (
                <View key={p.id} style={[styles.winnerRow, i === 0 && styles.winnerRowFirst]}>
                  <Text style={styles.winnerRank}>#{i + 1}</Text>
                  <View style={[styles.winnerAvatar, i === 0 && styles.winnerAvatarFirst]}>
                    <Text style={styles.avatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.winnerName}>{p.name}</Text>
                  <Text style={[styles.winnerScore, total < 0 && styles.scoreNeg]}>
                    {total > 0 ? '+' : ''}{total} pts
                  </Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.homeButton} onPress={onEnd} activeOpacity={0.85}>
            <MaterialCommunityIcons name="home" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (enteringRound) {
    return (
      <SkullKingRoundScreen
        roundNumber={currentRound}
        players={players}
        onValidate={handleValidateRound}
        onBack={() => setEnteringRound(false)}
      />
    );
  }

  const sortedPlayers = [...players].sort(
    (a, b) => getTotalScore(b.id, rounds) - getTotalScore(a.id, rounds)
  );

  const progress = (rounds.length / TOTAL_ROUNDS) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={confirmQuit} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Skull King</Text>
          <Text style={styles.subtitle}>
            {isFinished ? 'Partie terminée' : `Manche ${currentRound} / ${TOTAL_ROUNDS}`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Classement */}
        <Text style={styles.sectionLabel}>Classement</Text>
        {sortedPlayers.map((player, index) => {
          const total = getTotalScore(player.id, rounds);
          const isFirst = index === 0 && rounds.length > 0;
          return (
            <View key={player.id} style={[styles.playerRow, isFirst && styles.playerRowFirst]}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={[styles.avatar, isFirst && styles.avatarFirst]}>
                <Text style={styles.avatarText}>{player.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={[styles.score, isFirst && styles.scoreFirst, total < 0 && styles.scoreNeg]}>
                {total > 0 ? '+' : ''}{total} pts
              </Text>
            </View>
          );
        })}

        {/* Historique des manches */}
        {rounds.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Détail des manches</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.historyTable}>
                {/* En-tête */}
                <View style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.historyCellHeader, styles.historyCellRound]}>M.</Text>
                  {players.map((p) => (
                    <Text key={p.id} style={[styles.historyCell, styles.historyCellHeader]} numberOfLines={1}>
                      {p.name.split(' ')[0]}
                    </Text>
                  ))}
                </View>
                {/* Manches */}
                {rounds.map((round) => (
                  <View key={round.roundNumber} style={styles.historyRow}>
                    <Text style={[styles.historyCell, styles.historyCellRound, styles.historyCellMuted]}>
                      {round.roundNumber}
                    </Text>
                    {players.map((p) => {
                      const pts = getRoundScore(p.id, round);
                      return (
                        <Text
                          key={p.id}
                          style={[
                            styles.historyCell,
                            pts > 0 && styles.historyCellPos,
                            pts < 0 && styles.historyCellNeg,
                          ]}
                        >
                          {pts > 0 ? '+' : ''}{pts}
                        </Text>
                      );
                    })}
                  </View>
                ))}
                {/* Totaux */}
                <View style={[styles.historyRow, styles.historyRowTotal]}>
                  <Text style={[styles.historyCell, styles.historyCellRound, styles.historyCellHeader]}>Tot.</Text>
                  {players.map((p) => {
                    const total = getTotalScore(p.id, rounds);
                    return (
                      <Text
                        key={p.id}
                        style={[
                          styles.historyCell,
                          styles.historyCellBold,
                          total > 0 && styles.historyCellPos,
                          total < 0 && styles.historyCellNeg,
                        ]}
                      >
                        {total > 0 ? '+' : ''}{total}
                      </Text>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Légende */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
                <Text style={styles.legendText}>Pari réussi</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
                <Text style={styles.legendText}>Pari raté</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isFinished ? (
          <TouchableOpacity style={styles.endButton} onPress={handleEndGame} activeOpacity={0.85}>
            <MaterialCommunityIcons name="trophy" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Voir le gagnant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={() => setEnteringRound(true)} activeOpacity={0.85}>
            <Text style={styles.actionBtnText}>
              {rounds.length === 0 ? 'Commencer la manche 1' : `Saisir manche ${currentRound}`}
            </Text>
            <MaterialCommunityIcons name="pencil" size={22} color="#fff" />
          </TouchableOpacity>
        )}
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
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  progressBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20, borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: BLUE, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 16,
  },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
  },
  playerRowFirst: {
    backgroundColor: 'rgba(41,128,185,0.15)',
    borderWidth: 1, borderColor: 'rgba(41,128,185,0.4)',
  },
  rank: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarFirst: { backgroundColor: BLUE },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  score: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scoreFirst: { color: BLUE },
  scoreNeg: { color: '#e74c3c' },
  historyTable: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyRowTotal: { backgroundColor: 'rgba(255,255,255,0.04)' },
  historyCell: {
    width: 64, paddingVertical: 10, paddingHorizontal: 6,
    fontSize: 13, color: '#fff', textAlign: 'center', fontWeight: '600',
  },
  historyCellHeader: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
  },
  historyCellRound: { width: 36, color: 'rgba(255,255,255,0.4)' },
  historyCellMuted: { color: 'rgba(255,255,255,0.3)' },
  historyCellPos: { color: '#2ecc71' },
  historyCellNeg: { color: '#e74c3c' },
  historyCellBold: { fontWeight: '800', fontSize: 14 },
  legend: {
    flexDirection: 'row', gap: 16, marginTop: 8, paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  winnerContent: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  winnerEmoji: { fontSize: 72 },
  winnerTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
  winnerSub: {
    fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22,
  },
  winnerRanking: { width: '100%', gap: 8, marginTop: 8 },
  winnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14,
  },
  winnerRowFirst: {
    backgroundColor: 'rgba(41,128,185,0.2)', borderWidth: 1, borderColor: 'rgba(41,128,185,0.5)',
  },
  winnerRank: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  winnerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  winnerAvatarFirst: { backgroundColor: BLUE },
  winnerName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  winnerScore: { fontSize: 18, fontWeight: '800', color: '#fff' },
  homeButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: BLUE_DARK, borderRadius: 16, padding: 18,
    width: '100%', marginTop: 8,
  },
  footer: { padding: 16, paddingBottom: 28 },
  nextButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: BLUE, borderRadius: 16, padding: 18,
  },
  endButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: '#27ae60', borderRadius: 16, padding: 18,
  },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
