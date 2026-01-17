import React, {useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {RootStackParamList} from '../../App';
import {useVaultStore} from '../store';
import {
  FileTree,
  QuickSwitcher,
  RecentNotes,
  Breadcrumb,
} from '../components';
import type {FileNode} from '../types';

type VaultScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Vault'
>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SyncStatusIndicator(): React.JSX.Element {
  const syncStatus = useVaultStore(state => state.syncStatus);

  const statusConfig = {
    synced: {color: '#10b981', icon: '✓'},
    pending: {color: '#f59e0b', icon: '↻'},
    offline: {color: '#6b7280', icon: '○'},
    error: {color: '#ef4444', icon: '!'},
  };

  const config = statusConfig[syncStatus.state];

  return (
    <View style={styles.syncIndicator}>
      <View style={[styles.syncDot, {backgroundColor: config.color}]} />
      <Text style={[styles.syncText, {color: config.color}]}>
        {syncStatus.state === 'pending'
          ? `${syncStatus.pendingChanges} pending`
          : syncStatus.state}
      </Text>
    </View>
  );
}

interface FABProps {
  onQuickSwitch: () => void;
  onNewNote: () => void;
}

function FAB({onQuickSwitch, onNewNote}: FABProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const mainScale = useSharedValue(1);
  const secondaryScale = useSharedValue(1);
  const [expanded, setExpanded] = React.useState(false);

  const handleMainPressIn = useCallback(() => {
    mainScale.value = withTiming(0.9, {duration: 100});
  }, [mainScale]);

  const handleMainPressOut = useCallback(() => {
    mainScale.value = withSpring(1, {damping: 15, stiffness: 400});
  }, [mainScale]);

  const handleSecondaryPressIn = useCallback(() => {
    secondaryScale.value = withTiming(0.9, {duration: 100});
  }, [secondaryScale]);

  const handleSecondaryPressOut = useCallback(() => {
    secondaryScale.value = withSpring(1, {damping: 15, stiffness: 400});
  }, [secondaryScale]);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: mainScale.value}],
  }));

  const secondaryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: secondaryScale.value}],
  }));

  const handleMainPress = useCallback(() => {
    if (expanded) {
      setExpanded(false);
    } else {
      onQuickSwitch();
    }
  }, [expanded, onQuickSwitch]);

  const handleLongPress = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={[styles.fabContainer, {bottom: insets.bottom + 16}]}>
      {expanded && (
        <AnimatedPressable
          style={[styles.fabSecondary, secondaryAnimatedStyle]}
          onPressIn={handleSecondaryPressIn}
          onPressOut={handleSecondaryPressOut}
          onPress={() => {
            setExpanded(false);
            onNewNote();
          }}>
          <Text style={styles.fabIcon}>✏️</Text>
        </AnimatedPressable>
      )}
      <AnimatedPressable
        style={[styles.fab, mainAnimatedStyle]}
        onPressIn={handleMainPressIn}
        onPressOut={handleMainPressOut}
        onPress={handleMainPress}
        onLongPress={handleLongPress}
        delayLongPress={300}>
        <Text style={styles.fabIcon}>{expanded ? '✕' : '🔍'}</Text>
      </AnimatedPressable>
    </View>
  );
}

export function VaultScreen(): React.JSX.Element {
  const navigation = useNavigation<VaultScreenNavigationProp>();
  const vaultName = useVaultStore(state => state.vaultName);
  const setQuickSwitcherVisible = useVaultStore(
    state => state.setQuickSwitcherVisible,
  );
  const setCurrentPath = useVaultStore(state => state.setCurrentPath);

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

  const handleBreadcrumbNavigate = useCallback(
    (pathSegments: string[]) => {
      setCurrentPath(pathSegments);
    },
    [setCurrentPath],
  );

  const handleRename = useCallback((node: FileNode) => {
    console.log('Rename:', node.path);
  }, []);

  const handleDelete = useCallback((node: FileNode) => {
    console.log('Delete:', node.path);
  }, []);

  const handleMove = useCallback((node: FileNode) => {
    console.log('Move:', node.path);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{vaultName}</Text>
        <SyncStatusIndicator />
      </View>

      <Breadcrumb onNavigate={handleBreadcrumbNavigate} />

      <RecentNotes onNoteSelect={handleFileSelect} />

      <View style={styles.treeContainer}>
        <Text style={styles.sectionTitle}>Files</Text>
        <FileTree
          onFileSelect={handleFileSelect}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      </View>

      <FAB onQuickSwitch={handleQuickSwitch} onNewNote={handleNewNote} />

      <QuickSwitcher onFileSelect={handleFileSelect} />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  treeContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5b21b6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fabIcon: {
    fontSize: 22,
  },
});
