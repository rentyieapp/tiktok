import { createRequire } from 'node:module';
import type { Client, QueryResult } from 'pg';

const require = createRequire(import.meta.url);
const pg = require('pg') as typeof import('pg');
const ClientCtor = pg.Client;
const deasync = require('deasync') as { loopWhile: (predicate: () => boolean) => void };

export interface Statement<Row = Record<string, unknown>> {
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number };
  get: (...params: unknown[]) => Row | undefined;
  all: (...params: unknown[]) => Row[];
}

export interface SyncDatabase {
  prepare<Row = Record<string, unknown>>(sql: string): Statement<Row>;
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
  pragma(statement: string, options?: { simple?: boolean }): unknown;
}

function convertPlaceholders(sql: string): string {
  let index = 0;
  let output = '';
  let quote: string | null = null;
  for (let position = 0; position < sql.length; position += 1) {
    const char = sql[position]!;
    if (quote) {
      output += char;
      if (char === quote && sql[position - 1] !== '\\') quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      output += char;
      continue;
    }
    if (char === '?') {
      index += 1;
      output += `$${index}`;
      continue;
    }
    output += char;
  }
  return output;
}

function convertSql(sql: string): string {
  let converted = sql;
  if (/^\s*INSERT\s+OR\s+IGNORE/i.test(converted)) {
    converted = converted.replace(/^\s*INSERT\s+OR\s+IGNORE/i, 'INSERT');
    if (!/\bON\s+CONFLICT\b/i.test(converted)) converted = `${converted.trimEnd()} ON CONFLICT DO NOTHING`;
  }
  return convertPlaceholders(converted);
}

function waitForCallback<T>(
  run: (callback: (error: Error | null, value: T) => void) => void,
): T {
  let done = false;
  let value: T;
  let error: Error | null = null;
  run((caught, result) => {
    error = caught;
    value = result;
    done = true;
  });
  deasync.loopWhile(() => !done);
  if (error) throw error;
  return value!;
}

export class PostgresDatabase implements SyncDatabase {
  private client: Client;
  private txDepth = 0;

  constructor(connectionString: string) {
    this.client = new ClientCtor({
      connectionString,
      connectionTimeoutMillis: 15_000,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    waitForCallback<void>((callback) => {
      this.client.connect((error: Error | undefined) => callback(error ?? null, undefined));
    });
    waitForCallback<QueryResult>((callback) =>
      this.client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
        callback,
      ),
    );
  }

  private query(sql: string, params: unknown[]): QueryResult {
    const text = convertSql(sql);
    return waitForCallback<QueryResult>((callback) => this.client.query(text, params, callback));
  }

  prepare<Row = any>(sql: string): Statement<Row> {
    return {
      run: (...params: unknown[]) => {
        const result = this.query(sql, params);
        return { changes: result.rowCount ?? 0, lastInsertRowid: 0 };
      },
      get: (...params: unknown[]) => this.query(sql, params).rows[0] as Row | undefined,
      all: (...params: unknown[]) => this.query(sql, params).rows as Row[],
    };
  }

  exec(sql: string): void {
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) this.query(statement, []);
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      const outer = this.txDepth === 0;
      const savepoint = `sp_${this.txDepth + 1}`;
      if (outer) this.query('BEGIN', []);
      else this.query(`SAVEPOINT ${savepoint}`, []);
      this.txDepth += 1;
      try {
        const result = fn();
        this.txDepth -= 1;
        if (outer) this.query('COMMIT', []);
        else this.query(`RELEASE SAVEPOINT ${savepoint}`, []);
        return result;
      } catch (error) {
        this.txDepth = Math.max(0, this.txDepth - 1);
        if (outer) this.query('ROLLBACK', []);
        else this.query(`ROLLBACK TO SAVEPOINT ${savepoint}`, []);
        throw error;
      }
    };
  }

  pragma(statement: string, options?: { simple?: boolean }): unknown {
    const normalized = statement.trim().toLowerCase();
    if (normalized.startsWith('user_version')) {
      const match = normalized.match(/user_version\s*=\s*(\d+)/);
      if (match) {
        this.query(
          'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [Number(match[1]), new Date().toISOString()],
        );
        return Number(match[1]);
      }
      const result = this.query('SELECT MAX(version) AS version FROM schema_migrations', []);
      const version = Number((result.rows[0] as { version?: number } | undefined)?.version ?? 0);
      return options?.simple ? version : [{ user_version: version }];
    }
    return options?.simple ? 0 : [];
  }

  close(): void {
    try {
      waitForCallback<void>((callback) => this.client.end(() => callback(null, undefined as void)));
    } catch {
      /* yoksay */
    }
  }
}
