import React, {useCallback, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Animated, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import type {RootStackParamList} from '../../App';
import {useVaultStore} from '../store';
import {useVaultLoader} from '../hooks/useVaultLoader';
import {FileTree, QuickSwitcher, RecentNotes} from '../components';
import {gitSync} from '../services/git-sync';
import type {FileNode, SyncStatus} from '../types';
import {colors, touchTargets, radius} from '../theme';
import {haptics} from '../utils/haptics';

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
    <Pressable onPress={onPress} style={styles.syncIndicator}>
      <View style={[styles.syncDot, {backgroundColor: config.color}]} />
    </Pressable>
  );
}

interface FABProps {
  onPress: () => void;
}

function FAB({onPress}: FABProps): React.JSX.Element {
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
        onPress={onPress}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </Animated.View>
  );
}

interface HeaderActionProps {
  icon: string;
  onPress: () => void;
}

function HeaderAction({icon, onPress}: HeaderActionProps): React.JSX.Element {
  return (
    <Pressable
      style={({pressed}) => [
        styles.headerAction,
        pressed && styles.headerActionPressed,
      ]}
      onPress={onPress}>
      <Text style={styles.headerActionIcon}>{icon}</Text>
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

  const handleRename = useCallback((node: FileNode) => {
    console.log('Rename:', node.path);
  }, []);

  const handleDelete = useCallback((node: FileNode) => {
    console.log('Delete:', node.path);
  }, []);

  const handleMove = useCallback((node: FileNode) => {
    console.log('Move:', node.path);
  }, []);

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
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vaultName}</Text>
          <SyncStatusIndicator onPress={handleSyncPress} />
        </View>
        <View style={styles.headerActions}>
          <HeaderAction icon="🔍" onPress={handleSearch} />
          <HeaderAction icon="⚙" onPress={handleSettings} />
        </View>
      </View>

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

      <FAB onPress={handleNewNote} />

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: colors.background,
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
