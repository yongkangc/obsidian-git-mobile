import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';

export interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onHeading: () => void;
}

interface ToolbarButton {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}

export function EditorToolbar({
  onBold,
  onItalic,
  onLink,
  onHeading,
}: EditorToolbarProps): React.JSX.Element {
  const buttons: ToolbarButton[] = [
    {label: 'B', onPress: onBold, accessibilityLabel: 'Bold'},
    {label: 'I', onPress: onItalic, accessibilityLabel: 'Italic'},
    {label: '🔗', onPress: onLink, accessibilityLabel: 'Link'},
    {label: 'H', onPress: onHeading, accessibilityLabel: 'Heading'},
  ];

  return (
    <View style={styles.container}>
      {buttons.map((button) => (
        <TouchableOpacity
          key={button.label}
          style={styles.button}
          onPress={button.onPress}
          accessibilityLabel={button.accessibilityLabel}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, button.label === 'I' && styles.italic]}>
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#3d3d3d',
    borderRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});
