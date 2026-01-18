import * as RNFS from 'react-native-fs';
import type {VaultFS, FileNode, FileStat} from '../types';
import {normalizePath, joinPath, getFileName} from '../utils/path';
import {useVaultStore} from '../store';

const DEFAULT_IGNORE_PATTERNS = ['.git', '.obsidian'];

interface VaultFSOptions {
  ignorePatterns?: string[];
}

class VaultFSImpl implements VaultFS {
  private ignorePatterns: string[];
  private treeCache: Map<string, {tree: FileNode[]; timestamp: number}> =
    new Map();
  private readonly CACHE_TTL_MS = 5000;

  constructor(options: VaultFSOptions = {}) {
    this.ignorePatterns = options.ignorePatterns ?? DEFAULT_IGNORE_PATTERNS;
  }

  private getVaultPath(): string {
    return useVaultStore.getState().vaultPath;
  }

  private toAbsolutePath(relativePath: string): string {
    const normalized = normalizePath(relativePath);
    if (normalized.startsWith(this.getVaultPath())) {
      return normalized;
    }
    return joinPath(this.getVaultPath(), normalized);
  }

  private toRelativePath(absolutePath: string): string {
    const vaultPath = this.getVaultPath();
    const normalized = normalizePath(absolutePath);
    if (normalized.startsWith(vaultPath)) {
      return normalized.slice(vaultPath.length + 1);
    }
    return normalized;
  }

  private shouldIgnore(name: string): boolean {
    return this.ignorePatterns.some(
      pattern => name === pattern || name.startsWith(pattern + '/'),
    );
  }

  private invalidateCache(): void {
    this.treeCache.clear();
  }

  async readFile(path: string): Promise<string> {
    const absPath = this.toAbsolutePath(path);
    return RNFS.readFile(absPath, 'utf8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    const absPath = this.toAbsolutePath(path);
    const tmpPath = absPath + '.tmp';

    await this.ensureDir(normalizePath(absPath.slice(0, absPath.lastIndexOf('/'))));

    await RNFS.writeFile(tmpPath, content, 'utf8');

    try {
      await RNFS.moveFile(tmpPath, absPath);
    } catch {
      const exists = await RNFS.exists(tmpPath);
      if (exists) {
        await RNFS.unlink(tmpPath);
      }
      throw new Error(`Failed to write file: ${path}`);
    }

    this.invalidateCache();
  }

  async deleteFile(path: string): Promise<void> {
    const absPath = this.toAbsolutePath(path);
    await RNFS.unlink(absPath);
    this.invalidateCache();
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const absOldPath = this.toAbsolutePath(oldPath);
    const absNewPath = this.toAbsolutePath(newPath);
    await RNFS.moveFile(absOldPath, absNewPath);
    this.invalidateCache();
  }

  async createFolder(path: string): Promise<void> {
    const absPath = this.toAbsolutePath(path);
    await RNFS.mkdir(absPath);
    this.invalidateCache();
  }

  async listTree(dir?: string): Promise<FileNode[]> {
    const startDir = dir ? this.toAbsolutePath(dir) : this.getVaultPath();
    const cacheKey = startDir;

    const cached = this.treeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.tree;
    }

    const tree = await this.buildTree(startDir);

    this.treeCache.set(cacheKey, {tree, timestamp: Date.now()});

    return tree;
  }

  private async buildTree(dir: string): Promise<FileNode[]> {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      return [];
    }

    const items = await RNFS.readDir(dir);
    const nodes: FileNode[] = [];

    for (const item of items) {
      const name = getFileName(item.path);

      if (this.shouldIgnore(name)) {
        continue;
      }

      const node: FileNode = {
        path: this.toRelativePath(item.path),
        name,
        isDirectory: item.isDirectory(),
        modifiedAt: item.mtime ? new Date(item.mtime).getTime() : undefined,
      };

      if (item.isDirectory()) {
        node.children = await this.buildTree(item.path);
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async stat(path: string): Promise<FileStat> {
    const absPath = this.toAbsolutePath(path);
    const statResult = await RNFS.stat(absPath);

    return {
      path: this.toRelativePath(absPath),
      size: statResult.size,
      modifiedAt: new Date(statResult.mtime).getTime(),
      isDirectory: statResult.isDirectory(),
    };
  }

  async ensureDir(path: string): Promise<void> {
    const absPath = this.toAbsolutePath(path);
    const exists = await RNFS.exists(absPath);

    if (!exists) {
      await RNFS.mkdir(absPath);
    }
  }

  async exists(path: string): Promise<boolean> {
    const absPath = this.toAbsolutePath(path);
    return RNFS.exists(absPath);
  }
}

export const vaultFS = new VaultFSImpl();

export function createVaultFS(options?: VaultFSOptions): VaultFS {
  return new VaultFSImpl(options);
}
