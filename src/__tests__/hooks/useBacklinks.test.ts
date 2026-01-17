import {renderHook, waitFor, act} from '@testing-library/react-native';
import {useBacklinks, type BacklinkInfo} from '../../hooks/useBacklinks';

describe('useBacklinks', () => {
  const mockBacklinks: BacklinkInfo[] = [
    {
      sourcePath: 'notes/daily.md',
      title: 'Daily Notes',
      contextLine: 'Check out [[Test Note]] for more info.',
    },
    {
      sourcePath: 'projects/planning.md',
      title: 'Project Planning',
      contextLine: 'Related: [[Test Note]] and [[Other]]',
    },
  ];

  describe('initial fetch', () => {
    it('should fetch backlinks on mount', async () => {
      const onGetBacklinks = jest.fn().mockResolvedValue(mockBacklinks);

      const {result} = renderHook(() =>
        useBacklinks('notes/test.md', {onGetBacklinks}),
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onGetBacklinks).toHaveBeenCalledWith('notes/test.md');
      expect(result.current.backlinks).toEqual(mockBacklinks);
    });

    it('should return empty array when no callback provided', async () => {
      const {result} = renderHook(() => useBacklinks('notes/test.md'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.backlinks).toEqual([]);
    });

    it('should return empty array for empty path', async () => {
      const onGetBacklinks = jest.fn().mockResolvedValue(mockBacklinks);

      const {result} = renderHook(() =>
        useBacklinks('', {onGetBacklinks}),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onGetBacklinks).not.toHaveBeenCalled();
      expect(result.current.backlinks).toEqual([]);
    });
  });

  describe('path changes', () => {
    it('should refetch when path changes', async () => {
      const onGetBacklinks = jest.fn().mockResolvedValue(mockBacklinks);

      const {result, rerender} = renderHook(
        ({path}: {path: string}) => useBacklinks(path, {onGetBacklinks}),
        {initialProps: {path: 'notes/first.md'}},
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onGetBacklinks).toHaveBeenCalledWith('notes/first.md');

      rerender({path: 'notes/second.md'});

      await waitFor(() => {
        expect(onGetBacklinks).toHaveBeenCalledWith('notes/second.md');
      });

      expect(onGetBacklinks).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should allow manual refresh', async () => {
      const onGetBacklinks = jest.fn().mockResolvedValue(mockBacklinks);

      const {result} = renderHook(() =>
        useBacklinks('notes/test.md', {onGetBacklinks}),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onGetBacklinks).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(onGetBacklinks).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const onGetBacklinks = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const {result} = renderHook(() =>
        useBacklinks('notes/test.md', {onGetBacklinks}),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.backlinks).toEqual([]);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
