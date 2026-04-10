import React from 'react';
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
import { Game } from '../types';

interface HomeScreenProps {
  onSelectGame: (game: Game) => void;
  onOpenProfiles: () => void;
  onOpenStats: () => void;
}

export default function HomeScreen({ onSelectGame, onOpenProfiles, onOpenStats }: HomeScreenProps) {
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
        <Text style={styles.subtitle}>Choisissez votre jeu</Text>
      </View>

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
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    letterSpacing: 0.3,
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
});
