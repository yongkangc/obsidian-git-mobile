import {
  normalizePath,
  joinPath,
  getBasename,
  getDirname,
  getExtension,
  removeExtension,
  isMarkdownFile,
  isAbsolute,
  relativePath,
} from '../../utils/path';

describe('Path Utility Functions', () => {
  describe('normalizePath', () => {
    it('should remove duplicate slashes', () => {
      expect(normalizePath('//a//b//c')).toBe('/a/b/c');
    });

    it('should remove trailing slash', () => {
      expect(normalizePath('/a/b/')).toBe('/a/b');
    });

    it('should return root for empty result', () => {
      expect(normalizePath('/')).toBe('/');
    });

    it('should handle single slash', () => {
      expect(normalizePath('/')).toBe('/');
    });
  });

  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(joinPath('/notes', 'daily', 'today.md')).toBe('/notes/daily/today.md');
    });

    it('should filter empty segments', () => {
      expect(joinPath('/notes', '', 'file.md')).toBe('/notes/file.md');
    });

    it('should handle single segment', () => {
      expect(joinPath('/notes')).toBe('/notes');
    });
  });

  describe('getBasename', () => {
    it('should get file name', () => {
      expect(getBasename('/notes/daily/today.md')).toBe('today.md');
    });

    it('should handle root path', () => {
      expect(getBasename('/file.md')).toBe('file.md');
    });

    it('should handle no slashes', () => {
      expect(getBasename('file.md')).toBe('file.md');
    });
  });

  describe('getDirname', () => {
    it('should get directory path', () => {
      expect(getDirname('/notes/daily/today.md')).toBe('/notes/daily');
    });

    it('should return root for top-level file', () => {
      expect(getDirname('/file.md')).toBe('/');
    });

    it('should return dot for no slashes', () => {
      expect(getDirname('file.md')).toBe('.');
    });
  });

  describe('getExtension', () => {
    it('should get file extension', () => {
      expect(getExtension('/notes/file.md')).toBe('.md');
    });

    it('should return empty for no extension', () => {
      expect(getExtension('/notes/README')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getExtension('file.test.ts')).toBe('.ts');
    });

    it('should handle dotfiles', () => {
      expect(getExtension('.gitignore')).toBe('');
    });
  });

  describe('removeExtension', () => {
    it('should remove extension', () => {
      expect(removeExtension('/notes/file.md')).toBe('/notes/file');
    });

    it('should handle no extension', () => {
      expect(removeExtension('/notes/README')).toBe('/notes/README');
    });
  });

  describe('isMarkdownFile', () => {
    it('should detect .md files', () => {
      expect(isMarkdownFile('/notes/file.md')).toBe(true);
    });

    it('should detect .markdown files', () => {
      expect(isMarkdownFile('/notes/file.markdown')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isMarkdownFile('/notes/file.MD')).toBe(true);
    });

    it('should reject non-markdown files', () => {
      expect(isMarkdownFile('/notes/file.txt')).toBe(false);
    });
  });

  describe('isAbsolute', () => {
    it('should detect absolute paths', () => {
      expect(isAbsolute('/notes/file.md')).toBe(true);
    });

    it('should detect relative paths', () => {
      expect(isAbsolute('notes/file.md')).toBe(false);
    });
  });

  describe('relativePath', () => {
    it('should compute relative path between siblings', () => {
      expect(relativePath('/notes/a', '/notes/b')).toBe('../b');
    });

    it('should compute relative path to child', () => {
      expect(relativePath('/notes', '/notes/daily/today.md')).toBe('daily/today.md');
    });

    it('should compute relative path to parent', () => {
      expect(relativePath('/notes/daily/today.md', '/notes')).toBe('../..');
    });

    it('should return dot for same path', () => {
      expect(relativePath('/notes', '/notes')).toBe('.');
    });
  });
});
