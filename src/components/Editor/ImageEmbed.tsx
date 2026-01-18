import React, {useState, useCallback} from 'react';
import {View, Image, StyleSheet, ActivityIndicator, Text} from 'react-native';
import {colors, radius} from '../../theme';

export interface ImageEmbedProps {
  vaultPath: string;
  imagePath: string;
  maxWidth?: number;
  maxHeight?: number;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function ImageEmbed({
  vaultPath,
  imagePath,
  maxWidth = 300,
  maxHeight = 200,
}: ImageEmbedProps): React.JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [dimensions, setDimensions] = useState({width: 0, height: 0});

  const fullPath = imagePath.startsWith('/')
    ? `file://${imagePath}`
    : `file://${vaultPath}/${imagePath}`;

  const handleLoad = useCallback(
    (event: {nativeEvent: {source: {width: number; height: number}}}) => {
      const {width, height} = event.nativeEvent.source;
      const aspectRatio = width / height;

      let finalWidth = width;
      let finalHeight = height;

      if (width > maxWidth) {
        finalWidth = maxWidth;
        finalHeight = maxWidth / aspectRatio;
      }
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * aspectRatio;
      }

      setDimensions({width: finalWidth, height: finalHeight});
      setLoadState('loaded');
    },
    [maxWidth, maxHeight],
  );

  const handleError = useCallback(() => {
    setLoadState('error');
  }, []);

  if (loadState === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load: {imagePath}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadState === 'loading' && (
        <View style={styles.placeholder}>
          <ActivityIndicator color="#888" size="small" />
        </View>
      )}
      <Image
        source={{uri: fullPath}}
        style={[
          styles.image,
          loadState === 'loaded' && {
            width: dimensions.width,
            height: dimensions.height,
          },
          loadState === 'loading' && styles.hidden,
        ]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  placeholder: {
    width: 100,
    height: 100,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: radius.sm,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: radius.sm,
    marginVertical: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
});
