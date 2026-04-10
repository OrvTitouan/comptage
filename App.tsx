import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ProfilesScreen from './src/screens/ProfilesScreen';
import StatsScreen from './src/screens/StatsScreen';
import PlayerSetupScreen from './src/screens/PlayerSetupScreen';
import PapayooGameScreen from './src/screens/papayoo/PapayooGameScreen';
import Flip7GameScreen from './src/screens/flip7/Flip7GameScreen';
import FarwayGameScreen from './src/screens/farway/FarwayGameScreen';
import SkullKingGameScreen from './src/screens/skullking/SkullKingGameScreen';
import { Game, Player, Screen } from './src/types';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Home');

  const handleSelectGame = (game: Game) => {
    if (game.id === 'papayoo' || game.id === 'flip7' || game.id === 'farway' || game.id === 'skull-king') {
      setScreen({ name: 'PlayerSetup', game });
    } else {
      Alert.alert(game.name, 'Ce jeu arrive bientôt !', [{ text: 'OK' }]);
    }
  };

  if (screen === 'Profiles') {
    return (
      <View style={styles.root}>
        <ProfilesScreen onBack={() => setScreen('Home')} />
      </View>
    );
  }

  if (screen === 'Stats') {
    return (
      <View style={styles.root}>
        <StatsScreen onBack={() => setScreen('Home')} />
      </View>
    );
  }

  if (typeof screen === 'object' && screen.name === 'PlayerSetup') {
    const game = screen.game;
    return (
      <View style={styles.root}>
        <PlayerSetupScreen
          game={game}
          onBack={() => setScreen('Home')}
          onStart={(players: Player[], totalRounds: number) => {
            if (game.id === 'flip7') {
              setScreen({ name: 'Flip7Game', players });
            } else if (game.id === 'farway') {
              setScreen({ name: 'FarwayGame', players });
            } else if (game.id === 'skull-king') {
              setScreen({ name: 'SkullKingGame', players });
            } else {
              setScreen({ name: 'PapayooGame', game, players, totalRounds });
            }
          }}
        />
      </View>
    );
  }

  if (typeof screen === 'object' && screen.name === 'PapayooGame') {
    return (
      <View style={styles.root}>
        <PapayooGameScreen
          players={screen.players}
          totalRounds={screen.totalRounds}
          onEnd={() => setScreen('Home')}
        />
      </View>
    );
  }

  if (typeof screen === 'object' && screen.name === 'Flip7Game') {
    return (
      <View style={styles.root}>
        <Flip7GameScreen
          players={screen.players}
          onEnd={() => setScreen('Home')}
        />
      </View>
    );
  }

  if (typeof screen === 'object' && screen.name === 'FarwayGame') {
    return (
      <View style={styles.root}>
        <FarwayGameScreen
          players={screen.players}
          onEnd={() => setScreen('Home')}
        />
      </View>
    );
  }

  if (typeof screen === 'object' && screen.name === 'SkullKingGame') {
    return (
      <View style={styles.root}>
        <SkullKingGameScreen
          players={screen.players}
          onEnd={() => setScreen('Home')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <HomeScreen
        onSelectGame={handleSelectGame}
        onOpenProfiles={() => setScreen('Profiles')}
        onOpenStats={() => setScreen('Stats')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
