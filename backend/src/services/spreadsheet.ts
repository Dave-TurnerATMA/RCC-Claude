import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Extracts the first syntactically complete JSON object from a string by
 * tracking brace depth. This is more reliable than a greedy regex when
 * Claude adds explanatory text before or after the JSON.
 */
function extractJSON(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
    }
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnDef {
  name: string;
  sqlType: string;
  nullable: boolean;
  /** True when this column may hold non-English text that should be translated. */
  translatable?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnDef[];
  description: string;
}

export interface TabResult {
  tabName: string;
  tableName: string;
  schema: TableSchema;
  rowsInserted: number;
  skippedRows: number;
  errors: string[];
}

export interface ImportResult {
  fileName: string;
  tabs: TabResult[];
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

interface SheetData {
  tabName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

function parseSpreadsheet(filePath: string): SheetData[] {
  const workbook = XLSX.readFile(filePath);
  const results: SheetData[] = [];

  for (const tabName of workbook.SheetNames) {
    const sheet = workbook.Sheets[tabName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    if (raw.length === 0) continue;
    results.push({ tabName, headers: Object.keys(raw[0]), rows: raw });
  }

  return results;
}

// ─── Schema inference ─────────────────────────────────────────────────────────

function sampleRows(rows: Record<string, unknown>[], max = 10): Record<string, unknown>[] {
  return rows.slice(0, max);
}

async function inferSchema(
  headers: string[],
  sample: Record<string, unknown>[],
  baseName: string,
  tabName: string,
): Promise<TableSchema> {
  const prompt = `You are a database architect. Analyze this spreadsheet tab and design a SQLite table schema.

File base name: ${baseName}
Tab name: ${tabName}
Column headers: ${JSON.stringify(headers)}
Sample rows (up to 10):
${JSON.stringify(sample, null, 2)}

Respond with ONLY valid JSON matching this exact shape:
{
  "tableName": "snake_case_table_name",
  "description": "one sentence describing what this data represents",
  "columns": [
    {
      "name": "snake_case_column_name",
      "sqlType": "TEXT | INTEGER | REAL | NUMERIC | BLOB",
      "nullable": true,
      "translatable": false
    }
  ]
}

Rules:
- tableName must be lowercase snake_case, descriptive, derived from the tab name (preferred) or file name
- Always include an "id INTEGER PRIMARY KEY AUTOINCREMENT" as the first column (translatable: false)
- Map column headers to snake_case names
- Infer the best SQLite type from the sample values (INTEGER for whole numbers, REAL for decimals, TEXT for everything else)
- Set nullable: false only if every sample row has a non-empty value for that column
- Set translatable: true for TEXT columns that appear to contain natural-language text that could be in a non-English language (names, descriptions, addresses, notes, etc.)
- Set translatable: false for codes, numbers, dates, IDs, URLs, or English-only fields
- Your entire response must be the raw JSON object only — no markdown fences, no explanation, no text before or after`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';

  // Strip markdown code fences (```json ... ``` or ``` ... ```) before extracting
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  console.debug('[inferSchema] Claude raw response:', text.slice(0, 300));

  const jsonMatch = extractJSON(text);
  if (!jsonMatch) {
    console.error('[inferSchema] Full Claude response:', raw);
    throw new Error('Claude did not return valid JSON schema — check pm2 logs for the raw response');
  }

  let schema: TableSchema;
  try {
    schema = JSON.parse(jsonMatch);
  } catch (e) {
    console.error('[inferSchema] Extracted JSON that failed to parse:', jsonMatch);
    throw new Error(`Claude returned malformed JSON schema: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!schema.columns.find(c => c.name === 'id')) {
    schema.columns.unshift({ name: 'id', sqlType: 'INTEGER PRIMARY KEY AUTOINCREMENT', nullable: false, translatable: false });
  }

  // Inject source_tab and translatable _en columns into the schema
  const withMeta: ColumnDef[] = [];
  for (const col of schema.columns) {
    withMeta.push(col);
    if (col.translatable && col.name !== 'id') {
      withMeta.push({ name: `${col.name}_en`, sqlType: 'TEXT', nullable: true, translatable: false });
    }
  }
  // source_tab tracks which spreadsheet tab the row came from
  withMeta.push({ name: 'source_tab', sqlType: 'TEXT', nullable: false, translatable: false });

  schema.columns = withMeta;
  return schema;
}

// ─── DDL ──────────────────────────────────────────────────────────────────────

function buildCreateTableSQL(schema: TableSchema): string {
  const cols = schema.columns.map(col => {
    if (col.name === 'id') return 'id INTEGER PRIMARY KEY AUTOINCREMENT';
    const nullability = col.nullable ? '' : ' NOT NULL';
    return `${col.name} ${col.sqlType}${nullability}`;
  });
  return `CREATE TABLE IF NOT EXISTS ${schema.tableName} (\n  ${cols.join(',\n  ')}\n)`;
}

// ─── Translation ──────────────────────────────────────────────────────────────

/**
 * Batch-translates an array of unique strings to English in a single Claude call.
 * Uses a numbered list format to avoid JSON-escaping issues with the source values.
 * Returns a map from original value → English translation.
 */
async function batchTranslate(values: string[]): Promise<Map<string, string>> {
  if (values.length === 0) return new Map();

  // Use index-based format so special characters in values don't break JSON parsing.
  // Claude returns {"0": "translation", "1": "translation", ...}
  const numbered = values.map((v, i) => `${i}: ${v}`).join('\n');

  const prompt = `Translate each numbered text value below to English.
If a value is already in English, return it unchanged.
Respond ONLY with a JSON object where keys are the index numbers (as strings) and values are the English translations.
Example: {"0": "Hello", "1": "Goodbye"}

Text to translate:
${numbered}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = extractJSON(text);
  if (!jsonMatch) return new Map();

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(jsonMatch);
  } catch {
    // If JSON is still malformed, fall back — return originals untranslated
    console.warn('batchTranslate: failed to parse Claude response, skipping translation');
    return new Map();
  }

  const result = new Map<string, string>();
  values.forEach((original, i) => {
    const translation = parsed[String(i)];
    result.set(original, translation ?? original);
  });
  return result;
}

/**
 * For each translatable column, collect all unique non-null string values,
 * translate them in one batch, and return a cache keyed by column name.
 */
async function buildTranslationCache(
  rows: Record<string, unknown>[],
  translatableColumns: string[],
): Promise<Map<string, Map<string, string>>> {
  const cache = new Map<string, Map<string, string>>();

  for (const col of translatableColumns) {
    const unique = [...new Set(
      rows
        .map(r => r[col])
        .filter((v): v is string => typeof v === 'string' && v.trim() !== ''),
    )];
    cache.set(col, await batchTranslate(unique));
  }

  return cache;
}

// ─── Column name helpers ──────────────────────────────────────────────────────

function sanitizeColumnName(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'col';
}

// ─── Registry table ───────────────────────────────────────────────────────────

export function initSpreadsheetRegistry() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spreadsheet_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT (datetime('now')),
      tabs TEXT NOT NULL
    )
  `);
}

// ─── Per-tab import ───────────────────────────────────────────────────────────

async function importTab(
  sheet: SheetData,
  baseName: string,
  usedTableNames: Set<string>,
): Promise<TabResult> {
  const { tabName, headers, rows } = sheet;
  const sample = sampleRows(rows);
  const schema = await inferSchema(headers, sample, baseName, tabName);

  // Disambiguate if two tabs resolve to the same table name
  let finalTableName = schema.tableName;
  let suffix = 2;
  while (usedTableNames.has(finalTableName)) {
    finalTableName = `${schema.tableName}_${suffix++}`;
  }
  schema.tableName = finalTableName;
  usedTableNames.add(finalTableName);

  const ddl = buildCreateTableSQL(schema);
  db.exec(ddl);

  // Build header → column mapping (skip id, source_tab, and _en columns)
  const dataColumns = schema.columns.filter(
    c => c.name !== 'id' && c.name !== 'source_tab' && !c.name.endsWith('_en'),
  );
  const headerToColumn: Record<string, string> = {};
  headers.forEach(h => {
    const sanitized = sanitizeColumnName(h);
    const matched = dataColumns.find(c => c.name === sanitized);
    if (matched) headerToColumn[h] = matched.name;
  });

  // Identify translatable columns (using original header keys in rows)
  const translatableColNames = dataColumns
    .filter(c => c.translatable)
    .map(c => c.name);

  // Map column names back to original headers for lookup
  const colToHeader: Record<string, string> = {};
  for (const [h, col] of Object.entries(headerToColumn)) {
    colToHeader[col] = h;
  }

  // Build translation cache: keyed by column name → original value → english
  const translatableHeaderKeys = translatableColNames
    .map(col => colToHeader[col])
    .filter((h): h is string => !!h);

  // Re-key translation cache by column name for lookup during insert
  const rawCache = await buildTranslationCache(rows, translatableHeaderKeys);
  const translationCache = new Map<string, Map<string, string>>();
  for (const col of translatableColNames) {
    const header = colToHeader[col];
    if (header && rawCache.has(header)) {
      translationCache.set(col, rawCache.get(header)!);
    }
  }

  // All columns to insert (excludes id, includes source_tab and _en columns)
  const insertCols = schema.columns
    .filter(c => c.name !== 'id')
    .map(c => c.name);

  const placeholders = insertCols.map(() => '?').join(', ');
  const insert = db.prepare(
    `INSERT INTO ${schema.tableName} (${insertCols.join(', ')}) VALUES (${placeholders})`,
  );

  let rowsInserted = 0;
  let skippedRows = 0;
  const errors: string[] = [];

  const insertMany = db.transaction((dataRows: Record<string, unknown>[]) => {
    for (const row of dataRows) {
      try {
        const values = insertCols.map(col => {
          if (col === 'source_tab') return tabName;

          // _en columns get the translated value
          if (col.endsWith('_en')) {
            const baseCol = col.slice(0, -3);
            const origHeader = colToHeader[baseCol];
            const origVal = origHeader ? row[origHeader] : null;
            if (typeof origVal !== 'string' || !origVal) return null;
            return translationCache.get(baseCol)?.get(origVal) ?? origVal;
          }

          const origHeader = colToHeader[col];
          if (!origHeader) return null;
          const val = row[origHeader];
          return val === undefined ? null : val;
        });
        insert.run(values);
        rowsInserted++;
      } catch (err: unknown) {
        skippedRows++;
        if (errors.length < 10) {
          errors.push(`Row error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  });

  insertMany(rows);

  return { tabName, tableName: schema.tableName, schema, rowsInserted, skippedRows, errors };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function importSpreadsheet(filePath: string, originalFileName: string): Promise<ImportResult> {
  initSpreadsheetRegistry();

  const sheets = parseSpreadsheet(filePath);
  if (sheets.length === 0) throw new Error('Spreadsheet has no data in any tab');

  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const usedTableNames = new Set<string>();
  const tabs: TabResult[] = [];

  for (const sheet of sheets) {
    const result = await importTab(sheet, baseName, usedTableNames);
    tabs.push(result);
  }

  // Record the import in the registry
  db.prepare(
    `INSERT INTO spreadsheet_imports (file_name, tabs) VALUES (?, ?)`,
  ).run(
    originalFileName,
    JSON.stringify(tabs.map(t => ({ tabName: t.tabName, tableName: t.tableName, rowCount: t.rowsInserted }))),
  );

  return { fileName: originalFileName, tabs };
}
