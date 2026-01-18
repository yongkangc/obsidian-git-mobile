import React, {useCallback, useRef} from 'react';
import {StyleSheet, Text, View, Pressable, Animated} from 'react-native';
import type {FileNode} from '../../types';
import {colors, touchTargets} from '../../theme';
import {haptics} from '../../utils/haptics';

const INDENT_SIZE = 24;

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  isSelected?: boolean;
  onPress: (node: FileNode) => void;
  onLongPress: (node: FileNode) => void;
}

function formatSecondaryText(node: FileNode): string {
  if (node.isDirectory && node.children) {
    const count = node.children.length;
    return `${count} item${count !== 1 ? 's' : ''}`;
  }
  if (node.modifiedAt) {
    const date = new Date(node.modifiedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  return '';
}

export const FileTreeItem = React.memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  onPress,
  onLongPress,
}: FileTreeItemProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 80,
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

  const handlePress = useCallback(() => {
    haptics.impactLight();
    onPress(node);
  }, [node, onPress]);

  const handleLongPress = useCallback(() => {
    haptics.impactMedium();
    onLongPress(node);
  }, [node, onLongPress]);

  const displayName = node.isDirectory
    ? node.name
    : node.name.replace(/\.md$/, '');

  const secondaryText = formatSecondaryText(node);

  return (
    <Animated.View style={{transform: [{scale}]}}>
      <Pressable
        style={[
          styles.container,
          {paddingLeft: depth * INDENT_SIZE + 24},
          isSelected && styles.selected,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}>
      {node.isDirectory ? (
        <>
          <Text style={styles.chevron}>{isExpanded ? '▿' : '▹'}</Text>
          <View style={styles.folderIcon}>
            <View style={styles.folderShape} />
          </View>
        </>
      ) : (
        <View style={styles.fileIcon}>
          <View style={styles.fileShape} />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text
          style={[styles.name, node.isDirectory ? styles.folderName : styles.fileName]}
          numberOfLines={1}>
          {displayName}
        </Text>
        {secondaryText ? (
          <Text style={styles.secondaryText} numberOfLines={1}>
            {secondaryText}
          </Text>
        ) : null}
      </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 24,
    minHeight: touchTargets.large,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  chevron: {
    width: 14,
    color: colors.textPlaceholder,
    fontSize: 10,
    fontWeight: '300',
    marginRight: 12,
    opacity: 0.7,
  },
  folderIcon: {
    width: 20,
    height: 16,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderShape: {
    width: 18,
    height: 14,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.7)',
    backgroundColor: 'transparent',
  },
  fileIcon: {
    width: 16,
    height: 20,
    marginRight: 14,
    marginLeft: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileShape: {
    width: 14,
    height: 18,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {},
  folderName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  fileName: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '400',
  },
  secondaryText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});
