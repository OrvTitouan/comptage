export type GameId = 'flip7' | 'papayoo' | 'skulking';

export interface Game {
  id: GameId;
  name: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface Profile {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
}

// Papayoo
export interface PapayooRoundScore {
  playerId: string;
  payooPoints: number;  // 0-210
  hasPapayoo: boolean;  // +40 pts
}

export interface PapayooRound {
  roundNumber: number;
  scores: PapayooRoundScore[];
}

export interface PapayooGame {
  players: Player[];
  totalRounds: number;
  rounds: PapayooRound[];
  finished: boolean;
}

// Flip 7
export interface Flip7RoundScore {
  playerId: string;
  busted: boolean;
  numberTotal: number;
  hasX2: boolean;
  hasBonus2: boolean;
  hasBonus4: boolean;
  hasBonus6: boolean;
  hasBonus8: boolean;
  hasBonus10: boolean;
  hasFlip7: boolean;
}

export interface Flip7Round {
  roundNumber: number;
  scores: Flip7RoundScore[];
}

export function calcFlip7Score(s: Flip7RoundScore): number {
  if (s.busted) return 0;
  const nums = s.numberTotal * (s.hasX2 ? 2 : 1);
  const bonuses =
    (s.hasBonus2 ? 2 : 0) +
    (s.hasBonus4 ? 4 : 0) +
    (s.hasBonus6 ? 6 : 0) +
    (s.hasBonus8 ? 8 : 0) +
    (s.hasBonus10 ? 10 : 0);
  const flip7 = s.hasFlip7 ? 15 : 0;
  return nums + bonuses + flip7;
}

export const FLIP7_WIN_SCORE = 200;

// Statistiques
export interface PlayerResult {
  playerId: string;
  playerName: string;
  score: number;
  winner: boolean;
}

export interface GameResult {
  id: string;
  gameId: GameId;
  gameName: string;
  date: string; // ISO
  rounds: number;
  playerResults: PlayerResult[];
}

export type Screen =
  | 'Home'
  | 'Profiles'
  | 'Stats'
  | { name: 'PlayerSetup'; game: Game }
  | { name: 'PapayooGame'; game: Game; players: Player[]; totalRounds: number }
  | { name: 'Flip7Game'; players: Player[] };
