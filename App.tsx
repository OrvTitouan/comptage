import React, { useState } from 'react';
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
import { Game, Player, GameId, ActiveGameState, GameScreenType, PlayerScore } from './src/types';
import { GAMES } from './src/constants/games';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavScreen =
  | 'Home'
  | 'Profiles'
  | 'Stats'
  | { name: 'PlayerSetup'; game: Game };

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [navScreen, setNavScreen] = useState<NavScreen>('Home');
  const [activeGame, setActiveGame] = useState<ActiveGameState | null>(null);
  const [showingGame, setShowingGame] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────

  const goHome = () => {
    setShowingGame(false);
    setNavScreen('Home');
  };

  const endGame = () => {
    setActiveGame(null);
    setShowingGame(false);
    setNavScreen('Home');
  };

  const updateMeta = (scores: PlayerScore[]) => {
    setActiveGame((prev) => {
      if (!prev) return prev;
      const sorted = [...scores].sort((a, b) =>
        prev.game.id === 'papayoo' ? a.score - b.score : b.score - a.score
      );
      return {
        ...prev,
        currentScores: scores,
        leaderName: sorted[0]?.playerName ?? prev.leaderName,
        leaderScore: sorted[0]?.score ?? prev.leaderScore,
      };
    });
  };

  const handleSelectGame = (game: Game) => {
    if (activeGame) {
      const doStart = () => setNavScreen({ name: 'PlayerSetup', game });
      if (Platform.OS === 'web') {
        if (window.confirm('Une partie est en cours. L\'abandonner pour en commencer une nouvelle ?')) {
          setActiveGame(null);
          doStart();
        }
      } else {
        Alert.alert(
          'Partie en cours',
          'Abandonner la partie en cours pour en commencer une nouvelle ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Abandonner', style: 'destructive', onPress: () => { setActiveGame(null); doStart(); } },
          ]
        );
      }
    } else {
      setNavScreen({ name: 'PlayerSetup', game });
    }
  };

  const handleResumeGame = () => {
    if (activeGame) setShowingGame(true);
  };

  const handleStart = (
    game: Game,
    players: Player[],
    totalRounds: number,
    groupName?: string,
  ) => {
    const gameToScreenType: Record<GameId, GameScreenType> = {
      papayoo: 'PapayooGame',
      flip7: 'Flip7Game',
      farway: 'FarwayGame',
      'skull-king': 'SkullKingGame',
      tarot: 'TarotGame',
    };
    const newGame: ActiveGameState = {
      screenType: gameToScreenType[game.id],
      players,
      groupName,
      totalRounds,
      game,
      leaderName: players[0]?.name ?? '',
      leaderScore: null,
      currentScores: null,
    };
    setActiveGame(newGame);
    setShowingGame(true);
    setNavScreen('Home');
  };

  // ── Render ─────────────────────────────────────────────────────

  const renderNavScreen = () => {
    if (navScreen === 'Profiles') {
      return <ProfilesScreen onBack={() => setNavScreen('Home')} />;
    }
    if (navScreen === 'Stats') {
      return <StatsScreen onBack={() => setNavScreen('Home')} activeGame={activeGame} />;
    }
    if (typeof navScreen === 'object' && navScreen.name === 'PlayerSetup') {
      const game = navScreen.game;
      return (
        <PlayerSetupScreen
          game={game}
          onBack={() => setNavScreen('Home')}
          onStart={(players, totalRounds, groupName) =>
            handleStart(game, players, totalRounds, groupName)
          }
        />
      );
    }
    // Home
    return (
      <HomeScreen
        activeGame={activeGame}
        onSelectGame={handleSelectGame}
        onOpenProfiles={() => setNavScreen('Profiles')}
        onOpenStats={() => setNavScreen('Stats')}
        onResumeGame={handleResumeGame}
      />
    );
  };

  const renderActiveGameScreen = () => {
    if (!activeGame) return null;
    const { screenType, players, totalRounds, game } = activeGame;

    if (screenType === 'SkullKingGame') {
      return (
        <SkullKingGameScreen
          players={players}
          onEnd={endGame}
          onGoHome={goHome}
          onMeta={updateMeta}
        />
      );
    }
    if (screenType === 'PapayooGame') {
      return (
        <PapayooGameScreen
          players={players}
          totalRounds={totalRounds}
          onEnd={endGame}
          onGoHome={goHome}
          onMeta={updateMeta}
        />
      );
    }
    if (screenType === 'Flip7Game') {
      return (
        <Flip7GameScreen
          players={players}
          onEnd={endGame}
          onGoHome={goHome}
          onMeta={updateMeta}
        />
      );
    }
    if (screenType === 'FarwayGame') {
      return (
        <FarwayGameScreen
          players={players}
          onEnd={endGame}
          onGoHome={goHome}
          onMeta={updateMeta}
        />
      );
    }
    if (screenType === 'TarotGame') {
      return (
        <TarotGameScreen
          players={players}
          onEnd={endGame}
          onGoHome={goHome}
          onMeta={updateMeta}
        />
      );
    }
    return null;
  };

  return (
    <View style={styles.root}>
      {/* Couche navigation — toujours montée, masquée quand le jeu est affiché */}
      <View style={[StyleSheet.absoluteFill, showingGame && styles.hidden]}>
        {renderNavScreen()}
      </View>

      {/* Couche jeu — montée quand un jeu est actif, masquée quand on est à l'accueil */}
      {activeGame && (
        <View style={[StyleSheet.absoluteFill, !showingGame && styles.hidden]}>
          {renderActiveGameScreen()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hidden: { display: 'none' },
});
