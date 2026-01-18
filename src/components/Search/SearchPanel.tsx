import React, {useRef, useEffect, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {SearchResultItem} from './SearchResultItem';
import type {SearchResult} from '../../types';
import type {SearchMode} from '../../hooks/useSearch';
import {colors, radius, touchTargets} from '../../theme';

interface SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  isLoading: boolean;
  onResultPress: (path: string) => void;
}

export function SearchPanel({
  query,
  onQueryChange,
  results,
  mode,
  onModeChange,
  isLoading,
  onResultPress,
}: SearchPanelProps): React.JSX.Element {
  const inputRef = useRef<TextInput>(null);
  const clearButtonOpacity = useRef(new Animated.Value(0)).current;
  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (query.length > 0 && !isLoading) {
      setShowClearButton(true);
      Animated.timing(clearButtonOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(clearButtonOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setShowClearButton(false));
    }
  }, [query.length, isLoading, clearButtonOpacity]);

  const renderItem = useCallback(
    ({item}: {item: SearchResult}) => (
      <SearchResultItem
        title={item.title}
        path={item.path}
        snippet={item.snippet}
        onPress={() => onResultPress(item.path)}
      />
    ),
    [onResultPress],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.path, []);

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, mode === 'filename' && styles.tabActive]}
          onPress={() => onModeChange('filename')}>
          <Text
            style={[
              styles.tabText,
              mode === 'filename' && styles.tabTextActive,
            ]}>
            Filename
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'fulltext' && styles.tabActive]}
          onPress={() => onModeChange('fulltext')}>
          <Text
            style={[
              styles.tabText,
              mode === 'fulltext' && styles.tabTextActive,
            ]}>
            Full Text
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={
            mode === 'filename' ? 'Search by filename...' : 'Search content...'
          }
          placeholderTextColor={colors.textPlaceholder}
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={mode === 'filename' ? 'Search by filename' : 'Search content'}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.accent}
            style={styles.loader}
          />
        )}
        {showClearButton && (
          <Animated.View style={{opacity: clearButtonOpacity}}>
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button">
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={styles.resultsContainer}>
        {results.length > 0 ? (
          <FlashList
            data={results}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : query.length > 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try different keywords or switch search mode
            </Text>
          </View>
        ) : !query.length ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>
              {mode === 'filename'
                ? 'Search notes by filename'
                : 'Search within note content'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    minHeight: touchTargets.minimum,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textPlaceholder,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    minHeight: touchTargets.comfortable,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: touchTargets.comfortable,
    color: colors.textPrimary,
    fontSize: 16,
  },
  loader: {
    marginRight: 8,
  },
  clearButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.textPlaceholder,
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: colors.textPlaceholder,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textPlaceholder,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
