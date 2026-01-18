import React, {useCallback} from 'react';
import {View, Text, StyleSheet, Pressable, ActivityIndicator} from 'react-native';
import Modal from 'react-native-modal';
import {FlashList} from '@shopify/flash-list';
import {BacklinkItem} from './BacklinkItem';
import type {BacklinkInfo} from '../../hooks/useBacklinks';
import {colors, radius, touchTargets} from '../../theme';

interface BacklinksPanelProps {
  visible: boolean;
  onClose: () => void;
  backlinks: BacklinkInfo[];
  isLoading: boolean;
  onBacklinkPress: (sourcePath: string) => void;
}

export function BacklinksPanel({
  visible,
  onClose,
  backlinks,
  isLoading,
  onBacklinkPress,
}: BacklinksPanelProps): React.JSX.Element {
  const renderItem = useCallback(
    ({item}: {item: BacklinkInfo}) => (
      <BacklinkItem
        title={item.title}
        contextLine={item.contextLine}
        onPress={() => {
          onClose();
          onBacklinkPress(item.sourcePath);
        }}
      />
    ),
    [onBacklinkPress, onClose],
  );

  const keyExtractor = useCallback(
    (item: BacklinkInfo) => item.sourcePath,
    [],
  );

  const backlinkCount = backlinks.length;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.6}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={250}
      animationOutTiming={200}
      useNativeDriverForBackdrop
      avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>🔗</Text>
          <Text style={styles.headerTitle}>
            {isLoading
              ? 'Loading backlinks...'
              : backlinkCount === 0
                ? 'No backlinks yet'
                : `${backlinkCount} note${backlinkCount !== 1 ? 's' : ''} link to this`}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : backlinks.length > 0 ? (
            <FlashList
              data={backlinks}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={styles.emptyText}>No backlinks yet</Text>
              <Text style={styles.emptySubtext}>
                Other notes that link to this one will appear here
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '70%',
    minHeight: 200,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textPlaceholder,
    fontSize: 16,
  },
  content: {
    flex: 1,
    minHeight: 150,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: colors.textPlaceholder,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textPlaceholder,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
