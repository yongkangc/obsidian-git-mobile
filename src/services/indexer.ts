import type {VaultFS, IndexDB, FileMeta} from '../types';
import {parseWikilinks, parseTitle} from '../utils/markdown';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function getTitleFromPath(path: string): string {
  const filename = path.split('/').pop() || path;
  return filename.replace(/\.md$/, '');
}

export class VaultIndexer {
  constructor(
    private vaultFS: VaultFS,
    private indexDB: IndexDB,
  ) {}

  async indexVault(): Promise<void> {
    const tree = await this.vaultFS.listTree();
    const markdownFiles = this.flattenTree(tree).filter((node) =>
      node.path.endsWith('.md'),
    );

    for (const file of markdownFiles) {
      try {
        const content = await this.vaultFS.readFile(file.path);
        await this.indexFile(file.path, content, file.modifiedAt);
      } catch {
        // Skip files that can't be read
      }
    }
  }

  async indexFile(
    path: string,
    content: string,
    modifiedAt?: number,
  ): Promise<void> {
    const actualModifiedAt =
      modifiedAt ?? (await this.vaultFS.stat(path)).modifiedAt;
    const contentHash = simpleHash(content);

    let title = parseTitle(content);
    if (title === 'Untitled') {
      title = getTitleFromPath(path);
    }

    const fileMeta: FileMeta = {
      path,
      title,
      modifiedAt: actualModifiedAt,
      contentHash,
    };

    await this.indexDB.upsertFileMeta(fileMeta);

    const wikilinks = parseWikilinks(content);
    const normalizedLinks = wikilinks.map((link) => this.normalizeLink(link));
    await this.indexDB.updateLinksForFile(path, normalizedLinks);

    await this.indexDB.ftsUpsert(path, title, content);
  }

  async needsReindex(path: string, modifiedAt: number): Promise<boolean> {
    const existing = await this.indexDB.getFileMeta(path);
    if (!existing) {
      return true;
    }
    return existing.modifiedAt < modifiedAt;
  }

  async needsReindexWithContent(
    path: string,
    content: string,
    modifiedAt: number,
  ): Promise<boolean> {
    const existing = await this.indexDB.getFileMeta(path);
    if (!existing) {
      return true;
    }

    if (existing.modifiedAt < modifiedAt) {
      const newHash = simpleHash(content);
      return newHash !== existing.contentHash;
    }

    return false;
  }

  async incrementalIndex(): Promise<{indexed: number; skipped: number}> {
    const tree = await this.vaultFS.listTree();
    const markdownFiles = this.flattenTree(tree).filter((node) =>
      node.path.endsWith('.md'),
    );

    let indexed = 0;
    let skipped = 0;

    for (const file of markdownFiles) {
      try {
        const needsUpdate = await this.needsReindex(
          file.path,
          file.modifiedAt ?? 0,
        );
        if (needsUpdate) {
          const content = await this.vaultFS.readFile(file.path);
          await this.indexFile(file.path, content, file.modifiedAt);
          indexed++;
        } else {
          skipped++;
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {indexed, skipped};
  }

  async removeDeletedFiles(): Promise<number> {
    const indexedFiles = await this.indexDB.getAllFiles();
    let removed = 0;

    for (const file of indexedFiles) {
      const exists = await this.vaultFS.exists(file.path);
      if (!exists) {
        await this.indexDB.deleteFileMeta(file.path);
        removed++;
      }
    }

    return removed;
  }

  private normalizeLink(link: string): string {
    let normalized = link.trim();

    const pipeIndex = normalized.indexOf('|');
    if (pipeIndex !== -1) {
      normalized = normalized.substring(0, pipeIndex);
    }

    const hashIndex = normalized.indexOf('#');
    if (hashIndex !== -1) {
      normalized = normalized.substring(0, hashIndex);
    }

    if (!normalized.endsWith('.md')) {
      normalized = `${normalized}.md`;
    }

    return normalized;
  }

  private flattenTree(
    nodes: Array<{
      path: string;
      isDirectory: boolean;
      children?: Array<{
        path: string;
        isDirectory: boolean;
        children?: unknown[];
        modifiedAt?: number;
      }>;
      modifiedAt?: number;
    }>,
  ): Array<{path: string; modifiedAt?: number}> {
    const result: Array<{path: string; modifiedAt?: number}> = [];

    const traverse = (
      items: Array<{
        path: string;
        isDirectory: boolean;
        children?: unknown[];
        modifiedAt?: number;
      }>,
    ) => {
      for (const item of items) {
        if (!item.isDirectory) {
          result.push({path: item.path, modifiedAt: item.modifiedAt});
        }
        if (item.children) {
          traverse(
            item.children as Array<{
              path: string;
              isDirectory: boolean;
              children?: unknown[];
              modifiedAt?: number;
            }>,
          );
        }
      }
    };

    traverse(nodes);
    return result;
  }
}
