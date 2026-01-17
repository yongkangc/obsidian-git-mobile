import React, {useCallback, useRef, useEffect} from 'react';
import {Pressable, StyleSheet, Text, View, Animated} from 'react-native';
import type {FileNode} from '../../types';

const INDENT_SIZE = 20;

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  onPress: (node: FileNode) => void;
  onLongPress: (node: FileNode) => void;
}

function getFileIcon(node: FileNode): string {
  if (node.isDirectory) {
    return '📁';
  }
  const ext = node.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return '📄';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return '🖼️';
    default:
      return '📄';
  }
}

export const FileTreeItem = React.memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  onPress,
  onLongPress,
}: FileTreeItemProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;
  const chevronRotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(chevronRotation, {
      toValue: isExpanded ? 1 : 0,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, chevronRotation]);

  const handlePressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(node);
  }, [node, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(node);
  }, [node, onLongPress]);

  const chevronRotateInterpolation = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const icon = getFileIcon(node);

  return (
    <Animated.View style={{transform: [{scale}]}}>
      <Pressable
        style={[styles.container, {paddingLeft: depth * INDENT_SIZE + 12}]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}>
        <Animated.View
          style={[
            styles.chevron,
            {
              transform: [{rotate: chevronRotateInterpolation}],
              opacity: node.isDirectory ? 1 : 0,
            },
          ]}>
          <Text style={styles.chevronText}>›</Text>
        </Animated.View>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {node.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
    backgroundColor: '#1e1e1e',
  },
  chevron: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: '#e0e0e0',
    fontSize: 15,
  },
});
