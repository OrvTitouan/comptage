import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Profile } from '../types';
import { loadProfiles, addProfile, deleteProfile } from '../storage/profiles';

interface ProfilesScreenProps {
  onBack: () => void;
}

export default function ProfilesScreen({ onBack }: ProfilesScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Champ manquant', 'Veuillez renseigner un nom.');
      return;
    }
    const newProfile = await addProfile(name.trim());
    setProfiles((prev) => [...prev, newProfile]);
    setName('');
    setShowForm(false);
  };

  const handleDelete = (profile: Profile) => {
    Alert.alert(
      'Supprimer le profil',
      `Supprimer "${profile.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile(profile.id);
            setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Profils</Text>
        <TouchableOpacity
          onPress={() => setShowForm((v) => !v)}
          style={styles.addButton}
        >
          <MaterialCommunityIcons name={showForm ? 'close' : 'plus'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nouveau profil</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du joueur"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity style={styles.confirmButton} onPress={handleAdd}>
              <Text style={styles.confirmButtonText}>Créer le profil</Text>
            </TouchableOpacity>
          </View>
        )}

        {profiles.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-off" size={64} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>Aucun profil créé</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour ajouter un joueur</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {profile.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{profile.name}</Text>
              <TouchableOpacity
                onPress={() => handleDelete(profile)}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#f39c12',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 8,
  },
});
