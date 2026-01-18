import {useState, useCallback, useRef} from 'react';

interface HistoryState {
  text: string;
  cursorPos: number;
}

interface UndoHistoryResult {
  pushState: (text: string, cursorPos: number) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 100;
const DEBOUNCE_MS = 300;

export function useUndoHistory(initialText: string): UndoHistoryResult {
  const [undoStack, setUndoStack] = useState<HistoryState[]>([
    {text: initialText, cursorPos: 0},
  ]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const lastPushRef = useRef<number>(0);
  const pendingStateRef = useRef<HistoryState | null>(null);

  const pushState = useCallback((text: string, cursorPos: number) => {
    const now = Date.now();
    const state: HistoryState = {text, cursorPos};

    if (now - lastPushRef.current < DEBOUNCE_MS) {
      pendingStateRef.current = state;
      return;
    }

    if (pendingStateRef.current) {
      setUndoStack(prev => {
        const last = prev[prev.length - 1];
        if (last && last.text === pendingStateRef.current?.text) {
          return prev;
        }
        const newStack = [...prev, pendingStateRef.current!];
        return newStack.slice(-MAX_HISTORY);
      });
      pendingStateRef.current = null;
    }

    setUndoStack(prev => {
      const last = prev[prev.length - 1];
      if (last && last.text === text) {
        return prev;
      }
      const newStack = [...prev, state];
      return newStack.slice(-MAX_HISTORY);
    });
    setRedoStack([]);
    lastPushRef.current = now;
  }, []);

  const undo = useCallback((): HistoryState | null => {
    if (undoStack.length <= 1) {
      return null;
    }

    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];

    setUndoStack(prev => prev.slice(0, -1));
    if (currentState) {
      setRedoStack(prev => [...prev, currentState]);
    }

    return previousState ?? null;
  }, [undoStack]);

  const redo = useCallback((): HistoryState | null => {
    if (redoStack.length === 0) {
      return null;
    }

    const nextState = redoStack[redoStack.length - 1];

    setRedoStack(prev => prev.slice(0, -1));
    if (nextState) {
      setUndoStack(prev => [...prev, nextState]);
    }

    return nextState ?? null;
  }, [redoStack]);

  return {
    pushState,
    undo,
    redo,
    canUndo: undoStack.length > 1,
    canRedo: redoStack.length > 0,
  };
}
