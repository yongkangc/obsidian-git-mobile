import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {useVaultStore} from '../../store';
import {FileTreeItem} from './FileTreeItem';
import type {FileNode} from '../../types';
import {colors} from '../../theme';

interface FlattenedNode {
  node: FileNode;
  depth: number;
  key: string;
}

interface FileTreeProps {
  onFileSelect: (path: string) => void;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onMove?: (node: FileNode) => void;
}

export function FileTree({
  onFileSelect,
  onRename,
  onDelete,
  onMove,
}: FileTreeProps): React.JSX.Element {
  const fileTree = useVaultStore(state => state.fileTree);
  const expandedFolders = useVaultStore(state => state.expandedFolders);
  const toggleFolder = useVaultStore(state => state.toggleFolder);

  const flattenTree = useCallback(
    (nodes: FileNode[], depth = 0): FlattenedNode[] => {
      const result: FlattenedNode[] = [];
      for (const node of nodes) {
        result.push({node, depth, key: node.path});
        if (node.isDirectory && expandedFolders.has(node.path) && node.children) {
          result.push(...flattenTree(node.children, depth + 1));
        }
      }
      return result;
    },
    [expandedFolders],
  );

  const flattenedNodes = useMemo(
    () => flattenTree(fileTree),
    [fileTree, flattenTree],
  );

  const handlePress = useCallback(
    (node: FileNode) => {
      if (node.isDirectory) {
        toggleFolder(node.path);
      } else {
        onFileSelect(node.path);
      }
    },
    [toggleFolder, onFileSelect],
  );

  const renderItem = useCallback(
    ({item}: {item: FlattenedNode}) => (
      <FileTreeItem
        node={item.node}
        depth={item.depth}
        isExpanded={expandedFolders.has(item.node.path)}
        onPress={handlePress}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      />
    ),
    [expandedFolders, handlePress, onRename, onMove, onDelete],
  );

  const keyExtractor = useCallback((item: FlattenedNode) => item.key, []);

  if (flattenedNodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptySubtext}>
          Tap + to create your first note
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={flattenedNodes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: colors.textPlaceholder,
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textPlaceholder,
    fontSize: 13,
    textAlign: 'center',
  },
});
