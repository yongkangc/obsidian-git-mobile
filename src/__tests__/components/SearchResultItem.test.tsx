describe('SearchResultItem helpers', () => {
  describe('getFileIcon', () => {
    function getFileIcon(path: string): string {
      if (path.endsWith('.md')) return '📄';
      if (path.endsWith('.txt')) return '📝';
      if (path.endsWith('.json')) return '📋';
      if (path.endsWith('.yaml') || path.endsWith('.yml')) return '⚙️';
      return '📄';
    }

    it('returns markdown icon for .md files', () => {
      expect(getFileIcon('notes/test.md')).toBe('📄');
    });

    it('returns text icon for .txt files', () => {
      expect(getFileIcon('notes/test.txt')).toBe('📝');
    });

    it('returns json icon for .json files', () => {
      expect(getFileIcon('config/settings.json')).toBe('📋');
    });

    it('returns config icon for yaml files', () => {
      expect(getFileIcon('config.yaml')).toBe('⚙️');
      expect(getFileIcon('config.yml')).toBe('⚙️');
    });

    it('returns default icon for unknown types', () => {
      expect(getFileIcon('file.xyz')).toBe('📄');
    });
  });

  describe('parseSnippetWithHighlights', () => {
    function parseSnippetSegments(snippet: string): Array<{text: string; highlighted: boolean}> {
      if (!snippet) return [];

      const segments: Array<{text: string; highlighted: boolean}> = [];
      const regex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(snippet)) !== null) {
        if (match.index > lastIndex) {
          segments.push({
            text: snippet.slice(lastIndex, match.index),
            highlighted: false,
          });
        }
        segments.push({
          text: match[1] ?? '',
          highlighted: true,
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < snippet.length) {
        segments.push({
          text: snippet.slice(lastIndex),
          highlighted: false,
        });
      }

      return segments;
    }

    it('returns empty array for empty snippet', () => {
      expect(parseSnippetSegments('')).toEqual([]);
    });

    it('parses plain text without highlights', () => {
      expect(parseSnippetSegments('plain text')).toEqual([
        {text: 'plain text', highlighted: false},
      ]);
    });

    it('parses single highlight', () => {
      expect(parseSnippetSegments('before **match** after')).toEqual([
        {text: 'before ', highlighted: false},
        {text: 'match', highlighted: true},
        {text: ' after', highlighted: false},
      ]);
    });

    it('parses multiple highlights', () => {
      expect(parseSnippetSegments('**first** and **second**')).toEqual([
        {text: 'first', highlighted: true},
        {text: ' and ', highlighted: false},
        {text: 'second', highlighted: true},
      ]);
    });

    it('handles highlight at start', () => {
      expect(parseSnippetSegments('**start** text')).toEqual([
        {text: 'start', highlighted: true},
        {text: ' text', highlighted: false},
      ]);
    });

    it('handles highlight at end', () => {
      expect(parseSnippetSegments('text **end**')).toEqual([
        {text: 'text ', highlighted: false},
        {text: 'end', highlighted: true},
      ]);
    });
  });

  describe('folder path extraction', () => {
    function getFolderPath(path: string): string {
      const parts = path.split('/');
      return parts.slice(0, -1).join(' › ') || 'Vault';
    }

    it('returns Vault for root-level files', () => {
      expect(getFolderPath('test.md')).toBe('Vault');
    });

    it('returns single folder name', () => {
      expect(getFolderPath('notes/test.md')).toBe('notes');
    });

    it('returns nested path with separators', () => {
      expect(getFolderPath('projects/work/notes/test.md')).toBe('projects › work › notes');
    });
  });
});
