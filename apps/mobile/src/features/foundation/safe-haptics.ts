import * as Haptics from "expo-haptics";

/**
 * Wraps expo-haptics calls so the app never crashes if the native module
 * is unavailable (e.g. Expo Go, simulator, or a build that hasn't been
 * re-linked yet). All feedback is best-effort: silently ignored on failure.
 */
export const hapticImpact = (style: Haptics.ImpactFeedbackStyle): void => {
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch {
    // Native module unavailable — silently ignore
  }
};

export const hapticNotification = (type: Haptics.NotificationFeedbackType): void => {
  try {
    Haptics.notificationAsync(type).catch(() => {});
  } catch {
    // Native module unavailable — silently ignore
  }
};

export const ImpactStyle = Haptics.ImpactFeedbackStyle;
export const NotificationType = Haptics.NotificationFeedbackType;
