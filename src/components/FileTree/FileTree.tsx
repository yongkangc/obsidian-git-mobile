import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet, Text, Pressable} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import Modal from 'react-native-modal';
import {useVaultStore} from '../../store';
import {FileTreeItem} from './FileTreeItem';
import type {FileNode} from '../../types';
import {colors, radius, touchTargets} from '../../theme';

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
        icon: '✎',
        onPress: () => {
          closeContextMenu();
          onRename?.(selectedNode);
        },
      },
      {
        label: 'Move',
        icon: '↗',
        onPress: () => {
          closeContextMenu();
          onMove?.(selectedNode);
        },
      },
      {
        label: 'Delete',
        icon: '×',
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

      <Modal
        isVisible={contextMenuVisible}
        onBackdropPress={closeContextMenu}
        onBackButtonPress={closeContextMenu}
        backdropOpacity={0.5}
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        animationInTiming={120}
        animationOutTiming={80}
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
                index === contextMenuActions.length - 1 &&
                  styles.contextMenuItemLast,
              ]}
              onPress={action.onPress}>
              <Text
                style={[
                  styles.contextMenuIcon,
                  action.destructive && styles.contextMenuDestructive,
                ]}>
                {action.icon}
              </Text>
              <Text
                style={[
                  styles.contextMenuLabel,
                  action.destructive && styles.contextMenuDestructive,
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
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  contextMenu: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  contextMenuHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contextMenuTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: touchTargets.comfortable,
  },
  contextMenuItemPressed: {
    backgroundColor: colors.border,
  },
  contextMenuItemLast: {},
  contextMenuIcon: {
    fontSize: 16,
    color: colors.textPlaceholder,
    width: 24,
  },
  contextMenuLabel: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  contextMenuDestructive: {
    color: colors.error,
  },
});
