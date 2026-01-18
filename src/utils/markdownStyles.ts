/**
 * Markdown syntax styling utilities
 *
 * Processes markdown text to identify syntax elements that should be dimmed
 * (like #, **, [[, ]]) while keeping content at full opacity.
 */

export type SegmentType =
  | 'content'
  | 'syntax'
  | 'wikilink'
  | 'linkUrl'
  | 'heading'
  | 'checkbox'
  | 'checkboxChecked';

export interface StyledSegment {
  text: string;
  type: SegmentType;
  headingLevel?: number;
  /** @deprecated Use type === 'syntax' instead */
  isSyntax: boolean;
}

interface MarkedRange {
  start: number;
  end: number;
  type: SegmentType;
  headingLevel?: number;
}

export function parseMarkdownSegments(text: string): StyledSegment[] {
  const ranges: MarkedRange[] = [];

  // Headings - capture the syntax and track heading level
  const headingRegex = /^(#{1,6})\s/gm;
  let match;
  while ((match = headingRegex.exec(text)) !== null) {
    const hashGroup = match[1]!;
    const level = hashGroup.length;
    ranges.push({
      start: match.index,
      end: match.index + hashGroup.length,
      type: 'heading',
      headingLevel: level,
    });
  }

  // Checkboxes - must come before list markers
  const checkboxUnchecked = /^(\s*-\s\[ \])/gm;
  while ((match = checkboxUnchecked.exec(text)) !== null) {
    const checkboxGroup = match[1]!;
    ranges.push({
      start: match.index,
      end: match.index + checkboxGroup.length,
      type: 'checkbox',
    });
  }

  const checkboxChecked = /^(\s*-\s\[x\])/gim;
  while ((match = checkboxChecked.exec(text)) !== null) {
    const checkboxGroup = match[1]!;
    ranges.push({
      start: match.index,
      end: match.index + checkboxGroup.length,
      type: 'checkboxChecked',
    });
  }

  // Wikilinks [[link]] - brackets are syntax, content is wikilink
  const wikilinkSimple = /(\[\[)([^\]|]+)(\]\])/g;
  while ((match = wikilinkSimple.exec(text)) !== null) {
    const linkContent = match[2]!;
    let offset = match.index;
    ranges.push({start: offset, end: offset + 2, type: 'syntax'}); // [[
    offset += 2;
    ranges.push({start: offset, end: offset + linkContent.length, type: 'wikilink'});
    offset += linkContent.length;
    ranges.push({start: offset, end: offset + 2, type: 'syntax'}); // ]]
  }

  // Wikilinks with alias [[link|alias]]
  const wikilinkAlias = /(\[\[)([^\]|]+)(\|)([^\]]+)(\]\])/g;
  while ((match = wikilinkAlias.exec(text)) !== null) {
    const linkTarget = match[2]!;
    const aliasText = match[4]!;
    let offset = match.index;
    ranges.push({start: offset, end: offset + 2, type: 'syntax'}); // [[
    offset += 2;
    ranges.push({start: offset, end: offset + linkTarget.length, type: 'wikilink'});
    offset += linkTarget.length;
    ranges.push({start: offset, end: offset + 1, type: 'syntax'}); // |
    offset += 1;
    ranges.push({start: offset, end: offset + aliasText.length, type: 'content'});
    offset += aliasText.length;
    ranges.push({start: offset, end: offset + 2, type: 'syntax'}); // ]]
  }

  // Markdown links [text](url) - brackets/parens are syntax, url is linkUrl
  const mdLink = /(\[)([^\]]+)(\])(\()([^)]+)(\))/g;
  while ((match = mdLink.exec(text)) !== null) {
    const linkText = match[2]!;
    const urlText = match[5]!;
    let offset = match.index;
    ranges.push({start: offset, end: offset + 1, type: 'syntax'}); // [
    offset += 1;
    ranges.push({start: offset, end: offset + linkText.length, type: 'content'});
    offset += linkText.length;
    ranges.push({start: offset, end: offset + 1, type: 'syntax'}); // ]
    offset += 1;
    ranges.push({start: offset, end: offset + 1, type: 'syntax'}); // (
    offset += 1;
    ranges.push({start: offset, end: offset + urlText.length, type: 'linkUrl'});
    offset += urlText.length;
    ranges.push({start: offset, end: offset + 1, type: 'syntax'}); // )
  }

  // Standard syntax patterns
  const syntaxPatterns = [
    {regex: /(\*\*)(.*?)(\*\*)/g, groups: [1, 3]},
    {regex: /(\*)(.*?)(\*)/g, groups: [1, 3]},
    {regex: /(__)(.+?)(__)/g, groups: [1, 3]},
    {regex: /(_)(.+?)(_)/g, groups: [1, 3]},
    {regex: /(~~)(.+?)(~~)/g, groups: [1, 3]},
    {regex: /(`)([^`]+)(`)/g, groups: [1, 3]},
    {regex: /^(\s*[-*+])\s/gm, groups: [1]},
    {regex: /^(\s*\d+\.)\s/gm, groups: [1]},
    {regex: /^(>)\s/gm, groups: [1]},
  ];

  for (const pattern of syntaxPatterns) {
    const {regex} = pattern;
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      let offset = match.index;
      for (let i = 1; i < match.length; i++) {
        const group = match[i];
        if (group === undefined) continue;

        if (pattern.groups.includes(i)) {
          ranges.push({
            start: offset,
            end: offset + group.length,
            type: 'syntax',
          });
        }
        offset += group.length;
      }
    }
  }

  // Sort by start position, then by specificity (non-syntax first for overlaps)
  ranges.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.type !== 'syntax' && b.type === 'syntax') return -1;
    if (a.type === 'syntax' && b.type !== 'syntax') return 1;
    return 0;
  });

  // Remove overlapping ranges, keeping earlier/more specific ones
  const finalRanges: MarkedRange[] = [];
  let lastEnd = 0;
  for (const range of ranges) {
    if (range.start >= lastEnd) {
      finalRanges.push(range);
      lastEnd = range.end;
    }
  }

  // Build segments
  const segments: StyledSegment[] = [];
  let pos = 0;
  for (const range of finalRanges) {
    if (pos < range.start) {
      segments.push({
        text: text.slice(pos, range.start),
        type: 'content',
        isSyntax: false,
      });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      type: range.type,
      headingLevel: range.headingLevel,
      isSyntax: range.type === 'syntax',
    });
    pos = range.end;
  }

  if (pos < text.length) {
    segments.push({
      text: text.slice(pos),
      type: 'content',
      isSyntax: false,
    });
  }

  return segments;
}

export const SYNTAX_OPACITY = 0.4;
export const CONTENT_OPACITY = 1.0;
