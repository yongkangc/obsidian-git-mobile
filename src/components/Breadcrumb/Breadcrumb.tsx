import React, {useCallback, useRef} from 'react';
import {View, StyleSheet, Text, Pressable, ScrollView, Animated} from 'react-native';
import {useVaultStore} from '../../store';
import {colors, touchTargets} from '../../theme';

interface BreadcrumbProps {
  onNavigate: (pathSegments: string[]) => void;
}

interface BreadcrumbItemProps {
  label: string;
  isLast: boolean;
  onPress: () => void;
}

const BreadcrumbItem = React.memo(function BreadcrumbItem({
  label,
  isLast,
  onPress,
}: BreadcrumbItemProps): React.JSX.Element {
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0.5,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handlePressOut = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={styles.itemContainer}>
      <Animated.View style={{opacity}}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={isLast}>
          <Text style={[styles.itemText, isLast && styles.itemTextActive]}>
            {label}
          </Text>
        </Pressable>
      </Animated.View>
      {!isLast && <Text style={styles.separator}>›</Text>}
    </View>
  );
});

export function Breadcrumb({onNavigate}: BreadcrumbProps): React.JSX.Element {
  const currentPath = useVaultStore(state => state.currentPath);
  const vaultName = useVaultStore(state => state.vaultName);

  const segments = [vaultName, ...currentPath];

  const handleNavigate = useCallback(
    (index: number) => {
      if (index === 0) {
        onNavigate([]);
      } else {
        onNavigate(currentPath.slice(0, index));
      }
    },
    [currentPath, onNavigate],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {segments.map((segment, index) => (
          <BreadcrumbItem
            key={`${segment}-${index}`}
            label={segment}
            isLast={index === segments.length - 1}
            onPress={() => handleNavigate(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: touchTargets.minimum,
    gap: 4,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    color: colors.textPlaceholder,
    fontSize: 13,
  },
  itemTextActive: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    color: colors.textDisabled,
    fontSize: 14,
    marginHorizontal: 2,
  },
});
