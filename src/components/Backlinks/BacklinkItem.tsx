import React, {useMemo} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface BacklinkItemProps {
  title: string;
  contextLine: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function highlightWikilink(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`text-${keyIndex++}`} style={styles.contextText}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }
    parts.push(
      <Text key={`link-${keyIndex++}`} style={styles.contextLink}>
        [[{match[1]}]]
      </Text>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`text-${keyIndex++}`} style={styles.contextText}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? (
    <Text style={styles.contextContainer}>{parts}</Text>
  ) : (
    <Text style={styles.contextText}>{text}</Text>
  );
}

export function BacklinkItem({
  title,
  contextLine,
  onPress,
}: BacklinkItemProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, {damping: 15, stiffness: 300});
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
  };

  const highlightedContext = useMemo(
    () => highlightWikilink(contextLine),
    [contextLine],
  );

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <Text style={styles.icon}>📄</Text>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.contextWrapper}>
          {highlightedContext}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
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
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '500',
  },
  contextWrapper: {
    marginTop: 4,
  },
  contextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contextText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  contextLink: {
    color: '#7c3aed',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
