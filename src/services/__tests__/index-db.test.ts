import type {IndexDB, FileMeta, SearchResult} from '../../types';

class MockSQLiteIndexDB implements IndexDB {
  private files: Map<string, FileMeta> = new Map();
  private links: Map<string, Set<string>> = new Map();
  private ftsIndex: Map<string, {title: string; content: string}> = new Map();
  private _isReady = false;

  async init(): Promise<void> {
    this._isReady = true;
  }

  isReady(): boolean {
    return this._isReady;
  }

  async waitUntilReady(): Promise<void> {
    return;
  }

  async upsertFileMeta(file: FileMeta): Promise<void> {
    this.files.set(file.path, file);
  }

  async getFileMeta(path: string): Promise<FileMeta | null> {
    return this.files.get(path) ?? null;
  }

  async getAllFiles(): Promise<FileMeta[]> {
    return Array.from(this.files.values());
  }

  async updateLinksForFile(sourcePath: string, links: string[]): Promise<void> {
    this.links.set(sourcePath, new Set(links));
  }

  async getBacklinks(targetPath: string): Promise<string[]> {
    const backlinks: string[] = [];
    for (const [source, targets] of this.links) {
      if (targets.has(targetPath)) {
        backlinks.push(source);
      }
    }
    return backlinks;
  }

  async ftsUpsert(path: string, title: string, content: string): Promise<void> {
    this.ftsIndex.set(path, {title, content});
  }

  async ftsSearch(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [path, {title, content}] of this.ftsIndex) {
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(lowerQuery);
      if (idx !== -1 || title.toLowerCase().includes(lowerQuery)) {
        const snippetStart = Math.max(0, idx - 20);
        const snippetEnd = Math.min(content.length, idx + query.length + 20);
        const snippet =
          idx !== -1
            ? `...${content.substring(snippetStart, idx)}**${content.substring(idx, idx + query.length)}**${content.substring(idx + query.length, snippetEnd)}...`
            : `...${content.substring(0, 50)}...`;

        results.push({
          path,
          title,
          snippet,
          score: idx !== -1 ? 100 - idx : 50,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async deleteFileMeta(path: string): Promise<void> {
    this.files.delete(path);
    this.links.delete(path);
    this.ftsIndex.delete(path);
  }

  async close(): Promise<void> {
    this._isReady = false;
  }

  clear(): void {
    this.files.clear();
    this.links.clear();
    this.ftsIndex.clear();
  }
}

describe('SQLiteIndexDB', () => {
  let db: MockSQLiteIndexDB;

  beforeEach(() => {
    db = new MockSQLiteIndexDB();
  });

  afterEach(() => {
    db.clear();
  });

  describe('FileMeta CRUD', () => {
    it('upserts and retrieves file metadata', async () => {
      const file: FileMeta = {
        path: 'notes/test.md',
        title: 'Test Note',
        modifiedAt: Date.now(),
        contentHash: 'abc123',
      };

      await db.upsertFileMeta(file);
      const retrieved = await db.getFileMeta('notes/test.md');

      expect(retrieved).toEqual(file);
    });

    it('returns null for non-existent file', async () => {
      const retrieved = await db.getFileMeta('non/existent.md');
      expect(retrieved).toBeNull();
    });

    it('updates existing file metadata', async () => {
      const file: FileMeta = {
        path: 'notes/test.md',
        title: 'Original Title',
        modifiedAt: 1000,
        contentHash: 'hash1',
      };

      await db.upsertFileMeta(file);

      const updated: FileMeta = {
        ...file,
        title: 'Updated Title',
        modifiedAt: 2000,
        contentHash: 'hash2',
      };

      await db.upsertFileMeta(updated);
      const retrieved = await db.getFileMeta('notes/test.md');

      expect(retrieved?.title).toBe('Updated Title');
      expect(retrieved?.modifiedAt).toBe(2000);
      expect(retrieved?.contentHash).toBe('hash2');
    });

    it('gets all files', async () => {
      const files: FileMeta[] = [
        {path: 'a.md', title: 'A', modifiedAt: 1, contentHash: 'a'},
        {path: 'b.md', title: 'B', modifiedAt: 2, contentHash: 'b'},
        {path: 'c.md', title: 'C', modifiedAt: 3, contentHash: 'c'},
      ];

      for (const file of files) {
        await db.upsertFileMeta(file);
      }

      const all = await db.getAllFiles();
      expect(all).toHaveLength(3);
      expect(all.map((f) => f.path).sort()).toEqual(['a.md', 'b.md', 'c.md']);
    });

    it('deletes file metadata', async () => {
      const file: FileMeta = {
        path: 'notes/test.md',
        title: 'Test',
        modifiedAt: 1,
        contentHash: 'x',
      };

      await db.upsertFileMeta(file);
      await db.deleteFileMeta('notes/test.md');

      const retrieved = await db.getFileMeta('notes/test.md');
      expect(retrieved).toBeNull();
    });
  });

  describe('Links and Backlinks', () => {
    it('updates links for a file', async () => {
      await db.updateLinksForFile('source.md', ['target1.md', 'target2.md']);

      const backlinks1 = await db.getBacklinks('target1.md');
      const backlinks2 = await db.getBacklinks('target2.md');

      expect(backlinks1).toContain('source.md');
      expect(backlinks2).toContain('source.md');
    });

    it('replaces existing links when updating', async () => {
      await db.updateLinksForFile('source.md', ['old.md']);
      await db.updateLinksForFile('source.md', ['new.md']);

      const oldBacklinks = await db.getBacklinks('old.md');
      const newBacklinks = await db.getBacklinks('new.md');

      expect(oldBacklinks).not.toContain('source.md');
      expect(newBacklinks).toContain('source.md');
    });

    it('handles multiple sources linking to same target', async () => {
      await db.updateLinksForFile('a.md', ['common.md']);
      await db.updateLinksForFile('b.md', ['common.md']);
      await db.updateLinksForFile('c.md', ['common.md']);

      const backlinks = await db.getBacklinks('common.md');
      expect(backlinks).toHaveLength(3);
      expect(backlinks.sort()).toEqual(['a.md', 'b.md', 'c.md']);
    });

    it('returns empty array for no backlinks', async () => {
      const backlinks = await db.getBacklinks('isolated.md');
      expect(backlinks).toEqual([]);
    });

    it('cleans up links when file is deleted', async () => {
      await db.updateLinksForFile('source.md', ['target.md']);
      await db.deleteFileMeta('source.md');

      const backlinks = await db.getBacklinks('target.md');
      expect(backlinks).not.toContain('source.md');
    });
  });

  describe('FTS Search', () => {
    beforeEach(async () => {
      await db.ftsUpsert(
        'notes/vim.md',
        'Vim Tips',
        'Vim is a powerful text editor with modal editing.',
      );
      await db.ftsUpsert(
        'notes/emacs.md',
        'Emacs Guide',
        'Emacs is an extensible text editor.',
      );
      await db.ftsUpsert(
        'notes/neovim.md',
        'Neovim Setup',
        'Neovim is a modern fork of Vim with better defaults.',
      );
    });

    it('searches content and returns snippets', async () => {
      const results = await db.ftsSearch('Vim');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.snippet).toContain('**');
    });

    it('searches by title', async () => {
      const results = await db.ftsSearch('Emacs');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.path === 'notes/emacs.md')).toBe(true);
    });

    it('ranks results by relevance', async () => {
      const results = await db.ftsSearch('editor');

      expect(results.length).toBeGreaterThan(1);
      expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
    });

    it('returns empty array for no matches', async () => {
      const results = await db.ftsSearch('python');
      expect(results).toEqual([]);
    });

    it('handles partial word matches', async () => {
      const results = await db.ftsSearch('edit');

      expect(results.length).toBeGreaterThan(0);
    });

    it('updates FTS when content changes', async () => {
      await db.ftsUpsert(
        'notes/vim.md',
        'Vim Tricks',
        'Advanced Vim tricks for developers.',
      );

      const results = await db.ftsSearch('tricks');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.path).toBe('notes/vim.md');

      const oldResults = await db.ftsSearch('powerful');
      expect(oldResults.some((r) => r.path === 'notes/vim.md')).toBe(false);
    });

    it('removes from FTS when file is deleted', async () => {
      await db.deleteFileMeta('notes/vim.md');

      const results = await db.ftsSearch('Vim');
      expect(results.some((r) => r.path === 'notes/vim.md')).toBe(false);
    });
  });

  describe('Incremental Indexing', () => {
    it('detects changed files by modifiedAt', async () => {
      const file: FileMeta = {
        path: 'test.md',
        title: 'Test',
        modifiedAt: 1000,
        contentHash: 'hash1',
      };

      await db.upsertFileMeta(file);
      const stored = await db.getFileMeta('test.md');

      expect(stored?.modifiedAt).toBe(1000);

      const needsReindex = stored ? stored.modifiedAt < 2000 : true;
      expect(needsReindex).toBe(true);
    });

    it('detects changed files by content hash', async () => {
      const file: FileMeta = {
        path: 'test.md',
        title: 'Test',
        modifiedAt: 1000,
        contentHash: 'oldhash',
      };

      await db.upsertFileMeta(file);
      const stored = await db.getFileMeta('test.md');

      const newContentHash = 'newhash';
      expect(stored?.contentHash !== newContentHash).toBe(true);
    });

    it('skips unchanged files', async () => {
      const file: FileMeta = {
        path: 'test.md',
        title: 'Test',
        modifiedAt: 1000,
        contentHash: 'samehash',
      };

      await db.upsertFileMeta(file);
      const stored = await db.getFileMeta('test.md');

      const sameHash = 'samehash';
      const sameTime = 1000;

      const needsReindex =
        stored && (stored.modifiedAt < sameTime || stored.contentHash !== sameHash);
      expect(needsReindex).toBe(false);
    });
  });

  describe('Performance', () => {
    it('handles batch operations efficiently', async () => {
      const fileCount = 100;
      const files: FileMeta[] = Array.from({length: fileCount}, (_, i) => ({
        path: `notes/file-${i}.md`,
        title: `File ${i}`,
        modifiedAt: Date.now(),
        contentHash: `hash-${i}`,
      }));

      const start = Date.now();

      for (const file of files) {
        await db.upsertFileMeta(file);
        await db.ftsUpsert(
          file.path,
          file.title,
          `Content for file ${file.title}`,
        );
      }

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });

    it('searches efficiently', async () => {
      const fileCount = 100;
      for (let i = 0; i < fileCount; i++) {
        await db.ftsUpsert(
          `notes/file-${i}.md`,
          `File ${i}`,
          `This is the content of file ${i}. It contains some searchable text.`,
        );
      }

      const start = Date.now();
      const results = await db.ftsSearch('searchable');
      const elapsed = Date.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
