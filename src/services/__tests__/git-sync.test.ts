import type {GitAuth} from '../../types';
import {useSyncQueueStore} from '../sync-queue';

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(null),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('isomorphic-git', () => ({
  clone: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockResolvedValue(undefined),
  checkout: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue('abc123'),
  push: jest.fn().mockResolvedValue(undefined),
  resolveRef: jest.fn().mockResolvedValue('abc123'),
  statusMatrix: jest.fn().mockResolvedValue([]),
  log: jest.fn().mockResolvedValue([
    {
      commit: {
        committer: {
          timestamp: Math.floor(Date.now() / 1000),
        },
      },
    },
  ]),
  walk: jest.fn().mockResolvedValue([]),
  TREE: jest.fn(() => ({})),
}));

jest.mock('isomorphic-git/http/web', () => ({}));

jest.mock('../rnfs-adapter', () => ({
  rnfsAdapter: {
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockRejectedValue(new Error('Not found')),
      readFile: jest.fn().mockResolvedValue(''),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readdir: jest.fn().mockResolvedValue([]),
      rmdir: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import * as auth from '../auth';
import {GitSyncService} from '../git-sync';
import {addToQueue, getQueue, clearQueue} from '../sync-queue';

const git = require('isomorphic-git');

describe('Auth Service', () => {
  const Keychain = require('react-native-keychain');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should store token in keychain', async () => {
    const testAuth: GitAuth = {
      type: 'pat',
      token: 'test-token',
      username: 'testuser',
    };

    await auth.storeToken(testAuth);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'git-auth',
      JSON.stringify(testAuth),
      {service: 'obsidian-git-mobile'},
    );
  });

  it('should retrieve token from keychain', async () => {
    const testAuth: GitAuth = {
      type: 'pat',
      token: 'test-token',
      username: 'testuser',
    };

    Keychain.getGenericPassword.mockResolvedValueOnce({
      password: JSON.stringify(testAuth),
    });

    const result = await auth.getToken();

    expect(result).toEqual(testAuth);
  });

  it('should return null when no token stored', async () => {
    Keychain.getGenericPassword.mockResolvedValueOnce(false);

    const result = await auth.getToken();

    expect(result).toBeNull();
  });

  it('should clear token from keychain', async () => {
    await auth.clearToken();

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'obsidian-git-mobile',
    });
  });
});

describe('Sync Queue', () => {
  beforeEach(() => {
    useSyncQueueStore.setState({queue: []});
  });

  it('should add item to queue', () => {
    addToQueue('test.md', 'add');

    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.path).toBe('test.md');
    expect(queue[0]!.action).toBe('add');
  });

  it('should update existing item in queue', () => {
    addToQueue('test.md', 'add');
    addToQueue('test.md', 'modify');

    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.action).toBe('modify');
  });

  it('should remove item when delete follows add', () => {
    addToQueue('test.md', 'add');
    addToQueue('test.md', 'delete');

    const queue = getQueue();
    expect(queue).toHaveLength(0);
  });

  it('should clear queue', () => {
    addToQueue('test1.md', 'add');
    addToQueue('test2.md', 'modify');

    clearQueue();

    expect(getQueue()).toHaveLength(0);
  });
});

describe('GitSyncService', () => {
  let gitSync: GitSyncService;
  const testAuth: GitAuth = {
    type: 'pat',
    token: 'test-token',
    username: 'testuser',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gitSync = new GitSyncService();
    useSyncQueueStore.setState({queue: []});
  });

  describe('clone', () => {
    it('should clone repository with shallow depth', async () => {
      await gitSync.clone('https://github.com/test/repo.git', testAuth);

      expect(git.clone).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://github.com/test/repo.git',
          depth: 1,
          singleBranch: true,
        }),
      );
    });
  });

  describe('pull', () => {
    beforeEach(() => {
      gitSync.setAuth(testAuth);
    });

    it('should fetch and checkout', async () => {
      git.resolveRef
        .mockResolvedValueOnce('before-abc')
        .mockResolvedValueOnce('after-xyz');

      await gitSync.pull();

      expect(git.fetch).toHaveBeenCalled();
      expect(git.checkout).toHaveBeenCalled();
    });

    it('should return empty result when no changes', async () => {
      git.resolveRef.mockResolvedValue('same-ref');

      const result = await gitSync.pull();

      expect(result.updated).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('commitAndPush', () => {
    beforeEach(() => {
      gitSync.setAuth(testAuth);
    });

    it('should stage, commit and push changes', async () => {
      addToQueue('test.md', 'add');
      git.statusMatrix.mockResolvedValueOnce([['test.md', 1, 2, 2]]);

      await gitSync.commitAndPush('Test commit');

      expect(git.add).toHaveBeenCalled();
      expect(git.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test commit',
        }),
      );
      expect(git.push).toHaveBeenCalled();
    });

    it('should handle delete actions', async () => {
      addToQueue('deleted.md', 'delete');
      git.statusMatrix.mockResolvedValueOnce([['deleted.md', 1, 0, 0]]);

      await gitSync.commitAndPush('Delete file');

      expect(git.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          filepath: 'deleted.md',
        }),
      );
    });

    it('should clear queue after successful push', async () => {
      addToQueue('test.md', 'add');
      git.statusMatrix.mockResolvedValueOnce([['test.md', 1, 2, 2]]);

      await gitSync.commitAndPush('Test commit');

      expect(getQueue()).toHaveLength(0);
    });

    it('should skip commit when no changes', async () => {
      git.statusMatrix.mockResolvedValueOnce([]);

      await gitSync.commitAndPush('Empty commit');

      expect(git.commit).not.toHaveBeenCalled();
      expect(git.push).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('should return offline when no auth', async () => {
      const status = await gitSync.status();

      expect(status.state).toBe('offline');
    });

    it('should return pending when queue has items', async () => {
      gitSync.setAuth(testAuth);
      addToQueue('test.md', 'add');

      const status = await gitSync.status();

      expect(status.pendingChanges).toBe(1);
    });
  });
});
