import { Game } from '../types';

export const GAMES: Game[] = [
  {
    id: 'flip7',
    name: 'Flip 7',
    description: 'Piochez des cartes sans dépasser 7 !',
    icon: 'cards-playing-outline',
    color: '#e74c3c',
    accentColor: '#c0392b',
    minPlayers: 2,
    maxPlayers: 8,
  },
  {
    id: 'papayoo',
    name: 'Papayoo',
    description: 'Le jeu de dés explosif et festif !',
    icon: 'dice-multiple',
    color: '#f39c12',
    accentColor: '#d68910',
    minPlayers: 2,
    maxPlayers: 6,
  },
  {
    id: 'skulking',
    name: 'Skulking',
    description: 'Bluffez et remportez les plis !',
    icon: 'skull',
    color: '#8e44ad',
    accentColor: '#7d3c98',
    minPlayers: 2,
    maxPlayers: 6,
  },
  {
    id: 'farway',
    name: 'Farway',
    description: 'Explorez des régions et trouvez des sanctuaires !',
    icon: 'map-search-outline',
    color: '#27ae60',
    accentColor: '#1e8449',
    minPlayers: 2,
    maxPlayers: 5,
  },
];
