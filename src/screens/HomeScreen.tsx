import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GameCard from '../components/GameCard';
import { GAMES } from '../constants/games';
import { Game, ActiveGameState } from '../types';

interface HomeScreenProps {
  activeGame: ActiveGameState | null;
  onSelectGame: (game: Game) => void;
  onOpenProfiles: () => void;
  onOpenStats: () => void;
  onResumeGame: () => void;
}

type Tab = 'games' | 'active';

export default function HomeScreen({
  activeGame,
  onSelectGame,
  onOpenProfiles,
  onOpenStats,
  onResumeGame,
}: HomeScreenProps) {
  const [tab, setTab] = useState<Tab>('games');

  const playersLabel = activeGame
    ? activeGame.groupName ?? activeGame.players.map((p) => p.name).join(', ')
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="trophy" size={32} color="#f39c12" />
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={onOpenStats}>
              <MaterialCommunityIcons name="chart-bar" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onOpenProfiles}>
              <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.title}>Comptage Jeux</Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'games' && styles.tabActive]}
          onPress={() => setTab('games')}
        >
          <MaterialCommunityIcons
            name="cards-playing-outline"
            size={15}
            color={tab === 'games' ? '#fff' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.tabText, tab === 'games' && styles.tabTextActive]}>Jeux</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <View style={styles.tabLabelRow}>
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={15}
              color={tab === 'active' ? '#fff' : 'rgba(255,255,255,0.4)'}
            />
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>En cours</Text>
            {activeGame && (
              <View style={styles.activeDot} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {tab === 'games' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Jeux disponibles</Text>
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} onPress={onSelectGame} />
          ))}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="cards" size={18} color="rgba(255,255,255,0.3)" />
            <Text style={styles.footerText}>  {GAMES.length} jeux disponibles</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeGame ? (
            <>
              <Text style={styles.sectionLabel}>Partie en cours</Text>
              <View style={[styles.activeCard, { borderLeftColor: activeGame.game.color }]}>
                {/* Jeu */}
                <View style={styles.activeCardHeader}>
                  <View style={[styles.activeGameIcon, { backgroundColor: activeGame.game.color }]}>
                    <MaterialCommunityIcons
                      name={activeGame.game.icon as any}
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.activeCardInfo}>
                    <Text style={styles.activeGameName}>{activeGame.game.name}</Text>
                    <Text style={styles.activePlayersLabel} numberOfLines={1}>
                      {playersLabel}
                    </Text>
                  </View>
                </View>

                {/* Leader */}
                <View style={styles.leaderRow}>
                  <MaterialCommunityIcons name="crown" size={16} color="#f39c12" />
                  {activeGame.leaderScore !== null ? (
                    <Text style={styles.leaderText}>
                      En tête :{' '}
                      <Text style={styles.leaderName}>{activeGame.leaderName}</Text>
                      {' — '}
                      <Text style={styles.leaderScore}>
                        {activeGame.leaderScore > 0 ? '+' : ''}{activeGame.leaderScore} pts
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.leaderText}>Aucune manche jouée</Text>
                  )}
                </View>

                {/* Bouton reprendre */}
                <TouchableOpacity
                  style={[styles.resumeButton, { backgroundColor: activeGame.game.color }]}
                  onPress={onResumeGame}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="play" size={20} color="#fff" />
                  <Text style={styles.resumeButtonText}>Reprendre la partie</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyActive}>
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={64}
                color="rgba(255,255,255,0.1)"
              />
              <Text style={styles.emptyActiveText}>Aucune partie en cours</Text>
              <Text style={styles.emptyActiveSub}>
                Lancez un jeu depuis l'onglet Jeux
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(243,156,18,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#fff',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
    marginLeft: 2,
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
    marginBottom: 16,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  // Active game card
  activeCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderLeftWidth: 4,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeGameIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCardInfo: {
    flex: 1,
  },
  activeGameName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  activePlayersLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(243,156,18,0.1)',
    borderRadius: 10,
    padding: 12,
  },
  leaderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  leaderName: {
    fontWeight: '800',
    color: '#fff',
  },
  leaderScore: {
    fontWeight: '800',
    color: '#f39c12',
  },
  resumeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 16,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Empty state
  emptyActive: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyActiveText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.25)',
  },
  emptyActiveSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.15)',
  },
});
