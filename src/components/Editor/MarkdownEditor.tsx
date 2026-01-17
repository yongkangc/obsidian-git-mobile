import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  type TextInputSelectionChangeEventData,
  type NativeSyntheticEvent,
} from 'react-native';
import {useDebounce} from '../../hooks/useDebounce';
import {WikilinkAutocomplete} from './WikilinkAutocomplete';
import {EditorToolbar} from './EditorToolbar';

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
  placeholder = 'Start typing...',
}: MarkdownEditorProps): React.JSX.Element {
  const [text, setText] = useState(initialContent);
  const [selection, setSelection] = useState<Selection>({start: 0, end: 0});
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const lastSavedRef = useRef(initialContent);

  useEffect(() => {
    setText(initialContent);
    lastSavedRef.current = initialContent;
  }, [initialContent]);

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

      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {start: newCursorPos, end: newCursorPos},
        });
      }, 0);
    },
    [selection, text, debouncedSave],
  );

  const handleBold = useCallback(() => insertFormatting('**'), [insertFormatting]);
  const handleItalic = useCallback(() => insertFormatting('*'), [insertFormatting]);
  const handleLink = useCallback(() => insertFormatting('[', '](url)'), [insertFormatting]);
  const handleHeading = useCallback(() => {
    const {start} = selection;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const before = text.slice(0, lineStart);
    const lineAndAfter = text.slice(lineStart);
    const newText = `${before}# ${lineAndAfter}`;
    setText(newText);
    debouncedSave(newText);
  }, [selection, text, debouncedSave]);

  return (
    <View style={styles.container}>
      <EditorToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onLink={handleLink}
        onHeading={handleHeading}
      />
      <View style={styles.editorContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          onSelectionChange={handleSelectionChange}
          multiline
          placeholder={placeholder}
          placeholderTextColor="#666"
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          scrollEnabled
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'monospace',
    padding: 16,
    lineHeight: 24,
  },
});
