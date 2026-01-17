import {renderHook, act, waitFor} from '@testing-library/react-native';
import {useSearch} from '../../hooks/useSearch';
import type {FileMeta, SearchResult} from '../../types';

jest.useFakeTimers();

describe('useSearch', () => {
  const mockFiles: FileMeta[] = [
    {path: 'notes/test.md', title: 'Test Note', modifiedAt: Date.now(), contentHash: ''},
    {path: 'notes/hello.md', title: 'Hello World', modifiedAt: Date.now(), contentHash: ''},
    {path: 'projects/readme.md', title: 'Readme', modifiedAt: Date.now(), contentHash: ''},
  ];

  const mockSearchResults: SearchResult[] = [
    {path: 'notes/test.md', title: 'Test Note', snippet: 'Contains **query** here', score: 1},
  ];

  describe('debouncing', () => {
    it('should debounce search input', async () => {
      const onFilenameSearch = jest.fn().mockResolvedValue(mockFiles);

      const {result} = renderHook(() =>
        useSearch({
          debounceMs: 150,
          onFilenameSearch,
        }),
      );

      act(() => {
        result.current.setQuery('t');
      });
      act(() => {
        result.current.setQuery('te');
      });
      act(() => {
        result.current.setQuery('tes');
      });
      act(() => {
        result.current.setQuery('test');
      });

      expect(onFilenameSearch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(onFilenameSearch).toHaveBeenCalledTimes(1);
        expect(onFilenameSearch).toHaveBeenCalledWith('test');
      });
    });

    it('should not search with empty query', async () => {
      const onFilenameSearch = jest.fn().mockResolvedValue(mockFiles);

      const {result} = renderHook(() =>
        useSearch({
          debounceMs: 150,
          onFilenameSearch,
        }),
      );

      act(() => {
        result.current.setQuery('   ');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(onFilenameSearch).not.toHaveBeenCalled();
        expect(result.current.results).toEqual([]);
      });
    });
  });

  describe('mode switching', () => {
    it('should switch between filename and fulltext modes', () => {
      const {result} = renderHook(() => useSearch());

      expect(result.current.mode).toBe('filename');

      act(() => {
        result.current.setMode('fulltext');
      });

      expect(result.current.mode).toBe('fulltext');

      act(() => {
        result.current.setMode('filename');
      });

      expect(result.current.mode).toBe('filename');
    });

    it('should call correct search function based on mode', async () => {
      const onFilenameSearch = jest.fn().mockResolvedValue(mockFiles);
      const onFulltextSearch = jest.fn().mockResolvedValue(mockSearchResults);

      const {result} = renderHook(() =>
        useSearch({
          debounceMs: 150,
          onFilenameSearch,
          onFulltextSearch,
        }),
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(onFilenameSearch).toHaveBeenCalledWith('test');
        expect(onFulltextSearch).not.toHaveBeenCalled();
      });

      jest.clearAllMocks();

      act(() => {
        result.current.setMode('fulltext');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(onFulltextSearch).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('loading state', () => {
    it('should set isLoading during search', async () => {
      let resolveSearch: (value: FileMeta[]) => void;
      const onFilenameSearch = jest.fn().mockImplementation(
        () =>
          new Promise<FileMeta[]>(resolve => {
            resolveSearch = resolve;
          }),
      );

      const {result} = renderHook(() =>
        useSearch({
          debounceMs: 150,
          onFilenameSearch,
        }),
      );

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveSearch!(mockFiles);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.results).toHaveLength(3);
      });
    });
  });

  describe('error handling', () => {
    it('should handle search errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const onFilenameSearch = jest.fn().mockRejectedValue(new Error('Search failed'));

      const {result} = renderHook(() =>
        useSearch({
          debounceMs: 150,
          onFilenameSearch,
        }),
      );

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
