/**
 * RNFS Adapter for isomorphic-git
 *
 * Bridges react-native-fs to the filesystem interface expected by isomorphic-git.
 * This allows git operations to work on the actual device filesystem instead of
 * LightningFS's IndexedDB-based virtual filesystem.
 */

import * as RNFS from 'react-native-fs';
import {decode as base64Decode, encode as base64Encode} from 'base-64';

// Base64 to Uint8Array conversion
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = base64Decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Uint8Array to Base64 conversion
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return base64Encode(binary);
}

interface StatResult {
  type: 'file' | 'dir';
  mode: number;
  size: number;
  ino: number;
  mtimeMs: number;
  ctimeMs?: number;
  uid: number;
  gid: number;
  dev: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
  isSymbolicLink: () => boolean;
}



// Create a promisified filesystem interface compatible with isomorphic-git
export const rnfsAdapter = {
  promises: {
    async readFile(
      filepath: string,
      options?: {encoding?: string} | string,
    ): Promise<string | Uint8Array> {
      const encoding =
        typeof options === 'string'
          ? options
          : options?.encoding || 'utf8';

      if (encoding === 'utf8') {
        return RNFS.readFile(filepath, 'utf8');
      }

      // For binary, read as base64 and convert to Uint8Array
      const base64 = await RNFS.readFile(filepath, 'base64');
      return base64ToUint8Array(base64);
    },

    async writeFile(
      filepath: string,
      data: string | Uint8Array,
      options?: {encoding?: string; mode?: number} | string,
    ): Promise<void> {
      const encoding =
        typeof options === 'string'
          ? options
          : options?.encoding || 'utf8';

      // Ensure parent directory exists
      const dir = filepath.substring(0, filepath.lastIndexOf('/'));
      if (dir) {
        try {
          await RNFS.mkdir(dir);
        } catch {
          // Directory might already exist
        }
      }

      if (typeof data === 'string') {
        await RNFS.writeFile(filepath, data, encoding);
      } else {
        // Convert Uint8Array to base64
        const base64 = uint8ArrayToBase64(data);
        await RNFS.writeFile(filepath, base64, 'base64');
      }
    },

    async unlink(filepath: string): Promise<void> {
      await RNFS.unlink(filepath);
    },

    async readdir(dirpath: string): Promise<string[]> {
      const items = await RNFS.readDir(dirpath);
      return items.map(item => item.name);
    },

    async mkdir(dirpath: string, _options?: {recursive?: boolean}): Promise<void> {
      try {
        await RNFS.mkdir(dirpath);
      } catch (error) {
        // EEXIST is ok
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('exists')) {
          throw error;
        }
      }
    },

    async rmdir(dirpath: string): Promise<void> {
      // RNFS.unlink works for both files and directories
      await RNFS.unlink(dirpath);
    },

    async stat(filepath: string): Promise<StatResult> {
      const stat = await RNFS.stat(filepath);
      const isDir = stat.isDirectory();
      const mtime = new Date(stat.mtime).getTime();

      return {
        type: isDir ? 'dir' : 'file',
        mode: isDir ? 0o40755 : 0o100644,
        size: stat.size,
        ino: 0,
        mtimeMs: mtime,
        ctimeMs: mtime,
        uid: 1000,
        gid: 1000,
        dev: 0,
        isFile: () => !isDir,
        isDirectory: () => isDir,
        isSymbolicLink: () => false,
      };
    },

    async lstat(filepath: string): Promise<StatResult> {
      // RNFS doesn't distinguish lstat from stat
      return this.stat(filepath);
    },

    async readlink(_filepath: string): Promise<string> {
      // React Native doesn't support symlinks in the same way
      throw new Error('Symlinks not supported');
    },

    async symlink(_target: string, _filepath: string): Promise<void> {
      throw new Error('Symlinks not supported');
    },

    async chmod(_filepath: string, _mode: number): Promise<void> {
      // No-op on mobile
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      await RNFS.moveFile(oldPath, newPath);
    },
  },
};

export type RNFSAdapter = typeof rnfsAdapter;
