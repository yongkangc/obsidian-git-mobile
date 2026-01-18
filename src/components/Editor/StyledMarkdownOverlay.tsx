/**
 * Styled Markdown Overlay
 *
 * Renders markdown text with syntax dimming as an overlay.
 * This creates the visual effect of dimmed syntax characters while
 * keeping the actual TextInput transparent for editing.
 */

import React, {useMemo} from 'react';
import {Text, StyleSheet, View} from 'react-native';
import {
  parseMarkdownSegments,
  SYNTAX_OPACITY,
} from '../../utils/markdownStyles';
import {colors} from '../../theme';

export interface StyledMarkdownOverlayProps {
  text: string;
  style?: object;
}

export function StyledMarkdownOverlay({
  text,
  style,
}: StyledMarkdownOverlayProps): React.JSX.Element {
  const segments = useMemo(() => parseMarkdownSegments(text), [text]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Text style={styles.text}>
        {segments.map((segment, index) => (
          <Text
            key={index}
            style={segment.isSyntax ? styles.syntax : styles.content}>
            {segment.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 30,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  syntax: {
    opacity: SYNTAX_OPACITY,
  },
  content: {
    opacity: 1,
  },
});
