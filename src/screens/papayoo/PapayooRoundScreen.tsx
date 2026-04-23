import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, PapayooRoundScore } from '../../types';
import PlayerAvatar from '../../components/PlayerAvatar';

interface PapayooRoundScreenProps {
  roundNumber: number;
  totalRounds: number;
  players: Player[];
  onValidate: (scores: PapayooRoundScore[]) => void;
  onBack: () => void;
}

export default function PapayooRoundScreen({
  roundNumber,
  totalRounds,
  players,
  onValidate,
  onBack,
}: PapayooRoundScreenProps) {
  const [payooInputs, setPayooInputs] = useState<Record<string, string>>(
    Object.fromEntries(players.map((p) => [p.id, '0']))
  );
  const [hasPapayoo, setHasPapayoo] = useState<Record<string, boolean>>(
    Object.fromEntries(players.map((p) => [p.id, false]))
  );

  const totalPayoo = players.reduce((sum, p) => sum + (parseInt(payooInputs[p.id]) || 0), 0);
  const papayooCount = Object.values(hasPapayoo).filter(Boolean).length;

  const handleValidate = () => {
    if (papayooCount > 1) {
      Alert.alert('Erreur', 'Un seul joueur peut avoir le Papayoo par manche.');
      return;
    }
    if (totalPayoo > 210) {
      Alert.alert('Erreur', `Le total des Payoos ne peut pas dépasser 210 points (actuellement ${totalPayoo}).`);
      return;
    }

    const scores: PapayooRoundScore[] = players.map((p) => ({
      playerId: p.id,
      payooPoints: parseInt(payooInputs[p.id]) || 0,
      hasPapayoo: hasPapayoo[p.id],
    }));
    onValidate(scores);
  };

  const togglePapayoo = (playerId: string) => {
    setHasPapayoo((prev) => {
      // Un seul joueur peut avoir le Papayoo
      const next: Record<string, boolean> = Object.fromEntries(
        Object.keys(prev).map((id) => [id, false])
      );
      next[playerId] = !prev[playerId];
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Manche {roundNumber}</Text>
          <Text style={styles.subtitle}>sur {totalRounds}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Indicateur total */}
      <View style={styles.totalBar}>
        <View>
          <Text style={styles.totalLabel}>Total Payoos saisis</Text>
          <Text style={[styles.totalValue, totalPayoo > 210 && styles.totalValueError]}>
            {totalPayoo} / 210
          </Text>
        </View>
        <View style={styles.remainingBox}>
          <Text style={styles.remainingLabel}>Il reste</Text>
          <Text style={[
            styles.remainingValue,
            totalPayoo === 210 ? styles.remainingDone :
            totalPayoo > 210 ? styles.remainingError :
            styles.remainingPending,
          ]}>
            {210 - totalPayoo} pts
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Points par joueur</Text>

        {players.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <PlayerAvatar name={player.name} photoUri={player.photoUri} size={40} color="#f39c12" />
              <Text style={styles.playerName}>{player.name}</Text>
            </View>

            <View style={styles.controls}>
              {/* Points Payoo */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Payoos</Text>
                <TextInput
                  style={styles.input}
                  value={payooInputs[player.id]}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    setPayooInputs((prev) => ({ ...prev, [player.id]: clean }));
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                  selectTextOnFocus
                />
              </View>

              {/* Toggle Papayoo */}
              <TouchableOpacity
                style={[styles.papayooToggle, hasPapayoo[player.id] && styles.papayooToggleActive]}
                onPress={() => togglePapayoo(player.id)}
              >
                <Text style={styles.papayooToggleLabel}>
                  {hasPapayoo[player.id] ? '🃏 Papayoo' : 'Papayoo ?'}
                </Text>
                <Text style={styles.papayooTogglePoints}>+40 pts</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.reminder}>
          <MaterialCommunityIcons name="information-outline" size={16} color="rgba(255,255,255,0.3)" />
          <Text style={styles.reminderText}>
            Total max : 210 pts Payoos + 40 pts Papayoo = 250 pts par manche
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.validateButton} onPress={handleValidate} activeOpacity={0.85}>
          <Text style={styles.validateButtonText}>Valider la manche</Text>
          <MaterialCommunityIcons name="check" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f39c12',
  },
  totalValueError: {
    color: '#e74c3c',
  },
  remainingBox: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  remainingValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  remainingPending: {
    color: '#f39c12',
  },
  remainingDone: {
    color: '#2ecc71',
  },
  remainingError: {
    color: '#e74c3c',
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
    marginBottom: 12,
    marginTop: 16,
  },
  playerRow: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    width: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  papayooToggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 2,
  },
  papayooToggleActive: {
    backgroundColor: 'rgba(231,76,60,0.2)',
    borderColor: '#e74c3c',
  },
  papayooToggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  papayooTogglePoints: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  validateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f39c12',
    borderRadius: 16,
    padding: 18,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
