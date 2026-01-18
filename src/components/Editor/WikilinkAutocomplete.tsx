import React, {useMemo, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import {fuzzyMatch} from '../../utils/markdown';
import {colors, radius, touchTargets} from '../../theme';

export interface WikilinkAutocompleteProps {
  query: string;
  onSelect: (title: string) => void;
  onDismiss: () => void;
  getFileTitles: () => string[];
  maxResults?: number;
}

interface MatchedFile {
  title: string;
  score: number;
}

export function WikilinkAutocomplete({
  query,
  onSelect,
  onDismiss: _onDismiss,
  getFileTitles,
  maxResults = 8,
}: WikilinkAutocompleteProps): React.JSX.Element | null {
  void _onDismiss;
  const matches = useMemo(() => {
    const titles = getFileTitles();
    if (!query) {
      return titles.slice(0, maxResults).map(title => ({title, score: 0}));
    }

    const scored: MatchedFile[] = [];
    for (const title of titles) {
      const score = fuzzyMatch(query, title);
      if (score > 0) {
        scored.push({title, score});
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }, [query, getFileTitles, maxResults]);

  const handleSelect = useCallback(
    (title: string) => {
      Keyboard.dismiss();
      onSelect(title);
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({item}: {item: MatchedFile}) => (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleSelect(item.title)}
        activeOpacity={0.7}>
        <Text style={styles.itemText} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: MatchedFile) => item.title, []);

  if (matches.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    maxHeight: 240,
    backgroundColor: colors.backgroundModal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  list: {
    maxHeight: 240,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '500',
  },
});
