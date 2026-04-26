import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types';
import { getDefaultPhotoUri } from '../utils/defaultPhotos';

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

export async function updateProfilePhoto(id: string, photoUri: string): Promise<void> {
  const profiles = await loadProfiles();
  await saveProfiles(profiles.map((p) => p.id === id ? { ...p, photoUri } : p));
}

// Assigne les photos par défaut aux profils qui n'en ont pas encore.
// N'écrase jamais une photo déjà définie (custom ou précédemment assignée).
export async function applyDefaultPhotos(): Promise<void> {
  const profiles = await loadProfiles();
  const toUpdate = profiles.filter((p) => !p.photoUri);
  if (toUpdate.length === 0) return;
  const updated = await Promise.all(
    toUpdate.map(async (p) => {
      const uri = await getDefaultPhotoUri(p.name);
      return uri ? { ...p, photoUri: uri } : p;
    })
  );
  const hadChanges = updated.some((p, i) => p.photoUri !== toUpdate[i].photoUri);
  if (!hadChanges) return;
  await saveProfiles(profiles.map((p) => {
    const u = updated.find((x) => x.id === p.id);
    return u ?? p;
  }));
}
