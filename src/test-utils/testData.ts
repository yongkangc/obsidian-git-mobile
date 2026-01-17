import type {FileMeta, FileNode, SyncStatus} from '../types';

export const sampleNotes: Record<string, string> = {
  '/notes/welcome.md': `# Welcome to Obsidian Git Mobile

This is your first note. Edit it to get started!

## Features
- [[Quick Start|Quick start guide]]
- Markdown support
- Git sync

## Links
- [[Daily Notes]]
- [[Projects]]
`,
  '/notes/daily/2024-01-15.md': `# Daily Note - 2024-01-15

## Tasks
- [ ] Review PRs
- [x] Update dependencies
- [ ] Write tests

## Notes
Today I worked on the testing infrastructure.

#daily #work
`,
  '/notes/projects/testing.md': `# Testing Project

## Goals
- Set up Jest
- Add integration tests
- Performance benchmarks

## Progress
Started on 2024-01-15.

[[2024-01-15]]
`,
  '/notes/empty.md': '',
  '/notes/long-content.md': Array(1000)
    .fill('This is line content for testing large files.')
    .join('\n'),
};

export const sampleFileTree: FileNode[] = [
  {
    path: '/notes',
    name: 'notes',
    isDirectory: true,
    children: [
      {
        path: '/notes/welcome.md',
        name: 'welcome.md',
        isDirectory: false,
        modifiedAt: Date.now() - 86400000,
      },
      {
        path: '/notes/daily',
        name: 'daily',
        isDirectory: true,
        children: [
          {
            path: '/notes/daily/2024-01-15.md',
            name: '2024-01-15.md',
            isDirectory: false,
            modifiedAt: Date.now(),
          },
        ],
      },
      {
        path: '/notes/projects',
        name: 'projects',
        isDirectory: true,
        children: [
          {
            path: '/notes/projects/testing.md',
            name: 'testing.md',
            isDirectory: false,
            modifiedAt: Date.now() - 3600000,
          },
        ],
      },
    ],
  },
];

export const sampleFileMetas: FileMeta[] = [
  {
    path: '/notes/welcome.md',
    title: 'Welcome to Obsidian Git Mobile',
    modifiedAt: Date.now() - 86400000,
    contentHash: 'abc123',
  },
  {
    path: '/notes/daily/2024-01-15.md',
    title: 'Daily Note - 2024-01-15',
    modifiedAt: Date.now(),
    contentHash: 'def456',
  },
  {
    path: '/notes/projects/testing.md',
    title: 'Testing Project',
    modifiedAt: Date.now() - 3600000,
    contentHash: 'ghi789',
  },
];

export const syncStatuses: Record<string, SyncStatus> = {
  synced: {
    state: 'synced',
    pendingChanges: 0,
    lastSyncAt: Date.now(),
  },
  pending: {
    state: 'pending',
    pendingChanges: 3,
    lastSyncAt: Date.now() - 300000,
  },
  offline: {
    state: 'offline',
    pendingChanges: 5,
    lastSyncAt: null,
  },
  error: {
    state: 'error',
    pendingChanges: 2,
    lastSyncAt: Date.now() - 600000,
    error: 'Authentication failed',
  },
};

export function generateLargeFileTree(depth: number, breadth: number): FileNode[] {
  function generate(parentPath: string, currentDepth: number): FileNode[] {
    if (currentDepth >= depth) return [];

    const result: FileNode[] = [];
    for (let i = 0; i < breadth; i++) {
      const isDir = currentDepth < depth - 1;
      const name = isDir ? `folder_${i}` : `note_${i}.md`;
      const path = `${parentPath}/${name}`;

      result.push({
        path,
        name,
        isDirectory: isDir,
        children: isDir ? generate(path, currentDepth + 1) : undefined,
        modifiedAt: Date.now() - Math.random() * 86400000 * 30,
      });
    }
    return result;
  }

  return generate('', 0);
}
