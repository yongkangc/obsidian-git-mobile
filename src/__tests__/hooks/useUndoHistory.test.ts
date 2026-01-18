import {renderHook, act} from '@testing-library/react-native';
import {useUndoHistory} from '../../hooks/useUndoHistory';

describe('useUndoHistory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with initial text', () => {
    const {result} = renderHook(() => useUndoHistory('initial'));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should allow undo after text changes', () => {
    const {result} = renderHook(() => useUndoHistory('initial'));

    act(() => {
      result.current.pushState('change1', 7);
      jest.advanceTimersByTime(350);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      const undoState = result.current.undo();
      expect(undoState?.text).toBe('initial');
    });
  });

  it('should allow redo after undo', () => {
    const {result} = renderHook(() => useUndoHistory('initial'));

    act(() => {
      result.current.pushState('change1', 7);
      jest.advanceTimersByTime(350);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      const redoState = result.current.redo();
      expect(redoState?.text).toBe('change1');
    });
  });

  it('should clear redo stack when new change is made', () => {
    const {result} = renderHook(() => useUndoHistory('initial'));

    act(() => {
      result.current.pushState('change1', 7);
      jest.advanceTimersByTime(350);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.pushState('change2', 7);
      jest.advanceTimersByTime(350);
    });

    expect(result.current.canRedo).toBe(false);
  });

  it('should not push duplicate states', () => {
    const {result} = renderHook(() => useUndoHistory('initial'));

    act(() => {
      result.current.pushState('change1', 7);
      jest.advanceTimersByTime(350);
      result.current.pushState('change1', 7);
      jest.advanceTimersByTime(350);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
  });
});
