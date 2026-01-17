import {
  parseWikilinks,
  parseTitle,
  extractImageEmbeds,
  fuzzyMatch,
  tokenizeMarkdown,
} from '../../../utils/markdown';

describe('parseWikilinks', () => {
  it('extracts simple wikilinks', () => {
    const content = 'See [[Note A]] and [[Note B]] for more.';
    expect(parseWikilinks(content)).toEqual(['Note A', 'Note B']);
  });

  it('extracts wikilinks with aliases', () => {
    const content = 'Check [[My Note|display text]] here.';
    expect(parseWikilinks(content)).toEqual(['My Note']);
  });

  it('returns empty array when no wikilinks', () => {
    const content = 'No links here.';
    expect(parseWikilinks(content)).toEqual([]);
  });

  it('handles nested brackets by matching first closing', () => {
    const content = '[[Note with [brackets]]]';
    expect(parseWikilinks(content)).toEqual(['Note with [brackets']);
  });

  it('extracts multiple wikilinks on same line', () => {
    const content = '[[A]] [[B]] [[C]]';
    expect(parseWikilinks(content)).toEqual(['A', 'B', 'C']);
  });
});

describe('parseTitle', () => {
  it('extracts title from frontmatter', () => {
    const content = `---
title: My Document
date: 2024-01-01
---

# Content`;
    expect(parseTitle(content)).toBe('My Document');
  });

  it('extracts title from quoted frontmatter', () => {
    const content = `---
title: "Quoted Title"
---

Content`;
    expect(parseTitle(content)).toBe('Quoted Title');
  });

  it('falls back to H1 when no frontmatter title', () => {
    const content = `# My Heading

Some content here.`;
    expect(parseTitle(content)).toBe('My Heading');
  });

  it('returns Untitled when no title found', () => {
    const content = 'Just some text without any title.';
    expect(parseTitle(content)).toBe('Untitled');
  });

  it('prefers frontmatter over H1', () => {
    const content = `---
title: Frontmatter Title
---

# H1 Title`;
    expect(parseTitle(content)).toBe('Frontmatter Title');
  });
});

describe('extractImageEmbeds', () => {
  it('extracts image embeds', () => {
    const content = 'Here is an image: ![[photo.png]]';
    expect(extractImageEmbeds(content)).toEqual(['photo.png']);
  });

  it('extracts multiple image embeds', () => {
    const content = '![[a.jpg]] text ![[b.png]] more ![[c.gif]]';
    expect(extractImageEmbeds(content)).toEqual(['a.jpg', 'b.png', 'c.gif']);
  });

  it('returns empty array when no embeds', () => {
    const content = 'No images here [[just a link]]';
    expect(extractImageEmbeds(content)).toEqual([]);
  });

  it('handles paths with spaces', () => {
    const content = '![[my image file.png]]';
    expect(extractImageEmbeds(content)).toEqual(['my image file.png']);
  });
});

describe('fuzzyMatch', () => {
  it('returns high score for exact match', () => {
    expect(fuzzyMatch('test', 'test')).toBeGreaterThan(50);
  });

  it('returns high score for prefix match', () => {
    expect(fuzzyMatch('test', 'testing')).toBeGreaterThan(50);
  });

  it('returns positive score for substring match', () => {
    const score = fuzzyMatch('note', 'my note file');
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 for no match', () => {
    expect(fuzzyMatch('xyz', 'abc')).toBe(0);
  });

  it('is case insensitive', () => {
    expect(fuzzyMatch('TEST', 'test')).toBeGreaterThan(50);
  });

  it('scores consecutive matches higher', () => {
    const consecutive = fuzzyMatch('abc', 'abcdef');
    const scattered = fuzzyMatch('ace', 'abcdef');
    expect(consecutive).toBeGreaterThan(scattered);
  });
});

describe('tokenizeMarkdown', () => {
  it('tokenizes bold text', () => {
    const tokens = tokenizeMarkdown('**bold**');
    expect(tokens.some((t) => t.type === 'bold')).toBe(true);
  });

  it('tokenizes italic text', () => {
    const tokens = tokenizeMarkdown('*italic*');
    expect(tokens.some((t) => t.type === 'italic')).toBe(true);
  });

  it('tokenizes headings', () => {
    const tokens = tokenizeMarkdown('# Heading');
    const heading = tokens.find((t) => t.type === 'heading');
    expect(heading).toBeDefined();
    expect(heading?.level).toBe(1);
  });

  it('tokenizes wikilinks', () => {
    const tokens = tokenizeMarkdown('[[My Link]]');
    expect(tokens.some((t) => t.type === 'wikilink')).toBe(true);
  });

  it('tokenizes inline code', () => {
    const tokens = tokenizeMarkdown('`code`');
    expect(tokens.some((t) => t.type === 'code')).toBe(true);
  });

  it('returns tokens sorted by position', () => {
    const tokens = tokenizeMarkdown('**bold** *italic* `code`');
    for (let i = 1; i < tokens.length; i++) {
      const prev = tokens[i - 1];
      const curr = tokens[i];
      if (prev && curr) {
        expect(curr.start).toBeGreaterThanOrEqual(prev.start);
      }
    }
  });
});
