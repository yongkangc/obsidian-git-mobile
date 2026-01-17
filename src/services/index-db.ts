import {open, QuickSQLiteConnection} from 'react-native-quick-sqlite';
import type {IndexDB, FileMeta, SearchResult} from '../types';

const DB_NAME = 'vault_index.db';

export class SQLiteIndexDB implements IndexDB {
  private db: QuickSQLiteConnection | null = null;

  async init(): Promise<void> {
    this.db = open({name: DB_NAME});

    this.db.execute(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        title TEXT,
        modified_at INTEGER,
        content_hash TEXT
      )
    `);

    this.db.execute(`
      CREATE TABLE IF NOT EXISTS links (
        source_path TEXT,
        target_path TEXT,
        PRIMARY KEY (source_path, target_path)
      )
    `);

    this.db.execute(`
      CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_path)
    `);

    const ftsCheck = this.db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='fts'",
    );
    if (ftsCheck.rows?.length === 0) {
      this.db.execute(`
        CREATE VIRTUAL TABLE fts USING fts5(path, title, content)
      `);
    }
  }

  private ensureDb(): QuickSQLiteConnection {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async upsertFileMeta(file: FileMeta): Promise<void> {
    const db = this.ensureDb();
    db.execute(
      `INSERT OR REPLACE INTO files (path, title, modified_at, content_hash)
       VALUES (?, ?, ?, ?)`,
      [file.path, file.title, file.modifiedAt, file.contentHash],
    );
  }

  async getFileMeta(path: string): Promise<FileMeta | null> {
    const db = this.ensureDb();
    const result = db.execute(
      'SELECT path, title, modified_at, content_hash FROM files WHERE path = ?',
      [path],
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    return {
      path: row.path,
      title: row.title,
      modifiedAt: row.modified_at,
      contentHash: row.content_hash,
    };
  }

  async getAllFiles(): Promise<FileMeta[]> {
    const db = this.ensureDb();
    const result = db.execute(
      'SELECT path, title, modified_at, content_hash FROM files',
    );

    const files: FileMeta[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        files.push({
          path: row.path,
          title: row.title,
          modifiedAt: row.modified_at,
          contentHash: row.content_hash,
        });
      }
    }
    return files;
  }

  async updateLinksForFile(sourcePath: string, links: string[]): Promise<void> {
    const db = this.ensureDb();

    db.execute('BEGIN TRANSACTION');
    try {
      db.execute('DELETE FROM links WHERE source_path = ?', [sourcePath]);

      for (const targetPath of links) {
        db.execute(
          'INSERT OR IGNORE INTO links (source_path, target_path) VALUES (?, ?)',
          [sourcePath, targetPath],
        );
      }

      db.execute('COMMIT');
    } catch (error) {
      db.execute('ROLLBACK');
      throw error;
    }
  }

  async getBacklinks(targetPath: string): Promise<string[]> {
    const db = this.ensureDb();
    const result = db.execute(
      'SELECT source_path FROM links WHERE target_path = ?',
      [targetPath],
    );

    const backlinks: string[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        backlinks.push(result.rows.item(i).source_path);
      }
    }
    return backlinks;
  }

  async ftsUpsert(path: string, title: string, content: string): Promise<void> {
    const db = this.ensureDb();
    db.execute('DELETE FROM fts WHERE path = ?', [path]);
    db.execute('INSERT INTO fts (path, title, content) VALUES (?, ?, ?)', [
      path,
      title,
      content,
    ]);
  }

  async ftsSearch(query: string): Promise<SearchResult[]> {
    const db = this.ensureDb();

    const sanitizedQuery = query
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' ');

    if (!sanitizedQuery) {
      return [];
    }

    const result = db.execute(
      `SELECT path, title, snippet(fts, 2, '**', '**', '...', 32) as snippet, rank
       FROM fts
       WHERE fts MATCH ?
       ORDER BY rank
       LIMIT 50`,
      [sanitizedQuery],
    );

    const results: SearchResult[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        results.push({
          path: row.path,
          title: row.title,
          snippet: row.snippet,
          score: Math.abs(row.rank),
        });
      }
    }
    return results;
  }

  async deleteFileMeta(path: string): Promise<void> {
    const db = this.ensureDb();

    db.execute('BEGIN TRANSACTION');
    try {
      db.execute('DELETE FROM files WHERE path = ?', [path]);
      db.execute('DELETE FROM links WHERE source_path = ?', [path]);
      db.execute('DELETE FROM fts WHERE path = ?', [path]);
      db.execute('COMMIT');
    } catch (error) {
      db.execute('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const indexDB = new SQLiteIndexDB();
