import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import type {FileNode} from '../../types';

const INDENT_SIZE = 20;

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  onPress: (node: FileNode) => void;
  onLongPress: (node: FileNode) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const scale = useSharedValue(1);
  const chevronRotation = useSharedValue(isExpanded ? 1 : 0);

  React.useEffect(() => {
    chevronRotation.value = withSpring(isExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isExpanded, chevronRotation]);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.96, {duration: 100});
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 400});
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(node);
  }, [node, onPress]);

  const handleLongPress = useCallback(() => {
    onLongPress(node);
  }, [node, onLongPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {rotate: `${interpolate(chevronRotation.value, [0, 1], [0, 90])}deg`},
    ],
    opacity: node.isDirectory ? 1 : 0,
  }));

  const icon = getFileIcon(node);

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle, {paddingLeft: depth * INDENT_SIZE + 12}]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}>
      <Animated.View style={[styles.chevron, chevronStyle]}>
        <Text style={styles.chevronText}>›</Text>
      </Animated.View>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {node.name}
        </Text>
      </View>
    </AnimatedPressable>
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
