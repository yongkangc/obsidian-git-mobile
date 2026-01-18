import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FileNode} from '../types';

const CACHE_KEY = 'vault_tree_cache';

export const treeCache = {
  async get(): Promise<FileNode[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  },

  async set(tree: FileNode[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tree));
    } catch {
      // Ignore cache write failures
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};
