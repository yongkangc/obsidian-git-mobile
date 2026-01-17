import React, {useCallback, useRef, useEffect} from 'react';
import {Pressable, StyleSheet, Text, View, Animated} from 'react-native';
import type {FileNode} from '../../types';

const INDENT_SIZE = 16;

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  onPress: (node: FileNode) => void;
  onLongPress: (node: FileNode) => void;
}

function getFileIcon(node: FileNode, isExpanded: boolean): string {
  if (node.isDirectory) {
    return isExpanded ? '▾' : '▸';
  }
  return '';
}

function getFileTypeIndicator(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'md') return null;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return 'img';
  }
  return ext || null;
}

export const FileTreeItem = React.memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  onPress,
  onLongPress,
}: FileTreeItemProps): React.JSX.Element {
  const opacity = useRef(new Animated.Value(1)).current;
  const chevronRotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(chevronRotation, {
      toValue: isExpanded ? 1 : 0,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, chevronRotation]);

  const handlePressIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0.6,
      duration: 50,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handlePressOut = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handlePress = useCallback(() => {
    onPress(node);
  }, [node, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(node);
  }, [node, onLongPress]);

  const icon = getFileIcon(node, isExpanded);
  const typeIndicator = !node.isDirectory ? getFileTypeIndicator(node.name) : null;
  const displayName = node.isDirectory
    ? node.name
    : node.name.replace(/\.md$/, '');

  return (
    <Animated.View style={{opacity}}>
      <Pressable
        style={({pressed}) => [
          styles.container,
          {paddingLeft: depth * INDENT_SIZE + 16},
          pressed && styles.pressed,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}>
        {node.isDirectory ? (
          <Text style={styles.chevron}>{icon}</Text>
        ) : (
          <View style={styles.fileIndicator} />
        )}
        <Text
          style={[styles.name, node.isDirectory && styles.folderName]}
          numberOfLines={1}>
          {displayName}
        </Text>
        {typeIndicator && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeIndicator}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingRight: 16,
    minHeight: 40,
  },
  pressed: {
    backgroundColor: '#262626',
  },
  chevron: {
    width: 18,
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  fileIndicator: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    color: '#dcddde',
    fontSize: 14,
    marginLeft: 8,
  },
  folderName: {
    color: '#dcddde',
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeBadgeText: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});
