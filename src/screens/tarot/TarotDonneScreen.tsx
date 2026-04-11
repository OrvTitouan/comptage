import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Player,
  TarotContract,
  TarotDonneScore,
  TarotPoignee,
  TarotChelemResult,
  calcTarotDonne,
} from '../../types';

const RED = '#c0392b';
const RED_DARK = '#922b21';

interface Props {
  donneNumber: number;
  players: Player[];
  onValidate: (score: TarotDonneScore) => void;
  onBack: () => void;
}

const CONTRACTS: { id: TarotContract; label: string; mult: number }[] = [
  { id: 'prise', label: 'Prise', mult: 1 },
  { id: 'garde', label: 'Garde', mult: 2 },
  { id: 'garde-sans', label: 'G. Sans', mult: 4 },
  { id: 'garde-contre', label: 'G. Contre', mult: 6 },
];

const SEUILS = [56, 51, 41, 36];

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  label: string;
}) {
  return (
    <View style={tg.wrapper}>
      <Text style={tg.label}>{label}</Text>
      <View style={tg.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[tg.btn, value === opt.id && tg.btnActive]}
            onPress={() => onChange(value === opt.id ? null : opt.id)}
          >
            <Text style={[tg.btnText, value === opt.id && tg.btnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function TarotDonneScreen({ donneNumber, players, onValidate, onBack }: Props) {
  const [preneurId, setPreneurId] = useState<string | null>(null);
  const [contract, setContract] = useState<TarotContract | null>(null);
  const [bouts, setBouts] = useState<0 | 1 | 2 | 3>(0);
  const [pointsStr, setPointsStr] = useState('');
  const [petitAuBout, setPetitAuBout] = useState<'preneur' | 'defense' | null>(null);
  const [poigneeType, setPoigneeType] = useState<TarotPoignee | null>(null);
  const [poigneeBy, setPoigneeBy] = useState<'preneur' | 'defense' | null>(null);
  const [chelem, setChelem] = useState<TarotChelemResult | null>(null);

  const points = parseInt(pointsStr) || 0;
  const seuil = SEUILS[bouts];
  const isValid = preneurId !== null && contract !== null && pointsStr !== '';

  // Score preview (recalculé à chaque changement)
  const preview = useMemo(() => {
    if (!preneurId || !contract || pointsStr === '') return null;
    const score: TarotDonneScore = {
      preneurId,
      contract,
      bouts,
      points,
      petitAuBout,
      poignee: poigneeType,
      poigneeBy,
      chelem,
    };
    return calcTarotDonne(score, players.map((p) => p.id));
  }, [preneurId, contract, bouts, points, petitAuBout, poigneeType, poigneeBy, chelem, players, pointsStr]);

  const handleValidate = () => {
    if (!preneurId || !contract || pointsStr === '') return;
    onValidate({
      preneurId,
      contract,
      bouts,
      points,
      petitAuBout,
      poignee: poigneeType,
      poigneeBy,
      chelem,
    });
  };

  const won = contract ? points >= seuil : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Donne {donneNumber}</Text>
          <Text style={styles.subtitle}>Saisie de la manche</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Preneur ── */}
          <Text style={styles.sectionLabel}>Preneur</Text>
          <View style={styles.playersRow}>
            {players.map((p) => {
              const selected = preneurId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.playerChip, selected && styles.playerChipSelected]}
                  onPress={() => setPreneurId(p.id)}
                >
                  <Text style={[styles.playerChipText, selected && styles.playerChipTextSelected]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Contrat ── */}
          <Text style={styles.sectionLabel}>Contrat</Text>
          <View style={styles.contractRow}>
            {CONTRACTS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.contractBtn, contract === c.id && styles.contractBtnSelected]}
                onPress={() => setContract(contract === c.id ? null : c.id)}
              >
                <Text style={[styles.contractBtnText, contract === c.id && styles.contractBtnTextSelected]}>
                  {c.label}
                </Text>
                <Text style={[styles.contractBtnMult, contract === c.id && styles.contractBtnMultSelected]}>
                  ×{c.mult}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Bouts & Points ── */}
          <View style={styles.boutPointsRow}>
            <View style={styles.boutsGroup}>
              <Text style={styles.sectionLabel}>Bouts</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, bouts === 0 && styles.stepBtnDisabled]}
                  onPress={() => bouts > 0 && setBouts((bouts - 1) as 0 | 1 | 2 | 3)}
                  disabled={bouts === 0}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{bouts}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, bouts === 3 && styles.stepBtnDisabled]}
                  onPress={() => bouts < 3 && setBouts((bouts + 1) as 0 | 1 | 2 | 3)}
                  disabled={bouts === 3}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.seuilText}>Seuil : {seuil} pts</Text>
            </View>

            <View style={styles.pointsGroup}>
              <Text style={styles.sectionLabel}>Points preneur</Text>
              <TextInput
                style={[
                  styles.pointsInput,
                  won === true && styles.pointsInputWon,
                  won === false && styles.pointsInputLost,
                ]}
                value={pointsStr}
                onChangeText={(v) => setPointsStr(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor="rgba(255,255,255,0.25)"
                maxLength={2}
              />
              {pointsStr !== '' && (
                <View style={[styles.resultBadge, won ? styles.resultBadgeWon : styles.resultBadgeLost]}>
                  <Text style={styles.resultBadgeText}>
                    {won ? '✓ Contrat réussi' : '✗ Chute'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Primes ── */}
          <Text style={styles.sectionLabel}>Primes</Text>
          <View style={styles.primesCard}>

            {/* Petit au bout */}
            <Text style={styles.primeLabel}>Petit au bout (+10 × contrat)</Text>
            <View style={styles.optionRow}>
              {([
                { id: null, label: 'Aucun' },
                { id: 'preneur', label: 'Preneur' },
                { id: 'defense', label: 'Défense' },
              ] as { id: typeof petitAuBout; label: string }[]).map((opt) => (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[styles.optionBtn, petitAuBout === opt.id && styles.optionBtnActive]}
                  onPress={() => setPetitAuBout(opt.id)}
                >
                  <Text style={[styles.optionBtnText, petitAuBout === opt.id && styles.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.primeDivider} />

            {/* Poignée */}
            <Text style={styles.primeLabel}>Poignée d'atouts</Text>
            <View style={styles.optionRow}>
              {([
                { id: null, label: 'Aucune' },
                { id: 'simple', label: 'Simple\n20 pts' },
                { id: 'double', label: 'Double\n30 pts' },
                { id: 'triple', label: 'Triple\n40 pts' },
              ] as { id: TarotPoignee | null; label: string }[]).map((opt) => (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[styles.optionBtn, poigneeType === opt.id && styles.optionBtnActive]}
                  onPress={() => { setPoigneeType(opt.id); if (!opt.id) setPoigneeBy(null); }}
                >
                  <Text style={[styles.optionBtnText, poigneeType === opt.id && styles.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {poigneeType && (
              <View style={[styles.optionRow, { marginTop: 8 }]}>
                <Text style={styles.optionSubLabel}>Déclarée par :</Text>
                {(['preneur', 'defense'] as const).map((who) => (
                  <TouchableOpacity
                    key={who}
                    style={[styles.optionBtn, poigneeBy === who && styles.optionBtnActive]}
                    onPress={() => setPoigneeBy(who)}
                  >
                    <Text style={[styles.optionBtnText, poigneeBy === who && styles.optionBtnTextActive]}>
                      {who === 'preneur' ? 'Preneur' : 'Défense'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.primeDivider} />

            {/* Chelem */}
            <Text style={styles.primeLabel}>Chelem</Text>
            <View style={styles.optionRow}>
              {([
                { id: null, label: 'Aucun' },
                { id: 'annonce-reussi', label: 'Annoncé\n+400' },
                { id: 'non-annonce-reussi', label: 'Surprise\n+200' },
                { id: 'annonce-rate', label: 'Raté\n−200' },
              ] as { id: TarotChelemResult | null; label: string }[]).map((opt) => (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[styles.optionBtn, chelem === opt.id && styles.optionBtnActive]}
                  onPress={() => setChelem(opt.id)}
                >
                  <Text style={[styles.optionBtnText, chelem === opt.id && styles.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Aperçu des scores ── */}
          {preview && (
            <>
              <Text style={styles.sectionLabel}>Scores de cette donne</Text>
              <View style={styles.previewCard}>
                {players.map((p) => {
                  const s = preview[p.id] ?? 0;
                  const isPreneur = p.id === preneurId;
                  return (
                    <View key={p.id} style={styles.previewRow}>
                      <View style={[styles.previewAvatar, isPreneur && styles.previewAvatarPreneur]}>
                        <Text style={styles.previewAvatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.previewName}>
                        {p.name}{isPreneur ? ' (preneur)' : ''}
                      </Text>
                      <Text style={[
                        styles.previewScore,
                        s > 0 && styles.previewScorePos,
                        s < 0 && styles.previewScoreNeg,
                      ]}>
                        {s > 0 ? '+' : ''}{s}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.validateBtn, !isValid && styles.validateBtnDisabled]}
          onPress={handleValidate}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={styles.validateBtnText}>Valider la donne</Text>
          <MaterialCommunityIcons name="check" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const tg = StyleSheet.create({
  wrapper: { gap: 8 },
  label: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1.1,
  },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent',
  },
  btnActive: { borderColor: RED, backgroundColor: 'rgba(192,57,43,0.2)' },
  btnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  btnTextActive: { color: '#fff' },
});

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

  // Preneur
  playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  playerChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: 'transparent',
  },
  playerChipSelected: { borderColor: RED, backgroundColor: 'rgba(192,57,43,0.2)' },
  playerChipText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  playerChipTextSelected: { color: '#fff' },

  // Contrat
  contractRow: { flexDirection: 'row', gap: 8 },
  contractBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent', gap: 2,
  },
  contractBtnSelected: { borderColor: RED, backgroundColor: 'rgba(192,57,43,0.2)' },
  contractBtnText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  contractBtnTextSelected: { color: '#fff' },
  contractBtnMult: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  contractBtnMultSelected: { color: 'rgba(255,180,180,0.8)' },

  // Bouts & Points
  boutPointsRow: { flexDirection: 'row', gap: 12 },
  boutsGroup: { flex: 1, gap: 8 },
  pointsGroup: { flex: 1, gap: 8 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden',
  },
  stepBtn: {
    width: 40, height: 52, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800', color: '#fff' },
  seuilText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  pointsInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 52,
    fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  pointsInputWon: { borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.1)' },
  pointsInputLost: { borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)' },
  resultBadge: {
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center',
  },
  resultBadgeWon: { backgroundColor: 'rgba(46,204,113,0.2)' },
  resultBadgeLost: { backgroundColor: 'rgba(231,76,60,0.2)' },
  resultBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Primes
  primesCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, gap: 10,
  },
  primeLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  primeDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },
  optionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  optionBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center',
  },
  optionBtnActive: { borderColor: RED, backgroundColor: 'rgba(192,57,43,0.2)' },
  optionBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 15 },
  optionBtnTextActive: { color: '#fff' },
  optionSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', alignSelf: 'center', marginRight: 4 },

  // Aperçu
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  previewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewAvatarPreneur: { backgroundColor: RED },
  previewAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  previewName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  previewScore: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  previewScorePos: { color: '#2ecc71' },
  previewScoreNeg: { color: '#e74c3c' },

  // Footer
  footer: { padding: 16, paddingBottom: 28 },
  validateBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: RED_DARK, borderRadius: 16, padding: 18,
  },
  validateBtnDisabled: { opacity: 0.4 },
  validateBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
