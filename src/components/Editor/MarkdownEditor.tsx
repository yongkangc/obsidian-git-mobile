import React, {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  type TextInputSelectionChangeEventData,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useDebounce, useUndoHistory} from '../../hooks';
import {WikilinkAutocomplete} from './WikilinkAutocomplete';
import {EditorToolbar, type FormatState} from './EditorToolbar';
import {StyledMarkdownOverlay} from './StyledMarkdownOverlay';
import {colors} from '../../theme';
import {haptics} from '../../utils/haptics';

const SWIPE_THRESHOLD = 50;
const LIST_PATTERN = /^(\s*)([-*+]|\d+\.)\s/;

const LINE_HEIGHT = 30;
const TYPEWRITER_POSITION = 0.4; // 40% from top

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
  const [selection, setSelection] = useState<Selection>({start: 0, end: 0});
  const [isFocused, setIsFocused] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState(0);
  const [editorHeight, setEditorHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastSavedRef = useRef(initialContent);
  const skipHistoryRef = useRef(false);
  const lastScrollLineRef = useRef(-1);

  const {pushState, undo, redo, canUndo, canRedo} = useUndoHistory(initialContent);

  useEffect(() => {
    setText(initialContent);
    lastSavedRef.current = initialContent;
  }, [initialContent]);

  const getLineFromPosition = useCallback((pos: number, content: string): number => {
    return content.slice(0, pos).split('\n').length - 1;
  }, []);

  const scrollToTypewriterPosition = useCallback((lineNumber: number) => {
    if (!scrollViewRef.current || editorHeight === 0) return;
    if (lineNumber === lastScrollLineRef.current) return;
    
    lastScrollLineRef.current = lineNumber;
    const targetY = lineNumber * LINE_HEIGHT - editorHeight * TYPEWRITER_POSITION + 16; // 16 = paddingTop
    scrollViewRef.current.scrollTo({y: Math.max(0, targetY), animated: true});
  }, [editorHeight]);

  const handleEditorLayout = useCallback((event: LayoutChangeEvent) => {
    setEditorHeight(event.nativeEvent.layout.height);
  }, []);

  // Save immediately when component unmounts (user navigates back)
  const textRef = useRef(text);
  textRef.current = text;
  
  useEffect(() => {
    return () => {
      // Force save on unmount if there are unsaved changes
      if (textRef.current !== lastSavedRef.current) {
        onSave(textRef.current);
      }
    };
  }, [onSave]);

  const debouncedSave = useDebounce((content: string) => {
    if (content !== lastSavedRef.current) {
      onSave(content);
      lastSavedRef.current = content;
    }
  }, debounceMs);

  const applySmartTypographyNearCursor = useCallback(
    (inputText: string, cursorPos: number): {text: string; newCursorPos: number} => {
      // Only process in a small window before the cursor
      const windowSize = 10;
      const from = Math.max(0, cursorPos - windowSize);
      const before = inputText.slice(0, from);
      let mid = inputText.slice(from, cursorPos);
      const after = inputText.slice(cursorPos);

      let cursorOffset = 0;

      // Em-dash: -- -> —
      if (mid.endsWith('--')) {
        mid = mid.slice(0, -2) + '—';
        cursorOffset = -1;
      }

      // Ellipsis: ... -> …
      if (mid.endsWith('...')) {
        mid = mid.slice(0, -3) + '…';
        cursorOffset = -2;
      }

      // Smart double quotes
      if (mid.endsWith('"')) {
        const textBeforeQuote = before + mid.slice(0, -1);
        const quoteCount = (textBeforeQuote.match(/"/g) ?? []).length;
        const isOpening = quoteCount % 2 === 0;
        mid = mid.slice(0, -1) + (isOpening ? '\u201c' : '\u201d');
      }

      // Smart single quotes
      if (mid.endsWith("'")) {
        const charBefore = mid.slice(-2, -1);
        const isOpening = !charBefore || /\s/.test(charBefore);
        mid = mid.slice(0, -1) + (isOpening ? '\u2018' : '\u2019');
      }

      return {
        text: before + mid + after,
        newCursorPos: cursorPos + cursorOffset,
      };
    },
    [],
  );

  const handleTextChange = useCallback(
    (newText: string) => {
      // Use current selection position for smart typography
      const cursorPos = selection.start + (newText.length - text.length);
      const {text: processedText, newCursorPos} = applySmartTypographyNearCursor(newText, cursorPos);

      setText(processedText);
      debouncedSave(processedText);

      // Update cursor if it moved due to smart typography
      if (newCursorPos !== cursorPos) {
        setTimeout(() => {
          inputRef.current?.setNativeProps({
            selection: {start: newCursorPos, end: newCursorPos},
          });
        }, 0);
      }

      if (!skipHistoryRef.current) {
        pushState(processedText, newCursorPos);
      }
      skipHistoryRef.current = false;

      const textBeforeCursor = processedText.slice(0, newCursorPos + 1);
      const wikilinkMatch = /\[\[([^\]|]*)$/.exec(textBeforeCursor);

      if (wikilinkMatch) {
        setShowAutocomplete(true);
        setAutocompleteQuery(wikilinkMatch[1] ?? '');
        setAutocompletePosition(wikilinkMatch.index);
      } else {
        setShowAutocomplete(false);
      }
    },
    [text, selection.start, applySmartTypographyNearCursor, debouncedSave, pushState],
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const newSelection = event.nativeEvent.selection;
      setSelection(newSelection);
      
      // Typewriter scrolling
      const lineNumber = getLineFromPosition(newSelection.start, text);
      scrollToTypewriterPosition(lineNumber);
    },
    [text, getLineFromPosition, scrollToTypewriterPosition],
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

  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      skipHistoryRef.current = true;
      setText(state.text);
      debouncedSave(state.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {start: state.cursorPos, end: state.cursorPos},
        });
      }, 0);
    }
  }, [undo, debouncedSave]);

  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      skipHistoryRef.current = true;
      setText(state.text);
      debouncedSave(state.text);
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {start: state.cursorPos, end: state.cursorPos},
        });
      }, 0);
    }
  }, [redo, debouncedSave]);

  const getCurrentLineInfo = useCallback(() => {
    const {start} = selection;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', start);
    const currentLine = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    return {lineStart, lineEnd: lineEnd === -1 ? text.length : lineEnd, currentLine};
  }, [text, selection]);

  const handleIndent = useCallback(() => {
    const {lineStart, lineEnd, currentLine} = getCurrentLineInfo();
    if (!LIST_PATTERN.test(currentLine)) return false;

    const before = text.slice(0, lineStart);
    const after = text.slice(lineEnd);
    const newLine = '  ' + currentLine;
    const newText = before + newLine + after;

    setText(newText);
    debouncedSave(newText);
    pushState(newText, selection.start + 2);
    haptics.selection();

    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: {start: selection.start + 2, end: selection.start + 2},
      });
    }, 0);
    return true;
  }, [getCurrentLineInfo, text, debouncedSave, pushState, selection.start]);

  const handleOutdent = useCallback(() => {
    const {lineStart, lineEnd, currentLine} = getCurrentLineInfo();
    if (!LIST_PATTERN.test(currentLine)) return false;

    const match = currentLine.match(/^(\s*)/);
    const leadingSpaces = match?.[1]?.length ?? 0;
    if (leadingSpaces < 2) return false;

    const before = text.slice(0, lineStart);
    const after = text.slice(lineEnd);
    const newLine = currentLine.slice(2);
    const newText = before + newLine + after;

    setText(newText);
    debouncedSave(newText);
    pushState(newText, Math.max(lineStart, selection.start - 2));
    haptics.selection();

    setTimeout(() => {
      const newCursorPos = Math.max(lineStart, selection.start - 2);
      inputRef.current?.setNativeProps({
        selection: {start: newCursorPos, end: newCursorPos},
      });
    }, 0);
    return true;
  }, [getCurrentLineInfo, text, debouncedSave, pushState, selection.start]);

  const swipeHandledRef = useRef(false);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_THRESHOLD, SWIPE_THRESHOLD])
        .failOffsetY([-20, 20])
        .onStart(() => {
          swipeHandledRef.current = false;
        })
        .onUpdate(event => {
          if (swipeHandledRef.current) return;

          if (event.translationX > SWIPE_THRESHOLD) {
            swipeHandledRef.current = true;
            handleIndent();
          } else if (event.translationX < -SWIPE_THRESHOLD) {
            swipeHandledRef.current = true;
            handleOutdent();
          }
        }),
    [handleIndent, handleOutdent],
  );

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

  const {wordCount, charCount} = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    return {wordCount: words, charCount: chars};
  }, [text]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <View style={styles.editorContainer} onLayout={handleEditorLayout}>
        {isFocused ? (
          <GestureDetector gesture={panGesture}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.editorContent}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  onChangeText={handleTextChange}
                  onSelectionChange={handleSelectionChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  multiline
                  placeholder={placeholder}
                  placeholderTextColor={colors.textDisabled}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  autoCorrect
                  scrollEnabled={false}
                  selectionColor={colors.accent}
                  caretHidden={false}
                />
              </View>
            </ScrollView>
          </GestureDetector>
        ) : (
          <Pressable
            onPress={() => {
              setIsFocused(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            style={styles.previewContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}>
              <StyledMarkdownOverlay
                text={text}
                style={styles.markdownPreview}
              />
            </ScrollView>
          </Pressable>
        )}
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        formatState={formatState}
        wordCount={wordCount}
        charCount={charCount}
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
  scrollView: {
    flex: 1,
  },
  editorContent: {
    minHeight: '100%',
    position: 'relative',
  },
  input: {
    color: colors.textPrimary,
    fontSize: 17,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    lineHeight: 28,
    zIndex: 1,
    backgroundColor: 'transparent',
    minHeight: 300,
  },
  previewContainer: {
    flex: 1,
  },
  markdownPreview: {
    position: 'relative',
    minHeight: 300,
  },
});
