import React, {useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useVaultStore} from '../../store';
import type {FileMeta} from '../../types';

interface RecentNotesProps {
  onNoteSelect: (path: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface RecentNoteCardProps {
  note: FileMeta;
  onPress: (path: string) => void;
}

const RecentNoteCard = React.memo(function RecentNoteCard({
  note,
  onPress,
}: RecentNoteCardProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.95, {duration: 100});
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 400});
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress(note.path);
  }, [note.path, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}>
      <Text style={styles.cardIcon}>📄</Text>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {note.title}
      </Text>
      <Text style={styles.cardTime}>{formatRelativeTime(note.modifiedAt)}</Text>
    </AnimatedPressable>
  );
});

export function RecentNotes({
  onNoteSelect,
}: RecentNotesProps): React.JSX.Element | null {
  const recentNotes = useVaultStore(state => state.recentNotes);

  if (recentNotes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {recentNotes.map(note => (
          <RecentNoteCard
            key={note.path}
            note={note}
            onPress={onNoteSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    width: 130,
    height: 100,
    justifyContent: 'space-between',
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardTime: {
    color: '#666',
    fontSize: 11,
  },
});
