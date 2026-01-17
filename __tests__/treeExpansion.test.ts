import type {FileNode} from '../src/types';

interface FlattenedNode {
  node: FileNode;
  depth: number;
  key: string;
}

function flattenTree(
  nodes: FileNode[],
  expandedFolders: Set<string>,
  depth = 0,
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  for (const node of nodes) {
    result.push({node, depth, key: node.path});
    if (node.isDirectory && expandedFolders.has(node.path) && node.children) {
      result.push(...flattenTree(node.children, expandedFolders, depth + 1));
    }
  }
  return result;
}

const mockFileTree: FileNode[] = [
  {
    path: 'notes',
    name: 'notes',
    isDirectory: true,
    children: [
      {
        path: 'notes/daily',
        name: 'daily',
        isDirectory: true,
        children: [
          {
            path: 'notes/daily/2024-01-01.md',
            name: '2024-01-01.md',
            isDirectory: false,
          },
          {
            path: 'notes/daily/2024-01-02.md',
            name: '2024-01-02.md',
            isDirectory: false,
          },
        ],
      },
      {
        path: 'notes/weekly.md',
        name: 'weekly.md',
        isDirectory: false,
      },
    ],
  },
  {
    path: 'projects',
    name: 'projects',
    isDirectory: true,
    children: [
      {
        path: 'projects/app.md',
        name: 'app.md',
        isDirectory: false,
      },
    ],
  },
  {
    path: 'readme.md',
    name: 'readme.md',
    isDirectory: false,
  },
];

describe('Tree Expansion Logic', () => {
  it('shows only top-level items when nothing is expanded', () => {
    const expanded = new Set<string>();
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(3);
    expect(flattened.map(f => f.node.name)).toEqual([
      'notes',
      'projects',
      'readme.md',
    ]);
  });

  it('shows children when folder is expanded', () => {
    const expanded = new Set<string>(['notes']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(5);
    expect(flattened.map(f => f.node.name)).toEqual([
      'notes',
      'daily',
      'weekly.md',
      'projects',
      'readme.md',
    ]);
  });

  it('shows nested children when multiple folders are expanded', () => {
    const expanded = new Set<string>(['notes', 'notes/daily']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(7);
    expect(flattened.map(f => f.node.name)).toEqual([
      'notes',
      'daily',
      '2024-01-01.md',
      '2024-01-02.md',
      'weekly.md',
      'projects',
      'readme.md',
    ]);
  });

  it('correctly calculates depth for nested items', () => {
    const expanded = new Set<string>(['notes', 'notes/daily']);
    const flattened = flattenTree(mockFileTree, expanded);

    const depths = flattened.map(f => ({name: f.node.name, depth: f.depth}));
    expect(depths).toEqual([
      {name: 'notes', depth: 0},
      {name: 'daily', depth: 1},
      {name: '2024-01-01.md', depth: 2},
      {name: '2024-01-02.md', depth: 2},
      {name: 'weekly.md', depth: 1},
      {name: 'projects', depth: 0},
      {name: 'readme.md', depth: 0},
    ]);
  });

  it('hides children when parent is collapsed', () => {
    const expanded = new Set<string>(['notes/daily']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(3);
    expect(flattened.map(f => f.node.name)).toEqual([
      'notes',
      'projects',
      'readme.md',
    ]);
  });

  it('expands multiple sibling folders independently', () => {
    const expanded = new Set<string>(['notes', 'projects']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(6);
    expect(flattened.map(f => f.node.name)).toEqual([
      'notes',
      'daily',
      'weekly.md',
      'projects',
      'app.md',
      'readme.md',
    ]);
  });

  it('handles empty expansion set', () => {
    const expanded = new Set<string>();
    const flattened = flattenTree([], expanded);

    expect(flattened.length).toBe(0);
  });

  it('ignores expansion of non-existent paths', () => {
    const expanded = new Set<string>(['nonexistent', 'also-fake']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(3);
  });

  it('handles files in expansion set without error', () => {
    const expanded = new Set<string>(['readme.md']);
    const flattened = flattenTree(mockFileTree, expanded);

    expect(flattened.length).toBe(3);
  });

  it('preserves key uniqueness', () => {
    const expanded = new Set<string>(['notes', 'notes/daily', 'projects']);
    const flattened = flattenTree(mockFileTree, expanded);

    const keys = flattened.map(f => f.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
