import {create} from 'zustand';
import * as RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FileMeta, FileNode, SyncStatus, SyncQueueItem} from '../types';

const RECENT_NOTES_KEY = '@obsidian_git_recent_notes';
const MAX_RECENT_NOTES = 10;

interface VaultState {
  currentNote: FileMeta | null;
  currentPath: string[];
  fileTree: FileNode[];
  recentNotes: FileMeta[];
  syncStatus: SyncStatus;
  syncQueue: SyncQueueItem[];
  isLoading: boolean;
  vaultPath: string;
  expandedFolders: Set<string>;
  quickSwitcherVisible: boolean;
  vaultName: string;

  setCurrentNote: (note: FileMeta | null) => void;
  setCurrentPath: (path: string[]) => void;
  setFileTree: (tree: FileNode[]) => void;
  setRecentNotes: (notes: FileMeta[]) => void;
  addRecentNote: (note: FileMeta) => void;
  loadRecentNotes: () => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
  addToSyncQueue: (path: string, action: 'add' | 'modify' | 'delete') => void;
  clearSyncQueue: () => void;
  setIsLoading: (loading: boolean) => void;
  setVaultPath: (path: string) => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  setQuickSwitcherVisible: (visible: boolean) => void;
  setVaultName: (name: string) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  currentNote: null,
  currentPath: [],
  fileTree: [],
  recentNotes: [],
  syncStatus: {
    state: 'offline',
    pendingChanges: 0,
    lastSyncAt: null,
  },
  syncQueue: [],
  isLoading: false,
  vaultPath: `${RNFS.DocumentDirectoryPath}/vault`,
  expandedFolders: new Set<string>(),
  quickSwitcherVisible: false,
  vaultName: 'Vault',

  setCurrentNote: note => set({currentNote: note}),
  setCurrentPath: path => set({currentPath: path}),
  setFileTree: tree => set({fileTree: tree}),
  setRecentNotes: notes => set({recentNotes: notes}),
  addRecentNote: note => {
    const current = get().recentNotes;
    const filtered = current.filter(n => n.path !== note.path);
    const updated = [note, ...filtered].slice(0, MAX_RECENT_NOTES);
    set({recentNotes: updated});
    AsyncStorage.setItem(RECENT_NOTES_KEY, JSON.stringify(updated)).catch(
      err => console.warn('Failed to persist recent notes:', err),
    );
  },
  loadRecentNotes: async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_NOTES_KEY);
      if (stored) {
        const notes = JSON.parse(stored) as FileMeta[];
        set({recentNotes: notes});
      }
    } catch (err) {
      console.warn('Failed to load recent notes:', err);
    }
  },
  setSyncStatus: status => set({syncStatus: status}),
  addToSyncQueue: (path, action) => {
    const queue = get().syncQueue;
    const existing = queue.find(item => item.path === path);

    if (existing) {
      if (action === 'delete' && existing.action === 'add') {
        set({syncQueue: queue.filter(item => item.path !== path)});
        return;
      }
      set({
        syncQueue: queue.map(item =>
          item.path === path ? {...item, action, queuedAt: Date.now()} : item,
        ),
      });
    } else {
      set({
        syncQueue: [...queue, {path, action, queuedAt: Date.now()}],
      });
    }
  },
  clearSyncQueue: () => set({syncQueue: []}),
  setIsLoading: loading => set({isLoading: loading}),
  setVaultPath: path => set({vaultPath: path}),
  toggleFolder: path => {
    const expanded = new Set(get().expandedFolders);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({expandedFolders: expanded});
  },
  expandFolder: path => {
    const expanded = new Set(get().expandedFolders);
    expanded.add(path);
    set({expandedFolders: expanded});
  },
  collapseFolder: path => {
    const expanded = new Set(get().expandedFolders);
    expanded.delete(path);
    set({expandedFolders: expanded});
  },
  setQuickSwitcherVisible: visible => set({quickSwitcherVisible: visible}),
  setVaultName: name => set({vaultName: name}),
}));
