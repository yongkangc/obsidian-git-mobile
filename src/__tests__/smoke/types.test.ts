import type {
  VaultFS,
  FileNode,
  FileStat,
  IndexDB,
  FileMeta,
  SearchResult,
  GitSync,
  GitAuth,
  PullResult,
  SyncStatus,
  VaultService,
  SyncQueueItem,
} from '../../types';

describe('Type Interface Compliance', () => {
  describe('VaultFS Interface', () => {
    it('should define all required methods', () => {
      const mockVaultFS: VaultFS = {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        deleteFile: jest.fn(),
        listTree: jest.fn(),
        stat: jest.fn(),
        ensureDir: jest.fn(),
        exists: jest.fn(),
      };

      expect(mockVaultFS.readFile).toBeDefined();
      expect(mockVaultFS.writeFile).toBeDefined();
      expect(mockVaultFS.deleteFile).toBeDefined();
      expect(mockVaultFS.listTree).toBeDefined();
      expect(mockVaultFS.stat).toBeDefined();
      expect(mockVaultFS.ensureDir).toBeDefined();
      expect(mockVaultFS.exists).toBeDefined();
    });
  });

  describe('FileNode Interface', () => {
    it('should create valid FileNode', () => {
      const node: FileNode = {
        path: '/notes/test.md',
        name: 'test.md',
        isDirectory: false,
        modifiedAt: Date.now(),
      };

      expect(node.path).toBe('/notes/test.md');
      expect(node.name).toBe('test.md');
      expect(node.isDirectory).toBe(false);
    });

    it('should support directory with children', () => {
      const dir: FileNode = {
        path: '/notes',
        name: 'notes',
        isDirectory: true,
        children: [
          {path: '/notes/a.md', name: 'a.md', isDirectory: false},
        ],
      };

      expect(dir.children?.length).toBe(1);
    });
  });

  describe('FileStat Interface', () => {
    it('should create valid FileStat', () => {
      const stat: FileStat = {
        path: '/notes/test.md',
        size: 1024,
        modifiedAt: Date.now(),
        isDirectory: false,
      };

      expect(stat.size).toBe(1024);
    });
  });

  describe('IndexDB Interface', () => {
    it('should define all required methods', () => {
      const mockIndexDB: IndexDB = {
        upsertFileMeta: jest.fn(),
        getFileMeta: jest.fn(),
        getAllFiles: jest.fn(),
        updateLinksForFile: jest.fn(),
        getBacklinks: jest.fn(),
        ftsUpsert: jest.fn(),
        ftsSearch: jest.fn(),
        deleteFileMeta: jest.fn(),
      };

      expect(mockIndexDB.upsertFileMeta).toBeDefined();
      expect(mockIndexDB.ftsSearch).toBeDefined();
      expect(mockIndexDB.getBacklinks).toBeDefined();
    });
  });

  describe('FileMeta Interface', () => {
    it('should create valid FileMeta', () => {
      const meta: FileMeta = {
        path: '/notes/test.md',
        title: 'Test Note',
        modifiedAt: Date.now(),
        contentHash: 'abc123',
      };

      expect(meta.title).toBe('Test Note');
      expect(meta.contentHash).toBe('abc123');
    });
  });

  describe('SearchResult Interface', () => {
    it('should create valid SearchResult', () => {
      const result: SearchResult = {
        path: '/notes/test.md',
        title: 'Test Note',
        snippet: '...matching text...',
        score: 0.95,
      };

      expect(result.score).toBeGreaterThan(0);
      expect(result.snippet).toBeDefined();
    });
  });

  describe('GitSync Interface', () => {
    it('should define all required methods', () => {
      const mockGitSync: GitSync = {
        clone: jest.fn(),
        pull: jest.fn(),
        commitAndPush: jest.fn(),
        status: jest.fn(),
        setAuth: jest.fn(),
      };

      expect(mockGitSync.clone).toBeDefined();
      expect(mockGitSync.pull).toBeDefined();
      expect(mockGitSync.commitAndPush).toBeDefined();
    });
  });

  describe('GitAuth Interface', () => {
    it('should create OAuth auth', () => {
      const auth: GitAuth = {
        type: 'oauth',
        token: 'token123',
      };

      expect(auth.type).toBe('oauth');
    });

    it('should create PAT auth with username', () => {
      const auth: GitAuth = {
        type: 'pat',
        token: 'pat123',
        username: 'user',
      };

      expect(auth.username).toBe('user');
    });
  });

  describe('PullResult Interface', () => {
    it('should create valid PullResult', () => {
      const result: PullResult = {
        updated: ['/a.md', '/b.md'],
        conflicts: ['/c.md'],
      };

      expect(result.updated).toHaveLength(2);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('SyncStatus Interface', () => {
    it('should create synced status', () => {
      const status: SyncStatus = {
        state: 'synced',
        pendingChanges: 0,
        lastSyncAt: Date.now(),
      };

      expect(status.state).toBe('synced');
    });

    it('should create error status', () => {
      const status: SyncStatus = {
        state: 'error',
        pendingChanges: 2,
        lastSyncAt: null,
        error: 'Network error',
      };

      expect(status.error).toBe('Network error');
    });
  });

  describe('VaultService Interface', () => {
    it('should define all required methods', () => {
      const mockVaultService: VaultService = {
        openNote: jest.fn(),
        saveNote: jest.fn(),
        createNote: jest.fn(),
        deleteNote: jest.fn(),
        renameNote: jest.fn(),
        getRecentNotes: jest.fn(),
      };

      expect(mockVaultService.openNote).toBeDefined();
      expect(mockVaultService.saveNote).toBeDefined();
      expect(mockVaultService.renameNote).toBeDefined();
    });
  });

  describe('SyncQueueItem Interface', () => {
    it('should create valid queue item', () => {
      const item: SyncQueueItem = {
        path: '/notes/test.md',
        action: 'modify',
        queuedAt: Date.now(),
      };

      expect(item.action).toBe('modify');
    });

    it('should support all action types', () => {
      const actions: SyncQueueItem['action'][] = ['add', 'modify', 'delete'];

      for (const action of actions) {
        const item: SyncQueueItem = {
          path: '/test.md',
          action,
          queuedAt: Date.now(),
        };
        expect(item.action).toBe(action);
      }
    });
  });
});
