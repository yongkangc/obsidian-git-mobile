import {sampleNotes, generateLargeFileTree} from '../../test-utils';
import {measureTime, runBenchmark} from '../../utils/perf';

describe('Search Performance', () => {
  const FTS_MAX_MS = 300;

  function simpleSearch(files: Record<string, string>, query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return Object.entries(files)
      .filter(([_, content]) => content.toLowerCase().includes(lowerQuery))
      .map(([path]) => path);
  }

  it(`should complete full-text search in <${FTS_MAX_MS}ms`, () => {
    const {result, duration} = measureTime(() =>
      simpleSearch(sampleNotes, 'testing'),
    );

    expect(duration).toBeLessThan(FTS_MAX_MS);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should search across many files efficiently', () => {
    const manyFiles: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) {
      manyFiles[`/notes/note-${i}.md`] = `Note ${i}\n\nSome content here with keywords.`;
    }
    manyFiles['/notes/target.md'] = 'This contains the special target phrase.';

    const {result, duration} = measureTime(() =>
      simpleSearch(manyFiles, 'target phrase'),
    );

    expect(duration).toBeLessThan(FTS_MAX_MS);
    expect(result).toContain('/notes/target.md');
  });

  it('should handle empty query', () => {
    const {duration} = measureTime(() => simpleSearch(sampleNotes, ''));

    expect(duration).toBeLessThan(10);
  });

  it('should handle no results', () => {
    const {result, duration} = measureTime(() =>
      simpleSearch(sampleNotes, 'xyznonexistent123'),
    );

    expect(duration).toBeLessThan(FTS_MAX_MS);
    expect(result).toHaveLength(0);
  });

  it('benchmark: search operations', () => {
    const result = runBenchmark(
      'simple-search',
      () => simpleSearch(sampleNotes, 'testing'),
      100,
    );

    expect(result.p95Ms).toBeLessThan(50);
  });

  describe('File Tree Navigation', () => {
    it('should traverse large file tree efficiently', () => {
      const tree = generateLargeFileTree(4, 5); // 5^4 = 625 nodes

      function countNodes(nodes: typeof tree): number {
        let count = nodes.length;
        for (const node of nodes) {
          if (node.children) {
            count += countNodes(node.children);
          }
        }
        return count;
      }

      const {result, duration} = measureTime(() => countNodes(tree));

      expect(result).toBeGreaterThan(100);
      expect(duration).toBeLessThan(100);
    });
  });
});
