import {parseMarkdownSegments, SYNTAX_OPACITY} from '../../../utils/markdownStyles';

describe('parseMarkdownSegments', () => {
  describe('Link colors (wikilinks and markdown links)', () => {
    it('identifies wikilink content with type "wikilink"', () => {
      const segments = parseMarkdownSegments('See [[My Note]] here');
      const wikilinkSegment = segments.find(s => s.type === 'wikilink');
      expect(wikilinkSegment).toBeDefined();
      expect(wikilinkSegment?.text).toBe('My Note');
    });

    it('identifies wikilink brackets as syntax', () => {
      const segments = parseMarkdownSegments('[[Note]]');
      const syntaxSegments = segments.filter(s => s.type === 'syntax');
      expect(syntaxSegments).toHaveLength(2);
      expect(syntaxSegments[0]?.text).toBe('[[');
      expect(syntaxSegments[1]?.text).toBe(']]');
    });

    it('identifies markdown link URL with type "linkUrl"', () => {
      const segments = parseMarkdownSegments('[text](https://example.com)');
      const urlSegment = segments.find(s => s.type === 'linkUrl');
      expect(urlSegment).toBeDefined();
      expect(urlSegment?.text).toBe('https://example.com');
    });

    it('keeps markdown link text as content', () => {
      const segments = parseMarkdownSegments('[click here](url)');
      const contentSegments = segments.filter(s => s.type === 'content' && s.text === 'click here');
      expect(contentSegments).toHaveLength(1);
    });
  });

  describe('Heading hierarchy', () => {
    it('identifies H1 heading with level 1', () => {
      const segments = parseMarkdownSegments('# Heading');
      const heading = segments.find(s => s.type === 'heading');
      expect(heading).toBeDefined();
      expect(heading?.headingLevel).toBe(1);
    });

    it('identifies H2 heading with level 2', () => {
      const segments = parseMarkdownSegments('## Subheading');
      const heading = segments.find(s => s.type === 'heading');
      expect(heading?.headingLevel).toBe(2);
    });

    it('identifies H3-H6 headings with correct levels', () => {
      for (let level = 3; level <= 6; level++) {
        const hashes = '#'.repeat(level);
        const segments = parseMarkdownSegments(`${hashes} Heading ${level}`);
        const heading = segments.find(s => s.type === 'heading');
        expect(heading?.headingLevel).toBe(level);
      }
    });

    it('captures only the hash marks as heading type', () => {
      const segments = parseMarkdownSegments('### Title');
      const heading = segments.find(s => s.type === 'heading');
      expect(heading?.text).toBe('###');
    });
  });

  describe('Checkbox rendering', () => {
    it('identifies unchecked checkbox', () => {
      const segments = parseMarkdownSegments('- [ ] todo item');
      const checkbox = segments.find(s => s.type === 'checkbox');
      expect(checkbox).toBeDefined();
      expect(checkbox?.text).toBe('- [ ]');
    });

    it('identifies checked checkbox', () => {
      const segments = parseMarkdownSegments('- [x] done item');
      const checkbox = segments.find(s => s.type === 'checkboxChecked');
      expect(checkbox).toBeDefined();
      expect(checkbox?.text).toBe('- [x]');
    });

    it('handles indented checkboxes', () => {
      const segments = parseMarkdownSegments('  - [ ] nested todo');
      const checkbox = segments.find(s => s.type === 'checkbox');
      expect(checkbox).toBeDefined();
    });

    it('handles uppercase X in checked checkbox', () => {
      const segments = parseMarkdownSegments('- [X] also done');
      const checkbox = segments.find(s => s.type === 'checkboxChecked');
      expect(checkbox).toBeDefined();
    });
  });

  describe('Standard markdown syntax', () => {
    it('identifies bold markers as syntax', () => {
      const segments = parseMarkdownSegments('**bold text**');
      const syntaxSegments = segments.filter(s => s.type === 'syntax');
      expect(syntaxSegments.some(s => s.text === '**')).toBe(true);
    });

    it('identifies italic markers as syntax', () => {
      const segments = parseMarkdownSegments('*italic*');
      const syntaxSegments = segments.filter(s => s.type === 'syntax');
      expect(syntaxSegments.some(s => s.text === '*')).toBe(true);
    });

    it('identifies code backticks as syntax', () => {
      const segments = parseMarkdownSegments('`code`');
      const syntaxSegments = segments.filter(s => s.type === 'syntax');
      expect(syntaxSegments.some(s => s.text === '`')).toBe(true);
    });

    it('identifies list markers as syntax', () => {
      const segments = parseMarkdownSegments('- list item');
      const listMarker = segments.find(s => s.type === 'syntax' && s.text === '-');
      expect(listMarker).toBeDefined();
    });

    it('identifies numbered list markers as syntax', () => {
      const segments = parseMarkdownSegments('1. numbered item');
      const listMarker = segments.find(s => s.type === 'syntax' && s.text === '1.');
      expect(listMarker).toBeDefined();
    });

    it('identifies blockquote markers as syntax', () => {
      const segments = parseMarkdownSegments('> quote');
      const quoteMarker = segments.find(s => s.type === 'syntax' && s.text === '>');
      expect(quoteMarker).toBeDefined();
    });
  });

  describe('Complex documents', () => {
    it('handles multiple markdown elements', () => {
      const content = `# Title

[[Wikilink]] and [markdown](url)

- [ ] Todo
- [x] Done

**bold** *italic* \`code\``;
      
      const segments = parseMarkdownSegments(content);
      
      expect(segments.some(s => s.type === 'heading')).toBe(true);
      expect(segments.some(s => s.type === 'wikilink')).toBe(true);
      expect(segments.some(s => s.type === 'linkUrl')).toBe(true);
      expect(segments.some(s => s.type === 'checkbox')).toBe(true);
      expect(segments.some(s => s.type === 'checkboxChecked')).toBe(true);
    });

    it('maintains correct order of segments', () => {
      const segments = parseMarkdownSegments('[[A]] then [[B]]');
      const wikilinks = segments.filter(s => s.type === 'wikilink');
      expect(wikilinks[0]?.text).toBe('A');
      expect(wikilinks[1]?.text).toBe('B');
    });
  });

  describe('SYNTAX_OPACITY constant', () => {
    it('is defined and less than 1', () => {
      expect(SYNTAX_OPACITY).toBeDefined();
      expect(SYNTAX_OPACITY).toBeLessThan(1);
      expect(SYNTAX_OPACITY).toBeGreaterThan(0);
    });
  });
});
