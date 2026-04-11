import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export default function GameCard({ game, onPress, isFavorite, onToggleFavorite }: GameCardProps) {
  return (
    // Wrapper View en position relative pour pouvoir superposer le bouton étoile
    <View style={styles.wrapper}>
      {/* Zone cliquable principale (toute la carte sauf l'étoile) */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: game.color }]}
        onPress={() => onPress(game)}
        activeOpacity={0.85}
      >
        <View style={[styles.iconContainer, { backgroundColor: game.accentColor }]}>
          {game.image ? (
            <Image source={game.image} style={styles.gameImage} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name={game.icon as any} size={48} color="#fff" />
          )}
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

        {/* Espace réservé pour que le contenu ne passe pas sous l'étoile */}
        <View style={styles.favPlaceholder} />
      </TouchableOpacity>

      {/* Bouton étoile — en dehors du TouchableOpacity de la carte */}
      <TouchableOpacity
        style={styles.favBtn}
        onPress={() => onToggleFavorite(game.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <View style={[styles.favIconWrap, isFavorite && styles.favIconWrapActive]}>
          <MaterialCommunityIcons
            name={isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={isFavorite ? '#1a1a2e' : 'rgba(255,255,255,0.5)'}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
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
    overflow: 'hidden',
  },
  gameImage: {
    width: 76,
    height: 76,
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
  // Espace réservé aligné avec le bouton étoile absolu
  favPlaceholder: {
    width: 36,
  },
  // Bouton étoile positionné en absolu sur le coin droit de la carte
  favBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  // Cercle de fond — visible uniquement quand favori
  favIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
