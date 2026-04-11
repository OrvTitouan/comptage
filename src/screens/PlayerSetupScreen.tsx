import React, { useEffect, useState } from 'react';
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
import { Game, Group, Player, Profile } from '../types';
import { loadProfiles } from '../storage/profiles';
import { loadGroups } from '../storage/groups';

interface PlayerSetupScreenProps {
  game: Game;
  onBack: () => void;
  onStart: (players: Player[], totalRounds: number, groupName?: string) => void;
}

const ROUND_OPTIONS = [3, 5, 10];

type Tab = 'joueurs' | 'groupes';

export default function PlayerSetupScreen({ game, onBack, onStart }: PlayerSetupScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [totalRounds, setTotalRounds] = useState(5);
  const [tab, setTab] = useState<Tab>('joueurs');

  useEffect(() => {
    loadProfiles().then(setProfiles);
    loadGroups().then(setGroups);
  }, []);

  const togglePlayer = (profile: Profile) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profile.id)) {
        next.delete(profile.id);
      } else {
        if (next.size >= game.maxPlayers) {
          Alert.alert('Maximum atteint', `Ce jeu accepte ${game.maxPlayers} joueurs maximum.`);
          return prev;
        }
        next.add(profile.id);
      }
      return next;
    });
  };

  const selectGroup = (group: Group) => {
    if (group.memberIds.length < game.minPlayers) {
      Alert.alert(
        'Groupe trop petit',
        `Ce groupe a ${group.memberIds.length} membre(s), il en faut au moins ${game.minPlayers} pour jouer à ${game.name}.`
      );
      return;
    }
    if (group.memberIds.length > game.maxPlayers) {
      Alert.alert(
        'Groupe trop grand',
        `Ce groupe a ${group.memberIds.length} membres, mais ${game.name} accepte ${game.maxPlayers} joueurs maximum.`
      );
      return;
    }
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
      onStart(players, totalRounds, group.name);
    } else {
      if (selectedIds.size < game.minPlayers) {
        Alert.alert(
          'Pas assez de joueurs',
          `Il faut au moins ${game.minPlayers} joueurs pour jouer à ${game.name}.`
        );
        return;
      }
      const players: Player[] = profiles
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name }));
      onStart(players, totalRounds, undefined);
    }
  };

  const getGroupMemberNames = (group: Group): string => {
    const names = profiles
      .filter((p) => group.memberIds.includes(p.id))
      .map((p) => p.name);
    return names.join(', ');
  };

  const isGroupCompatible = (group: Group): boolean =>
    group.memberIds.length >= game.minPlayers && group.memberIds.length <= game.maxPlayers;

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
          <MaterialCommunityIcons
            name="account-multiple"
            size={16}
            color={tab === 'joueurs' ? '#fff' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.tabText, tab === 'joueurs' && styles.tabTextActive]}>Joueurs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'groupes' && styles.tabActive]}
          onPress={() => setTab('groupes')}
        >
          <MaterialCommunityIcons
            name="account-group"
            size={16}
            color={tab === 'groupes' ? '#fff' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.tabText, tab === 'groupes' && styles.tabTextActive]}>Groupes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Nombre de manches (masqué pour Flip 7 et Farway) */}
        {game.id !== 'flip7' && game.id !== 'farway' && game.id !== 'skull-king' && game.id !== 'tarot' && game.id !== '7wonders' && (
          <>
            <Text style={styles.sectionLabel}>Nombre de manches</Text>
            <View style={styles.roundsRow}>
              {ROUND_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.roundOption, totalRounds === n && styles.roundOptionSelected]}
                  onPress={() => setTotalRounds(n)}
                >
                  <Text style={[styles.roundOptionText, totalRounds === n && styles.roundOptionTextSelected]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {tab === 'joueurs' ? (
          <>
            <Text style={styles.sectionLabel}>
              Joueurs ({selectedIds.size}/{game.maxPlayers})
            </Text>

            {profiles.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-off" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyText}>Aucun profil disponible</Text>
                <Text style={styles.emptySubtext}>Créez des profils depuis l'accueil</Text>
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
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#f39c12" />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
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
                const compatible = isGroupCompatible(group);
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupCard,
                      selected && styles.groupCardSelected,
                      !compatible && styles.groupCardDisabled,
                    ]}
                    onPress={() => selectGroup(group)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.groupCardLeft}>
                      <View style={[styles.groupIcon, selected && styles.groupIconSelected]}>
                        <MaterialCommunityIcons
                          name="account-group"
                          size={22}
                          color={selected ? '#fff' : 'rgba(255,255,255,0.6)'}
                        />
                      </View>
                      <View style={styles.groupInfo}>
                        <Text style={[styles.groupName, !compatible && styles.groupNameDisabled]}>
                          {group.name}
                        </Text>
                        <Text style={styles.groupMembers}>
                          {group.memberIds.length} joueur{group.memberIds.length > 1 ? 's' : ''} · {getGroupMemberNames(group)}
                        </Text>
                        {!compatible && (
                          <Text style={styles.groupWarning}>
                            {group.memberIds.length < game.minPlayers
                              ? `Min. ${game.minPlayers} joueurs requis`
                              : `Max. ${game.maxPlayers} joueurs`}
                          </Text>
                        )}
                      </View>
                    </View>
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#f39c12" />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 24,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roundOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
  },
  roundOptionSelected: {
    backgroundColor: '#f39c12',
  },
  roundOptionText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
  },
  roundOptionTextSelected: {
    color: '#fff',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileCardSelected: {
    borderColor: '#f39c12',
    backgroundColor: 'rgba(243,156,18,0.1)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarSelected: {
    backgroundColor: '#f39c12',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupCardSelected: {
    borderColor: '#f39c12',
    backgroundColor: 'rgba(243,156,18,0.1)',
  },
  groupCardDisabled: {
    opacity: 0.5,
  },
  groupCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupIconSelected: {
    backgroundColor: '#f39c12',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  groupNameDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  groupMembers: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  groupWarning: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 2,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 18,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
