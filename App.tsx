import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ProfilesScreen from './src/screens/ProfilesScreen';
import StatsScreen from './src/screens/StatsScreen';
import PlayerSetupScreen from './src/screens/PlayerSetupScreen';
import PapayooGameScreen from './src/screens/papayoo/PapayooGameScreen';
import Flip7GameScreen from './src/screens/flip7/Flip7GameScreen';
import FarwayGameScreen from './src/screens/farway/FarwayGameScreen';
import SkullKingGameScreen from './src/screens/skullking/SkullKingGameScreen';
import TarotGameScreen from './src/screens/tarot/TarotGameScreen';
import SevenWondersGameScreen from './src/screens/sevenwonders/SevenWondersGameScreen';
import SkyjoGameScreen from './src/screens/skyjo/SkyjoGameScreen';
import CatanGameScreen from './src/screens/catan/CatanGameScreen';
import ClassicGameScreen from './src/screens/classic/ClassicGameScreen';
import SixQuiPrendGameScreen from './src/screens/sixquiprend/SixQuiPrendGameScreen';
import LigrettoGameScreen from './src/screens/ligretto/LigrettoGameScreen';
import { Game, Player, GameId, ActiveGameState, GameScreenType, PlayerScore, GameResult, Team } from './src/types';
import { GAMES } from './src/constants/games';
import { saveResult } from './src/storage/stats';
import { applyDefaultPhotos } from './src/storage/profiles';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavScreen =
  | 'Home'
  | 'Profiles'
  | 'Stats'
  | { name: 'PlayerSetup'; game: Game };

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [navScreen, setNavScreen] = useState<NavScreen>('Home');
  const [activeGames, setActiveGames] = useState<ActiveGameState[]>([]);
  const [showingGameId, setShowingGameId] = useState<string | null>(null);

  useEffect(() => { applyDefaultPhotos(); }, []);

  // ── Helpers ────────────────────────────────────────────────────

  const goHome = () => {
    setShowingGameId(null);
    setNavScreen('Home');
  };

  const endGame = async (id: string) => {
    const ag = activeGames.find((g) => g.id === id);
    if (ag?.currentScores && ag.currentScores.length > 0) {
      const isLowWins = ag.game.lowWins ?? false;
      const sorted = [...ag.currentScores].sort((a, b) =>
        isLowWins ? a.score - b.score : b.score - a.score
      );
      const topScore = sorted[0].score;
      const result: GameResult = {
        id: Date.now().toString(),
        gameId: ag.game.id,
        gameName: ag.game.name,
        date: new Date().toISOString(),
        rounds: ag.totalRounds,
        playerResults: ag.currentScores.map((s) => ({
          playerId: s.playerId,
          playerName: s.playerName,
          score: s.score,
          winner: s.score === topScore,
        })),
      };
      try { await saveResult(result); } catch {}
    }
    setActiveGames((prev) => prev.filter((g) => g.id !== id));
    setShowingGameId(null);
    setNavScreen('Home');
  };

  const updateMeta = (id: string, scores: PlayerScore[]) => {
    setActiveGames((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const lowWins = g.game.lowWins ?? false;
      const sorted = [...scores].sort((a, b) =>
        lowWins ? a.score - b.score : b.score - a.score
      );
      return {
        ...g,
        currentScores: scores,
        leaderName: sorted[0]?.playerName ?? g.leaderName,
        leaderScore: sorted[0]?.score ?? g.leaderScore,
      };
    }));
  };

  const removeGame = (id: string) => {
    setActiveGames((prev) => prev.filter((g) => g.id !== id));
    setShowingGameId((cur) => cur === id ? null : cur);
    setNavScreen('Home');
  };

  const abandonGame = (id: string) => {
    const doAbandon = () => removeGame(id);
    if (Platform.OS === 'web') {
      if (window.confirm('Abandonner cette partie ? Elle ne sera pas enregistrée.')) doAbandon();
    } else {
      Alert.alert(
        'Abandonner la partie ?',
        'Elle ne sera pas enregistrée.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Abandonner', style: 'destructive', onPress: doAbandon },
        ]
      );
    }
  };

  const closeGame = (id: string) => {
    const ag = activeGames.find((g) => g.id === id);
    if (!ag?.currentScores || ag.currentScores.length === 0) return;

    const doClose = async () => {
      const isLowWins = ag.game.lowWins ?? false;
      const sorted = [...ag.currentScores!].sort((a, b) =>
        isLowWins ? a.score - b.score : b.score - a.score
      );
      const topScore = sorted[0].score;
      const result: GameResult = {
        id: Date.now().toString(),
        gameId: ag.game.id,
        gameName: ag.game.name,
        date: new Date().toISOString(),
        rounds: ag.totalRounds,
        playerResults: ag.currentScores!.map((s) => ({
          playerId: s.playerId,
          playerName: s.playerName,
          score: s.score,
          winner: s.score === topScore,
        })),
      };
      try { await saveResult(result); } catch {}
      removeGame(id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Clôturer la partie ? Les scores actuels seront enregistrés.')) doClose();
    } else {
      Alert.alert(
        'Clôturer la partie ?',
        'Les scores actuels seront enregistrés.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Clôturer', onPress: doClose },
        ]
      );
    }
  };

  const handleSelectGame = (game: Game) => {
    setNavScreen({ name: 'PlayerSetup', game });
  };

  const handleResumeGame = (id: string) => {
    setShowingGameId(id);
  };

  const handleStart = (
    game: Game,
    players: Player[],
    totalRounds: number,
    groupName?: string,
    customGameName?: string,
    teams?: Team[],
  ) => {
    const id = Date.now().toString();
    const gameToScreenType: Record<GameId, GameScreenType> = {
      papayoo: 'PapayooGame',
      flip7: 'Flip7Game',
      farway: 'FarwayGame',
      'skull-king': 'SkullKingGame',
      tarot: 'TarotGame',
      '7wonders': 'SevenWondersGame',
      'skyjo': 'SkyjoGame',
      'catan': 'CatanGame',
      'classic': 'ClassicGame',
      '6quiprend': 'SixQuiPrendGame',
      'ligretto': 'LigrettoGame',
    };
    const effectiveGame = customGameName ? { ...game, name: customGameName } : game;
    const newGame: ActiveGameState = {
      id,
      screenType: gameToScreenType[game.id],
      players,
      groupName,
      totalRounds,
      game: effectiveGame,
      leaderName: players[0]?.name ?? '',
      leaderScore: null,
      currentScores: null,
      teams,
    };
    setActiveGames((prev) => [...prev, newGame]);
    setShowingGameId(id);
    setNavScreen('Home');
  };

  // ── Render ─────────────────────────────────────────────────────

  const renderGameScreen = (ag: ActiveGameState) => {
    const { screenType, players, totalRounds } = ag;
    const end = () => endGame(ag.id);
    const meta = (scores: PlayerScore[]) => updateMeta(ag.id, scores);

    if (screenType === 'SkullKingGame') {
      return <SkullKingGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'PapayooGame') {
      return <PapayooGameScreen players={players} totalRounds={totalRounds} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'Flip7Game') {
      return <Flip7GameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'FarwayGame') {
      return <FarwayGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'TarotGame') {
      return <TarotGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'SevenWondersGame') {
      return <SevenWondersGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'SkyjoGame') {
      return <SkyjoGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'CatanGame') {
      return <CatanGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'ClassicGame') {
      return <ClassicGameScreen players={players} gameName={ag.game.name} teams={ag.teams} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'SixQuiPrendGame') {
      return <SixQuiPrendGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    if (screenType === 'LigrettoGame') {
      return <LigrettoGameScreen players={players} onEnd={end} onGoHome={goHome} onMeta={meta} />;
    }
    return null;
  };

  const renderNavScreen = () => {
    if (navScreen === 'Profiles') {
      return <ProfilesScreen onBack={() => setNavScreen('Home')} />;
    }
    if (navScreen === 'Stats') {
      return <StatsScreen onBack={() => setNavScreen('Home')} activeGames={activeGames} />;
    }
    if (typeof navScreen === 'object' && navScreen.name === 'PlayerSetup') {
      const game = navScreen.game;
      return (
        <PlayerSetupScreen
          game={game}
          onBack={() => setNavScreen('Home')}
          onStart={(players, totalRounds, groupName, customGameName, teams) =>
            handleStart(game, players, totalRounds, groupName, customGameName, teams)
          }
        />
      );
    }
    // Home
    return (
      <HomeScreen
        activeGames={activeGames}
        onSelectGame={handleSelectGame}
        onOpenProfiles={() => setNavScreen('Profiles')}
        onOpenStats={() => setNavScreen('Stats')}
        onResumeGame={handleResumeGame}
        onAbandonGame={abandonGame}
        onCloseGame={closeGame}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* Couche navigation — masquée quand un jeu est affiché */}
      <View style={[StyleSheet.absoluteFill, showingGameId !== null && styles.hidden]}>
        {renderNavScreen()}
      </View>

      {/* Une couche par partie active — seule la partie sélectionnée est visible */}
      {activeGames.map((ag) => (
        <View key={ag.id} style={[StyleSheet.absoluteFill, showingGameId !== ag.id && styles.hidden]}>
          {renderGameScreen(ag)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hidden: { display: 'none' },
});
