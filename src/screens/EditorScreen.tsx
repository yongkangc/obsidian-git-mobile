import React, {useEffect, useState, useCallback, useMemo} from 'react';
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
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Svg, {Path} from 'react-native-svg';
import type {RootStackParamList} from '../../App';
import {MarkdownEditor} from '../components/Editor';
import {BacklinksPanel, BlurHeader} from '../components';
import {useVaultStore} from '../store';
import {useBacklinks, type BacklinkInfo} from '../hooks/useBacklinks';
import {parseWikilinks, parseTitle} from '../utils/markdown';
import {colors, touchTargets} from '../theme';
import {vaultFS} from '../services/vault-fs';
import {indexDB} from '../services/index-db';

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const {fileTree, setCurrentNote, addRecentNote} = useVaultStore();

  const filename = path.replace(/^.*\//, '').replace(/\.md$/, '');
  const folderPath = path.replace(/\/[^/]+$/, '').replace(/^\//, '');

  const handleGetBacklinks = useCallback(
    async (targetPath: string): Promise<BacklinkInfo[]> => {
      try {
        // getBacklinks returns string[] of source paths
        const sourcePaths = await indexDB.getBacklinks(targetPath);
        return sourcePaths.map(sourcePath => ({
          sourcePath,
          title: sourcePath.replace(/^.*\//, '').replace(/\.md$/, ''),
          contextLine: `Links to [[${targetPath.replace(/^.*\//, '').replace(/\.md$/, '')}]]`,
        }));
      } catch (error) {
        console.warn('Failed to get backlinks from indexDB:', error);
        return [];
      }
    },
    [],
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
        const fileExists = await vaultFS.exists(path);
        let noteContent: string;
        
        if (fileExists) {
          noteContent = await vaultFS.readFile(path);
        } else {
          // New file - create with default content
          noteContent = `# ${filename}\n\n`;
          await vaultFS.writeFile(path, noteContent);
        }
        
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
  }, [path, filename, addRecentNote]);

  const handleSave = useCallback(
    async (newContent: string) => {
      setSaveStatus('saving');
      try {
        await vaultFS.writeFile(path, newContent);

        const links = parseWikilinks(newContent);
        try {
          await indexDB.updateLinksForFile(path, links);
        } catch (indexError) {
          console.warn('Failed to update links in index:', indexError);
        }

        const title = parseTitle(newContent);
        setCurrentNote({
          path,
          title,
          modifiedAt: Date.now(),
          contentHash: '',
        });

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (error) {
        console.error('Failed to save note:', error);
        setSaveStatus('idle');
      }
    },
    [path, setCurrentNote],
  );

  const fileTitles = useMemo((): string[] => {
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

  const getFileTitles = useCallback((): string[] => fileTitles, [fileTitles]);

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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <BlurHeader paddingBottom={12}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={12}
              accessibilityLabel="Go back"
              accessibilityRole="button">
              <BackIcon color={colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              {folderPath ? (
                <Text style={styles.breadcrumbPath} numberOfLines={1}>
                  {folderPath}
                </Text>
              ) : null}
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {filename}
                </Text>
                {saveStatus !== 'idle' && (
                  <Text style={styles.saveIndicator}>
                    {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => setShowBacklinks(true)}
              style={styles.headerButton}
              hitSlop={12}
              accessibilityLabel="Show backlinks"
              accessibilityRole="button">
              <BacklinksIcon color={colors.textPlaceholder} />
            </Pressable>
          </View>
        </BlurHeader>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveIndicator: {
    color: colors.textPlaceholder,
    fontSize: 12,
    marginLeft: 8,
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
