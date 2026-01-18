import React, {useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import {useVaultStore} from '../../store';
import type {FileMeta} from '../../types';
import {colors, radius} from '../../theme';

interface RecentNotesProps {
  onNoteSelect: (path: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

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
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0.7,
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
    onPress(note.path);
  }, [note.path, onPress]);

  return (
    <Animated.View style={{opacity}}>
      <Pressable
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {note.title}
        </Text>
        <Text style={styles.cardTime}>{formatRelativeTime(note.modifiedAt)}</Text>
      </Pressable>
    </Animated.View>
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
          <RecentNoteCard key={note.path} note={note} onPress={onNoteSelect} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: colors.textPlaceholder,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    padding: 12,
    width: 120,
    height: 80,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  cardTime: {
    color: colors.textPlaceholder,
    fontSize: 11,
  },
});
