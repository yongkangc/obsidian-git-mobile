import React, {useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {SearchResultItem} from './SearchResultItem';
import type {SearchResult} from '../../types';
import type {SearchMode} from '../../hooks/useSearch';

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

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

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
          placeholderTextColor="#666"
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#7c3aed"
            style={styles.loader}
          />
        )}
        {query.length > 0 && !isLoading && (
          <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(100)}>
            <Pressable onPress={handleClear} style={styles.clearButton}>
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
    backgroundColor: '#1e1e1e',
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
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  tabActive: {
    backgroundColor: '#7c3aed',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  loader: {
    marginRight: 8,
  },
  clearButton: {
    padding: 6,
  },
  clearButtonText: {
    color: '#888',
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
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
