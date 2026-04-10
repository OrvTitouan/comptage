import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group } from '../types';

const KEY = 'comptage_groups';

export async function loadGroups(): Promise<Group[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveGroup(group: Group): Promise<void> {
  const groups = await loadGroups();
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) groups[idx] = group;
  else groups.push(group);
  await AsyncStorage.setItem(KEY, JSON.stringify(groups));
}

export async function deleteGroup(id: string): Promise<void> {
  const groups = await loadGroups();
  await AsyncStorage.setItem(KEY, JSON.stringify(groups.filter((g) => g.id !== id)));
}
