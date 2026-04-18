export type GameId = 'flip7' | 'papayoo' | 'farway' | 'skull-king' | 'tarot' | '7wonders' | 'skyjo' | 'catan' | 'classic' | '6quiprend' | 'ligretto';

export interface Game {
  id: GameId;
  name: string;
  description: string;
  icon: string;
  image?: any; // local require() image
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

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
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

// Tarot
export type TarotContract = 'prise' | 'garde' | 'garde-sans' | 'garde-contre';
export type TarotPoignee = 'simple' | 'double' | 'triple';
export type TarotChelemResult = 'annonce-reussi' | 'non-annonce-reussi' | 'annonce-rate';

export interface TarotDonneScore {
  preneurId: string;
  contract: TarotContract;
  bouts: 0 | 1 | 2 | 3;
  points: number;                        // points réalisés par le preneur (0-91)
  petitAuBout: 'preneur' | 'defense' | null;
  poignee: TarotPoignee | null;
  poigneeBy: 'preneur' | 'defense' | null;
  chelem: TarotChelemResult | null;
  // À 5 joueurs seulement : null = seul (1c4), string = ID du partenaire (2c3)
  partnerId?: string | null;
}

export interface TarotDonne {
  donneNumber: number;
  score: TarotDonneScore;
}

export function calcTarotDonne(
  score: TarotDonneScore,
  playerIds: string[],
): Record<string, number> {
  const { preneurId, contract, bouts, points, petitAuBout, poignee, chelem } = score;

  const seuils: Record<number, number> = { 0: 56, 1: 51, 2: 41, 3: 36 };
  const multiplicateurs: Record<TarotContract, number> = {
    prise: 1, garde: 2, 'garde-sans': 4, 'garde-contre': 6,
  };

  const seuil = seuils[bouts];
  const mult = multiplicateurs[contract];
  const gain = points - seuil;
  const won = gain >= 0;
  const scoreBrut = (Math.abs(gain) + 25) * mult;

  // Score de base (positif = preneur gagne)
  let unitScore = scoreBrut * (won ? 1 : -1);

  // Petit au bout (×multiplicateur, indépendant du résultat)
  if (petitAuBout === 'preneur') unitScore += 10 * mult;
  else if (petitAuBout === 'defense') unitScore -= 10 * mult;

  // Poignée : va au camp gagnant
  if (poignee) {
    const poigneeValues: Record<TarotPoignee, number> = { simple: 20, double: 30, triple: 40 };
    unitScore += won ? poigneeValues[poignee] : -poigneeValues[poignee];
  }

  // Chelem
  if (chelem === 'annonce-reussi') unitScore += 400;
  else if (chelem === 'non-annonce-reussi') unitScore += 200;
  else if (chelem === 'annonce-rate') unitScore -= 200;

  // Distribution des points
  const result: Record<string, number> = {};

  if (playerIds.length === 5 && 'partnerId' in score) {
    const { partnerId } = score;
    if (partnerId) {
      // 2 contre 3 : preneur ×2, partenaire ×1, chaque défenseur ×-1
      playerIds.forEach((id) => {
        if (id === preneurId) result[id] = 2 * unitScore;
        else if (id === partnerId) result[id] = unitScore;
        else result[id] = -unitScore;
      });
    } else {
      // 1 contre 4 (seul) : preneur ×4, chaque défenseur ×-1
      playerIds.forEach((id) => {
        result[id] = id === preneurId ? 4 * unitScore : -unitScore;
      });
    }
  } else {
    // 3 ou 4 joueurs : preneur = (n-1) × unitScore, chaque défenseur = -unitScore
    const nDefenders = playerIds.length - 1;
    playerIds.forEach((id) => {
      result[id] = id === preneurId ? nDefenders * unitScore : -unitScore;
    });
  }

  return result;
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
  comment?: string;
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
}

export type GameScreenType = 'PapayooGame' | 'Flip7Game' | 'FarwayGame' | 'SkullKingGame' | 'TarotGame' | 'SevenWondersGame' | 'SkyjoGame' | 'CatanGame' | 'ClassicGame' | 'SixQuiPrendGame' | 'LigrettoGame';

export interface ActiveGameState {
  id: string;
  screenType: GameScreenType;
  players: Player[];
  groupName?: string;
  totalRounds: number;
  game: Game;
  leaderName: string;
  leaderScore: number | null;
  currentScores: PlayerScore[] | null;
  teams?: Team[];
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
