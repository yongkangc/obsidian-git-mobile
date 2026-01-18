import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Pressable,
  Keyboard,
  Animated,
} from 'react-native';
import Modal from 'react-native-modal';
import {FlashList} from '@shopify/flash-list';
import fuzzysort from 'fuzzysort';
import {useVaultStore} from '../../store';
import type {FileNode} from '../../types';
import {colors, radius, touchTargets} from '../../theme';

interface SearchResult {
  item: FileNode;
  highlighted: React.ReactNode;
  score: number;
  isRecent?: boolean;
}

interface QuickSwitcherProps {
  onFileSelect: (path: string) => void;
}

function getAllFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.isDirectory && node.children) {
      files.push(...getAllFiles(node.children));
    } else if (!node.isDirectory && node.name.endsWith('.md')) {
      files.push(node);
    }
  }
  return files;
}

function highlightMatches(
  text: string,
  indexes: readonly number[] | null,
): React.ReactNode {
  if (!indexes || indexes.length === 0) {
    return <Text style={styles.resultName}>{text}</Text>;
  }

  const indexSet = new Set(indexes);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < text.length; i++) {
    if (indexSet.has(i)) {
      if (i > lastIndex) {
        parts.push(
          <Text key={`normal-${lastIndex}`} style={styles.resultName}>
            {text.slice(lastIndex, i)}
          </Text>,
        );
      }
      let end = i;
      while (end < text.length && indexSet.has(end)) {
        end++;
      }
      parts.push(
        <Text key={`highlight-${i}`} style={styles.resultNameHighlight}>
          {text.slice(i, end)}
        </Text>,
      );
      lastIndex = end;
      i = end - 1;
    }
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`normal-end`} style={styles.resultName}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return <Text>{parts}</Text>;
}

export function QuickSwitcher({
  onFileSelect,
}: QuickSwitcherProps): React.JSX.Element {
  const visible = useVaultStore(state => state.quickSwitcherVisible);
  const setVisible = useVaultStore(state => state.setQuickSwitcherVisible);
  const fileTree = useVaultStore(state => state.fileTree);
  const recentNotes = useVaultStore(state => state.recentNotes);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const clearButtonOpacity = useRef(new Animated.Value(0)).current;
  const [showClearButton, setShowClearButton] = useState(false);

  const allFiles = useMemo(() => getAllFiles(fileTree), [fileTree]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      // Show recent notes when no query
      const recentPaths = new Set(recentNotes.map(n => n.path));
      const recentFiles = allFiles
        .filter(f => recentPaths.has(f.path))
        .slice(0, 5);

      return recentFiles.map(file => ({
        item: file,
        highlighted: (
          <Text style={styles.resultName}>
            {file.name.replace(/\.md$/, '')}
          </Text>
        ),
        score: 0,
        isRecent: true,
      }));
    }

    const fuzzyResults = fuzzysort.go(query, allFiles, {
      key: 'name',
      limit: 30,
      threshold: -10000,
    });

    return fuzzyResults.map(result => ({
      item: result.obj,
      highlighted: highlightMatches(
        result.obj.name.replace(/\.md$/, ''),
        result.indexes ?? null,
      ),
      score: result.score,
    }));
  }, [query, allFiles, recentNotes]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    if (query.length > 0) {
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
  }, [query.length, clearButtonOpacity]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    setVisible(false);
  }, [setVisible]);

  const handleSelect = useCallback(
    (path: string) => {
      close();
      onFileSelect(path);
    },
    [close, onFileSelect],
  );

  const handleSubmit = useCallback(() => {
    const selectedResult = results[selectedIndex];
    if (selectedResult) {
      handleSelect(selectedResult.item.path);
    }
  }, [results, selectedIndex, handleSelect]);

  const renderItem = useCallback(
    ({item, index}: {item: SearchResult; index: number}) => {
      const pathParts = item.item.path.split('/');
      const folderPath = pathParts.slice(0, -1).join(' › ') || 'Vault';
      const isSelected = index === selectedIndex;

      return (
        <Pressable
          style={[styles.resultItem, isSelected && styles.resultItemSelected]}
          onPress={() => handleSelect(item.item.path)}>
          <View style={styles.resultTextContainer}>
            {item.highlighted}
            <Text style={styles.resultPath} numberOfLines={1}>
              {folderPath}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleSelect, selectedIndex],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.item.path, []);

  const showRecentHeader = !query.trim() && results.length > 0;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={close}
      onBackButtonPress={close}
      backdropColor="#000"
      backdropOpacity={0.6}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={200}
      animationOutTiming={150}
      useNativeDriverForBackdrop
      avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View
          style={[styles.searchContainer, isFocused && styles.searchFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search notes..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {showClearButton && (
            <Animated.View style={{opacity: clearButtonOpacity}}>
              <Pressable
                onPress={() => setQuery('')}
                style={styles.clearButton}
                hitSlop={8}>
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        <View style={styles.resultsContainer}>
          {showRecentHeader && (
            <Text style={styles.sectionHeader}>Recent</Text>
          )}
          {results.length > 0 ? (
            <FlashList
              data={results}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              extraData={selectedIndex}
            />
          ) : query.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matching notes</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recent notes</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.backgroundModal,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '70%',
    minHeight: 300,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: touchTargets.comfortable,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchFocused: {
    borderColor: colors.borderFocus,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: touchTargets.comfortable,
    color: colors.textPrimary,
    fontSize: 17,
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
  sectionHeader: {
    color: colors.textPlaceholder,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: touchTargets.comfortable,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  resultItemSelected: {
    backgroundColor: colors.accentMuted,
    borderLeftColor: colors.accent,
  },
  resultTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  resultNameHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },
  resultPath: {
    color: colors.textPlaceholder,
    fontSize: 13,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textPlaceholder,
    fontSize: 14,
  },
});
