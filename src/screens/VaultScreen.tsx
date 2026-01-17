import React, {useCallback, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Animated} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import type {RootStackParamList} from '../../App';
import {useVaultStore} from '../store';
import {useVaultLoader} from '../hooks/useVaultLoader';
import {FileTree, QuickSwitcher, RecentNotes} from '../components';
import type {FileNode, SyncStatus} from '../types';

type VaultScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Vault'
>;

const statusConfig: Record<SyncStatus['state'], {color: string; label: string}> =
  {
    synced: {color: '#10b981', label: 'Synced'},
    pending: {color: '#f59e0b', label: 'Pending'},
    offline: {color: '#6b7280', label: 'Offline'},
    error: {color: '#ef4444', label: 'Error'},
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
          onPress={onSyncNow}>
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
  const vaultName = useVaultStore(state => state.vaultName);
  const currentPath = useVaultStore(state => state.currentPath);
  const setQuickSwitcherVisible = useVaultStore(
    state => state.setQuickSwitcherVisible,
  );
  const setCurrentPath = useVaultStore(state => state.setCurrentPath);
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  useVaultLoader();

  const handleSyncPress = useCallback(() => {
    setSyncModalVisible(true);
  }, []);

  const handleSyncModalClose = useCallback(() => {
    setSyncModalVisible(false);
  }, []);

  const handleSyncNow = useCallback(() => {
    setSyncModalVisible(false);
    // TODO: Trigger actual sync
    console.log('Sync triggered');
  }, []);

  const handleFileSelect = useCallback(
    (path: string) => {
      navigation.navigate('Editor', {path});
    },
    [navigation],
  );

  const handleQuickSwitch = useCallback(() => {
    setQuickSwitcherVisible(true);
  }, [setQuickSwitcherVisible]);

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vaultName}</Text>
          <SyncStatusIndicator onPress={handleSyncPress} />
        </View>
        <View style={styles.headerActions}>
          <HeaderAction icon="⌘" onPress={handleQuickSwitch} />
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
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#dcddde',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionPressed: {
    backgroundColor: '#262626',
  },
  headerActionIcon: {
    fontSize: 16,
    color: '#888888',
  },
  syncIndicator: {
    padding: 4,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  breadcrumbText: {
    color: '#888888',
    fontSize: 13,
  },
  breadcrumbTextActive: {
    color: '#dcddde',
  },
  breadcrumbPressed: {
    opacity: 0.6,
  },
  breadcrumbSeparator: {
    color: '#555555',
    fontSize: 13,
  },
  treeContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
    marginTop: -2,
  },
  syncModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  syncModalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  syncModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  syncModalTitle: {
    color: '#fff',
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
    color: '#888888',
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
    color: '#dcddde',
    fontSize: 15,
  },
  syncErrorRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginTop: 8,
  },
  syncErrorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  syncNowButton: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncNowButtonPressed: {
    backgroundColor: '#6d28d9',
  },
  syncNowButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
