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
  value, min, max, onChange, disabled = false,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <View style={[styles.stepper, disabled && styles.stepperDisabled]}>
      <TouchableOpacity
        style={[styles.stepBtn, (value <= min || disabled) && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min || disabled}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepBtn, (value >= max || disabled) && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max || disabled}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SkullKingRoundScreen({ roundNumber, players, onValidate, onBack }: Props) {
  const [phase, setPhase] = useState<'bids' | 'results'>('bids');

  const init = <T,>(val: T) => Object.fromEntries(players.map((p) => [p.id, val])) as Record<string, T>;

  const [bids, setBids] = useState<Record<string, number>>(init(0));
  const [tricks, setTricks] = useState<Record<string, number>>(init(0));
  const [pirates, setPirates] = useState<Record<string, number>>(init(0));
  const [mermaids, setMermaids] = useState<Record<string, number>>(init(0));
  const [skullKingCaptured, setSkullKingCaptured] = useState<Record<string, boolean>>(init(false));
  const [colored14s, setColored14s] = useState<Record<string, number>>(init(0));
  const [black14, setBlack14] = useState<Record<string, boolean>>(init(false));
  const [card8, setCard8] = useState<Record<string, number>>(init(0));
  const [card7, setCard7] = useState<Record<string, number>>(init(0));
  const [davyJones, setDavyJones] = useState<Record<string, number>>(init(0));

  const buildScore = (p: Player): SkullKingRoundScore => ({
    playerId: p.id,
    bid: bids[p.id],
    tricks: tricks[p.id],
    piratesCaptured: pirates[p.id],
    mermaidsCaptured: mermaids[p.id],
    skullKingCaptured: skullKingCaptured[p.id],
    colored14s: colored14s[p.id],
    black14: black14[p.id],
    card8Captured: card8[p.id],
    card7Captured: card7[p.id],
    davyJonesCaptures: davyJones[p.id],
  });

  const getScore = (p: Player) => calcSkullKingRoundScore(buildScore(p), roundNumber);

  // ── Phase 1 : Annonces ────────────────────────────────────────────────────

  if (phase === 'bids') {
    const totalBids = players.reduce((s, p) => s + bids[p.id], 0);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Manche {roundNumber} · Annonces</Text>
            <Text style={styles.subtitle}>{roundNumber} carte{roundNumber > 1 ? 's' : ''} par joueur</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Compteur total */}
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>Total annoncé</Text>
            <Text style={styles.totalBadgeValue}>{totalBids} / {roundNumber}</Text>
          </View>

          {players.map((p) => (
            <View key={p.id} style={styles.playerCard}>
              <View style={styles.cardHeader}>
                <PlayerAvatar name={p.name} photoUri={p.photoUri} size={40} color={BLUE} />
                <Text style={styles.playerName}>{p.name}</Text>
                <View style={styles.bidDisplay}>
                  <Text style={styles.bidDisplayValue}>{bids[p.id]}</Text>
                  <Text style={styles.bidDisplayLabel}>pli{bids[p.id] > 1 ? 's' : ''}</Text>
                </View>
              </View>
              <Stepper
                value={bids[p.id]}
                min={0}
                max={roundNumber}
                onChange={(v) => setBids((prev) => ({ ...prev, [p.id]: v }))}
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.validateButton}
            onPress={() => setPhase('results')}
            activeOpacity={0.85}
          >
            <Text style={styles.validateButtonText}>Confirmer les annonces</Text>
            <MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phase 2 : Résultats ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase('bids')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Manche {roundNumber} · Résultats</Text>
          <Text style={styles.subtitle}>Plis réalisés &amp; bonus</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {players.map((p) => {
          const bid = bids[p.id];
          const trick = tricks[p.id];
          const score = getScore(p);
          const pariReussi = bid > 0 && bid === trick;
          const scorePositive = score > 0;
          const scoreNeutral = score === 0;
          const hasConditionalBonus = pirates[p.id] > 0 || mermaids[p.id] > 0 || skullKingCaptured[p.id] || colored14s[p.id] > 0 || black14[p.id] || card8[p.id] > 0 || card7[p.id] > 0;

          return (
            <View key={p.id} style={styles.playerCard}>

              {/* En-tête */}
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

              {/* Annoncé (lecture seule) + Réalisé */}
              <View style={styles.bidsRow}>
                <View style={styles.stepperGroup}>
                  <Text style={styles.stepperLabel}>Annoncé</Text>
                  <View style={styles.bidReadOnly}>
                    <Text style={styles.bidReadOnlyValue}>{bid}</Text>
                  </View>
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

              {/* Bonus conditionnels */}
              <Text style={[styles.bonusSectionLabel, !pariReussi && styles.stepperLabelDisabled]}>
                Bonus · pari réussi uniquement
              </Text>

              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Pirates +30
                  </Text>
                  <Stepper
                    value={pirates[p.id]}
                    min={0}
                    max={8}
                    disabled={!pariReussi}
                    onChange={(v) => setPirates((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    🧜 Sirènes +20
                  </Text>
                  <Stepper
                    value={mermaids[p.id]}
                    min={0}
                    max={2}
                    disabled={!pariReussi}
                    onChange={(v) => setMermaids((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              </View>

              <View style={styles.bonusRow}>
                <TouchableOpacity
                  style={[styles.toggle, skullKingCaptured[p.id] && pariReussi && styles.toggleActiveGreen, !pariReussi && styles.toggleDisabled]}
                  onPress={() => setSkullKingCaptured((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  disabled={!pariReussi}
                >
                  <Text style={styles.toggleIcon}>💀</Text>
                  <Text style={[styles.toggleLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Skull King +40
                  </Text>
                  {skullKingCaptured[p.id] && pariReussi && <MaterialCommunityIcons name="check" size={14} color="#2ecc71" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, black14[p.id] && pariReussi && styles.toggleActiveGold, !pariReussi && styles.toggleDisabled]}
                  onPress={() => setBlack14((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  disabled={!pariReussi}
                >
                  <Text style={styles.toggleIcon}>🏴‍☠️</Text>
                  <Text style={[styles.toggleLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    14 noire +20
                  </Text>
                  {black14[p.id] && pariReussi && <MaterialCommunityIcons name="check" size={14} color="#f39c12" />}
                </TouchableOpacity>
              </View>

              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    14 couleur +10
                  </Text>
                  <Stepper
                    value={colored14s[p.id]}
                    min={0}
                    max={3}
                    disabled={!pariReussi}
                    onChange={(v) => setColored14s((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              </View>

              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Carte 8 +5
                  </Text>
                  <Stepper
                    value={card8[p.id]}
                    min={0}
                    max={4}
                    disabled={!pariReussi}
                    onChange={(v) => setCard8((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    Carte 7 −5
                  </Text>
                  <Stepper
                    value={card7[p.id]}
                    min={0}
                    max={4}
                    disabled={!pariReussi}
                    onChange={(v) => setCard7((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              </View>

              <Text style={[styles.bonusSectionLabel, !pariReussi && styles.stepperLabelDisabled]}>
                Davy Jones +20/capture
              </Text>
              <View style={styles.bonusRow}>
                <View style={styles.stepperGroup}>
                  <Text style={[styles.stepperLabel, !pariReussi && styles.stepperLabelDisabled]}>
                    🐋 Baleine · 🦑 Kraken · 🐟 Raie
                  </Text>
                  <Stepper
                    value={davyJones[p.id]}
                    min={0}
                    max={3}
                    disabled={!pariReussi}
                    onChange={(v) => setDavyJones((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.validateButton} onPress={() => onValidate(players.map(buildScore))} activeOpacity={0.85}>
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
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  scrollContent: { padding: 20, gap: 12, paddingBottom: 40 },

  // Total badge (phase annonces)
  totalBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  totalBadgeLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  totalBadgeValue: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Carte joueur
  playerCard: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    padding: 14, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },

  // Affichage annonce en phase annonces
  bidDisplay: { alignItems: 'center', minWidth: 52 },
  bidDisplayValue: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 30 },
  bidDisplayLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },

  // Score badge
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scoreBadgePos: { backgroundColor: 'rgba(46,204,113,0.2)' },
  scoreBadgeNeg: { backgroundColor: 'rgba(231,76,60,0.2)' },
  scoreBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Bids row
  bidsRow: { flexDirection: 'row', gap: 12 },

  // Annoncé en lecture seule (phase résultats)
  bidReadOnly: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    height: 40, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bidReadOnlyValue: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.45)' },

  // Bonus
  bonusSectionLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 2,
  },
  bonusRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepperGroup: { flex: 1, gap: 6 },
  stepperLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  stepperLabelDisabled: { color: 'rgba(255,255,255,0.2)' },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden',
  },
  stepperDisabled: { opacity: 0.25 },
  stepBtn: {
    width: 38, height: 40, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#fff' },

  // Toggle
  toggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: 'transparent',
    minHeight: 40,
  },
  toggleActiveGreen: { borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.15)' },
  toggleActiveGold: { borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)' },
  toggleDisabled: { opacity: 0.25 },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },

  bonusNote: {
    fontSize: 11, color: 'rgba(255,165,0,0.6)',
    textAlign: 'center', fontStyle: 'italic',
  },

  // Footer
  footer: { padding: 16, paddingBottom: 28 },
  validateButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: BLUE_DARK, borderRadius: 16, padding: 18,
  },
  validateButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
