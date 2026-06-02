import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
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
  initialScores?: SkullKingRoundScore[];
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

export default function SkullKingRoundScreen({ roundNumber, players, onValidate, onBack, initialScores }: Props) {
  const [phase, setPhase] = useState<'bids' | 'results'>(initialScores ? 'results' : 'bids');

  const fromScore = <T,>(getter: (s: SkullKingRoundScore) => T, fallback: T): Record<string, T> =>
    Object.fromEntries(players.map((p) => {
      const s = initialScores?.find((sc) => sc.playerId === p.id);
      return [p.id, s !== undefined ? getter(s) : fallback];
    }));

  const [bonusModalPlayer, setBonusModalPlayer] = useState<string | null>(null);

  const [bids, setBids] = useState<Record<string, number>>(fromScore((s) => s.bid, 0));
  const [tricks, setTricks] = useState<Record<string, number>>(fromScore((s) => s.tricks, 0));
  const [pirates, setPirates] = useState<Record<string, number>>(fromScore((s) => s.piratesCaptured, 0));
  const [mermaids, setMermaids] = useState<Record<string, number>>(fromScore((s) => s.mermaidsCaptured, 0));
  const [skullKingCaptured, setSkullKingCaptured] = useState<Record<string, boolean>>(fromScore((s) => s.skullKingCaptured, false));
  const [colored14s, setColored14s] = useState<Record<string, number>>(fromScore((s) => s.colored14s, 0));
  const [black14, setBlack14] = useState<Record<string, boolean>>(fromScore((s) => s.black14, false));
  const [card8, setCard8] = useState<Record<string, number>>(fromScore((s) => s.card8Captured ?? 0, 0));
  const [card7, setCard7] = useState<Record<string, number>>(fromScore((s) => s.card7Captured ?? 0, 0));
  const [davyJones, setDavyJones] = useState<Record<string, number>>(fromScore((s) => s.davyJonesCaptures ?? 0, 0));

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

  const hasAnyBonus = (pid: string) =>
    pirates[pid] > 0 || mermaids[pid] > 0 || skullKingCaptured[pid] ||
    colored14s[pid] > 0 || black14[pid] || card8[pid] > 0 ||
    card7[pid] > 0 || davyJones[pid] > 0;

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

  const modalP = players.find((p) => p.id === bonusModalPlayer) ?? null;
  const modalPariReussi = modalP ? bids[modalP.id] === tricks[modalP.id] : false;

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
          const scorePositive = score > 0;
          const scoreNeutral = score === 0;
          const bonusSet = hasAnyBonus(p.id);
          const pariReussi = bid === trick;

          return (
            <View key={p.id} style={styles.playerCard}>
              {/* Ligne 1 : avatar · nom · annoncé · bouton bonus */}
              <View style={styles.cardHeader}>
                <PlayerAvatar name={p.name} photoUri={p.photoUri} size={38} color={BLUE} />
                <Text style={styles.playerName}>{p.name}</Text>
                <View style={styles.bidReadOnly}>
                  <Text style={styles.bidReadOnlyLabel}>annoncé</Text>
                  <Text style={styles.bidReadOnlyValue}>{bid}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.bonusBtn, bonusSet && pariReussi && styles.bonusBtnActive]}
                  onPress={() => setBonusModalPlayer(p.id)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={bonusSet && pariReussi ? 'star' : 'star-outline'}
                    size={20}
                    color={bonusSet && pariReussi ? '#f39c12' : 'rgba(255,255,255,0.35)'}
                  />
                </TouchableOpacity>
              </View>

              {/* Ligne 2 : stepper plis + score */}
              <View style={styles.tricksRow}>
                <View style={styles.stepperGroup}>
                  <Text style={styles.stepperLabel}>Plis réalisés</Text>
                  <Stepper
                    value={trick}
                    min={0}
                    max={roundNumber}
                    onChange={(v) => setTricks((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </View>
                <View style={[
                  styles.scoreBadge,
                  scorePositive && styles.scoreBadgePos,
                  !scorePositive && !scoreNeutral && styles.scoreBadgeNeg,
                ]}>
                  <Text style={styles.scoreBadgeText}>{score > 0 ? '+' : ''}{score} pts</Text>
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

      {/* ── Modal bonus ───────────────────────────────────────────────────── */}
      <Modal visible={bonusModalPlayer !== null} transparent animationType="slide" onRequestClose={() => setBonusModalPlayer(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBonusModalPlayer(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>

            {/* Poignée */}
            <View style={styles.modalHandle} />

            {modalP && (
              <>
                {/* En-tête modal */}
                <View style={styles.modalHeader}>
                  <PlayerAvatar name={modalP.name} photoUri={modalP.photoUri} size={32} color={BLUE} />
                  <Text style={styles.modalTitle}>Bonus · {modalP.name}</Text>
                  <TouchableOpacity onPress={() => setBonusModalPlayer(null)} style={styles.modalClose}>
                    <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>

                {!modalPariReussi && (
                  <Text style={styles.modalWarning}>Pari non réussi · tous les bonus sont désactivés</Text>
                )}

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                  <View style={styles.bonusRow}>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>Pirates +30</Text>
                      <Stepper value={pirates[modalP.id]} min={0} max={8} disabled={!modalPariReussi}
                        onChange={(v) => setPirates((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>🧜 Sirènes +20</Text>
                      <Stepper value={mermaids[modalP.id]} min={0} max={2} disabled={!modalPariReussi}
                        onChange={(v) => setMermaids((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                  </View>

                  <View style={styles.bonusRow}>
                    <TouchableOpacity
                      style={[styles.toggle, skullKingCaptured[modalP.id] && modalPariReussi && styles.toggleActiveGreen, !modalPariReussi && styles.toggleDisabled]}
                      onPress={() => setSkullKingCaptured((prev) => ({ ...prev, [modalP.id]: !prev[modalP.id] }))}
                      disabled={!modalPariReussi}
                    >
                      <Text style={styles.toggleIcon}>💀</Text>
                      <Text style={[styles.toggleLabel, !modalPariReussi && styles.stepperLabelDisabled]}>Skull King +40</Text>
                      {skullKingCaptured[modalP.id] && modalPariReussi && <MaterialCommunityIcons name="check" size={14} color="#2ecc71" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggle, black14[modalP.id] && modalPariReussi && styles.toggleActiveGold, !modalPariReussi && styles.toggleDisabled]}
                      onPress={() => setBlack14((prev) => ({ ...prev, [modalP.id]: !prev[modalP.id] }))}
                      disabled={!modalPariReussi}
                    >
                      <Text style={styles.toggleIcon}>🏴‍☠️</Text>
                      <Text style={[styles.toggleLabel, !modalPariReussi && styles.stepperLabelDisabled]}>14 noire +20</Text>
                      {black14[modalP.id] && modalPariReussi && <MaterialCommunityIcons name="check" size={14} color="#f39c12" />}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bonusRow}>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>14 couleur +10</Text>
                      <Stepper value={colored14s[modalP.id]} min={0} max={3} disabled={!modalPariReussi}
                        onChange={(v) => setColored14s((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>Carte 8 +5</Text>
                      <Stepper value={card8[modalP.id]} min={0} max={4} disabled={!modalPariReussi}
                        onChange={(v) => setCard8((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                  </View>

                  <View style={styles.bonusRow}>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>Carte 7 −5</Text>
                      <Stepper value={card7[modalP.id]} min={0} max={4} disabled={!modalPariReussi}
                        onChange={(v) => setCard7((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                    <View style={styles.stepperGroup}>
                      <Text style={[styles.stepperLabel, !modalPariReussi && styles.stepperLabelDisabled]}>🐋🦑🐟 Davy Jones +20</Text>
                      <Stepper value={davyJones[modalP.id]} min={0} max={3} disabled={!modalPariReussi}
                        onChange={(v) => setDavyJones((prev) => ({ ...prev, [modalP.id]: v }))} />
                    </View>
                  </View>

                </ScrollView>

                <TouchableOpacity style={styles.modalValidate} onPress={() => setBonusModalPlayer(null)} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.modalValidateText}>Confirmer</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

  // Annoncé en lecture seule
  bidReadOnly: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  bidReadOnlyLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' },
  bidReadOnlyValue: { fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.5)', lineHeight: 26 },

  // Bouton bonus
  bonusBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  bonusBtnActive: { borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)' },

  // Ligne plis réalisés
  tricksRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Score badge
  scoreBadge: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  scoreBadgePos: { backgroundColor: 'rgba(46,204,113,0.2)' },
  scoreBadgeNeg: { backgroundColor: 'rgba(231,76,60,0.2)' },
  scoreBadgeText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Bonus dans la modal
  bonusRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 },
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

  // Footer
  footer: { padding: 16, paddingBottom: 28 },
  validateButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: BLUE_DARK, borderRadius: 16, padding: 18,
  },
  validateButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalWarning: {
    fontSize: 12, color: '#e67e22', textAlign: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(230,126,34,0.1)',
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  modalValidate: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, backgroundColor: BLUE_DARK, borderRadius: 14, padding: 16,
    marginHorizontal: 20, marginTop: 8,
  },
  modalValidateText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
