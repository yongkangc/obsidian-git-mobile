import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet, Text, Pressable} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import Modal from 'react-native-modal';
import {useVaultStore} from '../../store';
import {FileTreeItem} from './FileTreeItem';
import type {FileNode} from '../../types';

interface FlattenedNode {
  node: FileNode;
  depth: number;
  key: string;
}

interface ContextMenuAction {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
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

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);

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

  const handleLongPress = useCallback((node: FileNode) => {
    setSelectedNode(node);
    setContextMenuVisible(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setSelectedNode(null);
  }, []);

  const contextMenuActions: ContextMenuAction[] = useMemo(() => {
    if (!selectedNode) return [];
    return [
      {
        label: 'Rename',
        icon: '✏️',
        onPress: () => {
          closeContextMenu();
          onRename?.(selectedNode);
        },
      },
      {
        label: 'Move',
        icon: '📦',
        onPress: () => {
          closeContextMenu();
          onMove?.(selectedNode);
        },
      },
      {
        label: 'Delete',
        icon: '🗑️',
        onPress: () => {
          closeContextMenu();
          onDelete?.(selectedNode);
        },
        destructive: true,
      },
    ];
  }, [selectedNode, onRename, onMove, onDelete, closeContextMenu]);

  const renderItem = useCallback(
    ({item}: {item: FlattenedNode}) => (
      <FileTreeItem
        node={item.node}
        depth={item.depth}
        isExpanded={expandedFolders.has(item.node.path)}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    ),
    [expandedFolders, handlePress, handleLongPress],
  );

  const keyExtractor = useCallback((item: FlattenedNode) => item.key, []);

  if (flattenedNodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyText}>No files yet</Text>
        <Text style={styles.emptySubtext}>Create a note to get started</Text>
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

      <Modal
        isVisible={contextMenuVisible}
        onBackdropPress={closeContextMenu}
        onBackButtonPress={closeContextMenu}
        backdropOpacity={0.4}
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        animationInTiming={150}
        animationOutTiming={100}
        useNativeDriverForBackdrop>
        <View style={styles.contextMenu}>
          {selectedNode && (
            <View style={styles.contextMenuHeader}>
              <Text style={styles.contextMenuTitle} numberOfLines={1}>
                {selectedNode.name}
              </Text>
            </View>
          )}
          {contextMenuActions.map((action, index) => (
            <Pressable
              key={action.label}
              style={({pressed}) => [
                styles.contextMenuItem,
                pressed && styles.contextMenuItemPressed,
                index === contextMenuActions.length - 1 && styles.contextMenuItemLast,
              ]}
              onPress={action.onPress}>
              <Text style={styles.contextMenuIcon}>{action.icon}</Text>
              <Text
                style={[
                  styles.contextMenuLabel,
                  action.destructive && styles.contextMenuLabelDestructive,
                ]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  contextMenu: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  contextMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  contextMenuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  contextMenuItemPressed: {
    backgroundColor: '#3a3a3a',
  },
  contextMenuItemLast: {
    borderBottomWidth: 0,
  },
  contextMenuIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  contextMenuLabel: {
    color: '#e0e0e0',
    fontSize: 16,
  },
  contextMenuLabelDestructive: {
    color: '#ff6b6b',
  },
});
