/**
 * Haptic feedback utility for tactile responses
 *
 * Uses react-native-haptic-feedback for native haptic patterns.
 * Provides semantic methods for different interaction types.
 */

import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Light impact for button taps, toolbar actions
 */
export function impactLight(): void {
  ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactLight, options);
}

/**
 * Medium impact for significant actions (save, delete confirmation)
 */
export function impactMedium(): void {
  ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactMedium, options);
}

/**
 * Heavy impact for destructive or major actions
 */
export function impactHeavy(): void {
  ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactHeavy, options);
}

/**
 * Selection feedback for swipe thresholds, picker changes
 */
export function selection(): void {
  ReactNativeHapticFeedback.trigger(
    HapticFeedbackTypes.selection,
    options,
  );
}

/**
 * Success notification for completed actions
 */
export function notificationSuccess(): void {
  ReactNativeHapticFeedback.trigger(
    HapticFeedbackTypes.notificationSuccess,
    options,
  );
}

/**
 * Warning notification
 */
export function notificationWarning(): void {
  ReactNativeHapticFeedback.trigger(
    HapticFeedbackTypes.notificationWarning,
    options,
  );
}

/**
 * Error notification for failed actions
 */
export function notificationError(): void {
  ReactNativeHapticFeedback.trigger(
    HapticFeedbackTypes.notificationError,
    options,
  );
}

export const haptics = {
  impactLight,
  impactMedium,
  impactHeavy,
  selection,
  notificationSuccess,
  notificationWarning,
  notificationError,
};
