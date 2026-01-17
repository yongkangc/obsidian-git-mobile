import type {VaultFS, FileNode, FileStat} from '../types';

interface MockFile {
  content: string;
  modifiedAt: number;
}

export function createMockVaultFS(
  initialFiles: Record<string, string> = {},
): VaultFS & {_files: Map<string, MockFile>} {
  const files = new Map<string, MockFile>();

  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(path, {content, modifiedAt: Date.now()});
  }

  return {
    _files: files,

    async readFile(path: string): Promise<string> {
      const file = files.get(path);
      if (!file) {
        throw new Error(`File not found: ${path}`);
      }
      return file.content;
    },

    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, {content, modifiedAt: Date.now()});
    },

    async deleteFile(path: string): Promise<void> {
      if (!files.has(path)) {
        throw new Error(`File not found: ${path}`);
      }
      files.delete(path);
    },

    async listTree(dir = '/'): Promise<FileNode[]> {
      const nodes: FileNode[] = [];
      const seen = new Set<string>();
      const normalizedDir = dir === '/' ? '' : dir;

      for (const filePath of files.keys()) {
        if (!filePath.startsWith(normalizedDir)) continue;

        const relativePath = normalizedDir
          ? filePath.slice(normalizedDir.length + 1)
          : filePath.startsWith('/')
            ? filePath.slice(1)
            : filePath;

        if (!relativePath) continue;

        const parts = relativePath.split('/');
        const name = parts[0];
        if (!name || seen.has(name)) continue;
        seen.add(name);

        const isDirectory = parts.length > 1;
        const fullPath = normalizedDir ? `${normalizedDir}/${name}` : `/${name}`;

        nodes.push({
          path: fullPath,
          name,
          isDirectory,
          modifiedAt: files.get(filePath)?.modifiedAt,
        });
      }

      return nodes;
    },

    async stat(path: string): Promise<FileStat> {
      const file = files.get(path);
      if (!file) {
        throw new Error(`File not found: ${path}`);
      }
      return {
        path,
        size: file.content.length,
        modifiedAt: file.modifiedAt,
        isDirectory: false,
      };
    },

    async ensureDir(_path: string): Promise<void> {
      // No-op for mock
    },

    async exists(path: string): Promise<boolean> {
      return files.has(path);
    },
  };
}
