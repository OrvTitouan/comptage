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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Profile, Group } from '../types';
import { loadProfiles, addProfile, deleteProfile } from '../storage/profiles';
import { loadGroups, saveGroup, deleteGroup } from '../storage/groups';

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

  // ── Profils ──────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Champ manquant', 'Veuillez renseigner un nom.');
      return;
    }
    await addProfile(name.trim());
    setName('');
    setShowForm(false);
    reload();
  };

  const handleDelete = (profile: Profile) => {
    Alert.alert('Supprimer le profil', `Supprimer "${profile.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { await deleteProfile(profile.id); reload(); },
      },
    ]);
  };

  // ── Groupes ──────────────────────────────────────────────────

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupMemberIds(new Set());
    setShowGroupModal(true);
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupMemberIds(new Set(group.memberIds));
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Nom requis', 'Donnez un nom à ce groupe.');
      return;
    }
    if (groupMemberIds.size < 2) {
      Alert.alert('Membres insuffisants', 'Un groupe doit avoir au moins 2 membres.');
      return;
    }
    await saveGroup({
      id: editingGroup?.id ?? Date.now().toString(),
      name: groupName.trim(),
      memberIds: Array.from(groupMemberIds),
    });
    setShowGroupModal(false);
    reload();
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert('Supprimer ce groupe ?', group.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { await deleteGroup(group.id); reload(); },
      },
    ]);
  };

  const toggleMember = (id: string) => {
    setGroupMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────

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
              <View key={profile.id} style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitials}>
                    {profile.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.profileName}>{profile.name}</Text>
                <TouchableOpacity onPress={() => handleDelete(profile)} style={styles.deleteButton}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
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
                  <View style={[styles.groupColorDot, { backgroundColor: color }]} />
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <View style={styles.memberAvatars}>
                      {members.slice(0, 6).map((m) => (
                        <View key={m.id} style={[styles.memberAvatar, { backgroundColor: color + '99' }]}>
                          <Text style={styles.memberAvatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                      ))}
                      {members.length > 6 && (
                        <Text style={styles.memberMore}>+{members.length - 6}</Text>
                      )}
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

      {/* ── MODAL GROUPE ── */}
      <Modal visible={showGroupModal} transparent animationType="slide" onRequestClose={() => setShowGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'}
            </Text>

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
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setShowGroupModal(false)}
              >
                <Text style={styles.modalBtnTextGray}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3498db' }]}
                onPress={handleSaveGroup}
              >
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f39c12',
    justifyContent: 'center', alignItems: 'center',
  },

  // Onglets
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
  form: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 20,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    padding: 14, color: '#fff', fontSize: 16, marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#f39c12', borderRadius: 10, padding: 14, alignItems: 'center',
  },
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
    backgroundColor: '#f39c12',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  profileInitials: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteButton: { padding: 8 },

  // Groupes
  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
  },
  groupColorDot: { width: 0 }, // border gauche suffit
  groupInfo: { flex: 1, gap: 8 },
  groupName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberAvatars: { flexDirection: 'row', gap: 4 },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  memberMore: { fontSize: 11, color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginLeft: 2 },
  memberCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 8 },
  groupAction: { padding: 8 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
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
  modalSectionLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  modalEmpty: { fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingVertical: 16 },
  modalMemberList: { maxHeight: 280 },
  modalMemberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 10,
  },
  modalMemberRowSelected: { backgroundColor: 'rgba(52,152,219,0.1)' },
  modalMemberName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnTextGray: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  modalBtnTextWhite: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
