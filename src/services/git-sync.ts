import git from 'isomorphic-git';
import * as RNFS from 'react-native-fs';
import type {GitSync, GitAuth, PullResult, SyncStatus} from '../types';
import {getQueue, clearQueue} from './sync-queue';
import {getToken} from './auth';
import {rnfsAdapter} from './rnfs-adapter';
import {gitHttp} from './git-http';

// Use actual device filesystem path
const VAULT_DIR = `${RNFS.DocumentDirectoryPath}/vault`;
const CONFLICTS_LOG = `${RNFS.DocumentDirectoryPath}/vault/conflicts.log`;

export class GitSyncService implements GitSync {
  private fs: typeof rnfsAdapter;
  private pfs: typeof rnfsAdapter.promises;
  private auth: GitAuth | null = null;

  constructor() {
    this.fs = rnfsAdapter;
    this.pfs = rnfsAdapter.promises;
  }

  setAuth(auth: GitAuth): void {
    this.auth = auth;
  }

  private getAuthConfig() {
    if (!this.auth) {
      throw new Error('Git auth not configured');
    }
    return {
      onAuth: () => ({
        username: this.auth!.username || 'oauth2',
        password: this.auth!.token,
      }),
    };
  }

  async clone(repoUrl: string, auth: GitAuth): Promise<void> {
    this.setAuth(auth);

    const exists = await RNFS.exists(VAULT_DIR);
    if (exists) {
      await this.deleteRecursive(VAULT_DIR);
    }

    await this.pfs.mkdir(VAULT_DIR);

    await git.clone({
      fs: this.fs,
      http: gitHttp,
      dir: VAULT_DIR,
      url: repoUrl,
      depth: 1,
      singleBranch: true,
      ...this.getAuthConfig(),
    });
  }

  async pull(): Promise<PullResult> {
    const auth = this.auth || (await getToken());
    if (auth) {
      this.setAuth(auth);
    }

    const queue = getQueue();
    const localDirtyFiles = new Map<string, string>();

    for (const item of queue) {
      if (item.action !== 'delete') {
        try {
          const content = await this.pfs.readFile(
            `${VAULT_DIR}/${item.path}`,
            {encoding: 'utf8'},
          );
          localDirtyFiles.set(item.path, content as string);
        } catch {
          // File might not exist yet
        }
      }
    }

    const beforeHead = await git.resolveRef({
      fs: this.fs,
      dir: VAULT_DIR,
      ref: 'HEAD',
    });

    await git.fetch({
      fs: this.fs,
      http: gitHttp,
      dir: VAULT_DIR,
      ...this.getAuthConfig(),
    });

    const remoteRef = await git.resolveRef({
      fs: this.fs,
      dir: VAULT_DIR,
      ref: 'refs/remotes/origin/HEAD',
    }).catch(() =>
      git.resolveRef({
        fs: this.fs,
        dir: VAULT_DIR,
        ref: 'refs/remotes/origin/main',
      }),
    ).catch(() =>
      git.resolveRef({
        fs: this.fs,
        dir: VAULT_DIR,
        ref: 'refs/remotes/origin/master',
      }),
    );

    if (beforeHead === remoteRef) {
      return {updated: [], conflicts: []};
    }

    await git.checkout({
      fs: this.fs,
      dir: VAULT_DIR,
      ref: remoteRef,
      force: true,
    });

    const updated: string[] = [];
    const conflicts: string[] = [];

    const changedFiles = await this.getChangedFiles(beforeHead, remoteRef);
    updated.push(...changedFiles);

    for (const [path, localContent] of localDirtyFiles) {
      if (changedFiles.includes(path)) {
        conflicts.push(path);
        await this.pfs.writeFile(`${VAULT_DIR}/${path}`, localContent);
        await this.logConflict(path);
      }
    }

    return {updated, conflicts};
  }

  async commitAndPush(message: string): Promise<void> {
    const auth = this.auth || (await getToken());
    if (auth) {
      this.setAuth(auth);
    }

    const queue = getQueue();

    for (const item of queue) {
      const filepath = item.path;
      if (item.action === 'delete') {
        await git.remove({
          fs: this.fs,
          dir: VAULT_DIR,
          filepath,
        });
      } else {
        await git.add({
          fs: this.fs,
          dir: VAULT_DIR,
          filepath,
        });
      }
    }

    const status = await git.statusMatrix({
      fs: this.fs,
      dir: VAULT_DIR,
    });

    const hasChanges = status.some(
      ([, head, workdir, stage]) =>
        head !== workdir || head !== stage || workdir !== stage,
    );

    if (!hasChanges) {
      clearQueue();
      return;
    }

    await git.commit({
      fs: this.fs,
      dir: VAULT_DIR,
      message,
      author: {
        name: this.auth?.username || 'Obsidian Git Mobile',
        email: `${this.auth?.username || 'user'}@obsidian-git-mobile.local`,
      },
    });

    await git.push({
      fs: this.fs,
      http: gitHttp,
      dir: VAULT_DIR,
      ...this.getAuthConfig(),
    });

    clearQueue();
  }

  async status(): Promise<SyncStatus> {
    const queue = getQueue();
    const pendingChanges = queue.length;

    try {
      await this.pfs.stat(`${VAULT_DIR}/.git`);
    } catch {
      return {
        state: 'offline',
        pendingChanges,
        lastSyncAt: null,
      };
    }

    try {
      const auth = this.auth || (await getToken());
      if (!auth) {
        return {
          state: 'offline',
          pendingChanges,
          lastSyncAt: null,
          error: 'No auth configured',
        };
      }

      const log = await git.log({
        fs: this.fs,
        dir: VAULT_DIR,
        depth: 1,
      });

      const lastSyncAt = log[0]?.commit?.committer?.timestamp
        ? log[0].commit.committer.timestamp * 1000
        : null;

      if (pendingChanges > 0) {
        return {
          state: 'pending',
          pendingChanges,
          lastSyncAt,
        };
      }

      return {
        state: 'synced',
        pendingChanges: 0,
        lastSyncAt,
      };
    } catch (error) {
      return {
        state: 'error',
        pendingChanges,
        lastSyncAt: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getChangedFiles(
    fromRef: string,
    toRef: string,
  ): Promise<string[]> {
    const changedFiles: string[] = [];

    try {
      const trees = [
        git.TREE({ref: fromRef}),
        git.TREE({ref: toRef}),
      ];

      await git.walk({
        fs: this.fs,
        dir: VAULT_DIR,
        trees,
        map: async (filepath, [a, b]) => {
          if (filepath === '.') {
            return;
          }

          const aOid = await a?.oid();
          const bOid = await b?.oid();

          if (aOid !== bOid) {
            changedFiles.push(filepath);
          }
          return;
        },
      });
    } catch {
      // Walk failed, return empty
    }

    return changedFiles;
  }

  private async logConflict(path: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `${timestamp}: LWW conflict resolved for ${path} (local version kept)\n`;

    try {
      const existing = await this.pfs.readFile(CONFLICTS_LOG, {
        encoding: 'utf8',
      });
      await this.pfs.writeFile(CONFLICTS_LOG, existing + entry);
    } catch {
      await this.pfs.writeFile(CONFLICTS_LOG, entry);
    }
  }

  private async deleteRecursive(path: string): Promise<void> {
    const stat = await this.pfs.stat(path);
    if (stat.isDirectory()) {
      const files = await this.pfs.readdir(path);
      for (const file of files) {
        await this.deleteRecursive(`${path}/${file}`);
      }
      await this.pfs.rmdir(path);
    } else {
      await this.pfs.unlink(path);
    }
  }
}

export const gitSync = new GitSyncService();
