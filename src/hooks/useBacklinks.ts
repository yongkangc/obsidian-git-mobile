import {useState, useEffect, useCallback} from 'react';

export interface BacklinkInfo {
  sourcePath: string;
  title: string;
  contextLine: string;
}

export interface UseBacklinksOptions {
  onGetBacklinks?: (targetPath: string) => Promise<BacklinkInfo[]>;
}

export interface UseBacklinksReturn {
  backlinks: BacklinkInfo[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useBacklinks(
  notePath: string,
  options: UseBacklinksOptions = {},
): UseBacklinksReturn {
  const {onGetBacklinks} = options;

  const [backlinks, setBacklinks] = useState<BacklinkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBacklinks = useCallback(async () => {
    if (!notePath || !onGetBacklinks) {
      setBacklinks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await onGetBacklinks(notePath);
      setBacklinks(result);
    } catch (error) {
      console.error('Failed to fetch backlinks:', error);
      setBacklinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [notePath, onGetBacklinks]);

  useEffect(() => {
    void fetchBacklinks();
  }, [fetchBacklinks]);

  const refresh = useCallback(async () => {
    await fetchBacklinks();
  }, [fetchBacklinks]);

  return {
    backlinks,
    isLoading,
    refresh,
  };
}
