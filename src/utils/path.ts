export function normalizePath(path: string): string {
  return (
    path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/^\.\//, '') || '/'
  );
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join('/'));
}

export function getBasename(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

export function getDirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  return normalized.slice(0, lastSlash);
}

export function getExtension(path: string): string {
  const basename = getBasename(path);
  const lastDot = basename.lastIndexOf('.');
  return lastDot === -1 || lastDot === 0 ? '' : basename.slice(lastDot);
}

export function removeExtension(path: string): string {
  const ext = getExtension(path);
  return ext ? path.slice(0, -ext.length) : path;
}

export function isMarkdownFile(path: string): boolean {
  const ext = getExtension(path).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

export function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split('/').filter(Boolean);
  const toParts = normalizePath(to).split('/').filter(Boolean);

  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const upPath = Array(upCount).fill('..');
  const downPath = toParts.slice(commonLength);

  return [...upPath, ...downPath].join('/') || '.';
}

export function getFileName(path: string): string {
  return getBasename(path);
}

export function getDirectory(path: string): string {
  const dir = getDirname(path);
  return dir === '.' ? '' : dir;
}

export function isMarkdown(path: string): boolean {
  return isMarkdownFile(path);
}
