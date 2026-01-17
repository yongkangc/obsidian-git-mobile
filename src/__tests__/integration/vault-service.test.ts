import {createMockVaultFS, sampleNotes} from '../../test-utils';

describe('VaultService Integration', () => {
  describe('Save Flow: edit → FS → queue → index', () => {
    it('should write file to VaultFS', async () => {
      const vaultFS = createMockVaultFS();
      const path = '/notes/new-note.md';
      const content = '# New Note\n\nContent here.';

      await vaultFS.writeFile(path, content);

      expect(await vaultFS.exists(path)).toBe(true);
      expect(await vaultFS.readFile(path)).toBe(content);
    });

    it('should update existing file', async () => {
      const vaultFS = createMockVaultFS(sampleNotes);
      const path = '/notes/welcome.md';
      const newContent = '# Updated Welcome\n\nNew content.';

      await vaultFS.writeFile(path, newContent);

      expect(await vaultFS.readFile(path)).toBe(newContent);
    });

    it('should track file modifications', async () => {
      const vaultFS = createMockVaultFS();
      const path = '/notes/test.md';

      const beforeWrite = Date.now();
      await vaultFS.writeFile(path, 'content');
      const afterWrite = Date.now();

      const stat = await vaultFS.stat(path);
      expect(stat.modifiedAt).toBeGreaterThanOrEqual(beforeWrite);
      expect(stat.modifiedAt).toBeLessThanOrEqual(afterWrite);
    });

    it('should handle concurrent writes', async () => {
      const vaultFS = createMockVaultFS();
      const paths = ['/a.md', '/b.md', '/c.md'];

      await Promise.all(
        paths.map((path, i) => vaultFS.writeFile(path, `content ${i}`)),
      );

      for (let i = 0; i < paths.length; i++) {
        expect(await vaultFS.readFile(paths[i]!)).toBe(`content ${i}`);
      }
    });
  });

  describe('File Tree Operations', () => {
    it('should list files in tree structure', async () => {
      const vaultFS = createMockVaultFS(sampleNotes);
      const tree = await vaultFS.listTree('/');

      expect(tree.length).toBeGreaterThan(0);
    });

    it('should detect directories vs files', async () => {
      const vaultFS = createMockVaultFS({
        '/folder/file.md': 'content',
      });

      const tree = await vaultFS.listTree('/');
      const folder = tree.find(n => n.name === 'folder');

      expect(folder?.isDirectory).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw when reading non-existent file', async () => {
      const vaultFS = createMockVaultFS();

      await expect(vaultFS.readFile('/does-not-exist.md')).rejects.toThrow(
        'File not found',
      );
    });

    it('should throw when deleting non-existent file', async () => {
      const vaultFS = createMockVaultFS();

      await expect(vaultFS.deleteFile('/does-not-exist.md')).rejects.toThrow(
        'File not found',
      );
    });

    it('should throw when stat-ing non-existent file', async () => {
      const vaultFS = createMockVaultFS();

      await expect(vaultFS.stat('/does-not-exist.md')).rejects.toThrow(
        'File not found',
      );
    });
  });
});
