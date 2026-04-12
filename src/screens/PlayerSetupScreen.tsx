import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Game, Group, Player, Profile } from '../types';
import { loadProfiles, addProfile } from '../storage/profiles';
import { loadGroups } from '../storage/groups';

interface PlayerSetupScreenProps {
  game: Game;
  onBack: () => void;
  onStart: (players: Player[], totalRounds: number, groupName?: string, customGameName?: string) => void;
}

const ROUND_OPTIONS = [3, 5, 10];
type Tab = 'joueurs' | 'groupes';

const PAPAYOO_DEAL: Record<number, { cards: number; exchange: number; note?: string }> = {
  3: { cards: 20, exchange: 5 },
  4: { cards: 15, exchange: 5 },
  5: { cards: 12, exchange: 4 },
  6: { cards: 10, exchange: 3 },
  7: { cards: 8,  exchange: 3, note: '*' },
  8: { cards: 7,  exchange: 3, note: '*' },
};

export default function PlayerSetupScreen({ game, onBack, onStart }: PlayerSetupScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [totalRounds, setTotalRounds] = useState(5);
  const [tab, setTab] = useState<Tab>('joueurs');

  // Nom personnalisé (mode classic)
  const [customGameName, setCustomGameName] = useState('');

  // Création rapide de joueur
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const newPlayerInputRef = useRef<TextInput>(null);

  const reload = async () => {
    const p = await loadProfiles();
    setProfiles(p);
    return p;
  };

  useEffect(() => {
    reload();
    loadGroups().then(setGroups);
  }, []);

  const togglePlayer = (profile: Profile) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profile.id)) next.delete(profile.id);
      else next.add(profile.id);
      return next;
    });
  };

  const handleCreatePlayer = async () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    const newProfile = await addProfile(trimmed);
    await reload();
    setSelectedIds((prev) => new Set([...prev, newProfile.id]));
    setNewPlayerName('');
    setShowNewPlayer(false);
  };

  const openNewPlayer = () => {
    setShowNewPlayer(true);
    setTimeout(() => newPlayerInputRef.current?.focus(), 100);
  };

  const selectGroup = (group: Group) => {
    setSelectedGroupId(group.id);
  };

  const handleStart = () => {
    if (tab === 'groupes') {
      if (!selectedGroupId) {
        Alert.alert('Aucun groupe sélectionné', 'Choisissez un groupe pour lancer la partie.');
        return;
      }
      const group = groups.find((g) => g.id === selectedGroupId)!;
      const players: Player[] = profiles
        .filter((p) => group.memberIds.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name }));
      onStart(players, totalRounds, group.name, customGameName || undefined);
    } else {
      if (selectedIds.size < 1) {
        Alert.alert('Aucun joueur', 'Sélectionnez au moins un joueur pour lancer la partie.');
        return;
      }
      const players: Player[] = profiles
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name }));
      onStart(players, totalRounds, undefined, customGameName || undefined);
    }
  };

  const getGroupMemberNames = (group: Group) =>
    profiles.filter((p) => group.memberIds.includes(p.id)).map((p) => p.name).join(', ');

  const isOutOfRange = (group: Group) =>
    group.memberIds.length < game.minPlayers || group.memberIds.length > game.maxPlayers;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{game.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'joueurs' && styles.tabActive]}
          onPress={() => setTab('joueurs')}
        >
          <MaterialCommunityIcons name="account-multiple" size={16} color={tab === 'joueurs' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'joueurs' && styles.tabTextActive]}>Joueurs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'groupes' && styles.tabActive]}
          onPress={() => setTab('groupes')}
        >
          <MaterialCommunityIcons name="account-group" size={16} color={tab === 'groupes' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'groupes' && styles.tabTextActive]}>Groupes</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Nom du jeu — mode classic uniquement */}
          {game.id === 'classic' && (
            <>
              <Text style={styles.sectionLabel}>Nom du jeu</Text>
              <TextInput
                style={styles.classicNameInput}
                value={customGameName}
                onChangeText={setCustomGameName}
                placeholder="Ex : Uno, Rummikub…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="words"
                returnKeyType="done"
              />
            </>
          )}

          {/* Nombre de manches */}
          {game.id !== 'flip7' && game.id !== 'farway' && game.id !== 'skull-king' && game.id !== 'tarot' && game.id !== '7wonders' && game.id !== 'skyjo' && game.id !== 'catan' && game.id !== 'classic' && game.id !== '6quiprend' && (
            <>
              <Text style={styles.sectionLabel}>Nombre de manches</Text>
              <View style={styles.roundsRow}>
                {ROUND_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.roundOption, totalRounds === n && styles.roundOptionSelected]}
                    onPress={() => setTotalRounds(n)}
                  >
                    <Text style={[styles.roundOptionText, totalRounds === n && styles.roundOptionTextSelected]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {tab === 'joueurs' ? (
            <>
              <Text style={styles.sectionLabel}>
                Joueurs ({selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''} · conseillé {game.minPlayers}–{game.maxPlayers})
              </Text>

              {profiles.length === 0 && !showNewPlayer ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="account-off" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>Aucun profil disponible</Text>
                </View>
              ) : (
                profiles.map((profile) => {
                  const selected = selectedIds.has(profile.id);
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={[styles.profileCard, selected && styles.profileCardSelected]}
                      onPress={() => togglePlayer(profile)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.avatar, selected && styles.avatarSelected]}>
                        <Text style={styles.avatarText}>
                          {(profile.name || '??').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.profileName}>{profile.name || 'Profil sans nom'}</Text>
                      {selected && <MaterialCommunityIcons name="check-circle" size={24} color="#f39c12" />}
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Formulaire création rapide */}
              {showNewPlayer ? (
                <View style={styles.newPlayerForm}>
                  <TextInput
                    ref={newPlayerInputRef}
                    style={styles.newPlayerInput}
                    value={newPlayerName}
                    onChangeText={setNewPlayerName}
                    placeholder="Nom du joueur"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="words"
                    onSubmitEditing={handleCreatePlayer}
                    returnKeyType="done"
                  />
                  <View style={styles.newPlayerActions}>
                    <TouchableOpacity
                      style={styles.newPlayerCancel}
                      onPress={() => { setShowNewPlayer(false); setNewPlayerName(''); }}
                    >
                      <Text style={styles.newPlayerCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.newPlayerConfirm, !newPlayerName.trim() && styles.newPlayerConfirmDisabled]}
                      onPress={handleCreatePlayer}
                      disabled={!newPlayerName.trim()}
                    >
                      <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      <Text style={styles.newPlayerConfirmText}>Créer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addPlayerBtn} onPress={openNewPlayer} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="account-plus-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.addPlayerBtnText}>Créer un nouveau joueur</Text>
                </TouchableOpacity>
              )}

              {/* Info distribution Papayoo */}
              {game.id === 'papayoo' && (() => {
                const n = selectedIds.size;
                const info = PAPAYOO_DEAL[n];
                return (
                  <View style={styles.dealInfo}>
                    <View style={styles.dealInfoHeader}>
                      <MaterialCommunityIcons name="cards-playing-outline" size={16} color="#f39c12" />
                      <Text style={styles.dealInfoTitle}>Distribution</Text>
                    </View>
                    {info ? (
                      <View style={styles.dealInfoBody}>
                        <View style={styles.dealInfoRow}>
                          <Text style={styles.dealInfoLabel}>Cartes distribuées</Text>
                          <Text style={styles.dealInfoValue}>
                            {info.cards}{info.note ?? ''} cartes
                          </Text>
                        </View>
                        <View style={styles.dealInfoRow}>
                          <Text style={styles.dealInfoLabel}>Cartes à échanger</Text>
                          <Text style={styles.dealInfoValue}>{info.exchange} cartes</Text>
                        </View>
                        {info.note && (
                          <Text style={styles.dealInfoNote}>* Retirez au préalable quelques cartes du jeu</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.dealInfoEmpty}>
                        Sélectionnez entre 3 et 8 joueurs
                      </Text>
                    )}
                  </View>
                );
              })()}
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Groupes</Text>
              {groups.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="account-group-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>Aucun groupe disponible</Text>
                  <Text style={styles.emptySubtext}>Créez des groupes depuis l'accueil</Text>
                </View>
              ) : (
                groups.map((group) => {
                  const selected = selectedGroupId === group.id;
                  const outOfRange = isOutOfRange(group);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.groupCard, selected && styles.groupCardSelected]}
                      onPress={() => selectGroup(group)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.groupCardLeft}>
                        <View style={[styles.groupIcon, selected && styles.groupIconSelected]}>
                          <MaterialCommunityIcons name="account-group" size={22} color={selected ? '#fff' : 'rgba(255,255,255,0.6)'} />
                        </View>
                        <View style={styles.groupInfo}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          <Text style={styles.groupMembers}>
                            {group.memberIds.length} joueur{group.memberIds.length > 1 ? 's' : ''} · {getGroupMemberNames(group)}
                          </Text>
                          {outOfRange && (
                            <Text style={styles.groupWarning}>
                              Hors du nombre conseillé ({game.minPlayers}–{game.maxPlayers})
                            </Text>
                          )}
                        </View>
                      </View>
                      {selected && <MaterialCommunityIcons name="check-circle" size={24} color="#f39c12" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: game.color }]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>Lancer la partie</Text>
          <MaterialCommunityIcons name="play" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  tabText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, marginTop: 24,
  },
  roundsRow: { flexDirection: 'row', gap: 12 },
  roundOption: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center',
  },
  roundOptionSelected: { backgroundColor: '#f39c12' },
  roundOptionText: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  roundOptionTextSelected: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  emptySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.2)' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  profileCardSelected: { borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.1)' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarSelected: { backgroundColor: '#f39c12' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profileName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },

  // Création rapide
  addPlayerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 14, marginTop: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  addPlayerBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  newPlayerForm: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginTop: 4, gap: 12,
  },
  newPlayerInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    padding: 12, color: '#fff', fontSize: 16, fontWeight: '600',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  newPlayerActions: { flexDirection: 'row', gap: 10 },
  newPlayerCancel: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  newPlayerCancelText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  newPlayerConfirm: {
    flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#f39c12',
  },
  newPlayerConfirmDisabled: { opacity: 0.4 },
  newPlayerConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Classic name input
  classicNameInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 4,
  },

  // Info distribution Papayoo
  dealInfo: {
    marginTop: 16,
    backgroundColor: 'rgba(243,156,18,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.2)',
    padding: 14,
    gap: 10,
  },
  dealInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f39c12',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dealInfoBody: { gap: 8 },
  dealInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealInfoLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  dealInfoValue: { fontSize: 15, fontWeight: '800', color: '#fff' },
  dealInfoNote: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginTop: 2 },
  dealInfoEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 4 },

  // Groupes
  groupCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  groupCardSelected: { borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.1)' },
  groupCardDisabled: { opacity: 0.5 },
  groupCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  groupIconSelected: { backgroundColor: '#f39c12' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  groupNameDisabled: { color: 'rgba(255,255,255,0.5)' },
  groupMembers: { fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  groupWarning: { fontSize: 12, color: '#e74c3c', marginTop: 2, fontWeight: '600' },

  footer: { padding: 24, paddingBottom: 32 },
  startButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 10, borderRadius: 16, padding: 18,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
