import React, {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInputSelectionChangeEventData,
  type NativeSyntheticEvent,
} from 'react-native';
import {useDebounce} from '../../hooks/useDebounce';
import {WikilinkAutocomplete} from './WikilinkAutocomplete';
import {EditorToolbar, type FormatState} from './EditorToolbar';
import {StyledMarkdownOverlay} from './StyledMarkdownOverlay';
import {colors} from '../../theme';

export interface MarkdownEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onGetFileTitles: () => string[];
  debounceMs?: number;
  placeholder?: string;
}

interface Selection {
  start: number;
  end: number;
}

export function MarkdownEditor({
  initialContent,
  onSave,
  onGetFileTitles,
  debounceMs = 500,
  placeholder = '',
}: MarkdownEditorProps): React.JSX.Element {
  const [text, setText] = useState(initialContent);
  const [overlayText, setOverlayText] = useState(initialContent);
  const [selection, setSelection] = useState<Selection>({start: 0, end: 0});
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const lastSavedRef = useRef(initialContent);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(initialContent);
    setOverlayText(initialContent);
    lastSavedRef.current = initialContent;
  }, [initialContent]);

  // Cleanup overlay timer on unmount
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  const debouncedSave = useDebounce((content: string) => {
    if (content !== lastSavedRef.current) {
      onSave(content);
      lastSavedRef.current = content;
    }
  }, debounceMs);

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      debouncedSave(newText);

      // Throttle overlay updates to reduce parseMarkdownSegments calls (every 100ms)
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
      overlayTimerRef.current = setTimeout(() => {
        setOverlayText(newText);
      }, 100);

      const cursorPos = selection.start;
      const textBeforeCursor = newText.slice(0, cursorPos + 1);
      const wikilinkMatch = /\[\[([^\]|]*)$/.exec(textBeforeCursor);

      if (wikilinkMatch) {
        setShowAutocomplete(true);
        setAutocompleteQuery(wikilinkMatch[1] ?? '');
        setAutocompletePosition(wikilinkMatch.index);
      } else {
        setShowAutocomplete(false);
      }
    },
    [debouncedSave, selection.start],
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(event.nativeEvent.selection);
    },
    [],
  );

  const handleWikilinkSelect = useCallback(
    (title: string) => {
      const before = text.slice(0, autocompletePosition);
      const after = text.slice(selection.start);
      const newText = `${before}[[${title}]]${after}`;
      setText(newText);
      debouncedSave(newText);
      setShowAutocomplete(false);

      const newCursorPos = autocompletePosition + title.length + 4;
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {start: newCursorPos, end: newCursorPos},
        });
      }, 0);
    },
    [text, autocompletePosition, selection.start, debouncedSave],
  );

  const insertFormatting = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const {start, end} = selection;
      const selectedText = text.slice(start, end);
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = `${before}${prefix}${selectedText}${suffix}${after}`;
      setText(newText);
      debouncedSave(newText);

      const newCursorPos =
        start + prefix.length + selectedText.length + suffix.length;
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {start: newCursorPos, end: newCursorPos},
        });
      }, 0);
    },
    [selection, text, debouncedSave],
  );

  const handleBold = useCallback(
    () => insertFormatting('**'),
    [insertFormatting],
  );
  const handleItalic = useCallback(
    () => insertFormatting('*'),
    [insertFormatting],
  );
  const handleLink = useCallback(
    () => insertFormatting('[', '](url)'),
    [insertFormatting],
  );
  const handleCode = useCallback(
    () => insertFormatting('`'),
    [insertFormatting],
  );
  const handleHeading = useCallback(() => {
    const {start} = selection;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const before = text.slice(0, lineStart);
    const lineAndAfter = text.slice(lineStart);
    const newText = `${before}# ${lineAndAfter}`;
    setText(newText);
    debouncedSave(newText);
  }, [selection, text, debouncedSave]);
  const handleList = useCallback(() => {
    const {start} = selection;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const before = text.slice(0, lineStart);
    const lineAndAfter = text.slice(lineStart);
    const newText = `${before}- ${lineAndAfter}`;
    setText(newText);
    debouncedSave(newText);
  }, [selection, text, debouncedSave]);

  const formatState = useMemo((): FormatState => {
    const {start} = selection;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', start);
    const currentLine = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    const textBefore = text.slice(0, start);
    const textAfter = text.slice(start);

    const isInBold = /\*\*[^*]*$/.test(textBefore) && /^[^*]*\*\*/.test(textAfter);
    const isInItalic =
      (/(?<!\*)\*[^*]+$/.test(textBefore) && /^[^*]+\*(?!\*)/.test(textAfter)) ||
      (/(?<!_)_[^_]+$/.test(textBefore) && /^[^_]+_(?!_)/.test(textAfter));
    const isInCode = /`[^`]*$/.test(textBefore) && /^[^`]*`/.test(textAfter);
    const isHeading = /^#{1,6}\s/.test(currentLine);
    const isList = /^(\s*[-*+]|\s*\d+\.)\s/.test(currentLine);
    const isInLink = /\[[^\]]*$/.test(textBefore) || /\]\([^)]*$/.test(textBefore);

    return {
      bold: isInBold,
      italic: isInItalic,
      code: isInCode,
      heading: isHeading,
      list: isList,
      link: isInLink,
    };
  }, [text, selection]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <View style={styles.editorContainer}>
        <StyledMarkdownOverlay text={overlayText} style={styles.overlay} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          onSelectionChange={handleSelectionChange}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect
          scrollEnabled
          selectionColor={colors.accent}
          caretHidden={false}
        />
        {showAutocomplete && (
          <WikilinkAutocomplete
            query={autocompleteQuery}
            onSelect={handleWikilinkSelect}
            onDismiss={() => setShowAutocomplete(false)}
            getFileTitles={onGetFileTitles}
          />
        )}
      </View>
      <EditorToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onLink={handleLink}
        onHeading={handleHeading}
        onList={handleList}
        onCode={handleCode}
        formatState={formatState}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundModal,
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  input: {
    flex: 1,
    color: 'transparent',
    fontSize: 18,
    fontFamily: undefined,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    lineHeight: 30,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
