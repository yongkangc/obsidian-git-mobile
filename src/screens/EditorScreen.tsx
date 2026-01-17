import React, {useEffect, useState, useCallback} from 'react';
import {View, StyleSheet, ActivityIndicator, Pressable, Text} from 'react-native';
import {
  Gesture,
  GestureDetector,
  Directions,
} from 'react-native-gesture-handler';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {MarkdownEditor} from '../components/Editor';
import {BacklinksPanel} from '../components/Backlinks';
import {useVaultStore} from '../store';
import {useBacklinks, type BacklinkInfo} from '../hooks/useBacklinks';
import {parseWikilinks, parseTitle} from '../utils/markdown';

type EditorScreenProps = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export function EditorScreen({
  route,
  navigation,
}: EditorScreenProps): React.JSX.Element {
  const {path} = route.params;
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const {fileTree, setCurrentNote} = useVaultStore();

  const handleGetBacklinks = useCallback(
    async (_targetPath: string): Promise<BacklinkInfo[]> => {
      // TODO: Connect to IndexDB.getBacklinks when implemented
      // For now, return mock data to demonstrate the UI
      return [
        {
          sourcePath: 'notes/daily-notes.md',
          title: 'Daily Notes',
          contextLine: `Check out [[${path.replace(/^.*\//, '').replace(/\.md$/, '')}]] for more details.`,
        },
        {
          sourcePath: 'projects/planning.md',
          title: 'Project Planning',
          contextLine: `Related: [[${path.replace(/^.*\//, '').replace(/\.md$/, '')}]] and [[Other Note]]`,
        },
      ];
    },
    [path],
  );

  const {backlinks, isLoading: backlinksLoading} = useBacklinks(path, {
    onGetBacklinks: handleGetBacklinks,
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setShowBacklinks(true)}
          style={styles.headerButton}
          hitSlop={8}>
          <Text style={styles.headerButtonText}>🔗</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;

    async function loadNote() {
      setIsLoading(true);
      try {
        // TODO: Replace with actual VaultFS implementation
        // const noteContent = await vaultFs.readFile(path);
        const noteContent = `# Welcome to ${path}\n\nStart editing your note here.\n\n[[Another Note]]\n`;
        if (mounted) {
          setContent(noteContent);
          const title = parseTitle(noteContent);
          navigation.setOptions({title});
        }
      } catch (error) {
        console.error('Failed to load note:', error);
        if (mounted) {
          setContent('');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadNote();

    return () => {
      mounted = false;
    };
  }, [path, navigation]);

  const handleSave = useCallback(
    async (newContent: string) => {
      try {
        // TODO: Replace with actual VaultFS implementation
        // await vaultFs.writeFile(path, newContent);

        const links = parseWikilinks(newContent);
        void links;
        // TODO: Update index with links
        // await indexDb.updateLinksForFile(path, links);

        // TODO: Add to sync queue
        // await syncQueue.add({ path, action: 'modify', queuedAt: Date.now() });

        const title = parseTitle(newContent);
        setCurrentNote({
          path,
          title,
          modifiedAt: Date.now(),
          contentHash: '', // TODO: Calculate hash
        });
      } catch (error) {
        console.error('Failed to save note:', error);
      }
    },
    [path, setCurrentNote],
  );

  const getFileTitles = useCallback((): string[] => {
    const titles: string[] = [];

    function collectTitles(nodes: typeof fileTree) {
      for (const node of nodes) {
        if (!node.isDirectory && node.name.endsWith('.md')) {
          titles.push(node.name.replace(/\.md$/, ''));
        }
        if (node.children) {
          collectTitles(node.children);
        }
      }
    }

    collectTitles(fileTree);
    return titles;
  }, [fileTree]);

  const handleBacklinkPress = useCallback(
    (sourcePath: string) => {
      navigation.push('Editor', {path: sourcePath});
    },
    [navigation],
  );

  const swipeGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    })
    .runOnJS(true);

  if (isLoading || content === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <MarkdownEditor
          initialContent={content}
          onSave={handleSave}
          onGetFileTitles={getFileTitles}
          debounceMs={500}
        />
        <BacklinksPanel
          visible={showBacklinks}
          onClose={() => setShowBacklinks(false)}
          backlinks={backlinks}
          isLoading={backlinksLoading}
          onBacklinkPress={handleBacklinkPress}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
});
