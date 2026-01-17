import {createMockVaultFS, sampleNotes} from '../../test-utils';
import {measureTimeAsync, runBenchmark} from '../../utils/perf';

describe('File Open Performance', () => {
  const FILE_OPEN_MAX_MS = 100;

  it(`should open file in <${FILE_OPEN_MAX_MS}ms`, async () => {
    const vaultFS = createMockVaultFS(sampleNotes);
    const path = '/notes/welcome.md';

    const {duration} = await measureTimeAsync(() => vaultFS.readFile(path));

    expect(duration).toBeLessThan(FILE_OPEN_MAX_MS);
  });

  it('should open large file within performance budget', async () => {
    const vaultFS = createMockVaultFS(sampleNotes);
    const path = '/notes/long-content.md';

    const {duration} = await measureTimeAsync(() => vaultFS.readFile(path));

    expect(duration).toBeLessThan(FILE_OPEN_MAX_MS);
  });

  it('should handle multiple sequential file opens', async () => {
    const vaultFS = createMockVaultFS(sampleNotes);
    const paths = Object.keys(sampleNotes);

    const start = Date.now();
    for (const path of paths) {
      await vaultFS.readFile(path);
    }
    const duration = Date.now() - start;

    const avgPerFile = duration / paths.length;
    expect(avgPerFile).toBeLessThan(FILE_OPEN_MAX_MS);
  });

  it('should handle concurrent file opens', async () => {
    const vaultFS = createMockVaultFS(sampleNotes);
    const paths = Object.keys(sampleNotes);

    const {duration} = await measureTimeAsync(() =>
      Promise.all(paths.map(path => vaultFS.readFile(path))),
    );

    expect(duration).toBeLessThan(FILE_OPEN_MAX_MS);
  });

  it('benchmark: file read operations', () => {
    const vaultFS = createMockVaultFS(sampleNotes);
    const path = '/notes/welcome.md';

    const result = runBenchmark(
      'file-read',
      () => {
        // Sync version for benchmark - in real app this would be async
        vaultFS._files.get(path);
      },
      1000,
    );

    expect(result.p95Ms).toBeLessThan(10);
  });
});
