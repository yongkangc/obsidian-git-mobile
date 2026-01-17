import fuzzysort from 'fuzzysort';
import type {FileNode} from '../src/types';

function getAllFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.isDirectory && node.children) {
      files.push(...getAllFiles(node.children));
    } else if (!node.isDirectory && node.name.endsWith('.md')) {
      files.push(node);
    }
  }
  return files;
}

const mockFileTree: FileNode[] = [
  {
    path: 'notes',
    name: 'notes',
    isDirectory: true,
    children: [
      {
        path: 'notes/daily-note.md',
        name: 'daily-note.md',
        isDirectory: false,
        modifiedAt: Date.now(),
      },
      {
        path: 'notes/weekly-review.md',
        name: 'weekly-review.md',
        isDirectory: false,
        modifiedAt: Date.now() - 86400000,
      },
    ],
  },
  {
    path: 'projects',
    name: 'projects',
    isDirectory: true,
    children: [
      {
        path: 'projects/obsidian-mobile.md',
        name: 'obsidian-mobile.md',
        isDirectory: false,
        modifiedAt: Date.now() - 172800000,
      },
      {
        path: 'projects/react-native-app.md',
        name: 'react-native-app.md',
        isDirectory: false,
        modifiedAt: Date.now() - 259200000,
      },
    ],
  },
  {
    path: 'readme.md',
    name: 'readme.md',
    isDirectory: false,
    modifiedAt: Date.now() - 345600000,
  },
];

describe('Fuzzy Search', () => {
  const allFiles = getAllFiles(mockFileTree);

  it('finds exact matches', () => {
    const results = fuzzysort.go('daily-note', allFiles, {key: 'name'});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toBe('daily-note.md');
  });

  it('finds partial matches', () => {
    const results = fuzzysort.go('daily', allFiles, {key: 'name'});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toContain('daily');
  });

  it('handles typos with fuzzy matching', () => {
    const results = fuzzysort.go('daly', allFiles, {key: 'name', threshold: -10000});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toBe('daily-note.md');
  });

  it('matches abbreviations', () => {
    const results = fuzzysort.go('rna', allFiles, {key: 'name', threshold: -10000});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toBe('react-native-app.md');
  });

  it('ranks exact prefix matches higher', () => {
    const results = fuzzysort.go('react', allFiles, {key: 'name'});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toBe('react-native-app.md');
  });

  it('returns empty array for no matches', () => {
    const results = fuzzysort.go('zzzzzzzzz', allFiles, {key: 'name'});
    expect(results.length).toBe(0);
  });

  it('is case insensitive', () => {
    const results = fuzzysort.go('DAILY', allFiles, {key: 'name'});
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.obj.name).toBe('daily-note.md');
  });

  it('limits results correctly', () => {
    const results = fuzzysort.go('e', allFiles, {key: 'name', limit: 2});
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('performs within 50ms for typical queries', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      fuzzysort.go('daily', allFiles, {key: 'name'});
    }
    const elapsed = Date.now() - start;
    expect(elapsed / 100).toBeLessThan(50);
  });
});
