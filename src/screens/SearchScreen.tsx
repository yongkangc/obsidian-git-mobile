import React, {useCallback} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import fuzzysort from 'fuzzysort';
import type {RootStackParamList} from '../../App';
import {SearchPanel} from '../components/Search';
import {useSearch} from '../hooks/useSearch';
import {useVaultStore} from '../store';
import type {FileMeta, SearchResult} from '../types';
import type {FileNode} from '../types';
import {colors} from '../theme';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

function getAllMarkdownFiles(nodes: FileNode[]): FileMeta[] {
  const files: FileMeta[] = [];
  for (const node of nodes) {
    if (node.isDirectory && node.children) {
      files.push(...getAllMarkdownFiles(node.children));
    } else if (!node.isDirectory && node.name.endsWith('.md')) {
      files.push({
        path: node.path,
        title: node.name.replace(/\.md$/, ''),
        modifiedAt: node.modifiedAt ?? Date.now(),
        contentHash: '',
      });
    }
  }
  return files;
}

export function SearchScreen({navigation}: SearchScreenProps): React.JSX.Element {
  const fileTree = useVaultStore(state => state.fileTree);

  const handleFilenameSearch = useCallback(
    async (query: string): Promise<FileMeta[]> => {
      const allFiles = getAllMarkdownFiles(fileTree);
      if (!query.trim()) {
        return allFiles.slice(0, 20);
      }

      const fuzzyResults = fuzzysort.go(query, allFiles, {
        key: 'title',
        limit: 30,
        threshold: -10000,
      });

      return fuzzyResults.map(result => result.obj);
    },
    [fileTree],
  );

  const handleFulltextSearch = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      // TODO: Connect to IndexDB.ftsSearch when implemented
      // For now, return mock results demonstrating the UI
      if (!query.trim()) return [];

      const allFiles = getAllMarkdownFiles(fileTree);
      const mockResults: SearchResult[] = allFiles
        .filter(file =>
          file.title.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 10)
        .map(file => ({
          path: file.path,
          title: file.title,
          snippet: `...content containing **${query}** in the note...`,
          score: 1,
        }));

      return mockResults;
    },
    [fileTree],
  );

  const {query, setQuery, results, mode, setMode, isLoading} = useSearch({
    debounceMs: 150,
    onFilenameSearch: handleFilenameSearch,
    onFulltextSearch: handleFulltextSearch,
  });

  const handleResultPress = useCallback(
    (path: string) => {
      navigation.navigate('Editor', {path});
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container}>
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        results={results}
        mode={mode}
        onModeChange={setMode}
        isLoading={isLoading}
        onResultPress={handleResultPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
  },
});
