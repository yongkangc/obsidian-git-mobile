import {useState, useEffect, useCallback} from 'react';
import {useDebouncedValue} from './useDebounce';
import type {SearchResult, FileMeta} from '../types';

export type SearchMode = 'filename' | 'fulltext';

export interface FileSearchResult {
  path: string;
  title: string;
  score: number;
}

export interface UseSearchOptions {
  debounceMs?: number;
  onFilenameSearch?: (query: string) => Promise<FileMeta[]>;
  onFulltextSearch?: (query: string) => Promise<SearchResult[]>;
}

export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  mode: SearchMode;
  setMode: (mode: SearchMode) => void;
  isLoading: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {debounceMs = 150, onFilenameSearch, onFulltextSearch} = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState<SearchMode>('filename');
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const performSearch = useCallback(async () => {
    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'filename' && onFilenameSearch) {
        const files = await onFilenameSearch(trimmedQuery);
        const searchResults: SearchResult[] = files.map(file => ({
          path: file.path,
          title: file.title,
          snippet: '',
          score: 0,
        }));
        setResults(searchResults);
      } else if (mode === 'fulltext' && onFulltextSearch) {
        const searchResults = await onFulltextSearch(trimmedQuery);
        setResults(searchResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, mode, onFilenameSearch, onFulltextSearch]);

  useEffect(() => {
    void performSearch();
  }, [performSearch]);

  return {
    query,
    setQuery,
    results,
    mode,
    setMode,
    isLoading,
  };
}
