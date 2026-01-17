describe('BacklinkItem helpers', () => {
  describe('highlightWikilink', () => {
    interface WikilinkSegment {
      text: string;
      isLink: boolean;
    }

    function parseWikilinkSegments(text: string): WikilinkSegment[] {
      const parts: WikilinkSegment[] = [];
      const regex = /\[\[([^\]]+)\]\]/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            text: text.slice(lastIndex, match.index),
            isLink: false,
          });
        }
        parts.push({
          text: `[[${match[1]}]]`,
          isLink: true,
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push({
          text: text.slice(lastIndex),
          isLink: false,
        });
      }

      return parts;
    }

    it('returns plain text when no wikilinks', () => {
      expect(parseWikilinkSegments('plain text')).toEqual([
        {text: 'plain text', isLink: false},
      ]);
    });

    it('parses single wikilink', () => {
      expect(parseWikilinkSegments('See [[Note]] here')).toEqual([
        {text: 'See ', isLink: false},
        {text: '[[Note]]', isLink: true},
        {text: ' here', isLink: false},
      ]);
    });

    it('parses multiple wikilinks', () => {
      expect(parseWikilinkSegments('[[First]] and [[Second]]')).toEqual([
        {text: '[[First]]', isLink: true},
        {text: ' and ', isLink: false},
        {text: '[[Second]]', isLink: true},
      ]);
    });

    it('handles wikilink at start', () => {
      expect(parseWikilinkSegments('[[Start]] of text')).toEqual([
        {text: '[[Start]]', isLink: true},
        {text: ' of text', isLink: false},
      ]);
    });

    it('handles wikilink at end', () => {
      expect(parseWikilinkSegments('Link to [[End]]')).toEqual([
        {text: 'Link to ', isLink: false},
        {text: '[[End]]', isLink: true},
      ]);
    });

    it('handles wikilink with alias syntax', () => {
      expect(parseWikilinkSegments('Check [[Note|Alias]] here')).toEqual([
        {text: 'Check ', isLink: false},
        {text: '[[Note|Alias]]', isLink: true},
        {text: ' here', isLink: false},
      ]);
    });

    it('returns empty array for empty string', () => {
      expect(parseWikilinkSegments('')).toEqual([]);
    });
  });
});
