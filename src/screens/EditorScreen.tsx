import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Text,
  StatusBar,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  Directions,
} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Svg, {Path} from 'react-native-svg';
import type {RootStackParamList} from '../../App';
import {MarkdownEditor} from '../components/Editor';
import {BacklinksPanel} from '../components/Backlinks';
import {useVaultStore} from '../store';
import {useBacklinks, type BacklinkInfo} from '../hooks/useBacklinks';
import {parseWikilinks, parseTitle} from '../utils/markdown';
import {colors, touchTargets} from '../theme';

type EditorScreenProps = NativeStackScreenProps<RootStackParamList, 'Editor'>;

function BackIcon({color = '#ffffff'}: {color?: string}) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BacklinksIcon({color = '#888888'}: {color?: string}) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EditorScreen({
  route,
  navigation,
}: EditorScreenProps): React.JSX.Element {
  const {path} = route.params;
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const {fileTree, setCurrentNote, addRecentNote} = useVaultStore();
  const insets = useSafeAreaInsets();

  const filename = path.replace(/^.*\//, '').replace(/\.md$/, '');
  const folderPath = path.replace(/\/[^/]+$/, '').replace(/^\//, '');

  const handleGetBacklinks = useCallback(
    async (_targetPath: string): Promise<BacklinkInfo[]> => {
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
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;

    async function loadNote() {
      setIsLoading(true);
      try {
        const noteContent = `# Welcome to ${path}\n\nStart editing your note here.\n\n[[Another Note]]\n`;
        if (mounted) {
          setContent(noteContent);
          const title = parseTitle(noteContent);
          const noteMeta = {
            path,
            title,
            modifiedAt: Date.now(),
            contentHash: '',
          };
          addRecentNote(noteMeta);
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
  }, [path, navigation, addRecentNote]);

  const handleSave = useCallback(
    async (newContent: string) => {
      try {
        const links = parseWikilinks(newContent);
        void links;

        const title = parseTitle(newContent);
        setCurrentNote({
          path,
          title,
          modifiedAt: Date.now(),
          contentHash: '',
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
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.header, {paddingTop: insets.top + 8}]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={12}>
              <BackIcon color={colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              {folderPath ? (
                <Text style={styles.breadcrumbPath} numberOfLines={1}>
                  {folderPath}
                </Text>
              ) : null}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {filename}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowBacklinks(true)}
              style={styles.headerButton}
              hitSlop={12}>
              <BacklinksIcon color={colors.textPlaceholder} />
            </Pressable>
          </View>
        </View>
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  breadcrumbPath: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
