export type GameId = 'flip7' | 'papayoo' | 'farway' | 'skull-king';

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

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
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

// Skull King
export interface SkullKingRoundScore {
  playerId: string;
  bid: number;          // pari (0..roundNumber)
  tricks: number;       // plis réalisés (0..roundNumber)
  piratesCaptured: number;           // Pirates capturés par Skull King (+30 par pirate si pari réussi)
  mermaidCapturedSkullKing: boolean; // Sirène a capturé Skull King (+50 si pari réussi)
  colored14s: number;                // Cartes 14 couleur (vert/violet/jaune) dans les plis remportés (+10 chacune si pari réussi)
  black14: boolean;                  // Carte 14 noire (atout) dans les plis remportés (+20 si pari réussi)
}

export interface SkullKingRound {
  roundNumber: number;
  scores: SkullKingRoundScore[];
}

export function calcSkullKingRoundScore(score: SkullKingRoundScore, roundNumber: number): number {
  const { bid, tricks, piratesCaptured, mermaidCapturedSkullKing, colored14s, black14 } = score;
  if (bid === 0) {
    return tricks === 0 ? roundNumber * 10 : -(roundNumber * 10);
  }
  if (bid === tricks) {
    return (
      bid * 20 +
      piratesCaptured * 30 +
      (mermaidCapturedSkullKing ? 50 : 0) +
      colored14s * 10 +
      (black14 ? 20 : 0)
    );
  }
  return -Math.abs(bid - tricks) * 10;
}

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
  | { name: 'Flip7Game'; players: Player[] }
  | { name: 'FarwayGame'; players: Player[] }
  | { name: 'SkullKingGame'; players: Player[] };
