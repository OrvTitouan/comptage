import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface PlayerAvatarProps {
  name: string;
  photoUri?: string;
  size?: number;
  color?: string;
}

export default function PlayerAvatar({ name, photoUri, size = 40, color = '#f39c12' }: PlayerAvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const fontSize = size * 0.38;
  const borderRadius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: photoUri ? 'transparent' : color }]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.image, { width: size, height: size, borderRadius }]} />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: {},
  initials: { fontWeight: '800', color: '#fff' },
});
