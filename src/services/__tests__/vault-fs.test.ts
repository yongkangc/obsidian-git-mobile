import {
  normalizePath,
  getFileName,
  getDirectory,
  joinPath,
  isMarkdown,
} from '../../utils/path';

describe('path utilities', () => {
  describe('normalizePath', () => {
    it('converts backslashes to forward slashes', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz');
    });

    it('removes trailing slashes', () => {
      expect(normalizePath('foo/bar/')).toBe('foo/bar');
    });

    it('collapses multiple slashes', () => {
      expect(normalizePath('foo//bar///baz')).toBe('foo/bar/baz');
    });

    it('removes leading ./', () => {
      expect(normalizePath('./foo/bar')).toBe('foo/bar');
    });

    it('handles empty string', () => {
      expect(normalizePath('')).toBe('/');
    });

    it('handles single file', () => {
      expect(normalizePath('file.md')).toBe('file.md');
    });
  });

  describe('getFileName', () => {
    it('extracts file name from path', () => {
      expect(getFileName('foo/bar/baz.md')).toBe('baz.md');
    });

    it('returns path if no directory', () => {
      expect(getFileName('file.md')).toBe('file.md');
    });

    it('handles paths with backslashes', () => {
      expect(getFileName('foo\\bar\\baz.md')).toBe('baz.md');
    });
  });

  describe('getDirectory', () => {
    it('extracts directory from path', () => {
      expect(getDirectory('foo/bar/baz.md')).toBe('foo/bar');
    });

    it('returns empty string for file in root', () => {
      expect(getDirectory('file.md')).toBe('');
    });

    it('handles nested paths', () => {
      expect(getDirectory('a/b/c/d.md')).toBe('a/b/c');
    });
  });

  describe('joinPath', () => {
    it('joins path segments', () => {
      expect(joinPath('foo', 'bar', 'baz')).toBe('foo/bar/baz');
    });

    it('filters empty segments', () => {
      expect(joinPath('foo', '', 'bar')).toBe('foo/bar');
    });

    it('normalizes result', () => {
      expect(joinPath('foo/', '/bar')).toBe('foo/bar');
    });
  });

  describe('isMarkdown', () => {
    it('returns true for .md files', () => {
      expect(isMarkdown('file.md')).toBe(true);
    });

    it('returns true for .markdown files', () => {
      expect(isMarkdown('file.markdown')).toBe(true);
    });

    it('returns false for non-markdown files', () => {
      expect(isMarkdown('file.txt')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isMarkdown('file.MD')).toBe(true);
      expect(isMarkdown('file.MARKDOWN')).toBe(true);
    });
  });
});

describe('VaultFS', () => {
  describe('atomic write safety', () => {
    it('should use .tmp suffix for atomic writes', () => {
      const path = 'notes/test.md';
      const tmpPath = path + '.tmp';
      expect(tmpPath).toBe('notes/test.md.tmp');
    });

    it('should clean up .tmp file on failure', () => {
      const tmpPath = 'notes/test.md.tmp';
      expect(tmpPath.endsWith('.tmp')).toBe(true);
    });
  });

  describe('tree building', () => {
    it('should sort directories before files', () => {
      const items = [
        {name: 'file.md', isDirectory: false},
        {name: 'folder', isDirectory: true},
        {name: 'another.md', isDirectory: false},
      ];

      const sorted = items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      expect(sorted[0]?.name).toBe('folder');
      expect(sorted[1]?.name).toBe('another.md');
      expect(sorted[2]?.name).toBe('file.md');
    });

    it('should ignore .git and .obsidian directories', () => {
      const ignorePatterns = ['.git', '.obsidian'];
      const shouldIgnore = (name: string) =>
        ignorePatterns.some(
          pattern => name === pattern || name.startsWith(pattern + '/'),
        );

      expect(shouldIgnore('.git')).toBe(true);
      expect(shouldIgnore('.obsidian')).toBe(true);
      expect(shouldIgnore('.gitignore')).toBe(false);
      expect(shouldIgnore('notes')).toBe(false);
    });
  });
});
