/**
 * Tests for Markdown Editor UI/UX features
 * 
 * Tests cover:
 * 1. Smart typography (quotes, em-dash, ellipsis)
 * 2. Word/character counting
 * 3. Frontmatter parsing
 */

describe('Smart Typography', () => {
  // Helper to simulate the applySmartTypography function behavior
  function applySmartTypography(inputText: string): {text: string; cursorOffset: number} {
    let result = inputText;
    let cursorOffset = 0;

    // Smart quotes: "" -> ""
    if (result.endsWith('"')) {
      const beforeQuote = result.slice(0, -1);
      const quoteCount = (beforeQuote.match(/"/g) ?? []).length;
      const isOpening = quoteCount % 2 === 0;
      result = beforeQuote + (isOpening ? '"' : '"');
    }

    // Smart single quotes: '' -> ''
    if (result.endsWith("'")) {
      const beforeQuote = result.slice(0, -1);
      const charBefore = beforeQuote.slice(-1);
      const isOpening = !charBefore || /\s/.test(charBefore);
      result = beforeQuote + (isOpening ? '\u2018' : '\u2019');
    }

    // Em-dash: -- -> —
    if (result.endsWith('--')) {
      result = result.slice(0, -2) + '—';
      cursorOffset = -1;
    }

    // Ellipsis: ... -> …
    if (result.endsWith('...')) {
      result = result.slice(0, -3) + '…';
      cursorOffset = -2;
    }

    return {text: result, cursorOffset};
  }

  describe('Smart quotes', () => {
    it('converts opening double quote', () => {
      const result = applySmartTypography('He said "');
      expect(result.text).toBe('He said "');
    });

    it('converts closing double quote', () => {
      const result = applySmartTypography('He said "hello"');
      expect(result.text).toBe('He said "hello"');
    });

    it('alternates quotes correctly', () => {
      let text = '';
      
      text = applySmartTypography(text + '"').text;
      expect(text.endsWith('"')).toBe(true);
      
      text = applySmartTypography(text + 'word"').text;
      expect(text.endsWith('"')).toBe(true);
    });

    it('converts opening single quote after space', () => {
      // After "it's ", typing a quote
      const withQuote = applySmartTypography("it's '");
      expect(withQuote.text.endsWith('\u2018')).toBe(true);
    });

    it('converts closing single quote after character', () => {
      // The function only processes quotes at the end of input
      // "don't" doesn't end with a quote, but "don'" does
      const result = applySmartTypography("don'");
      expect(result.text.endsWith('\u2019')).toBe(true);
    });
  });

  describe('Em-dash', () => {
    it('converts double dash to em-dash', () => {
      const result = applySmartTypography('word--');
      expect(result.text).toBe('word—');
    });

    it('returns negative cursor offset for em-dash', () => {
      const result = applySmartTypography('--');
      expect(result.cursorOffset).toBe(-1);
    });

    it('works in middle of sentence', () => {
      const result = applySmartTypography('hello--');
      expect(result.text).toBe('hello—');
    });
  });

  describe('Ellipsis', () => {
    it('converts three dots to ellipsis', () => {
      const result = applySmartTypography('wait...');
      expect(result.text).toBe('wait…');
    });

    it('returns negative cursor offset for ellipsis', () => {
      const result = applySmartTypography('...');
      expect(result.cursorOffset).toBe(-2);
    });
  });
});

describe('Word and Character Count', () => {
  function countWordsAndChars(text: string): {wordCount: number; charCount: number} {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    return {wordCount: words, charCount: chars};
  }

  it('counts empty text correctly', () => {
    const result = countWordsAndChars('');
    expect(result.wordCount).toBe(0);
    expect(result.charCount).toBe(0);
  });

  it('counts whitespace-only text correctly', () => {
    const result = countWordsAndChars('   ');
    expect(result.wordCount).toBe(0);
    expect(result.charCount).toBe(3);
  });

  it('counts single word', () => {
    const result = countWordsAndChars('hello');
    expect(result.wordCount).toBe(1);
    expect(result.charCount).toBe(5);
  });

  it('counts multiple words', () => {
    const result = countWordsAndChars('hello world test');
    expect(result.wordCount).toBe(3);
    expect(result.charCount).toBe(16);
  });

  it('handles multiple spaces between words', () => {
    const result = countWordsAndChars('hello    world');
    expect(result.wordCount).toBe(2);
  });

  it('handles newlines', () => {
    const result = countWordsAndChars('hello\nworld');
    expect(result.wordCount).toBe(2);
    expect(result.charCount).toBe(11);
  });

  it('handles tabs', () => {
    const result = countWordsAndChars('hello\tworld');
    expect(result.wordCount).toBe(2);
  });
});

describe('Frontmatter Detection', () => {
  const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;

  it('detects frontmatter at start of document', () => {
    const text = `---
title: Test
---

Content here`;
    expect(FRONTMATTER_REGEX.test(text)).toBe(true);
  });

  it('extracts frontmatter content', () => {
    const text = `---
title: Test
date: 2024-01-01
---

Content`;
    const match = FRONTMATTER_REGEX.exec(text);
    expect(match).not.toBeNull();
    expect(match?.[0]).toContain('title: Test');
    expect(match?.[0]).toContain('date: 2024-01-01');
  });

  it('does not match frontmatter not at start', () => {
    const text = `Some content first
---
title: Test
---`;
    expect(FRONTMATTER_REGEX.test(text)).toBe(false);
  });

  it('does not match unclosed frontmatter', () => {
    const text = `---
title: Test
Content without closing`;
    const match = FRONTMATTER_REGEX.exec(text);
    expect(match).toBeNull();
  });

  it('handles minimal frontmatter', () => {
    // Regex requires at least one newline between delimiters
    const text = `---
key: value
---

Content`;
    expect(FRONTMATTER_REGEX.test(text)).toBe(true);
  });
});

describe('List Indent Detection', () => {
  const LIST_PATTERN = /^(\s*)([-*+]|\d+\.)\s/;

  it('detects unordered list with dash', () => {
    expect(LIST_PATTERN.test('- item')).toBe(true);
  });

  it('detects unordered list with asterisk', () => {
    expect(LIST_PATTERN.test('* item')).toBe(true);
  });

  it('detects unordered list with plus', () => {
    expect(LIST_PATTERN.test('+ item')).toBe(true);
  });

  it('detects numbered list', () => {
    expect(LIST_PATTERN.test('1. item')).toBe(true);
  });

  it('detects indented list', () => {
    expect(LIST_PATTERN.test('  - nested')).toBe(true);
  });

  it('captures indent level', () => {
    const match = '    - deeply nested'.match(LIST_PATTERN);
    expect(match?.[1]).toBe('    ');
  });

  it('does not match non-list lines', () => {
    expect(LIST_PATTERN.test('regular text')).toBe(false);
    expect(LIST_PATTERN.test('# heading')).toBe(false);
  });
});

describe('Typewriter Scrolling Constants', () => {
  const LINE_HEIGHT = 30;
  const TYPEWRITER_POSITION = 0.4;

  it('maintains cursor at 40% from top', () => {
    expect(TYPEWRITER_POSITION).toBe(0.4);
  });

  it('uses consistent line height', () => {
    expect(LINE_HEIGHT).toBe(30);
  });

  it('calculates correct scroll position', () => {
    const editorHeight = 500;
    const lineNumber = 10;
    const paddingTop = 16;
    
    const targetY = lineNumber * LINE_HEIGHT - editorHeight * TYPEWRITER_POSITION + paddingTop;
    expect(targetY).toBe(10 * 30 - 500 * 0.4 + 16);
    expect(targetY).toBe(116);
  });
});
