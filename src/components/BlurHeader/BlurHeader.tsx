import React from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme';

interface BlurHeaderProps {
  children: React.ReactNode;
  paddingBottom?: number;
}

export function BlurHeader({
  children,
  paddingBottom = 12,
}: BlurHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8, paddingBottom}]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={20}
        reducedTransparencyFallbackColor={colors.background}
      />
      <View style={styles.overlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.select({
      android: 'rgba(19, 20, 22, 0.85)',
      ios: 'rgba(19, 20, 22, 0.7)',
    }),
  },
});
