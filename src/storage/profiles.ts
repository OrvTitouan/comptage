import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types';

const STORAGE_KEY = 'comptage_profiles';

export async function loadProfiles(): Promise<Profile[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export async function addProfile(name: string): Promise<Profile> {
  const profiles = await loadProfiles();
  const newProfile: Profile = {
    id: Date.now().toString(),
    name,
  };
  await saveProfiles([...profiles, newProfile]);
  return newProfile;
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await loadProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
}
