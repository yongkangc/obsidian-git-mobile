import React, {useCallback, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Animated, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import Svg, {Path} from 'react-native-svg';
import type {RootStackParamList} from '../../App';
import {useVaultStore} from '../store';
import {useVaultLoader} from '../hooks/useVaultLoader';
import {FileTree, QuickSwitcher, RecentNotes, BlurHeader} from '../components';
import {gitSync} from '../services/git-sync';
import {vaultFS} from '../services/vault-fs';
import {addToQueue} from '../services/sync-queue';
import type {FileNode, SyncStatus} from '../types';
import {colors, touchTargets, radius} from '../theme';
import {haptics} from '../utils/haptics';

interface IconProps {
  size?: number;
  color?: string;
}

function SearchIcon({size = 20, color = '#666666'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SettingsIcon({size = 20, color = '#666666'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

type VaultScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Vault'
>;

const statusConfig: Record<SyncStatus['state'], {color: string; label: string}> =
  {
    synced: {color: colors.success, label: 'Synced'},
    pending: {color: colors.warning, label: 'Pending'},
    offline: {color: colors.offline, label: 'Offline'},
    error: {color: colors.error, label: 'Error'},
  };

interface SyncDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncNow: () => void;
}

function SyncDetailsModal({
  visible,
  onClose,
  onSyncNow,
}: SyncDetailsModalProps): React.JSX.Element {
  const syncStatus = useVaultStore(state => state.syncStatus);
  const config = statusConfig[syncStatus.state];

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.4}
      style={styles.syncModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={200}
      animationOutTiming={150}
      useNativeDriverForBackdrop>
      <View style={styles.syncModalContent}>
        <View style={styles.syncModalHeader}>
          <Text style={styles.syncModalTitle}>Sync Status</Text>
        </View>

        <View style={styles.syncModalBody}>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Status</Text>
            <View style={styles.syncStatusValue}>
              <View
                style={[styles.syncModalDot, {backgroundColor: config.color}]}
              />
              <Text style={[styles.syncStatusText, {color: config.color}]}>
                {config.label}
              </Text>
            </View>
          </View>

          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Last sync</Text>
            <Text style={styles.syncStatusValueText}>
              {formatLastSync(syncStatus.lastSyncAt)}
            </Text>
          </View>

          {syncStatus.pendingChanges > 0 && (
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncStatusLabel}>Pending changes</Text>
              <Text style={styles.syncStatusValueText}>
                {syncStatus.pendingChanges}
              </Text>
            </View>
          )}

          {syncStatus.error && (
            <View style={styles.syncErrorRow}>
              <Text style={styles.syncErrorText}>{syncStatus.error}</Text>
            </View>
          )}
        </View>

        <Pressable
          style={({pressed}) => [
            styles.syncNowButton,
            pressed && styles.syncNowButtonPressed,
          ]}
          onPress={() => {
            haptics.impactMedium();
            onSyncNow();
          }}>
          <Text style={styles.syncNowButtonText}>Sync Now</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

interface SyncStatusIndicatorProps {
  onPress: () => void;
}

function SyncStatusIndicator({
  onPress,
}: SyncStatusIndicatorProps): React.JSX.Element {
  const syncStatus = useVaultStore(state => state.syncStatus);
  const config = statusConfig[syncStatus.state];

  return (
    <Pressable
      onPress={onPress}
      style={styles.syncIndicator}
      accessibilityLabel={`Sync status: ${config.label}`}
      accessibilityRole="button">
      <View style={[styles.syncDot, {backgroundColor: config.color}]} />
    </Pressable>
  );
}

interface FABProps {
  onNewNote: () => void;
  onNewFolder: () => void;
}

function FAB({onNewNote, onNewFolder}: FABProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    haptics.impactLight();
    Animated.timing(scale, {
      toValue: 0.92,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    onNewNote();
  }, [onNewNote]);

  const handleLongPress = useCallback(() => {
    haptics.impactMedium();
    Alert.alert('Create', 'What would you like to create?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'New Note', onPress: onNewNote},
      {text: 'New Folder', onPress: onNewFolder},
    ]);
  }, [onNewNote, onNewFolder]);

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {bottom: insets.bottom + 24, transform: [{scale}]},
      ]}>
      <Pressable
        style={styles.fab}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityLabel="Create new note, long press for more options"
        accessibilityRole="button">
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </Animated.View>
  );
}

interface HeaderActionProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}

function HeaderAction({icon, onPress, accessibilityLabel}: HeaderActionProps): React.JSX.Element {
  return (
    <Pressable
      style={({pressed}) => [
        styles.headerAction,
        pressed && styles.headerActionPressed,
      ]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      {icon}
    </Pressable>
  );
}

export function VaultScreen(): React.JSX.Element {
  const navigation = useNavigation<VaultScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const vaultName = useVaultStore(state => state.vaultName);
  const currentPath = useVaultStore(state => state.currentPath);
  const setCurrentPath = useVaultStore(state => state.setCurrentPath);
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  useVaultLoader();

  const handleSyncPress = useCallback(() => {
    setSyncModalVisible(true);
  }, []);

  const handleSyncModalClose = useCallback(() => {
    setSyncModalVisible(false);
  }, []);

  const setSyncStatus = useVaultStore(state => state.setSyncStatus);

  const handleSyncNow = useCallback(async () => {
    setSyncModalVisible(false);

    setSyncStatus({
      state: 'pending',
      pendingChanges: 0,
      lastSyncAt: null,
    });

    try {
      const pullResult = await gitSync.pull();

      const syncQueue = useVaultStore.getState().syncQueue;
      if (syncQueue.length > 0) {
        await gitSync.commitAndPush('Sync from Obsidian Git Mobile');
        useVaultStore.getState().clearSyncQueue();
      }

      const status = await gitSync.status();
      setSyncStatus(status);

      if (pullResult.conflicts.length > 0) {
        Alert.alert(
          'Sync Complete',
          `Updated ${pullResult.updated.length} files. ${pullResult.conflicts.length} conflicts resolved (local kept).`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setSyncStatus({
        state: 'error',
        pendingChanges: 0,
        lastSyncAt: null,
        error: errorMessage,
      });
      Alert.alert('Sync Failed', errorMessage);
    }
  }, [setSyncStatus]);

  const handleFileSelect = useCallback(
    (path: string) => {
      navigation.navigate('Editor', {path});
    },
    [navigation],
  );

  const handleNewNote = useCallback(() => {
    navigation.navigate('Editor', {path: ''});
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const refreshTree = useVaultStore(state => state.refreshTree);

  const handleRename = useCallback(
    (node: FileNode) => {
      Alert.prompt(
        'Rename',
        `Enter new name for ${node.name}`,
        async newName => {
          if (!newName || newName === node.name) return;
          try {
            const dir = node.path.substring(0, node.path.lastIndexOf('/'));
            const newPath = dir ? `${dir}/${newName}` : newName;
            await vaultFS.renameFile(node.path, newPath);
            addToQueue(node.path, 'delete');
            addToQueue(newPath, 'add');
            refreshTree();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('Rename Failed', message);
          }
        },
        'plain-text',
        node.name,
      );
    },
    [refreshTree],
  );

  const handleDelete = useCallback(
    (node: FileNode) => {
      Alert.alert('Delete', `Are you sure you want to delete ${node.name}?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vaultFS.deleteFile(node.path);
              addToQueue(node.path, 'delete');
              refreshTree();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Delete Failed', message);
            }
          },
        },
      ]);
    },
    [refreshTree],
  );

  const handleMove = useCallback(
    (node: FileNode) => {
      Alert.prompt(
        'Move',
        `Enter new path for ${node.name}`,
        async newPath => {
          if (!newPath || newPath === node.path) return;
          try {
            await vaultFS.renameFile(node.path, newPath);
            addToQueue(node.path, 'delete');
            addToQueue(newPath, 'add');
            refreshTree();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('Move Failed', message);
          }
        },
        'plain-text',
        node.path,
      );
    },
    [refreshTree],
  );

  const handleNewFolder = useCallback(() => {
    Alert.prompt(
      'New Folder',
      'Enter folder name',
      async folderName => {
        if (!folderName) return;
        try {
          const basePath = currentPath.join('/');
          const folderPath = basePath ? `${basePath}/${folderName}` : folderName;
          await vaultFS.createFolder(folderPath);
          refreshTree();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          Alert.alert('Create Folder Failed', message);
        }
      },
      'plain-text',
    );
  }, [currentPath, refreshTree]);

  const handleSearch = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      if (index === 0) {
        setCurrentPath([]);
      } else {
        setCurrentPath(currentPath.slice(0, index));
      }
    },
    [currentPath, setCurrentPath],
  );

  const breadcrumbSegments = [vaultName, ...currentPath];

  return (
    <View style={styles.container}>
      <BlurHeader paddingBottom={24}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{vaultName}</Text>
            <SyncStatusIndicator onPress={handleSyncPress} />
          </View>
          <View style={styles.headerActions}>
            <HeaderAction icon={<SearchIcon size={20} color={colors.textPlaceholder} />} onPress={handleSearch} accessibilityLabel="Search notes" />
            <HeaderAction icon={<SettingsIcon size={20} color={colors.textPlaceholder} />} onPress={handleSettings} accessibilityLabel="Settings" />
          </View>
        </View>
      </BlurHeader>

      {currentPath.length > 0 && (
        <View style={styles.breadcrumb}>
          {breadcrumbSegments.map((segment, index) => (
            <React.Fragment key={`${segment}-${index}`}>
              <Pressable
                onPress={() => handleBreadcrumbNavigate(index)}
                style={({pressed}) => [pressed && styles.breadcrumbPressed]}>
                <Text
                  style={[
                    styles.breadcrumbText,
                    index === breadcrumbSegments.length - 1 &&
                      styles.breadcrumbTextActive,
                  ]}>
                  {segment}
                </Text>
              </Pressable>
              {index < breadcrumbSegments.length - 1 && (
                <Text style={styles.breadcrumbSeparator}>/</Text>
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      <RecentNotes onNoteSelect={handleFileSelect} />

      <View style={styles.treeContainer}>
        <FileTree
          onFileSelect={handleFileSelect}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      </View>

      <FAB onNewNote={handleNewNote} onNewFolder={handleNewFolder} />

      <QuickSwitcher onFileSelect={handleFileSelect} />

      <SyncDetailsModal
        visible={syncModalVisible}
        onClose={handleSyncModalClose}
        onSyncNow={handleSyncNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerAction: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionPressed: {
    backgroundColor: colors.backgroundElevated,
  },
  headerActionIcon: {
    fontSize: 18,
    color: colors.textPlaceholder,
  },
  syncIndicator: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  breadcrumbText: {
    color: colors.textPlaceholder,
    fontSize: 13,
  },
  breadcrumbTextActive: {
    color: colors.textSecondary,
  },
  breadcrumbPressed: {
    opacity: 0.6,
  },
  breadcrumbSeparator: {
    color: colors.textDisabled,
    fontSize: 13,
  },
  treeContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
  },
  fab: {
    width: touchTargets.large,
    height: touchTargets.large,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '300',
    marginTop: -2,
  },
  syncModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  syncModalContent: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 32,
  },
  syncModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  syncModalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  syncStatusLabel: {
    color: colors.textPlaceholder,
    fontSize: 15,
  },
  syncStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncModalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncStatusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  syncStatusValueText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  syncErrorRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.sm,
    marginTop: 8,
  },
  syncErrorText: {
    color: colors.error,
    fontSize: 14,
  },
  syncNowButton: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
  },
  syncNowButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  syncNowButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
