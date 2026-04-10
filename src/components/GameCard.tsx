import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  onPress: (game: Game) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export default function GameCard({ game, onPress }: GameCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: game.color }]}
      onPress={() => onPress(game)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconContainer, { backgroundColor: game.accentColor }]}>
        <MaterialCommunityIcons
          name={game.icon as any}
          size={48}
          color="#fff"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{game.name}</Text>
        <Text style={styles.description}>{game.description}</Text>
        <View style={styles.players}>
          <MaterialCommunityIcons name="account-group" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.playersText}>
            {game.minPlayers} – {game.maxPlayers} joueurs
          </Text>
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={28}
        color="rgba(255,255,255,0.7)"
        style={styles.arrow}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
    lineHeight: 18,
  },
  players: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playersText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  arrow: {
    marginLeft: 4,
  },
});
