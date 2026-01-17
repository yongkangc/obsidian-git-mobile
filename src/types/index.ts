// VaultFS interface
export interface VaultFS {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listTree(dir?: string): Promise<FileNode[]>;
  stat(path: string): Promise<FileStat>;
  ensureDir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
  modifiedAt?: number;
}

export interface FileStat {
  path: string;
  size: number;
  modifiedAt: number;
  isDirectory: boolean;
}

// IndexDB interface
export interface IndexDB {
  upsertFileMeta(file: FileMeta): Promise<void>;
  getFileMeta(path: string): Promise<FileMeta | null>;
  getAllFiles(): Promise<FileMeta[]>;
  updateLinksForFile(sourcePath: string, links: string[]): Promise<void>;
  getBacklinks(targetPath: string): Promise<string[]>;
  ftsUpsert(path: string, title: string, content: string): Promise<void>;
  ftsSearch(query: string): Promise<SearchResult[]>;
  deleteFileMeta(path: string): Promise<void>;
}

export interface FileMeta {
  path: string;
  title: string;
  modifiedAt: number;
  contentHash: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

// GitSync interface
export interface GitSync {
  clone(repoUrl: string, auth: GitAuth): Promise<void>;
  pull(): Promise<PullResult>;
  commitAndPush(message: string): Promise<void>;
  status(): Promise<SyncStatus>;
  setAuth(auth: GitAuth): void;
}

export interface GitAuth {
  type: 'oauth' | 'pat';
  token: string;
  username?: string;
}

export interface PullResult {
  updated: string[];
  conflicts: string[];
}

export interface SyncStatus {
  state: 'synced' | 'pending' | 'offline' | 'error';
  pendingChanges: number;
  lastSyncAt: number | null;
  error?: string;
}

// VaultService interface
export interface VaultService {
  openNote(path: string): Promise<string>;
  saveNote(path: string, content: string): Promise<void>;
  createNote(path: string, content?: string): Promise<void>;
  deleteNote(path: string): Promise<void>;
  renameNote(oldPath: string, newPath: string): Promise<void>;
  getRecentNotes(): Promise<FileMeta[]>;
}

// Sync Queue
export interface SyncQueueItem {
  path: string;
  action: 'add' | 'modify' | 'delete';
  queuedAt: number;
}
