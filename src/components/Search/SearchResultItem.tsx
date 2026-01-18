import React, {useMemo, useRef, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable, Animated} from 'react-native';
import {colors, touchTargets} from '../../theme';
import {haptics} from '../../utils/haptics';

interface SearchResultItemProps {
  title: string;
  path: string;
  snippet?: string;
  onPress: () => void;
}

function getFileIcon(path: string): string {
  if (path.endsWith('.md')) return '📄';
  if (path.endsWith('.txt')) return '📝';
  if (path.endsWith('.json')) return '📋';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return '⚙️';
  return '📄';
}

function parseSnippetWithHighlights(snippet: string): React.ReactNode {
  if (!snippet) return null;

  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`text-${keyIndex++}`} style={styles.snippetText}>
          {snippet.slice(lastIndex, match.index)}
        </Text>,
      );
    }
    parts.push(
      <Text key={`highlight-${keyIndex++}`} style={styles.snippetHighlight}>
        {match[1]}
      </Text>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < snippet.length) {
    parts.push(
      <Text key={`text-${keyIndex++}`} style={styles.snippetText}>
        {snippet.slice(lastIndex)}
      </Text>,
    );
  }

  return <Text style={styles.snippetContainer}>{parts}</Text>;
}

export function SearchResultItem({
  title,
  path,
  snippet,
  onPress,
}: SearchResultItemProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    haptics.impactLight();
    Animated.spring(scale, {
      toValue: 0.98,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const folderPath = useMemo(() => {
    const parts = path.split('/');
    return parts.slice(0, -1).join(' › ') || 'Vault';
  }, [path]);

  const icon = getFileIcon(path);

  return (
    <Animated.View style={{transform: [{scale}]}}>
      <Pressable
        style={styles.container}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`${title}, in ${folderPath}`}
        accessibilityHint="Double tap to open note"
        accessibilityRole="button">
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.path} numberOfLines={1}>
            {folderPath}
          </Text>
          {snippet && parseSnippetWithHighlights(snippet)}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: touchTargets.comfortable,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  path: {
    color: colors.textPlaceholder,
    fontSize: 12,
    marginTop: 2,
  },
  snippetContainer: {
    marginTop: 6,
  },
  snippetText: {
    color: colors.textPlaceholder,
    fontSize: 13,
    lineHeight: 18,
  },
  snippetHighlight: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
