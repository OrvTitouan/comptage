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
import { Player, Flip7RoundScore, calcFlip7Score } from '../../types';

interface Flip7RoundScreenProps {
  roundNumber: number;
  players: Player[];
  onValidate: (scores: Flip7RoundScore[]) => void;
  onBack: () => void;
}

function initScore(playerId: string): Flip7RoundScore {
  return {
    playerId,
    busted: false,
    numberTotal: 0,
    hasX2: false,
    bonus5: 0,
    bonus10: 0,
    bonus15: 0,
    hasFlip7: false,
  };
}

// Cartes numéro disponibles dans le jeu
const NUMBER_CARDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const BONUS_CARDS = [2, 4, 6, 8, 10] as const;
type BonusValue = typeof BONUS_CARDS[number];

function calcFromCards(
  selected: Set<number>,
  hasX2: boolean,
  bonuses: Set<BonusValue>
): number {
  const total = Array.from(selected).reduce((s, n) => s + n, 0);
  const doubled = total * (hasX2 ? 2 : 1);
  const bonusTotal = Array.from(bonuses).reduce((s, b) => s + b, 0);
  const flip7Bonus = selected.size >= 7 ? 15 : 0;
  return doubled + bonusTotal + flip7Bonus;
}

interface PlayerState {
  busted: boolean;
  selectedNumbers: Set<number>;
  hasX2: boolean;
  selectedBonuses: Set<BonusValue>;
}

function initPlayerState(): PlayerState {
  return {
    busted: false,
    selectedNumbers: new Set(),
    hasX2: false,
    selectedBonuses: new Set(),
  };
}

function stateToScore(playerId: string, state: PlayerState): Flip7RoundScore {
  const hasFlip7 = state.selectedNumbers.size >= 7;
  return {
    playerId,
    busted: state.busted,
    numberTotal: Array.from(state.selectedNumbers).reduce((s, n) => s + n, 0),
    hasX2: state.hasX2,
    hasBonus2: state.selectedBonuses.has(2),
    hasBonus4: state.selectedBonuses.has(4),
    hasBonus6: state.selectedBonuses.has(6),
    hasBonus8: state.selectedBonuses.has(8),
    hasBonus10: state.selectedBonuses.has(10),
    hasFlip7,
  };
}


export default function Flip7RoundScreen({ roundNumber, players, onValidate, onBack }: Flip7RoundScreenProps) {
  const [activePlayer, setActivePlayer] = useState(players[0].id);
  const [states, setStates] = useState<Record<string, PlayerState>>(
    Object.fromEntries(players.map((p) => [p.id, initPlayerState()]))
  );

  const s = states[activePlayer];

  const update = (patch: Partial<PlayerState>) => {
    setStates((prev) => ({
      ...prev,
      [activePlayer]: { ...prev[activePlayer], ...patch },
    }));
  };

  const toggleNumber = (n: number) => {
    const next = new Set(s.selectedNumbers);
    if (next.has(n)) next.delete(n); else next.add(n);
    update({ selectedNumbers: next });
  };

  const toggleBonus = (b: BonusValue) => {
    const next = new Set(s.selectedBonuses);
    if (next.has(b)) next.delete(b); else next.add(b);
    update({ selectedBonuses: next });
  };

  const roundScore = s.busted
    ? 0
    : calcFromCards(s.selectedNumbers, s.hasX2, s.selectedBonuses);

  const isFlip7 = s.selectedNumbers.size >= 7;

  const handleValidate = () => {
    const flip7Players = players.filter((p) => states[p.id].selectedNumbers.size >= 7);
    if (flip7Players.length > 1) {
      Alert.alert('Erreur', 'Un seul joueur peut faire un Flip 7 par manche.');
      return;
    }
    onValidate(players.map((p) => stateToScore(p.id, states[p.id])));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Manche {roundNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets joueurs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {players.map((player) => {
          const ps = states[player.id];
          const pts = ps.busted ? 0 : calcFromCards(ps.selectedNumbers, ps.hasX2, ps.selectedBonuses);
          const active = player.id === activePlayer;
          const flip7 = ps.selectedNumbers.size >= 7;
          return (
            <TouchableOpacity
              key={player.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActivePlayer(player.id)}
            >
              <Text style={[styles.tabName, active && styles.tabNameActive]}>
                {player.name.split(' ')[0]}
              </Text>
              <Text style={[styles.tabScore, active && styles.tabScoreActive]}>
                {ps.busted ? '💥' : `${pts} pts${flip7 ? ' 🎯' : ''}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Score temps réel */}
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreDisplayLabel}>Score manche</Text>
          <Text style={styles.scoreDisplayValue}>
            {s.busted ? '💥 Sauté — 0 pts' : `${roundScore} pts${isFlip7 ? '  🎯 Flip 7 !' : ''}`}
          </Text>
        </View>

        {/* Bouton sauté */}
        <TouchableOpacity
          style={[styles.bustedBtn, s.busted && styles.bustedBtnActive]}
          onPress={() => update({ busted: !s.busted, selectedNumbers: new Set() })}
        >
          <MaterialCommunityIcons
            name={s.busted ? 'close-circle' : 'close-circle-outline'}
            size={22}
            color={s.busted ? '#e74c3c' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.bustedBtnText, s.busted && styles.bustedBtnTextActive]}>
            Sauté — doublon (0 pts)
          </Text>
        </TouchableOpacity>

        {!s.busted && (
          <>
            {/* Cartes numéro */}
            <Text style={styles.sectionLabel}>
              Cartes numéro ({s.selectedNumbers.size}/7)
            </Text>
            <View style={styles.cardsGrid}>
              {NUMBER_CARDS.map((n) => {
                const selected = s.selectedNumbers.has(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.card, selected && styles.cardSelected]}
                    onPress={() => toggleNumber(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cardNumber, selected && styles.cardNumberSelected]}>
                      {n}
                    </Text>
                    {selected && (
                      <View style={styles.cardCheck}>
                        <MaterialCommunityIcons name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cartes bonus */}
            <Text style={styles.sectionLabel}>Cartes bonus</Text>

            <View style={styles.bonusGrid}>
              {/* x2 */}
              <TouchableOpacity
                style={[styles.bonusCard, styles.bonusCardX2Base, s.hasX2 && styles.bonusCardX2Selected]}
                onPress={() => update({ hasX2: !s.hasX2 })}
              >
                <Text style={[styles.bonusCardLabel, s.hasX2 && styles.bonusCardLabelX2Selected]}>×2</Text>
                <Text style={styles.bonusCardSub}>Double</Text>
              </TouchableOpacity>

              {/* +2 +4 +6 +8 +10 */}
              {BONUS_CARDS.map((b) => {
                const selected = s.selectedBonuses.has(b);
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bonusCard, selected && styles.bonusCardSelected]}
                    onPress={() => toggleBonus(b)}
                  >
                    <Text style={[styles.bonusCardLabel, selected && styles.bonusCardLabelSelected]}>
                      +{b}
                    </Text>
                    <Text style={styles.bonusCardSub}>pts</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.validateBtn} onPress={handleValidate} activeOpacity={0.85}>
          <Text style={styles.validateBtnText}>Valider la manche</Text>
          <MaterialCommunityIcons name="check" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  tabsScroll: { maxHeight: 72 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', minWidth: 90,
  },
  tabActive: { backgroundColor: '#e74c3c' },
  tabName: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  tabNameActive: { color: '#fff' },
  tabScore: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  tabScoreActive: { color: 'rgba(255,255,255,0.85)' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  scoreDisplay: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  scoreDisplayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  scoreDisplayValue: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 },
  bustedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: 'transparent',
  },
  bustedBtnActive: { backgroundColor: 'rgba(231,76,60,0.15)', borderColor: '#e74c3c' },
  bustedBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  bustedBtnTextActive: { color: '#e74c3c' },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  cardsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  card: {
    width: 52, height: 68, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: 'rgba(231,76,60,0.25)',
    borderColor: '#e74c3c',
  },
  cardNumber: {
    fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.5)',
  },
  cardNumberSelected: { color: '#fff' },
  cardCheck: {
    position: 'absolute', top: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#e74c3c',
    justifyContent: 'center', alignItems: 'center',
  },
  bonusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  bonusCard: {
    width: '30.5%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  bonusCardX2Base: {
    backgroundColor: 'rgba(155,89,182,0.15)', borderColor: 'rgba(155,89,182,0.3)',
  },
  bonusCardX2Selected: {
    backgroundColor: 'rgba(155,89,182,0.3)', borderColor: '#9b59b6',
  },
  bonusCardSelected: {
    backgroundColor: 'rgba(243,156,18,0.2)', borderColor: '#f39c12',
  },
  bonusCardLabel: {
    fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.4)',
  },
  bonusCardLabelSelected: { color: '#f39c12' },
  bonusCardLabelX2Selected: { color: '#9b59b6' },
  bonusCardSub: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  footer: { padding: 16, paddingBottom: 28 },
  validateBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: '#e74c3c', borderRadius: 16, padding: 18,
  },
  validateBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
