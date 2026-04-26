import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Profile, Group } from '../types';
import { loadProfiles, addProfile, deleteProfile, updateProfilePhoto } from '../storage/profiles';
import { getDefaultPhotoUri } from '../utils/defaultPhotos';
import { loadGroups, saveGroup, deleteGroup } from '../storage/groups';
import { loadResults, computeStats, PlayerStats } from '../storage/stats';
import { GAMES } from '../constants/games';

interface ProfilesScreenProps {
  onBack: () => void;
}

type Tab = 'profiles' | 'groups';

const GROUP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63'];

export default function ProfilesScreen({ onBack }: ProfilesScreenProps) {
  const [tab, setTab] = useState<Tab>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Formulaire profil
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Modal stats joueur
  const [statsProfile, setStatsProfile] = useState<Profile | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Modal groupe
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<Set<string>>(new Set());

  const reload = async () => {
    setProfiles(await loadProfiles());
    setGroups(await loadGroups());
  };

  useEffect(() => { reload(); }, []);

  // ── Stats joueur ─────────────────────────────────────────────

  const openPlayerStats = async (profile: Profile) => {
    setStatsProfile(profile);
    const results = await loadResults();
    const allStats = computeStats(results);
    const found = allStats.find((s) => s.playerId === profile.id) ?? {
      playerId: profile.id,
      playerName: profile.name,
      gamesPlayed: 0,
      wins: 0,
      winsByGame: {},
      gamesByGame: {},
    };
    setPlayerStats(found);
  };

  const closeStats = () => {
    setStatsProfile(null);
    setPlayerStats(null);
  };

  // ── Photo de profil ──────────────────────────────────────────

  const [photoMenuProfile, setPhotoMenuProfile] = useState<Profile | null>(null);

  const pickPhoto = async (profile: Profile, useCamera: boolean) => {
    setPhotoMenuProfile(null);
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'denied' || status === 'undetermined') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès pour choisir une photo.');
      return;
    }
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: true, aspect: [1, 1] as [number, number],
      quality: 1, base64: false, exif: false,
    };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled && result.assets[0]) {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const uri = `data:image/jpeg;base64,${resized.base64}`;
      await updateProfilePhoto(profile.id, uri);
      reload();
    }
  };

  const handlePickPhoto = (profile: Profile) => {
    setPhotoMenuProfile(profile);
  };

  // ── Profils ──────────────────────────────────────────────────

  const normName = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Champ manquant', 'Veuillez renseigner un nom.');
      return;
    }
    const duplicate = profiles.find((p) => normName(p.name) === normName(trimmed));
    if (duplicate) {
      Alert.alert('Profil déjà existant', `"${duplicate.name}" existe déjà.`);
      return;
    }
    const newProfile = await addProfile(trimmed);
    const defaultUri = await getDefaultPhotoUri(trimmed);
    if (defaultUri) await updateProfilePhoto(newProfile.id, defaultUri);
    setName('');
    setShowForm(false);
    reload();
  };

  const handleDelete = (profile: Profile) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer "${profile.name}" ?`)) {
        deleteProfile(profile.id).then(reload);
      }
    } else {
      Alert.alert('Supprimer le profil', `Supprimer "${profile.name}" ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => { await deleteProfile(profile.id); reload(); },
        },
      ]);
    }
  };

  // ── Groupes ──────────────────────────────────────────────────

  const openCreateGroup = () => {
    setEditingGroup(null); setGroupName(''); setGroupMemberIds(new Set()); setShowGroupModal(true);
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group); setGroupName(group.name); setGroupMemberIds(new Set(group.memberIds)); setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Nom requis', 'Donnez un nom à ce groupe.'); return; }
    if (groupMemberIds.size < 2) { Alert.alert('Membres insuffisants', 'Un groupe doit avoir au moins 2 membres.'); return; }
    await saveGroup({ id: editingGroup?.id ?? Date.now().toString(), name: groupName.trim(), memberIds: Array.from(groupMemberIds) });
    setShowGroupModal(false);
    reload();
  };

  const handleDeleteGroup = (group: Group) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer le groupe "${group.name}" ?`)) {
        deleteGroup(group.id).then(reload);
      }
    } else {
      Alert.alert('Supprimer ce groupe ?', group.name, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteGroup(group.id); reload(); } },
      ]);
    }
  };

  const toggleMember = (id: string) => {
    setGroupMemberIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // ── Render ───────────────────────────────────────────────────

  const winRate = playerStats && playerStats.gamesPlayed > 0
    ? Math.round((playerStats.wins / playerStats.gamesPlayed) * 100)
    : 0;

  const playedGames = GAMES.filter((g) => (playerStats?.gamesByGame[g.id] ?? 0) > 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Profils & Groupes</Text>
        {tab === 'profiles' ? (
          <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={styles.addButton}>
            <MaterialCommunityIcons name={showForm ? 'close' : 'plus'} size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openCreateGroup} style={[styles.addButton, { backgroundColor: '#3498db' }]}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'profiles' && styles.tabActive]} onPress={() => setTab('profiles')}>
          <MaterialCommunityIcons name="account" size={16} color={tab === 'profiles' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'profiles' && styles.tabTextActive]}>Profils</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'groups' && styles.tabActive]} onPress={() => setTab('groups')}>
          <MaterialCommunityIcons name="account-group" size={16} color={tab === 'groups' ? '#fff' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.tabText, tab === 'groups' && styles.tabTextActive]}>Groupes</Text>
        </TouchableOpacity>
      </View>

      {/* ── ONGLET PROFILS ── */}
      {tab === 'profiles' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Nouveau profil</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du joueur"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />
              <TouchableOpacity style={styles.confirmButton} onPress={handleAdd}>
                <Text style={styles.confirmButtonText}>Créer le profil</Text>
              </TouchableOpacity>
            </View>
          )}

          {profiles.length === 0 && !showForm ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-off" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Aucun profil créé</Text>
              <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter un joueur</Text>
            </View>
          ) : (
            profiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => openPlayerStats(profile)}
                activeOpacity={0.8}
              >
                <TouchableOpacity onPress={() => handlePickPhoto(profile)} style={styles.profileAvatar} activeOpacity={0.8}>
                  {profile.photoUri ? (
                    <Image source={{ uri: profile.photoUri }} style={styles.profileAvatarImg} />
                  ) : (
                    <Text style={styles.profileInitials}>{profile.name.slice(0, 2).toUpperCase()}</Text>
                  )}
                  <View style={styles.profileAvatarEdit}>
                    <MaterialCommunityIcons name="camera" size={10} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Text style={styles.profileHint}>Appuyer pour voir les stats</Text>
                </View>
                <MaterialCommunityIcons name="chart-bar" size={18} color="rgba(255,255,255,0.25)" style={{ marginRight: 4 }} />
                <TouchableOpacity
                  onPress={() => handleDelete(profile)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── ONGLET GROUPES ── */}
      {tab === 'groups' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Aucun groupe</Text>
              <Text style={styles.emptySubtext}>Créez un groupe pour filtrer les statistiques</Text>
            </View>
          ) : (
            groups.map((group, idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
              const members = profiles.filter((p) => group.memberIds.includes(p.id));
              return (
                <View key={group.id} style={[styles.groupCard, { borderLeftColor: color }]}>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <View style={styles.memberAvatars}>
                      {members.slice(0, 6).map((m) => (
                        <View key={m.id} style={[styles.memberAvatar, { backgroundColor: color + '99' }]}>
                          <Text style={styles.memberAvatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                      ))}
                      {members.length > 6 && <Text style={styles.memberMore}>+{members.length - 6}</Text>}
                    </View>
                  </View>
                  <Text style={styles.memberCount}>{members.length} membre{members.length > 1 ? 's' : ''}</Text>
                  <TouchableOpacity onPress={() => openEditGroup(group)} style={styles.groupAction}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGroup(group)} style={styles.groupAction}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── MODAL STATS JOUEUR ── */}
      <Modal visible={!!statsProfile} transparent animationType="slide" onRequestClose={closeStats}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* En-tête */}
            <View style={styles.statsHeader}>
              <TouchableOpacity style={styles.statsAvatar} onPress={() => statsProfile && handlePickPhoto(statsProfile)} activeOpacity={0.8}>
                {statsProfile?.photoUri ? (
                  <Image source={{ uri: statsProfile.photoUri }} style={styles.profileAvatarImg} />
                ) : (
                  <Text style={styles.statsAvatarText}>
                    {statsProfile?.name.slice(0, 2).toUpperCase()}
                  </Text>
                )}
                <View style={styles.profileAvatarEdit}>
                  <MaterialCommunityIcons name="camera" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.statsName}>{statsProfile?.name}</Text>
                <Text style={styles.statsSubtitle}>Statistiques globales</Text>
              </View>
              <TouchableOpacity onPress={closeStats} style={styles.statsClose}>
                <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Chiffres clés */}
            <View style={styles.statsKpis}>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>{playerStats?.gamesPlayed ?? 0}</Text>
                <Text style={styles.kpiLabel}>Parties</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpi}>
                <Text style={[styles.kpiValue, { color: '#f39c12' }]}>{playerStats?.wins ?? 0}</Text>
                <Text style={styles.kpiLabel}>Victoires</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpi}>
                <Text style={[styles.kpiValue, { color: '#2ecc71' }]}>{winRate}%</Text>
                <Text style={styles.kpiLabel}>Réussite</Text>
              </View>
            </View>

            {/* Détail par jeu */}
            <Text style={styles.statsSection}>Par jeu</Text>

            <ScrollView style={styles.statsGameList} showsVerticalScrollIndicator={false}>
              {playerStats && playerStats.gamesPlayed > 0 ? (
                playedGames.map((game) => {
                  const played = playerStats.gamesByGame[game.id] ?? 0;
                  const won = playerStats.winsByGame[game.id] ?? 0;
                  const rate = played > 0 ? Math.round((won / played) * 100) : 0;
                  return (
                    <View key={game.id} style={styles.statsGameRow}>
                      <View style={[styles.statsGameDot, { backgroundColor: game.color }]} />
                      <Text style={styles.statsGameName}>{game.name}</Text>
                      <View style={styles.statsGameNumbers}>
                        <Text style={styles.statsGamePlayed}>{played} partie{played > 1 ? 's' : ''}</Text>
                        <Text style={styles.statsGameWon}>
                          {won} victoire{won > 1 ? 's' : ''}
                        </Text>
                        <Text style={[styles.statsGameRate, { color: game.color }]}>{rate}%</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.statsEmpty}>
                  <MaterialCommunityIcons name="cards-outline" size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.statsEmptyText}>Aucune partie jouée pour l'instant</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL PHOTO ── */}
      <Modal visible={!!photoMenuProfile} transparent animationType="fade" onRequestClose={() => setPhotoMenuProfile(null)}>
        <TouchableOpacity style={styles.photoOverlay} activeOpacity={1} onPress={() => setPhotoMenuProfile(null)}>
          <View style={styles.photoMenu}>
            <Text style={styles.photoMenuTitle}>Photo de {photoMenuProfile?.name}</Text>
            <TouchableOpacity style={styles.photoMenuBtn} onPress={() => photoMenuProfile && pickPhoto(photoMenuProfile, true)}>
              <MaterialCommunityIcons name="camera" size={22} color="#fff" />
              <Text style={styles.photoMenuBtnText}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoMenuBtn, styles.photoMenuBtnAlt]} onPress={() => photoMenuProfile && pickPhoto(photoMenuProfile, false)}>
              <MaterialCommunityIcons name="image-outline" size={22} color="#fff" />
              <Text style={styles.photoMenuBtnText}>Choisir dans la galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoMenuCancel} onPress={() => setPhotoMenuProfile(null)}>
              <Text style={styles.photoMenuCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL GROUPE ── */}
      <Modal visible={showGroupModal} transparent animationType="slide" onRequestClose={() => setShowGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'}</Text>
            <TextInput
              style={styles.modalInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Nom du groupe"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <Text style={styles.modalSectionLabel}>
              Membres ({groupMemberIds.size} sélectionné{groupMemberIds.size > 1 ? 's' : ''})
            </Text>
            {profiles.length === 0 ? (
              <Text style={styles.modalEmpty}>Créez d'abord des profils dans l'onglet Profils.</Text>
            ) : (
              <ScrollView style={styles.modalMemberList} showsVerticalScrollIndicator={false}>
                {profiles.map((p) => {
                  const selected = groupMemberIds.has(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.modalMemberRow, selected && styles.modalMemberRowSelected]}
                      onPress={() => toggleMember(p.id)}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: selected ? '#3498db' : 'rgba(255,255,255,0.15)' }]}>
                        <Text style={styles.memberAvatarText}>{(p.name || '??').slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.modalMemberName}>{p.name}</Text>
                      {selected && <MaterialCommunityIcons name="check-circle" size={20} color="#3498db" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowGroupModal(false)}>
                <Text style={styles.modalBtnTextGray}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#3498db' }]} onPress={handleSaveGroup}>
                <Text style={styles.modalBtnTextWhite}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  // Profils
  form: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 20 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, color: '#fff', fontSize: 16, marginBottom: 12 },
  confirmButton: { backgroundColor: '#f39c12', borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  emptySubtext: { fontSize: 14, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center', marginRight: 14,
    overflow: 'hidden',
  },
  profileAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  profileAvatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  profileInitials: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  deleteButton: { padding: 6 },

  // Groupes
  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginBottom: 10, borderLeftWidth: 4,
  },
  groupInfo: { flex: 1, gap: 8 },
  groupName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberAvatars: { flexDirection: 'row', gap: 4 },
  memberAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  memberMore: { fontSize: 11, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginLeft: 2 },
  memberCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 8 },
  groupAction: { padding: 8 },

  // Modal stats joueur
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  statsAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#f39c12', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  statsAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statsName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statsSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statsClose: { padding: 4 },
  statsKpis: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16, marginVertical: 12,
  },
  kpi: { flex: 1, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 26, fontWeight: '900', color: '#fff' },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  statsSection: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 10,
  },
  statsGameList: { maxHeight: 260 },
  statsGameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statsGameDot: { width: 10, height: 10, borderRadius: 5 },
  statsGameName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },
  statsGameNumbers: { alignItems: 'flex-end', gap: 1 },
  statsGamePlayed: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  statsGameWon: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  statsGameRate: { fontSize: 13, fontWeight: '800' },
  statsEmpty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  statsEmptyText: { fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },

  // Modal générique
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16, maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  modalEmpty: { fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingVertical: 16 },
  modalMemberList: { maxHeight: 280 },
  modalMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10 },
  modalMemberRowSelected: { backgroundColor: 'rgba(52,152,219,0.1)' },
  modalMemberName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnTextGray: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  modalBtnTextWhite: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Modal photo
  photoOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  photoMenu: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
  },
  photoMenuTitle: {
    fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginBottom: 4,
  },
  photoMenuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f39c12', borderRadius: 14, padding: 16,
  },
  photoMenuBtnAlt: { backgroundColor: 'rgba(255,255,255,0.1)' },
  photoMenuBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  photoMenuCancel: {
    alignItems: 'center', paddingVertical: 12,
  },
  photoMenuCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
});
