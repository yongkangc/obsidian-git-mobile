jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readDir: jest.fn(),
  stat: jest.fn(),
  exists: jest.fn(),
  DocumentDirectoryPath: '/mock/documents',
}));

import {useVaultStore} from '../../store';
import {sampleFileMetas, sampleFileTree, syncStatuses} from '../../test-utils';

describe('Store Smoke Tests', () => {
  beforeEach(() => {
    // Reset store state between tests
    useVaultStore.setState({
      currentNote: null,
      fileTree: [],
      recentNotes: [],
      syncStatus: {state: 'offline', pendingChanges: 0, lastSyncAt: null},
      isLoading: false,
    });
  });

  describe('Store Initialization', () => {
    it('should initialize with default state', () => {
      const state = useVaultStore.getState();

      expect(state.currentNote).toBeNull();
      expect(state.fileTree).toEqual([]);
      expect(state.recentNotes).toEqual([]);
      expect(state.syncStatus.state).toBe('offline');
      expect(state.isLoading).toBe(false);
    });

    it('should have all required actions', () => {
      const state = useVaultStore.getState();

      expect(typeof state.setCurrentNote).toBe('function');
      expect(typeof state.setFileTree).toBe('function');
      expect(typeof state.setRecentNotes).toBe('function');
      expect(typeof state.setSyncStatus).toBe('function');
      expect(typeof state.setIsLoading).toBe('function');
    });
  });

  describe('State Updates', () => {
    it('should set current note', () => {
      const note = sampleFileMetas[0];
      useVaultStore.getState().setCurrentNote(note!);

      expect(useVaultStore.getState().currentNote).toEqual(note);
    });

    it('should set file tree', () => {
      useVaultStore.getState().setFileTree(sampleFileTree);

      expect(useVaultStore.getState().fileTree).toEqual(sampleFileTree);
    });

    it('should set recent notes', () => {
      useVaultStore.getState().setRecentNotes(sampleFileMetas);

      expect(useVaultStore.getState().recentNotes).toEqual(sampleFileMetas);
    });

    it('should set sync status', () => {
      useVaultStore.getState().setSyncStatus(syncStatuses.pending!);

      expect(useVaultStore.getState().syncStatus).toEqual(syncStatuses.pending);
    });

    it('should set loading state', () => {
      useVaultStore.getState().setIsLoading(true);

      expect(useVaultStore.getState().isLoading).toBe(true);
    });

    it('should clear current note', () => {
      const note = sampleFileMetas[0];
      useVaultStore.getState().setCurrentNote(note!);
      useVaultStore.getState().setCurrentNote(null);

      expect(useVaultStore.getState().currentNote).toBeNull();
    });
  });

  describe('Multiple State Changes', () => {
    it('should handle rapid state updates', () => {
      const state = useVaultStore.getState();

      for (let i = 0; i < 100; i++) {
        state.setIsLoading(i % 2 === 0);
      }

      expect(useVaultStore.getState().isLoading).toBe(false);
    });

    it('should maintain state consistency', () => {
      const state = useVaultStore.getState();

      state.setCurrentNote(sampleFileMetas[0]!);
      state.setFileTree(sampleFileTree);
      state.setSyncStatus(syncStatuses.synced!);
      state.setIsLoading(true);

      const finalState = useVaultStore.getState();
      expect(finalState.currentNote).toEqual(sampleFileMetas[0]);
      expect(finalState.fileTree).toEqual(sampleFileTree);
      expect(finalState.syncStatus).toEqual(syncStatuses.synced);
      expect(finalState.isLoading).toBe(true);
    });
  });
});
