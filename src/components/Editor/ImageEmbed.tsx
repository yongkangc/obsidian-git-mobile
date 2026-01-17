import React, {useState, useCallback} from 'react';
import {View, Image, StyleSheet, ActivityIndicator, Text} from 'react-native';

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
    backgroundColor: '#2d2d2d',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 4,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#3d2020',
    borderRadius: 4,
    marginVertical: 8,
  },
  errorText: {
    color: '#ff8888',
    fontSize: 12,
  },
});
