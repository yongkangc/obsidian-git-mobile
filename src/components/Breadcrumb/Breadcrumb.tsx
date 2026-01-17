import React, {useCallback} from 'react';
import {View, StyleSheet, Text, Pressable, ScrollView} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useVaultStore} from '../../store';

interface BreadcrumbProps {
  onNavigate: (pathSegments: string[]) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    opacity.value = withTiming(0.5, {duration: 100});
  }, [opacity]);

  const handlePressOut = useCallback(() => {
    opacity.value = withTiming(1, {duration: 100});
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.itemContainer}>
      <AnimatedPressable
        style={animatedStyle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={isLast}>
        <Text style={[styles.itemText, isLast && styles.itemTextActive]}>
          {label}
        </Text>
      </AnimatedPressable>
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
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    color: '#888',
    fontSize: 13,
  },
  itemTextActive: {
    color: '#e0e0e0',
    fontWeight: '500',
  },
  separator: {
    color: '#555',
    fontSize: 14,
    marginHorizontal: 2,
  },
});
