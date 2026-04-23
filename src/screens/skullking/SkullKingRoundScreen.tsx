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
import { Player, SkullKingRoundScore, calcSkullKingRoundScore } from '../../types';
import PlayerAvatar from '../../components/PlayerAvatar';

const BLUE = '#2980b9';
const BLUE_DARK = '#1a5276';

interface Props {
  roundNumber: number;
  players: Player[];
  onValidate: (scores: SkullKingRoundScore[]) => void;
  onBack: () => void;
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SkullKingRoundScreen({ roundNumber, players, onValidate, onBack }: Props) {
  const [bids, setBids] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [tricks, setTricks] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [pirates, setPirates] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [mermaid, setMermaid] = useState<Record<string, boolean>>(
    Object.fromEntries(players.map((p) => [p.id, false]))
  );
  const [colored14s, setColored14s] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [black14, setBlack14] = useState<Record<string, boolean>>(
    Object.fromEntries(players.map((p) => [p.id, false]))
  );

  const getScore = (p: Player) => {
    const score: SkullKingRoundScore = {
      playerId: p.id,
      bid: bids[p.id],
      tricks: tricks[p.id],
      piratesCaptured: pirates[p.id],
      mermaidCapturedSkullKing: mermaid[p.id],
      colored14s: colored14s[p.id],
      black14: black14[p.id],
    };
    return calcSkullKingRoundScore(score, roundNumber);
  };

  const handleValidate = () => {
    const scores: SkullKingRoundScore[] = players.map((p) => ({
      playerId: p.id,
      bid: bids[p.id],
      tricks: tricks[p.id],
      piratesCaptured: pirates[p.id],
      mermaidCapturedSkullKing: mermaid[p.id],
      colored14s: colored14s[p.id],
      black14: black14[p.id],
    }));
    onValidate(scores);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Manche {roundNumber}</Text>
          <Text style={styles.subtitle}>{roundNumber} carte{roundNumber > 1 ? 's' : ''} par joueur · sur 10</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Saisie des résultats</Text>

        {players.map((p) => {
          const bid = bids[p.id];
          const trick = tricks[p.id];
          const score = getScore(p);
          const pariReussi = bid > 0 && bid === trick;
          const scorePositive = score > 0;
          const scoreNeutral = score === 0;

          return (
            <View key={p.id} style={styles.playerCard}>
              {/* En-tête joueur + score prévu */}
              <View style={styles.cardHeader}>
                <PlayerAvatar name={p.name} photoUri={p.photoUri} size={40} color={BLUE} />
                <Text style={styles.playerName}>{p.name}</Text>
                <View style={[
                  styles.scoreBadge,
                  scorePositive && styles.scoreBadgePos,
                  !scorePositive && !scoreNeutral && styles.scoreBadgeNeg,
                ]}>
                  <Text style={styles.scoreBadgeText}>
                    {score > 0 ? '+' : ''}{score} pts
                  </Text>
                </View>
              </View>

              {/* Annonce & Réalisé */}
              <View style={styles.bidsRow}>
                <View style={styles.stepperGroup}>
                  <Text style={styles.stepperLabel}>Annonce</Text>
                  <Stepper
                    value={bid}
                    min={0}
                    max={roundNumber}
                    onChange={(v) => setBids((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
                <View style={styles.stepperGroup}>
                  <Text style={styles.stepperLabel}>Réalisé</Text>
                  <Stepper
                    value={trick}
                    min={0}
                    max={roundNumber}
                    onChange={(v) => setTricks((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              </View>

              {/* Bonus — Pirates & Sirène */}
              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Pirates (SK) +30
                  </Text>
                  <Stepper
                    value={pirates[p.id]}
                    min={0}
                    max={6}
                    onChange={(v) => setPirates((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.toggle, mermaid[p.id] && styles.toggleActiveGreen]}
                  onPress={() => setMermaid((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                >
                  <Text style={styles.toggleIcon}>🧜</Text>
                  <Text style={[styles.toggleLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Sirène +50
                  </Text>
                  {mermaid[p.id] && (
                    <MaterialCommunityIcons name="check" size={14} color="#2ecc71" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Bonus — Cartes 14 (nouvelle édition) */}
              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    14 couleur +10
                  </Text>
                  <Stepper
                    value={colored14s[p.id]}
                    min={0}
                    max={3}
                    onChange={(v) => setColored14s((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.toggle, black14[p.id] && styles.toggleActiveGold]}
                  onPress={() => setBlack14((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                >
                  <Text style={styles.toggleIcon}>🏴‍☠️</Text>
                  <Text style={[styles.toggleLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    14 noire +20
                  </Text>
                  {black14[p.id] && (
                    <MaterialCommunityIcons name="check" size={14} color="#f39c12" />
                  )}
                </TouchableOpacity>
              </View>

              {!pariReussi && (bid > 0 || pirates[p.id] > 0 || mermaid[p.id] || colored14s[p.id] > 0 || black14[p.id]) && (
                <Text style={styles.bonusNote}>
                  Les bonus ne comptent que si le pari est réussi
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.validateButton} onPress={handleValidate} activeOpacity={0.85}>
          <Text style={styles.validateButtonText}>Valider la manche</Text>
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
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  scrollContent: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  playerCard: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    padding: 14, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scoreBadgePos: { backgroundColor: 'rgba(46,204,113,0.2)' },
  scoreBadgeNeg: { backgroundColor: 'rgba(231,76,60,0.2)' },
  scoreBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  bidsRow: { flexDirection: 'row', gap: 12 },
  bonusRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepperGroup: { flex: 1, gap: 6 },
  stepperLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  stepperLabelDisabled: { color: 'rgba(255,255,255,0.2)' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden',
  },
  stepBtn: {
    width: 38, height: 40, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  stepValue: {
    flex: 1, textAlign: 'center', fontSize: 20,
    fontWeight: '800', color: '#fff',
  },
  toggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: 'transparent',
    minHeight: 40,
  },
  toggleActiveGreen: {
    borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.15)',
  },
  toggleActiveGold: {
    borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)',
  },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bonusNote: {
    fontSize: 11, color: 'rgba(255,165,0,0.6)',
    textAlign: 'center', fontStyle: 'italic',
  },
  footer: { padding: 16, paddingBottom: 28 },
  validateButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: BLUE_DARK, borderRadius: 16, padding: 18,
  },
  validateButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
