/**
 * Markdown syntax styling utilities
 *
 * Processes markdown text to identify syntax elements that should be dimmed
 * (like #, **, [[, ]]) while keeping content at full opacity.
 */

export interface StyledSegment {
  text: string;
  isSyntax: boolean;
}

const MARKDOWN_PATTERNS = [
  {regex: /^(#{1,6})\s/gm, groups: [1]},
  {regex: /(\*\*)(.*?)(\*\*)/g, groups: [1, 3]},
  {regex: /(\*)(.*?)(\*)/g, groups: [1, 3]},
  {regex: /(__)(.+?)(__)/g, groups: [1, 3]},
  {regex: /(_)(.+?)(_)/g, groups: [1, 3]},
  {regex: /(~~)(.+?)(~~)/g, groups: [1, 3]},
  {regex: /(`)([^`]+)(`)/g, groups: [1, 3]},
  {regex: /(\[\[)([^\]|]+)(\]\])/g, groups: [1, 3]},
  {regex: /(\[\[)([^\]|]+)(\|)([^\]]+)(\]\])/g, groups: [1, 3, 5]},
  {regex: /(\[)([^\]]+)(\])(\()([^)]+)(\))/g, groups: [1, 3, 4, 6]},
  {regex: /^(\s*[-*+])\s/gm, groups: [1]},
  {regex: /^(\s*\d+\.)\s/gm, groups: [1]},
  {regex: /^(>)\s/gm, groups: [1]},
];

export function parseMarkdownSegments(text: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  const syntaxRanges: Array<{start: number; end: number}> = [];

  for (const pattern of MARKDOWN_PATTERNS) {
    const {regex} = pattern;
    regex.lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      let offset = match.index;
      for (let i = 1; i < match.length; i++) {
        const group = match[i];
        if (group === undefined) continue;

        if (pattern.groups.includes(i)) {
          syntaxRanges.push({
            start: offset,
            end: offset + group.length,
          });
        }
        offset += group.length;
      }
    }
  }

  syntaxRanges.sort((a, b) => a.start - b.start);

  const mergedRanges: Array<{start: number; end: number}> = [];
  for (const range of syntaxRanges) {
    const last = mergedRanges[mergedRanges.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      mergedRanges.push({...range});
    }
  }

  let pos = 0;
  for (const range of mergedRanges) {
    if (pos < range.start) {
      segments.push({
        text: text.slice(pos, range.start),
        isSyntax: false,
      });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      isSyntax: true,
    });
    pos = range.end;
  }

  if (pos < text.length) {
    segments.push({
      text: text.slice(pos),
      isSyntax: false,
    });
  }

  return segments;
}

export const SYNTAX_OPACITY = 0.4;
export const CONTENT_OPACITY = 1.0;
