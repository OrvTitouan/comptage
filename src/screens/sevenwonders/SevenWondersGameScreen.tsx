import React, { useState } from 'react';
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
import { Player, GameResult, PlayerResult, PlayerScore } from '../../types';
import { saveResult } from '../../storage/stats';
import PlayerAvatar from '../../components/PlayerAvatar';

const COLOR = '#7D3C98';
const COLOR_DARK = '#5B2C6F';

// ── Catégories dans l'ordre de comptage ──────────────────────────

const STEPS = [
  { key: 'wonder',     label: 'Merveille',               sublabel: 'Points du plateau Merveille',          icon: 'pillar',           color: '#9B59B6', emoji: '🏛️' },
  { key: 'military',   label: 'Conflits militaires',      sublabel: 'Cartes rouges — jetons victoire/défaite', icon: 'sword-cross',    color: '#e74c3c', emoji: '⚔️' },
  { key: 'coins',      label: 'Trésor',                   sublabel: 'Nombre de pièces  (3 pièces = 1 pt)', icon: 'currency-usd',     color: '#f39c12', emoji: '🪙' },
  { key: 'civilian',   label: 'Bâtiments civils',         sublabel: 'Cartes bleues',                        icon: 'home-city-outline',color: '#3498DB', emoji: '🏠' },
  { key: 'science',    label: 'Science',                  sublabel: 'Cartes vertes',                        icon: 'flask-outline',    color: '#2ecc71', emoji: '🔬' },
  { key: 'commercial', label: 'Bâtiments commerciaux',    sublabel: 'Cartes jaunes',                        icon: 'store-outline',    color: '#f39c12', emoji: '🏪' },
  { key: 'guilds',     label: 'Guildes',                  sublabel: 'Cartes violettes',                     icon: 'seal',             color: '#9B59B6', emoji: '🏺' },
] as const;

type StepKey = typeof STEPS[number]['key'];

// ── Types ────────────────────────────────────────────────────────

interface ScoreData {
  wonder: string;
  militarySign: 1 | -1;
  militaryAbs: string;
  coins: string;
  civilian: string;
  compasses: string;
  tablets: string;
  gears: string;
  commercial: string;
  guilds: string;
}

function emptyScore(): ScoreData {
  return {
    wonder: '', militarySign: 1, militaryAbs: '', coins: '',
    civilian: '', compasses: '', tablets: '', gears: '',
    commercial: '', guilds: '',
  };
}

function scienceScore(c: number, t: number, g: number): number {
  return c * c + t * t + g * g + 7 * Math.min(c, t, g);
}

function computeTotal(s: ScoreData): number {
  return (
    (parseInt(s.wonder) || 0) +
    s.militarySign * (parseInt(s.militaryAbs) || 0) +
    Math.floor((parseInt(s.coins) || 0) / 3) +
    (parseInt(s.civilian) || 0) +
    scienceScore(parseInt(s.compasses) || 0, parseInt(s.tablets) || 0, parseInt(s.gears) || 0) +
    (parseInt(s.commercial) || 0) +
    (parseInt(s.guilds) || 0)
  );
}

function categoryPoints(s: ScoreData, key: StepKey): number {
  switch (key) {
    case 'wonder':     return parseInt(s.wonder) || 0;
    case 'military':   return s.militarySign * (parseInt(s.militaryAbs) || 0);
    case 'coins':      return Math.floor((parseInt(s.coins) || 0) / 3);
    case 'civilian':   return parseInt(s.civilian) || 0;
    case 'science':    return scienceScore(parseInt(s.compasses) || 0, parseInt(s.tablets) || 0, parseInt(s.gears) || 0);
    case 'commercial': return parseInt(s.commercial) || 0;
    case 'guilds':     return parseInt(s.guilds) || 0;
  }
}

// ── Props ────────────────────────────────────────────────────────

interface Props {
  players: Player[];
  onEnd: () => void;
  onGoHome: () => void;
  onMeta: (scores: PlayerScore[]) => void;
}

// ── Main component ───────────────────────────────────────────────

export default function SevenWondersGameScreen({ players, onEnd, onGoHome, onMeta }: Props) {
  const [scores, setScores] = useState<Record<string, ScoreData>>(
    Object.fromEntries(players.map((p) => [p.id, emptyScore()])),
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<'input' | 'results'>('input');
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIdx];
  const isLastStep = stepIdx === STEPS.length - 1;

  const update = (playerId: string, field: keyof ScoreData, value: string | number) => {
    setScores((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
  };

  const handleNext = () => {
    const meta: PlayerScore[] = players.map((p) => ({
      playerId: p.id, playerName: p.name, score: computeTotal(scores[p.id]),
    }));
    onMeta(meta);

    if (isLastStep) {
      setPhase('results');
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (phase === 'results') {
      setPhase('input');
    } else if (stepIdx === 0) {
      onGoHome();
    } else {
      setStepIdx((i) => i - 1);
    }
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);

    const totals = players.map((p) => ({
      player: p,
      total: computeTotal(scores[p.id]),
      coins: parseInt(scores[p.id].coins) || 0,
    }));

    const sorted = [...totals].sort((a, b) =>
      b.total !== a.total ? b.total - a.total : b.coins - a.coins,
    );
    const winner = sorted[0];

    const result: GameResult = {
      id: Date.now().toString(),
      gameId: '7wonders',
      gameName: '7 Wonders',
      date: new Date().toISOString(),
      rounds: 3,
      playerResults: totals.map((x) => ({
        playerId: x.player.id,
        playerName: x.player.name,
        score: x.total,
        winner: x.player.id === winner.player.id,
      })),
    };

    try { await saveResult(result); } catch {}
    onEnd();
  };

  // ── Results screen ───────────────────────────────────────────

  if (phase === 'results') {
    const sorted = players
      .map((p) => ({ player: p, s: scores[p.id], total: computeTotal(scores[p.id]), coins: parseInt(scores[p.id].coins) || 0 }))
      .sort((a, b) => (b.total !== a.total ? b.total - a.total : b.coins - a.coins));

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Résultats finaux</Text>
            <Text style={styles.headerSub}>7 Wonders</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Podium */}
          {sorted.map((item, idx) => (
            <View key={item.player.id} style={[styles.resultRow, idx === 0 && styles.resultRowFirst]}>
              <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                {idx === 0
                  ? <MaterialCommunityIcons name="crown" size={18} color="#1a1a2e" />
                  : <Text style={styles.rankText}>#{idx + 1}</Text>}
              </View>
              <Text style={[styles.resultName, idx === 0 && styles.resultNameFirst]}>
                {item.player.name}
              </Text>
              <View style={styles.resultRight}>
                <Text style={[styles.resultScore, idx === 0 && styles.resultScoreFirst]}>
                  {item.total} pts
                </Text>
                <Text style={styles.resultCoins}>{item.coins} pièces</Text>
              </View>
            </View>
          ))}

          {/* Détail par catégorie */}
          <Text style={styles.sectionLabel}>Détail par catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              {/* En-tête */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tablePlayerCell, styles.tableCellHeader]}>
                  Joueur
                </Text>
                {STEPS.map((s) => (
                  <Text key={s.key} style={[styles.tableCell, styles.tableCellHeader, { color: s.color }]}>
                    {s.emoji}
                  </Text>
                ))}
                <Text style={[styles.tableCell, styles.tableTotalCell, styles.tableCellHeader]}>
                  Total
                </Text>
              </View>
              {/* Lignes joueurs */}
              {sorted.map(({ player, s }) => (
                <View key={player.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tablePlayerCell]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  {STEPS.map((step) => {
                    const pts = categoryPoints(s, step.key);
                    return (
                      <Text key={step.key} style={[styles.tableCell, pts < 0 && { color: '#e74c3c' }]}>
                        {pts}
                      </Text>
                    );
                  })}
                  <Text style={[styles.tableCell, styles.tableTotalCell]}>{computeTotal(s)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Légende */}
          <View style={styles.legend}>
            {STEPS.map((s) => (
              <Text key={s.key} style={styles.legendItem}>
                {s.emoji}  {s.label}
              </Text>
            ))}
            <Text style={styles.legendItem}>🪙  Trésor = nombre de pièces ÷ 3</Text>
            <Text style={styles.legendItem}>🔬  Science = c²+t²+g² + 7×min(c,t,g)</Text>
            <Text style={styles.legendNote}>Égalité : le plus de pièces l'emporte</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
            disabled={saving}
          >
            <MaterialCommunityIcons name="trophy" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Terminer la partie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Input screen (catégorie par catégorie) ───────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.stepIconRow}>
            <MaterialCommunityIcons name={step.icon as any} size={20} color={step.color} />
            <Text style={styles.title}>{step.label}</Text>
          </View>
          <Text style={styles.headerSub}>{stepIdx + 1} / {STEPS.length} — {step.sublabel}</Text>
        </View>
        <TouchableOpacity onPress={onGoHome} style={styles.backButton}>
          <MaterialCommunityIcons name="home-outline" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(stepIdx / STEPS.length) * 100}%` as any, backgroundColor: step.color }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Récap running totals */}
          <View style={styles.totalsRow}>
            {players.map((p) => (
              <View key={p.id} style={styles.totalChip}>
                <Text style={styles.totalChipName} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                <Text style={styles.totalChipScore}>{computeTotal(scores[p.id])}</Text>
              </View>
            ))}
          </View>

          {/* Saisie catégorie pour chaque joueur */}
          {step.key === 'military' && players.map((p) => (
            <MilitaryRow
              key={p.id}
              player={p}
              sign={scores[p.id].militarySign}
              abs={scores[p.id].militaryAbs}
              onSignChange={(v) => update(p.id, 'militarySign', v)}
              onAbsChange={(v) => update(p.id, 'militaryAbs', v)}
            />
          ))}

          {step.key === 'coins' && players.map((p) => (
            <CoinsRow
              key={p.id}
              player={p}
              value={scores[p.id].coins}
              onChange={(v) => update(p.id, 'coins', v)}
            />
          ))}

          {step.key === 'science' && players.map((p) => (
            <ScienceRow
              key={p.id}
              player={p}
              compasses={scores[p.id].compasses}
              tablets={scores[p.id].tablets}
              gears={scores[p.id].gears}
              onCompasses={(v) => update(p.id, 'compasses', v)}
              onTablets={(v) => update(p.id, 'tablets', v)}
              onGears={(v) => update(p.id, 'gears', v)}
            />
          ))}

          {step.key !== 'military' && step.key !== 'coins' && step.key !== 'science' && players.map((p) => (
            <SimpleRow
              key={p.id}
              player={p}
              color={step.color}
              value={(scores[p.id] as any)[step.key] as string}
              onChange={(v) => update(p.id, step.key as keyof ScoreData, v)}
            />
          ))}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: step.color }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>
            {isLastStep ? 'Voir les résultats' : 'Catégorie suivante'}
          </Text>
          <MaterialCommunityIcons name={isLastStep ? 'trophy' : 'arrow-right'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Sous-composants ──────────────────────────────────────────────

function SimpleRow({ player, color, value, onChange }: {
  player: Player; color: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.playerRow}>
      <PlayerAvatar name={player.name} photoUri={player.photoUri} size={36} color={color} />
      <Text style={styles.playerName}>{player.name}</Text>
      <TextInput
        style={styles.pointsInput}
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />
      <Text style={styles.ptsLabel}>pts</Text>
    </View>
  );
}

function MilitaryRow({ player, sign, abs, onSignChange, onAbsChange }: {
  player: Player;
  sign: 1 | -1;
  abs: string;
  onSignChange: (v: 1 | -1) => void;
  onAbsChange: (v: string) => void;
}) {
  const val = sign * (parseInt(abs) || 0);
  return (
    <View style={styles.playerRow}>
      <PlayerAvatar name={player.name} photoUri={player.photoUri} size={36} color="#e74c3c" />
      <Text style={styles.playerName}>{player.name}</Text>
      <TouchableOpacity
        style={[styles.signBtn, sign === 1 && styles.signBtnPos]}
        onPress={() => onSignChange(1)}
      >
        <Text style={[styles.signBtnText, sign === 1 && styles.signBtnPosText]}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.signBtn, sign === -1 && styles.signBtnNeg]}
        onPress={() => onSignChange(-1)}
      >
        <Text style={[styles.signBtnText, sign === -1 && styles.signBtnNegText]}>−</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.pointsInput}
        value={abs}
        onChangeText={(v) => onAbsChange(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />
      <Text style={[styles.signResult, val < 0 && { color: '#e74c3c' }]}>
        {val > 0 ? '+' : ''}{val}
      </Text>
    </View>
  );
}

function CoinsRow({ player, value, onChange }: {
  player: Player; value: string; onChange: (v: string) => void;
}) {
  const pts = Math.floor((parseInt(value) || 0) / 3);
  return (
    <View style={styles.playerRow}>
      <PlayerAvatar name={player.name} photoUri={player.photoUri} size={36} color="#f39c12" />
      <Text style={styles.playerName}>{player.name}</Text>
      <TextInput
        style={styles.pointsInput}
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />
      <Text style={styles.ptsLabel}>🪙</Text>
      <Text style={styles.coinConvert}>= {pts} pt{pts !== 1 ? 's' : ''}</Text>
    </View>
  );
}

function ScienceRow({ player, compasses, tablets, gears, onCompasses, onTablets, onGears }: {
  player: Player;
  compasses: string; tablets: string; gears: string;
  onCompasses: (v: string) => void;
  onTablets: (v: string) => void;
  onGears: (v: string) => void;
}) {
  const c = parseInt(compasses) || 0;
  const t = parseInt(tablets) || 0;
  const g = parseInt(gears) || 0;
  const pts = scienceScore(c, t, g);

  return (
    <View style={styles.scienceCard}>
      <View style={styles.scienceCardHeader}>
        <PlayerAvatar name={player.name} photoUri={player.photoUri} size={36} color="#2ecc71" />
        <Text style={styles.playerName}>{player.name}</Text>
        <View style={styles.sciencePtsChip}>
          <Text style={styles.sciencePtsText}>{pts} pts</Text>
        </View>
      </View>
      <View style={styles.scienceInputRow}>
        <ScienceSymbol emoji="🧭" label="Compas" value={compasses} onChange={onCompasses} />
        <ScienceSymbol emoji="📋" label="Tablette" value={tablets} onChange={onTablets} />
        <ScienceSymbol emoji="⚙️" label="Rouage" value={gears} onChange={onGears} />
      </View>
      <Text style={styles.scienceFormula}>
        {c}²+{t}²+{g}² + 7×min({c},{t},{g}) = {pts}
      </Text>
    </View>
  );
}

function ScienceSymbol({ emoji, label, value, onChange }: {
  emoji: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.scienceSymbol}>
      <Text style={styles.scienceEmoji}>{emoji}</Text>
      <Text style={styles.scienceLabel}>{label}</Text>
      <TextInput
        style={styles.scienceInput}
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.2)"
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

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
  headerCenter: { alignItems: 'center', flex: 1 },
  stepIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, textAlign: 'center' },

  progressBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20, borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 2 },

  scrollContent: { padding: 20, gap: 10, paddingBottom: 40 },

  // Running totals strip
  totalsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4,
  },
  totalChip: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 2,
  },
  totalChipName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', maxWidth: 70 },
  totalChipScore: { fontSize: 16, fontWeight: '900', color: '#fff' },

  // Generic player row
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14,
  },
  playerName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  pointsInput: {
    width: 72, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  ptsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.35)', width: 26 },

  // Coins
  coinConvert: { fontSize: 13, fontWeight: '700', color: '#f39c12', minWidth: 48 },

  // Military
  signBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  signBtnPos: { backgroundColor: 'rgba(46,204,113,0.2)', borderColor: '#2ecc71' },
  signBtnNeg: { backgroundColor: 'rgba(231,76,60,0.2)', borderColor: '#e74c3c' },
  signBtnText: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.3)' },
  signBtnPosText: { color: '#2ecc71' },
  signBtnNegText: { color: '#e74c3c' },
  signResult: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.5)', minWidth: 36, textAlign: 'right' },

  // Science card
  scienceCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, gap: 10,
  },
  scienceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sciencePtsChip: {
    backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  sciencePtsText: { fontSize: 15, fontWeight: '800', color: '#2ecc71' },
  scienceInputRow: { flexDirection: 'row', gap: 8 },
  scienceSymbol: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 10,
  },
  scienceEmoji: { fontSize: 20 },
  scienceLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  scienceInput: {
    width: 56, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingVertical: 6,
    fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  scienceFormula: {
    fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center',
  },

  // Results
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  resultRowFirst: { backgroundColor: COLOR + '22', borderWidth: 1, borderColor: COLOR + '55' },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  rankBadgeFirst: { backgroundColor: '#f39c12' },
  rankText: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  resultName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  resultNameFirst: { fontWeight: '900' },
  resultRight: { alignItems: 'flex-end', gap: 2 },
  resultScore: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  resultScoreFirst: { color: '#f39c12' },
  resultCoins: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  // Table
  table: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tableHeaderRow: { backgroundColor: 'rgba(255,255,255,0.04)' },
  tableCell: {
    width: 52, paddingVertical: 10, paddingHorizontal: 2,
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  },
  tableCellHeader: { fontSize: 18, paddingVertical: 8 },
  tablePlayerCell: { width: 86, textAlign: 'left', paddingLeft: 10, fontSize: 13 },
  tableTotalCell: { fontWeight: '900', color: '#fff', width: 58 },

  // Legend
  legend: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, gap: 4, marginTop: 4,
  },
  legendItem: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 22 },
  legendNote: { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', marginTop: 4 },

  footer: { padding: 16, paddingBottom: 28 },
  actionBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, backgroundColor: COLOR_DARK, borderRadius: 16, padding: 18,
  },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
