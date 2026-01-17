import {measureTime, runBenchmark} from '../../utils/perf';

describe('Editor Performance', () => {
  const KEYSTROKE_MAX_MS = 16; // 60fps = 16.67ms per frame

  function simulateKeystroke(content: string, position: number, char: string): string {
    return content.slice(0, position) + char + content.slice(position);
  }

  function simulateBackspace(content: string, position: number): string {
    if (position === 0) return content;
    return content.slice(0, position - 1) + content.slice(position);
  }

  it(`should process keystroke in <${KEYSTROKE_MAX_MS}ms`, () => {
    const content = 'Hello, world!';

    const {duration} = measureTime(() => simulateKeystroke(content, 5, 'X'));

    expect(duration).toBeLessThan(KEYSTROKE_MAX_MS);
  });

  it('should handle keystroke in large document', () => {
    const largeContent = 'x'.repeat(100000);

    const {duration} = measureTime(() =>
      simulateKeystroke(largeContent, 50000, 'Y'),
    );

    expect(duration).toBeLessThan(KEYSTROKE_MAX_MS);
  });

  it('should handle rapid keystrokes', () => {
    let content = '';

    const {duration} = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        content = simulateKeystroke(content, content.length, 'a');
      }
    });

    const avgPerKeystroke = duration / 100;
    expect(avgPerKeystroke).toBeLessThan(KEYSTROKE_MAX_MS);
  });

  it('should handle backspace efficiently', () => {
    const content = 'Hello, world!';

    const {duration} = measureTime(() => simulateBackspace(content, 5));

    expect(duration).toBeLessThan(KEYSTROKE_MAX_MS);
  });

  it('benchmark: keystroke operations', () => {
    const content = 'Test content for benchmarking keystrokes.';

    const result = runBenchmark(
      'keystroke',
      () => simulateKeystroke(content, 20, 'X'),
      1000,
    );

    expect(result.p95Ms).toBeLessThan(KEYSTROKE_MAX_MS);
  });

  describe('Content Parsing', () => {
    function parseMarkdownLinks(content: string): string[] {
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      const links: string[] = [];
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        if (match[1]) links.push(match[1]);
      }
      return links;
    }

    it('should parse links quickly', () => {
      const content = `
# Document with Links

This has [[Link One]] and [[Link Two|Display Text]].

More content with [[Another Link]].
      `;

      const {result, duration} = measureTime(() => parseMarkdownLinks(content));

      expect(duration).toBeLessThan(KEYSTROKE_MAX_MS);
      expect(result.length).toBe(3);
    });

    it('should parse large document with many links', () => {
      const links = Array.from({length: 100}, (_, i) => `[[Link ${i}]]`);
      const content = links.join('\n\nSome text between links.\n\n');

      const {result, duration} = measureTime(() => parseMarkdownLinks(content));

      expect(duration).toBeLessThan(100);
      expect(result.length).toBe(100);
    });
  });
});
