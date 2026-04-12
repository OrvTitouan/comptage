import React, { useEffect, useState, useMemo } from 'react';
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
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GameResult, GameId, Group, ActiveGameState } from '../types';
import { loadResults, computeStats, PlayerStats, deleteResult, importResults, updateResultComment } from '../storage/stats';
import { loadGroups } from '../storage/groups';
import { GAMES } from '../constants/games';

interface StatsScreenProps {
  onBack: () => void;
  activeGames?: ActiveGameState[];
}

type Tab = 'history' | 'trophies' | 'games';
type StatsView = 'selectGroup' | 'stats';

const GAME_COLORS: Record<GameId, string> = {
  flip7: '#e74c3c',
  papayoo: '#f39c12',
  'skull-king': '#2980b9',
  farway: '#27ae60',
  tarot: '#c0392b',
};

const GAME_ICONS: Record<GameId, string> = {
  flip7: 'cards-playing-outline',
  papayoo: 'cards-playing',
  'skull-king': 'skull-crossbones',
  farway: 'map-search-outline',
  tarot: 'cards-heart',
};

const GROUP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function StatsScreen({ onBack, activeGames = [] }: StatsScreenProps) {
  const [view, setView] = useState<StatsView>('selectGroup');
  const [tab, setTab] = useState<Tab>('trophies');
  const [allResults, setAllResults] = useState<GameResult[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [gameFilter, setGameFilter] = useState<GameId | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [commentResultId, setCommentResultId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const reload = async () => {
    const [r, g] = await Promise.all([loadResults(), loadGroups()]);
    setAllResults(r);
    setGroups(g);
  };

  useEffect(() => { reload(); }, []);

  // ── Résultats provisoires (parties en cours) ─────────────────

  const provisionalResults = useMemo((): GameResult[] => {
    return activeGames
      .filter((ag) => ag.currentScores && ag.currentScores.length > 0)
      .map((ag) => {
        const scores = ag.currentScores!;
        const isLowWins = ag.game.id === 'papayoo';
        const sorted = [...scores].sort((a, b) => isLowWins ? a.score - b.score : b.score - a.score);
        const topScore = sorted[0].score;
        return {
          id: `__active__${ag.id}`,
          gameId: ag.game.id,
          gameName: ag.game.name,
          date: new Date().toISOString(),
          rounds: ag.totalRounds,
          playerResults: scores.map((s) => ({
            playerId: s.playerId,
            playerName: s.playerName,
            score: s.score,
            winner: s.score === topScore,
          })),
        };
      });
  }, [activeGames]);

  // ── Filtrage ─────────────────────────────────────────────────

  const filteredResults = useMemo(() => {
    let r = allResults;
    if (selectedGroup) {
      r = r.filter((result) =>
        result.playerResults.every((pr) => selectedGroup.memberIds.includes(pr.playerId))
      );
    }
    if (gameFilter) {
      r = r.filter((result) => result.gameId === gameFilter);
    }
    const matching = provisionalResults.filter((pr) => {
      const groupMatch = !selectedGroup ||
        pr.playerResults.every((p) => selectedGroup.memberIds.includes(p.playerId));
      const gameMatch = !gameFilter || pr.gameId === gameFilter;
      return groupMatch && gameMatch;
    });
    return [...matching, ...r];
  }, [allResults, selectedGroup, gameFilter, provisionalResults]);

  const filteredStats = useMemo(() => computeStats(filteredResults), [filteredResults]);

  // ── Actions ──────────────────────────────────────────────────

  const handleDelete = (result: GameResult) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer cette partie ?\n${result.gameName} du ${formatDate(result.date)}`)) {
        deleteResult(result.id).then(reload);
      }
    } else {
      Alert.alert('Supprimer cette partie ?', `${result.gameName} du ${formatDate(result.date)}`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => { await deleteResult(result.id); await reload(); },
        },
      ]);
    }
  };

  const openComment = (result: GameResult) => {
    setCommentDraft(result.comment ?? '');
    setCommentResultId(result.id);
  };

  const saveComment = async () => {
    if (!commentResultId) return;
    await updateResultComment(commentResultId, commentDraft);
    setCommentResultId(null);
    await reload();
  };

  const handleExport = async () => {
    if (allResults.length === 0) { Alert.alert('Aucune partie', "Il n'y a rien à exporter."); return; }
    const json = JSON.stringify(allResults, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parties-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: json, title: 'Parties Kounter' });
    }
  };

  const handleImport = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        await processImport(await file.text());
      };
      document.body.appendChild(input); input.click(); document.body.removeChild(input);
    } else {
      setImportText(''); setShowImportModal(true);
    }
  };

  const processImport = async (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error();
      const merged = await importResults(parsed as GameResult[]);
      const added = parsed.filter((r: any) => !allResults.some((e) => e.id === r.id)).length;
      setAllResults(merged);
      Alert.alert('Import réussi', `${added} nouvelle(s) partie(s) ajoutée(s).`);
    } catch {
      Alert.alert('Erreur', "Fichier invalide. Vérifiez que c'est bien un export de l'application.");
    }
  };

  // ── ÉCRAN SÉLECTION GROUPE ────────────────────────────────────

  if (view === 'selectGroup') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Statistiques</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Toutes les parties */}
          <TouchableOpacity
            style={styles.groupSelectAll}
            onPress={() => { setSelectedGroup(null); setGameFilter(null); setView('stats'); }}
            activeOpacity={0.8}
          >
            <View style={styles.groupSelectAllIcon}>
              <MaterialCommunityIcons name="earth" size={28} color="#fff" />
            </View>
            <View style={styles.groupSelectInfo}>
              <Text style={styles.groupSelectName}>Toutes les parties</Text>
              <Text style={styles.groupSelectSub}>
                {allResults.length + provisionalResults.length} partie{(allResults.length + provisionalResults.length) > 1 ? 's' : ''}{provisionalResults.length > 0 ? ` (${provisionalResults.length} en cours)` : ` enregistrée${allResults.length > 1 ? 's' : ''}`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          {groups.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Mes groupes</Text>
              {groups.map((group, idx) => {
                const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                const groupResults = allResults.filter((r) =>
                  r.playerResults.every((pr) => group.memberIds.includes(pr.playerId))
                );
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupSelectCard, { borderLeftColor: color }]}
                    onPress={() => { setSelectedGroup(group); setGameFilter(null); setView('stats'); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.groupSelectDot, { backgroundColor: color }]}>
                      <MaterialCommunityIcons name="account-group" size={18} color="#fff" />
                    </View>
                    <View style={styles.groupSelectInfo}>
                      <Text style={styles.groupSelectName}>{group.name}</Text>
                      <Text style={styles.groupSelectSub}>
                        {group.memberIds.length} membre{group.memberIds.length > 1 ? 's' : ''} · {groupResults.length} partie{groupResults.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {groups.length === 0 && (
            <View style={styles.noGroupHint}>
              <MaterialCommunityIcons name="information-outline" size={18} color="rgba(255,255,255,0.25)" />
              <Text style={styles.noGroupHintText}>
                Créez des groupes dans Profils pour filtrer les stats par groupe de joueurs.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ÉCRAN STATS (avec filtres) ────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView('selectGroup')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Statistiques</Text>
          {selectedGroup && (
            <Text style={styles.headerGroupName}>{selectedGroup.name}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets principaux */}
      <View style={styles.tabs}>
        {([['trophies', 'trophy', 'Trophées'], ['games', 'account-group', 'Parties'], ['history', 'history', 'Historique']] as const).map(([t, icon, label]) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <MaterialCommunityIcons name={icon as any} size={16} color={tab === t ? '#fff' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtre par jeu */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.gameFilterScroll}
        contentContainerStyle={styles.gameFilterContent}
      >
        <TouchableOpacity
          style={[styles.gameFilterPill, gameFilter === null && styles.gameFilterPillActive]}
          onPress={() => setGameFilter(null)}
        >
          <Text style={[styles.gameFilterText, gameFilter === null && styles.gameFilterTextActive]}>Tous</Text>
        </TouchableOpacity>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameFilterPill,
              gameFilter === game.id && styles.gameFilterPillActive,
              gameFilter === game.id && { backgroundColor: GAME_COLORS[game.id] + '33', borderColor: GAME_COLORS[game.id] },
            ]}
            onPress={() => setGameFilter(gameFilter === game.id ? null : game.id)}
          >
            <MaterialCommunityIcons
              name={GAME_ICONS[game.id] as any}
              size={13}
              color={gameFilter === game.id ? GAME_COLORS[game.id] : 'rgba(255,255,255,0.4)'}
            />
            <Text style={[
              styles.gameFilterText,
              gameFilter === game.id && { color: GAME_COLORS[game.id] },
            ]}>
              {game.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── TROPHÉES ── */}
        {tab === 'trophies' && (
          <>
            {filteredStats.length === 0
              ? <EmptyState icon="trophy-outline" text="Aucune victoire" sub="Terminez une partie pour voir les trophées" />
              : filteredStats.map((s, index) => (
                <View key={s.playerId} style={styles.card}>
                  <View style={styles.playerRow}>
                    {index === 0 && <MaterialCommunityIcons name="crown" size={18} color="#f39c12" style={{ marginRight: 4 }} />}
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{s.playerName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.playerName}>{s.playerName}</Text>
                    <View style={styles.totalWins}>
                      <MaterialCommunityIcons name="trophy" size={14} color="#f39c12" />
                      <Text style={styles.totalWinsText}>{s.wins} victoire{s.wins > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.gameBreakdown}>
                    {GAMES.map((game) => {
                      const wins = s.winsByGame[game.id] ?? 0;
                      if (wins === 0) return null;
                      return (
                        <View key={game.id} style={[styles.gameBadge, { backgroundColor: GAME_COLORS[game.id] + '33', borderColor: GAME_COLORS[game.id] + '88' }]}>
                          <MaterialCommunityIcons name={GAME_ICONS[game.id] as any} size={13} color={GAME_COLORS[game.id]} />
                          <Text style={[styles.gameBadgeText, { color: GAME_COLORS[game.id] }]}>{game.name} ×{wins}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            }
          </>
        )}

        {/* ── PARTIES JOUÉES ── */}
        {tab === 'games' && (
          <>
            {filteredStats.length === 0
              ? <EmptyState icon="cards-outline" text="Aucune partie" sub="Terminez une partie pour voir les stats" />
              : filteredStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed).map((s) => (
                <View key={s.playerId} style={styles.card}>
                  <View style={styles.playerRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{s.playerName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.playerName}>{s.playerName}</Text>
                    <Text style={styles.gamesCount}>{s.gamesPlayed} partie{s.gamesPlayed > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.gameBreakdown}>
                    {GAMES.map((game) => {
                      const played = s.gamesByGame[game.id] ?? 0;
                      const wins = s.winsByGame[game.id] ?? 0;
                      if (played === 0) return null;
                      return (
                        <View key={game.id} style={[styles.gameBadge, { backgroundColor: GAME_COLORS[game.id] + '22', borderColor: GAME_COLORS[game.id] + '66' }]}>
                          <MaterialCommunityIcons name={GAME_ICONS[game.id] as any} size={13} color={GAME_COLORS[game.id]} />
                          <Text style={[styles.gameBadgeText, { color: GAME_COLORS[game.id] }]}>
                            {game.name} · {played}J / {wins}V
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            }
          </>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === 'history' && (
          <>
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
                <MaterialCommunityIcons name="export" size={16} color="#fff" />
                <Text style={styles.exportBtnText}>Exporter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, styles.importBtn]} onPress={handleImport} activeOpacity={0.8}>
                <MaterialCommunityIcons name="import" size={16} color="#fff" />
                <Text style={styles.exportBtnText}>Importer</Text>
              </TouchableOpacity>
            </View>

            {filteredResults.length === 0
              ? <EmptyState icon="history" text="Aucune partie" sub="L'historique apparaîtra ici" />
              : filteredResults.map((result) => {
                const isActive = result.id.startsWith('__active__');
                const leader = result.playerResults.find((p) => p.winner);
                const sorted = [...result.playerResults].sort((a, b) =>
                  result.gameId === 'papayoo' ? a.score - b.score : b.score - a.score
                );
                return (
                  <View key={result.id} style={[styles.historyCard, isActive && styles.historyCardActive]}>
                    <View style={styles.historyHeader}>
                      <View style={[styles.gameIcon, { backgroundColor: GAME_COLORS[result.gameId] }]}>
                        <MaterialCommunityIcons name={GAME_ICONS[result.gameId] as any} size={18} color="#fff" />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyGame}>{result.gameName}</Text>
                        {isActive
                          ? <Text style={[styles.historyMeta, styles.historyMetaActive]}>En cours</Text>
                          : <Text style={styles.historyMeta}>
                              {formatDate(result.date)} · {result.rounds} manche{result.rounds > 1 ? 's' : ''}
                            </Text>
                        }
                      </View>
                      {leader && (
                        <View style={[styles.historyWinner, isActive && styles.historyWinnerActive]}>
                          <MaterialCommunityIcons name={isActive ? 'crown' : 'trophy'} size={13} color={isActive ? '#2ecc71' : '#f39c12'} />
                          <Text style={[styles.historyWinnerName, isActive && styles.historyWinnerNameActive]}>{leader.playerName}</Text>
                        </View>
                      )}
                      {!isActive && (
                        <TouchableOpacity
                          style={styles.commentBtn}
                          onPress={() => openComment(result)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons
                            name={result.comment ? 'comment-text' : 'comment-plus-outline'}
                            size={18}
                            color={result.comment ? '#3498db' : 'rgba(255,255,255,0.3)'}
                          />
                        </TouchableOpacity>
                      )}
                      {!isActive && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(result)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.historyScores}>
                      {sorted.map((pr, i) => (
                        <View key={pr.playerId} style={styles.historyScoreRow}>
                          <Text style={styles.historyRank}>#{i + 1}</Text>
                          <Text style={styles.historyPlayerName}>{pr.playerName}</Text>
                          <Text style={[styles.historyScore, pr.winner && styles.historyScoreWinner, isActive && pr.winner && styles.historyScoreLeader]}>
                            {pr.score} pts
                          </Text>
                        </View>
                      ))}
                      {result.comment ? (
                        <TouchableOpacity
                          style={styles.commentBubble}
                          onPress={() => !isActive && openComment(result)}
                          activeOpacity={isActive ? 1 : 0.7}
                        >
                          <MaterialCommunityIcons name="comment-text-outline" size={13} color="#3498db" />
                          <Text style={styles.commentText}>{result.comment}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            }
          </>
        )}
      </ScrollView>

      {/* Modal commentaire */}
      <Modal visible={!!commentResultId} transparent animationType="slide" onRequestClose={() => setCommentResultId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Commentaire</Text>
            <TextInput
              style={[styles.modalInput, { height: 120, textAlignVertical: 'top', fontSize: 15 }]}
              multiline
              placeholder="Ajouter un commentaire sur cette partie…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={commentDraft}
              onChangeText={setCommentDraft}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setCommentResultId(null)}>
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={saveComment}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal import natif */}
      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer des parties</Text>
            <Text style={styles.modalSub}>Collez le contenu du fichier JSON exporté :</Text>
            <TextInput
              style={styles.modalInput}
              multiline numberOfLines={8}
              placeholder="Collez le JSON ici..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={importText}
              onChangeText={setImportText}
              autoCapitalize="none" autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowImportModal(false)}>
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={async () => { setShowImportModal(false); await processImport(importText); }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Importer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <View style={emptyStyles.container}>
      <MaterialCommunityIcons name={icon as any} size={64} color="rgba(255,255,255,0.15)" />
      <Text style={emptyStyles.text}>{text}</Text>
      <Text style={emptyStyles.sub}>{sub}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, gap: 10 },
  text: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.25)' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.15)', textAlign: 'center' },
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
  headerGroupName: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  // Sélection groupe
  groupSelectAll: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  groupSelectAllIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  groupSelectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 16,
    borderLeftWidth: 4, marginBottom: 2,
  },
  groupSelectDot: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  groupSelectInfo: { flex: 1 },
  groupSelectName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  groupSelectSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8,
  },
  noGroupHint: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginTop: 12,
  },
  noGroupHintText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 19 },

  // Onglets
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#fff' },

  // Filtre jeux
  gameFilterScroll: { maxHeight: 44 },
  gameFilterContent: {
    paddingHorizontal: 20, paddingBottom: 8, gap: 8, alignItems: 'center',
  },
  gameFilterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'transparent',
  },
  gameFilterPillActive: { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)' },
  gameFilterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  gameFilterTextActive: { color: '#fff' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 10, paddingTop: 4 },

  // Trophées & Parties
  card: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, gap: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  totalWins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalWinsText: { fontSize: 14, fontWeight: '700', color: '#f39c12' },
  gamesCount: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  gameBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gameBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  gameBadgeText: { fontSize: 12, fontWeight: '700' },

  // Historique
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(46,213,115,0.2)', borderRadius: 12,
    paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(46,213,115,0.4)',
  },
  importBtn: { backgroundColor: 'rgba(52,152,219,0.2)', borderColor: 'rgba(52,152,219,0.4)' },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' },
  historyCardActive: { borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)', backgroundColor: 'rgba(46,204,113,0.06)' },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  gameIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyGame: { fontSize: 15, fontWeight: '800', color: '#fff' },
  historyMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  historyMetaActive: { color: '#2ecc71', fontWeight: '700' },
  historyWinner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(243,156,18,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  historyWinnerActive: { backgroundColor: 'rgba(46,204,113,0.15)' },
  historyWinnerName: { fontSize: 12, fontWeight: '700', color: '#f39c12' },
  historyWinnerNameActive: { color: '#2ecc71' },
  historyScoreLeader: { color: '#2ecc71' },
  commentBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  commentBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(52,152,219,0.08)',
    borderRadius: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  historyScores: { padding: 12, gap: 6 },
  historyScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  historyRank: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', width: 24 },
  historyPlayerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  historyScore: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  historyScoreWinner: { color: '#f39c12' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 12, fontFamily: 'monospace',
    height: 160, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.1)' },
  modalBtnConfirm: { backgroundColor: '#3498db' },
  modalBtnText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
});
