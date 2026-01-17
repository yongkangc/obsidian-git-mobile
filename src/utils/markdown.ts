const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const IMAGE_EMBED_REGEX = /!\[\[([^\]]+)\]\]/g;
const FRONTMATTER_TITLE_REGEX = /^---\s*\n(?:.*\n)*?title:\s*["']?([^"'\n]+)["']?\s*\n(?:.*\n)*?---/;
const H1_REGEX = /^#\s+(.+)$/m;

export function parseWikilinks(content: string): string[] {
  const links: string[] = [];
  let match;
  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    const link = match[1];
    if (link) {
      links.push(link);
    }
  }
  return links;
}

export function parseTitle(content: string): string {
  const frontmatterMatch = FRONTMATTER_TITLE_REGEX.exec(content);
  if (frontmatterMatch?.[1]) {
    return frontmatterMatch[1].trim();
  }

  const h1Match = H1_REGEX.exec(content);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }

  return 'Untitled';
}

export function extractImageEmbeds(content: string): string[] {
  const embeds: string[] = [];
  let match;
  while ((match = IMAGE_EMBED_REGEX.exec(content)) !== null) {
    const embed = match[1];
    if (embed) {
      embeds.push(embed);
    }
  }
  return embeds;
}

export interface MarkdownToken {
  type: 'bold' | 'italic' | 'heading' | 'code' | 'link' | 'wikilink' | 'image' | 'text';
  start: number;
  end: number;
  content: string;
  level?: number;
}

export function tokenizeMarkdown(content: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  const patterns: Array<{
    regex: RegExp;
    type: MarkdownToken['type'];
    getLevel?: (match: RegExpExecArray) => number;
  }> = [
    {regex: /\*\*(.+?)\*\*/g, type: 'bold'},
    {regex: /__(.+?)__/g, type: 'bold'},
    {regex: /\*([^*]+)\*/g, type: 'italic'},
    {regex: /_([^_]+)_/g, type: 'italic'},
    {regex: /`([^`]+)`/g, type: 'code'},
    {regex: /^(#{1,6})\s+(.+)$/gm, type: 'heading', getLevel: (m) => m[1]?.length ?? 1},
    {regex: /\[\[([^\]]+)\]\]/g, type: 'wikilink'},
    {regex: /!\[\[([^\]]+)\]\]/g, type: 'image'},
    {regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link'},
  ];

  for (const {regex, type, getLevel} of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      tokens.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
        level: getLevel?.(match),
      });
    }
  }

  return tokens.sort((a, b) => a.start - b.start);
}

export function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.includes(q)) {
    return t.indexOf(q) === 0 ? 100 : 75;
  }

  let qIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;

  for (let tIdx = 0; tIdx < t.length && qIdx < q.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      score += 10 + consecutiveBonus;
      consecutiveBonus += 5;
      qIdx++;
    } else {
      consecutiveBonus = 0;
    }
  }

  return qIdx === q.length ? score : 0;
}
