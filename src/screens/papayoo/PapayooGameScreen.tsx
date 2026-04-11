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
import { Player, PapayooRound, PapayooRoundScore, GameResult, PlayerScore } from '../../types';
import PapayooRoundScreen from './PapayooRoundScreen';
import { saveResult } from '../../storage/stats';

interface PapayooGameScreenProps {
  players: Player[];
  totalRounds: number;
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

function getTotalScore(playerId: string, rounds: PapayooRound[]): number {
  return rounds.reduce((sum, round) => {
    const score = round.scores.find((s) => s.playerId === playerId);
    if (!score) return sum;
    return sum + score.payooPoints + (score.hasPapayoo ? 40 : 0);
  }, 0);
}

export default function PapayooGameScreen({ players, totalRounds, onEnd, onGoHome, onMeta }: PapayooGameScreenProps) {
  const [rounds, setRounds] = useState<PapayooRound[]>([]);
  const [enteringRound, setEnteringRound] = useState(false);

  const currentRound = rounds.length + 1;
  const isFinished = rounds.length >= totalRounds;

  const handleValidateRound = (scores: PapayooRoundScore[]) => {
    const newRound: PapayooRound = { roundNumber: currentRound, scores };
    const updatedRounds = [...rounds, newRound];
    setRounds(updatedRounds);
    setEnteringRound(false);
    // Mettre à jour les scores pour l'accueil et les stats (Papayoo : score bas = bon)
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getTotalScore(p.id, updatedRounds) })));
  };

  const handleUndoRound = () => {
    const updatedRounds = rounds.slice(0, -1);
    setRounds(updatedRounds);
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getTotalScore(p.id, updatedRounds) })));
  };

  const handleEndGame = () => {
    const sorted = [...players].sort(
      (a, b) => getTotalScore(a.id, rounds) - getTotalScore(b.id, rounds)
    );
    const winner = sorted[0];
    const minScore = getTotalScore(winner.id, rounds);

    const result: GameResult = {
      id: Date.now().toString(),
      gameId: 'papayoo',
      gameName: 'Papayoo',
      date: new Date().toISOString(),
      rounds: rounds.length,
      playerResults: players.map((p) => {
        const score = getTotalScore(p.id, rounds);
        return { playerId: p.id, playerName: p.name, score, winner: score === minScore };
      }),
    };
    saveResult(result);

    Alert.alert(
      '🏆 Fin de partie !',
      `${winner.name} remporte la partie avec ${minScore} points !`,
      [
        { text: 'Rejouer', onPress: onEnd },
        { text: 'Accueil', onPress: onEnd },
      ]
    );
  };

  if (enteringRound) {
    return (
      <PapayooRoundScreen
        roundNumber={currentRound}
        totalRounds={totalRounds}
        players={players}
        onValidate={handleValidateRound}
        onBack={() => setEnteringRound(false)}
      />
    );
  }

  // Classement trié par score croissant
  const sortedPlayers = [...players].sort(
    (a, b) => getTotalScore(a.id, rounds) - getTotalScore(b.id, rounds)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Papayoo</Text>
          <Text style={styles.subtitle}>
            {isFinished ? 'Partie terminée' : `Manche ${currentRound} / ${totalRounds}`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Classement */}
        <Text style={styles.sectionLabel}>Classement</Text>
        {sortedPlayers.map((player, index) => {
          const total = getTotalScore(player.id, rounds);
          const isFirst = index === 0;
          return (
            <View key={player.id} style={[styles.playerRow, isFirst && rounds.length > 0 && styles.playerRowFirst]}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{player.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={[styles.score, isFirst && rounds.length > 0 && styles.scoreFirst]}>
                {total} pts
              </Text>
            </View>
          );
        })}

        {/* Historique des manches */}
        {rounds.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Détail des manches</Text>
            <View style={styles.historyTable}>
              {/* En-tête */}
              <View style={styles.historyRow}>
                <Text style={[styles.historyCell, styles.historyCellHeader, styles.historyCellManche]}>
                  M.
                </Text>
                {players.map((p) => (
                  <Text key={p.id} style={[styles.historyCell, styles.historyCellHeader]} numberOfLines={1}>
                    {p.name.split(' ')[0]}
                  </Text>
                ))}
              </View>
              {/* Manches */}
              {rounds.map((round) => (
                <View key={round.roundNumber} style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.historyCellManche]}>
                    {round.roundNumber}
                  </Text>
                  {players.map((p) => {
                    const s = round.scores.find((sc) => sc.playerId === p.id);
                    const pts = s ? s.payooPoints + (s.hasPapayoo ? 40 : 0) : 0;
                    return (
                      <Text key={p.id} style={[styles.historyCell, s?.hasPapayoo && styles.historyCellPapayoo]}>
                        {pts}{s?.hasPapayoo ? '🃏' : ''}
                      </Text>
                    );
                  })}
                </View>
              ))}
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
        {isFinished ? (
          <TouchableOpacity style={styles.endButton} onPress={handleEndGame} activeOpacity={0.85}>
            <Text style={styles.endButtonText}>Voir le gagnant</Text>
            <MaterialCommunityIcons name="trophy" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={() => setEnteringRound(true)} activeOpacity={0.85}>
            <Text style={styles.nextButtonText}>
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
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  playerRowFirst: {
    backgroundColor: 'rgba(243,156,18,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.4)',
  },
  rank: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    width: 28,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  score: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  scoreFirst: {
    color: '#f39c12',
  },
  historyTable: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  historyCellHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyCellManche: {
    flex: 0.5,
    color: 'rgba(255,255,255,0.4)',
  },
  historyCellPapayoo: {
    color: '#e74c3c',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    gap: 10,
  },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  undoBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f39c12',
    borderRadius: 16,
    padding: 18,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  endButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#27ae60',
    borderRadius: 16,
    padding: 18,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
