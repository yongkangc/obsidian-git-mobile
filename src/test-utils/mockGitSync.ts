import type {GitSync, GitAuth, PullResult, SyncStatus} from '../types';

export interface MockGitSyncOptions {
  initialStatus?: SyncStatus;
  pullResult?: PullResult;
  shouldFailPull?: boolean;
  shouldFailPush?: boolean;
}

export function createMockGitSync(options: MockGitSyncOptions = {}): GitSync & {
  _calls: {method: string; args: unknown[]}[];
  _auth: GitAuth | null;
} {
  const {
    initialStatus = {state: 'synced', pendingChanges: 0, lastSyncAt: Date.now()},
    pullResult = {updated: [], conflicts: []},
    shouldFailPull = false,
    shouldFailPush = false,
  } = options;

  let status = {...initialStatus};
  let auth: GitAuth | null = null;
  const calls: {method: string; args: unknown[]}[] = [];

  return {
    _calls: calls,
    _auth: auth,

    async clone(repoUrl: string, authParam: GitAuth): Promise<void> {
      calls.push({method: 'clone', args: [repoUrl, authParam]});
      auth = authParam;
    },

    async pull(): Promise<PullResult> {
      calls.push({method: 'pull', args: []});
      if (shouldFailPull) {
        throw new Error('Pull failed');
      }
      status = {...status, lastSyncAt: Date.now()};
      return pullResult;
    },

    async commitAndPush(message: string): Promise<void> {
      calls.push({method: 'commitAndPush', args: [message]});
      if (shouldFailPush) {
        throw new Error('Push failed');
      }
      status = {...status, pendingChanges: 0, lastSyncAt: Date.now()};
    },

    async status(): Promise<SyncStatus> {
      calls.push({method: 'status', args: []});
      return status;
    },

    setAuth(authParam: GitAuth): void {
      calls.push({method: 'setAuth', args: [authParam]});
      auth = authParam;
    },
  };
}
