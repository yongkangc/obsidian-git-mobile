import React from 'react';
import {View, TouchableOpacity, StyleSheet, Text} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {colors, radius, touchTargets, typography} from '../../theme';
import {haptics} from '../../utils/haptics';

export interface FormatState {
  bold: boolean;
  italic: boolean;
  code: boolean;
  heading: boolean;
  list: boolean;
  link: boolean;
}

export interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onHeading: () => void;
  onList: () => void;
  onCode: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  formatState?: FormatState;
  wordCount?: number;
  charCount?: number;
}

interface IconProps {
  size?: number;
  color?: string;
}

function BoldIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ItalicIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4h-9M14 20H5M15 4l-6 16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LinkIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeadingIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12h8M4 18V6M12 18V6M17 10l3 2-3 2M17 6v12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ListIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CodeIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m16 18 6-6-6-6M8 6l-6 6 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UndoIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7v6h6M3 13a9 9 0 0 1 15.36-6.36L21 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RedoIcon({size = 20, color = '#888888'}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 7v6h-6M21 13a9 9 0 0 0-15.36-6.36L3 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface ToolbarButton {
  icon: React.ComponentType<IconProps>;
  onPress: () => void;
  accessibilityLabel: string;
  stateKey: keyof FormatState;
}

const defaultFormatState: FormatState = {
  bold: false,
  italic: false,
  code: false,
  heading: false,
  list: false,
  link: false,
};

export function EditorToolbar({
  onBold,
  onItalic,
  onLink,
  onHeading,
  onList,
  onCode,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  formatState = defaultFormatState,
  wordCount,
  charCount,
}: EditorToolbarProps): React.JSX.Element {
  const handlePress = (action: () => void) => {
    haptics.impactLight();
    action();
  };

  const buttons: ToolbarButton[] = [
    {icon: BoldIcon, onPress: onBold, accessibilityLabel: 'Bold', stateKey: 'bold'},
    {icon: ItalicIcon, onPress: onItalic, accessibilityLabel: 'Italic', stateKey: 'italic'},
    {icon: HeadingIcon, onPress: onHeading, accessibilityLabel: 'Heading', stateKey: 'heading'},
    {icon: ListIcon, onPress: onList, accessibilityLabel: 'List', stateKey: 'list'},
    {icon: LinkIcon, onPress: onLink, accessibilityLabel: 'Link', stateKey: 'link'},
    {icon: CodeIcon, onPress: onCode, accessibilityLabel: 'Code', stateKey: 'code'},
  ];

  const showWordCount = wordCount !== undefined && charCount !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        {onUndo && (
          <TouchableOpacity
            style={[styles.button, !canUndo && styles.buttonDisabled]}
            onPress={() => canUndo && handlePress(onUndo)}
            accessibilityLabel="Undo"
            accessibilityRole="button"
            accessibilityState={{disabled: !canUndo}}
            activeOpacity={canUndo ? 0.7 : 1}
            disabled={!canUndo}>
            <UndoIcon
              size={20}
              color={canUndo ? colors.textPlaceholder : colors.textDisabled}
            />
          </TouchableOpacity>
        )}
        {onRedo && (
          <TouchableOpacity
            style={[styles.button, !canRedo && styles.buttonDisabled]}
            onPress={() => canRedo && handlePress(onRedo)}
            accessibilityLabel="Redo"
            accessibilityRole="button"
            accessibilityState={{disabled: !canRedo}}
            activeOpacity={canRedo ? 0.7 : 1}
            disabled={!canRedo}>
            <RedoIcon
              size={20}
              color={canRedo ? colors.textPlaceholder : colors.textDisabled}
            />
          </TouchableOpacity>
        )}
        <View style={styles.formatGroup}>
          {buttons.map(button => {
            const isActive = formatState[button.stateKey];
            return (
              <TouchableOpacity
                key={button.accessibilityLabel}
                style={[styles.button, isActive && styles.buttonActive]}
                onPress={() => handlePress(button.onPress)}
                accessibilityLabel={button.accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{selected: isActive}}
                activeOpacity={0.7}>
                <button.icon
                  size={20}
                  color={isActive ? colors.accent : colors.textPlaceholder}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {showWordCount && (
        <Text style={styles.wordCount}>
          {wordCount} words · {charCount} chars
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundModal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  button: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  buttonActive: {
    backgroundColor: colors.accentMuted,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  formatGroup: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginLeft: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  wordCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: 6,
  },
});
