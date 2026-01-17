import {createMockVaultFS, createMockGitSync, sampleNotes} from '../../test-utils';

describe('Sync Flow Integration', () => {
  describe('Offline edit → sync → push', () => {
    it('should track pending changes while offline', async () => {
      const gitSync = createMockGitSync({
        initialStatus: {state: 'offline', pendingChanges: 0, lastSyncAt: null},
      });

      const status = await gitSync.status();
      expect(status.state).toBe('offline');
    });

    it('should sync after coming online', async () => {
      const gitSync = createMockGitSync({
        pullResult: {updated: ['/notes/updated.md'], conflicts: []},
      });

      const result = await gitSync.pull();

      expect(result.updated).toContain('/notes/updated.md');
      expect(result.conflicts).toHaveLength(0);
      expect(gitSync._calls).toContainEqual({method: 'pull', args: []});
    });

    it('should push local changes after sync', async () => {
      const gitSync = createMockGitSync();

      await gitSync.commitAndPush('Update notes');

      expect(gitSync._calls).toContainEqual({
        method: 'commitAndPush',
        args: ['Update notes'],
      });
    });

    it('should handle pull failure gracefully', async () => {
      const gitSync = createMockGitSync({shouldFailPull: true});

      await expect(gitSync.pull()).rejects.toThrow('Pull failed');
    });

    it('should handle push failure gracefully', async () => {
      const gitSync = createMockGitSync({shouldFailPush: true});

      await expect(gitSync.commitAndPush('test')).rejects.toThrow('Push failed');
    });

    it('should report conflicts', async () => {
      const gitSync = createMockGitSync({
        pullResult: {
          updated: [],
          conflicts: ['/notes/conflicted.md'],
        },
      });

      const result = await gitSync.pull();

      expect(result.conflicts).toContain('/notes/conflicted.md');
    });
  });

  describe('Full Sync Workflow', () => {
    it('should complete full offline → online → push cycle', async () => {
      const vaultFS = createMockVaultFS(sampleNotes);
      const gitSync = createMockGitSync();

      // 1. Make offline edit
      await vaultFS.writeFile('/notes/offline-edit.md', '# Offline Edit');
      expect(await vaultFS.exists('/notes/offline-edit.md')).toBe(true);

      // 2. Pull when online
      const pullResult = await gitSync.pull();
      expect(pullResult.conflicts).toHaveLength(0);

      // 3. Push changes
      await gitSync.commitAndPush('Offline edits');

      // 4. Verify status
      const status = await gitSync.status();
      expect(status.pendingChanges).toBe(0);
    });

    it('should set authentication', () => {
      const gitSync = createMockGitSync();

      gitSync.setAuth({type: 'pat', token: 'test-token'});

      expect(gitSync._calls).toContainEqual({
        method: 'setAuth',
        args: [{type: 'pat', token: 'test-token'}],
      });
    });

    it('should clone repository with auth', async () => {
      const gitSync = createMockGitSync();
      const auth = {type: 'oauth' as const, token: 'oauth-token'};

      await gitSync.clone('https://github.com/user/repo.git', auth);

      expect(gitSync._calls).toContainEqual({
        method: 'clone',
        args: ['https://github.com/user/repo.git', auth],
      });
    });
  });
});
