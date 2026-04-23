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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, Flip7Round, Flip7RoundScore, calcFlip7Score, FLIP7_WIN_SCORE, GameResult, PlayerScore } from '../../types';
import Flip7RoundScreen from './Flip7RoundScreen';
import PlayerAvatar from '../../components/PlayerAvatar';
import { saveResult } from '../../storage/stats';

interface Flip7GameScreenProps {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

function getTotalScore(playerId: string, rounds: Flip7Round[]): number {
  return rounds.reduce((sum, round) => {
    const s = round.scores.find((sc) => sc.playerId === playerId);
    return sum + (s ? calcFlip7Score(s) : 0);
  }, 0);
}

export default function Flip7GameScreen({ players, onEnd, onGoHome, onMeta }: Flip7GameScreenProps) {
  const [rounds, setRounds] = useState<Flip7Round[]>([]);
  const [enteringRound, setEnteringRound] = useState(false);

  const currentRound = rounds.length + 1;

  const handleValidateRound = (scores: Flip7RoundScore[]) => {
    const newRound: Flip7Round = { roundNumber: currentRound, scores };
    const updatedRounds = [...rounds, newRound];
    setRounds(updatedRounds);
    setEnteringRound(false);
    // Mettre à jour les scores pour l'accueil et les stats
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getTotalScore(p.id, updatedRounds) })));

    // Vérifier si un joueur a atteint 200 pts
    const winner = players.find(
      (p) => getTotalScore(p.id, updatedRounds) >= FLIP7_WIN_SCORE
    );
    if (winner) {
      const finalScore = getTotalScore(winner.id, updatedRounds);

      const result: GameResult = {
        id: Date.now().toString(),
        gameId: 'flip7',
        gameName: 'Flip 7',
        date: new Date().toISOString(),
        rounds: updatedRounds.length,
        playerResults: players.map((p) => ({
          playerId: p.id,
          playerName: p.name,
          score: getTotalScore(p.id, updatedRounds),
          winner: p.id === winner.id,
        })),
      };
      saveResult(result);

      setTimeout(() => {
        Alert.alert(
          '🏆 Fin de partie !',
          `${winner.name} remporte la partie avec ${finalScore} points !`,
          [
            { text: 'Rejouer', onPress: onEnd },
            { text: 'Accueil', onPress: onEnd },
          ]
        );
      }, 300);
    }
  };

  const handleUndoRound = () => {
    const updatedRounds = rounds.slice(0, -1);
    setRounds(updatedRounds);
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getTotalScore(p.id, updatedRounds) })));
  };

  if (enteringRound) {
    return (
      <Flip7RoundScreen
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Flip 7</Text>
          <Text style={styles.subtitle}>Manche {currentRound} · Premier à {FLIP7_WIN_SCORE} pts</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Classement */}
        <Text style={styles.sectionLabel}>Classement</Text>
        {sortedPlayers.map((player, index) => {
          const total = getTotalScore(player.id, rounds);
          const isFirst = index === 0 && rounds.length > 0;
          const progress = Math.min((total / FLIP7_WIN_SCORE) * 100, 100);
          return (
            <View key={player.id} style={[styles.playerRow, isFirst && styles.playerRowFirst]}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <PlayerAvatar name={player.name} photoUri={player.photoUri} size={42} color="#e74c3c" />
              <View style={styles.playerInfo}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={[styles.score, isFirst && styles.scoreFirst]}>
                    {total} pts
                  </Text>
                </View>
                {/* Barre de progression vers 200 */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` as any }, isFirst && styles.progressFillFirst]} />
                </View>
                <Text style={styles.progressLabel}>{FLIP7_WIN_SCORE - total} pts restants</Text>
              </View>
            </View>
          );
        })}

        {/* Historique */}
        {rounds.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Détail des manches</Text>
            <View style={styles.historyTable}>
              <View style={styles.historyRow}>
                <Text style={[styles.historyCell, styles.historyCellHeader, styles.historyCellManche]}>M.</Text>
                {players.map((p) => (
                  <Text key={p.id} style={[styles.historyCell, styles.historyCellHeader]} numberOfLines={1}>
                    {p.name.split(' ')[0]}
                  </Text>
                ))}
              </View>
              {rounds.map((round) => (
                <View key={round.roundNumber} style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.historyCellManche]}>{round.roundNumber}</Text>
                  {players.map((p) => {
                    const s = round.scores.find((sc) => sc.playerId === p.id);
                    const pts = s ? calcFlip7Score(s) : 0;
                    const busted = s?.busted;
                    const flip7 = s?.hasFlip7;
                    return (
                      <Text
                        key={p.id}
                        style={[
                          styles.historyCell,
                          busted && styles.historyCellBusted,
                          flip7 && styles.historyCellFlip7,
                        ]}
                      >
                        {busted ? '💥' : `${pts}${flip7 ? '🎯' : ''}`}
                      </Text>
                    );
                  })}
                </View>
              ))}
              {/* Total */}
              <View style={[styles.historyRow, styles.historyTotalRow]}>
                <Text style={[styles.historyCell, styles.historyCellManche, styles.historyCellTotal]}>∑</Text>
                {players.map((p) => (
                  <Text key={p.id} style={[styles.historyCell, styles.historyCellTotal]}>
                    {getTotalScore(p.id, rounds)}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {rounds.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndoRound} activeOpacity={0.8}>
            <MaterialCommunityIcons name="undo" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.undoBtnText}>Corriger la manche {rounds.length}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={() => setEnteringRound(true)} activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>
            {rounds.length === 0 ? 'Commencer la manche 1' : `Saisir manche ${currentRound}`}
          </Text>
          <MaterialCommunityIcons name="pencil" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, marginTop: 8,
  },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
  },
  playerRowFirst: {
    backgroundColor: 'rgba(231,76,60,0.12)',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.35)',
  },
  rank: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#e74c3c',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  playerInfo: { flex: 1, gap: 6 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  score: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scoreFirst: { color: '#e74c3c' },
  progressBar: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3,
  },
  progressFillFirst: { backgroundColor: '#e74c3c' },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  historyTable: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyTotalRow: { backgroundColor: 'rgba(255,255,255,0.05)' },
  historyCell: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    fontSize: 14, color: '#fff', textAlign: 'center', fontWeight: '600',
  },
  historyCellHeader: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    fontWeight: '700', textTransform: 'uppercase',
  },
  historyCellManche: { flex: 0.5, color: 'rgba(255,255,255,0.4)' },
  historyCellBusted: { color: '#e74c3c' },
  historyCellFlip7: { color: '#f39c12' },
  historyCellTotal: { fontWeight: '800', color: '#fff' },
  footer: { padding: 20, paddingBottom: 32, gap: 10 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  undoBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  nextButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: '#e74c3c', borderRadius: 16, padding: 18,
  },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
