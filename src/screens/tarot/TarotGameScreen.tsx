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
import {
  Player,
  TarotDonne,
  TarotDonneScore,
  TarotContract,
  GameResult,
  PlayerResult,
  PlayerScore,
  calcTarotDonne,
} from '../../types';
import { saveResult } from '../../storage/stats';
import TarotDonneScreen from './TarotDonneScreen';
import PlayerAvatar from '../../components/PlayerAvatar';

const RED = '#c0392b';
const RED_DARK = '#922b21';

const CONTRACT_LABELS: Record<TarotContract, string> = {
  prise: 'Prise',
  garde: 'Garde',
  'garde-sans': 'G. Sans',
  'garde-contre': 'G. Contre',
};

interface Props {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

function getRunningTotal(playerId: string, donnes: TarotDonne[], playerIds: string[]): number {
  return donnes.reduce((sum, d) => {
    const scores = calcTarotDonne(d.score, playerIds);
    return sum + (scores[playerId] ?? 0);
  }, 0);
}

export default function TarotGameScreen({ players, onEnd, onGoHome, onMeta }: Props) {
  const [donnes, setDonnes] = useState<TarotDonne[]>([]);
  const [enteringDonne, setEnteringDonne] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string; total: number } | null>(null);

  const playerIds = players.map((p) => p.id);
  const currentDonne = donnes.length + 1;

  const handleValidateDonne = (score: TarotDonneScore) => {
    const newDonne: TarotDonne = { donneNumber: currentDonne, score };
    const updatedDonnes = [...donnes, newDonne];
    setDonnes(updatedDonnes);
    setEnteringDonne(false);

    // Mettre à jour les scores pour l'accueil et les stats
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getRunningTotal(p.id, updatedDonnes, playerIds) })));
  };

  const handleUndoDonne = () => {
    const updatedDonnes = donnes.slice(0, -1);
    setDonnes(updatedDonnes);
    onMeta(players.map((p) => ({ playerId: p.id, playerName: p.name, score: getRunningTotal(p.id, updatedDonnes, playerIds) })));
  };

  const handleEndGame = async () => {
    const withTotals = players.map((p) => ({
      player: p,
      total: getRunningTotal(p.id, donnes, playerIds),
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
      gameId: 'tarot',
      gameName: 'Tarot',
      date: new Date().toISOString(),
      rounds: donnes.length,
      playerResults,
    };

    try { await saveResult(result); } catch {}
    setWinnerInfo({ name: top.player.name, total: top.total });
  };

  // Écran de victoire
  if (winnerInfo) {
    const finalRanking = [...players].sort(
      (a, b) => getRunningTotal(b.id, donnes, playerIds) - getRunningTotal(a.id, donnes, playerIds)
    );
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <ScrollView contentContainerStyle={styles.winnerContent}>
          <Text style={styles.winnerEmoji}>🃏</Text>
          <Text style={styles.winnerTitle}>Fin de partie !</Text>
          <Text style={styles.winnerSub}>
            {winnerInfo.name} remporte la victoire avec {winnerInfo.total > 0 ? '+' : ''}{winnerInfo.total} pts
          </Text>
          <View style={styles.winnerRanking}>
            {finalRanking.map((p, i) => {
              const total = getRunningTotal(p.id, donnes, playerIds);
              return (
                <View key={p.id} style={[styles.winnerRow, i === 0 && styles.winnerRowFirst]}>
                  <Text style={styles.winnerRank}>#{i + 1}</Text>
                  <PlayerAvatar name={p.name} photoUri={p.photoUri} size={40} color={i === 0 ? RED : 'rgba(255,255,255,0.15)'} />
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

  if (enteringDonne) {
    return (
      <TarotDonneScreen
        donneNumber={currentDonne}
        players={players}
        onValidate={handleValidateDonne}
        onBack={() => setEnteringDonne(false)}
      />
    );
  }

  const sortedPlayers = [...players].sort(
    (a, b) => getRunningTotal(b.id, donnes, playerIds) - getRunningTotal(a.id, donnes, playerIds)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Tarot</Text>
          <Text style={styles.subtitle}>
            {donnes.length === 0
              ? 'Aucune donne jouée'
              : `${donnes.length} donne${donnes.length > 1 ? 's' : ''} jouée${donnes.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Classement */}
        <Text style={styles.sectionLabel}>Classement</Text>
        {sortedPlayers.map((player, index) => {
          const total = getRunningTotal(player.id, donnes, playerIds);
          const isFirst = index === 0 && donnes.length > 0;
          return (
            <View key={player.id} style={[styles.playerRow, isFirst && styles.playerRowFirst]}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <PlayerAvatar name={player.name} photoUri={player.photoUri} size={40} color={isFirst ? RED : 'rgba(255,255,255,0.15)'} />
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={[styles.score, isFirst && styles.scoreFirst, total < 0 && styles.scoreNeg]}>
                {total > 0 ? '+' : ''}{total} pts
              </Text>
            </View>
          );
        })}

        {/* Historique */}
        {donnes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Historique des donnes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.historyTable}>
                {/* En-tête */}
                <View style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.historyCellHeader, styles.historyCellDonne]}>#</Text>
                  <Text style={[styles.historyCell, styles.historyCellHeader, styles.historyCellContract]}>Contrat</Text>
                  {players.map((p) => (
                    <Text key={p.id} style={[styles.historyCell, styles.historyCellHeader]} numberOfLines={1}>
                      {p.name.split(' ')[0]}
                    </Text>
                  ))}
                </View>
                {/* Donnes */}
                {donnes.map((donne) => {
                  const scores = calcTarotDonne(donne.score, playerIds);
                  const preneur = players.find((p) => p.id === donne.score.preneurId);
                  return (
                    <View key={donne.donneNumber} style={styles.historyRow}>
                      <Text style={[styles.historyCell, styles.historyCellDonne, styles.historyCellMuted]}>
                        {donne.donneNumber}
                      </Text>
                      <View style={[styles.historyCell, styles.historyCellContract, { justifyContent: 'center' }]}>
                        <Text style={styles.historyCellContractText}>
                          {preneur ? preneur.name.split(' ')[0] : '?'}
                        </Text>
                        <Text style={styles.historyCellContractSub}>
                          {CONTRACT_LABELS[donne.score.contract]}
                        </Text>
                      </View>
                      {players.map((p) => {
                        const s = scores[p.id] ?? 0;
                        return (
                          <Text
                            key={p.id}
                            style={[
                              styles.historyCell,
                              s > 0 && styles.historyCellPos,
                              s < 0 && styles.historyCellNeg,
                            ]}
                          >
                            {s > 0 ? '+' : ''}{s}
                          </Text>
                        );
                      })}
                    </View>
                  );
                })}
                {/* Totaux */}
                <View style={[styles.historyRow, styles.historyRowTotal]}>
                  <Text style={[styles.historyCell, styles.historyCellDonne, styles.historyCellHeader]}>Tot.</Text>
                  <View style={[styles.historyCell, styles.historyCellContract]} />
                  {players.map((p) => {
                    const total = getRunningTotal(p.id, donnes, playerIds);
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
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {donnes.length > 0 && (
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndoDonne} activeOpacity={0.8}>
            <MaterialCommunityIcons name="undo" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.undoBtnText}>Corriger la donne {donnes.length}</Text>
          </TouchableOpacity>
        )}
        {donnes.length > 0 && (
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndGame}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Terminer la partie</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setEnteringDonne(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {donnes.length === 0 ? 'Commencer la première donne' : 'Nouvelle donne'}
          </Text>
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
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
    backgroundColor: 'rgba(192,57,43,0.15)',
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.4)',
  },
  rank: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarFirst: { backgroundColor: RED },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  score: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scoreFirst: { color: RED },
  scoreNeg: { color: '#e74c3c' },

  // Historique
  historyTable: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  historyRowTotal: { backgroundColor: 'rgba(255,255,255,0.04)' },
  historyCell: {
    width: 64, paddingVertical: 10, paddingHorizontal: 6,
    fontSize: 13, color: '#fff', textAlign: 'center', fontWeight: '600',
  },
  historyCellHeader: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
  },
  historyCellDonne: { width: 28, color: 'rgba(255,255,255,0.3)' },
  historyCellContract: { width: 80, flexDirection: 'column' },
  historyCellContractText: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
  historyCellContractSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  historyCellMuted: { color: 'rgba(255,255,255,0.3)' },
  historyCellPos: { color: '#2ecc71' },
  historyCellNeg: { color: '#e74c3c' },
  historyCellBold: { fontWeight: '800', fontSize: 14 },

  // Footer
  footer: { padding: 16, paddingBottom: 28, gap: 10 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  undoBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  nextButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: RED, borderRadius: 16, padding: 16,
  },
  endButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: '#27ae60', borderRadius: 16, padding: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Écran de victoire
  winnerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  winnerEmoji: { fontSize: 72 },
  winnerTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
  winnerSub: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  winnerRanking: { width: '100%', gap: 8, marginTop: 8 },
  winnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14,
  },
  winnerRowFirst: { backgroundColor: 'rgba(192,57,43,0.2)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.5)' },
  winnerRank: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.4)', width: 28 },
  winnerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  winnerAvatarFirst: { backgroundColor: RED },
  winnerName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  winnerScore: { fontSize: 18, fontWeight: '800', color: '#fff' },
  homeButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: RED_DARK, borderRadius: 16, padding: 18, width: '100%', marginTop: 8,
  },
});
