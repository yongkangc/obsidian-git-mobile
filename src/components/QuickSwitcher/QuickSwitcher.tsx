import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Pressable,
  Keyboard,
} from 'react-native';
import Modal from 'react-native-modal';
import {FlashList} from '@shopify/flash-list';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import fuzzysort from 'fuzzysort';
import {useVaultStore} from '../../store';
import type {FileNode} from '../../types';

interface SearchResult {
  item: FileNode;
  highlighted: React.ReactNode;
  score: number;
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

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const allFiles = useMemo(() => getAllFiles(fileTree), [fileTree]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      return allFiles.slice(0, 20).map(file => ({
        item: file,
        highlighted: <Text style={styles.resultName}>{file.name.replace(/\.md$/, '')}</Text>,
        score: 0,
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
  }, [query, allFiles]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [visible]);

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
    const firstResult = results[0];
    if (results.length > 0 && firstResult) {
      handleSelect(firstResult.item.path);
    }
  }, [results, handleSelect]);

  const renderItem = useCallback(
    ({item}: {item: SearchResult}) => {
      const pathParts = item.item.path.split('/');
      const folderPath = pathParts.slice(0, -1).join(' › ') || 'Vault';

      return (
        <Pressable
          style={({pressed}) => [
            styles.resultItem,
            pressed && styles.resultItemPressed,
          ]}
          onPress={() => handleSelect(item.item.path)}>
          <Text style={styles.resultIcon}>📄</Text>
          <View style={styles.resultTextContainer}>
            {item.highlighted}
            <Text style={styles.resultPath} numberOfLines={1}>
              {folderPath}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleSelect],
  );

  const keyExtractor = useCallback((item: SearchResult) => item.item.path, []);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={close}
      onBackButtonPress={close}
      backdropOpacity={0.6}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={250}
      animationOutTiming={200}
      useNativeDriverForBackdrop
      avoidKeyboard>
      <Animated.View
        style={styles.container}
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown.duration(150)}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search notes..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Animated.View entering={FadeIn.duration(100)} exiting={FadeOut.duration(100)}>
              <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
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
          ) : query.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No matching notes</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
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
  clearButton: {
    padding: 6,
  },
  clearButtonText: {
    color: '#888',
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
    minHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  resultItemPressed: {
    backgroundColor: '#2a2a2a',
  },
  resultIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    color: '#e0e0e0',
    fontSize: 16,
  },
  resultNameHighlight: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  resultPath: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});
