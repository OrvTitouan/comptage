import { Alert, Platform } from 'react-native';

export function confirmAlert(title: string, message: string, onConfirm: () => void, confirmLabel = 'Confirmer') {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n${message}` : title;
    if (window.confirm(text)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}
