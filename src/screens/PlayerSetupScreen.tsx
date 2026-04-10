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
import { Game, Player, Profile } from '../types';
import { loadProfiles } from '../storage/profiles';

interface PlayerSetupScreenProps {
  game: Game;
  onBack: () => void;
  onStart: (players: Player[], totalRounds: number) => void;
}

const ROUND_OPTIONS = [3, 5, 10];

export default function PlayerSetupScreen({ game, onBack, onStart }: PlayerSetupScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalRounds, setTotalRounds] = useState(5);

  useEffect(() => {
    loadProfiles().then(setProfiles);
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

  const handleStart = () => {
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
    onStart(players, totalRounds);
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Nombre de manches (masqué pour Flip 7 et Farway) */}
        {game.id !== 'flip7' && game.id !== 'farway' && (
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

        {/* Sélection des joueurs */}
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
