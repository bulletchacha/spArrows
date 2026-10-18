import { Alert, Platform } from 'react-native';

/** Two-button confirm that also works on web, where Alert buttons are unsupported. */
export function confirmDialog(title: string, message: string, confirmText: string, cancelText = 'Cancel'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
