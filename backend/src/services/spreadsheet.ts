import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database';

const anthropic = new Anthropic();

export interface ColumnDef {
  name: string;
  sqlType: string;
  nullable: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnDef[];
  description: string;
}

export interface ImportResult {
  tableName: string;
  schema: TableSchema;
  rowsInserted: number;
  skippedRows: number;
  errors: string[];
}

function parseSpreadsheet(filePath: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(raw[0]);
  return { headers, rows: raw };
}

function sampleRows(rows: Record<string, unknown>[], max = 10): Record<string, unknown>[] {
  return rows.slice(0, max);
}

async function inferSchema(headers: string[], sample: Record<string, unknown>[], fileName: string): Promise<TableSchema> {
  const prompt = `You are a database architect. Analyze this spreadsheet data and design a SQLite table schema.

File name: ${fileName}
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
      "nullable": true
    }
  ]
}

Rules:
- tableName must be lowercase snake_case, descriptive, and based on the file name or content
- Always include an "id INTEGER PRIMARY KEY AUTOINCREMENT" as the first column
- Map column names to snake_case
- Infer the best SQLite type from the sample values (INTEGER for whole numbers, REAL for decimals, TEXT for strings/dates)
- Set nullable: false only if every sample row has a non-empty value for that column
- Do not include any explanation — only the JSON object`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON schema');

  const schema: TableSchema = JSON.parse(jsonMatch[0]);

  // Ensure id column is first and present
  if (!schema.columns.find(c => c.name === 'id')) {
    schema.columns.unshift({ name: 'id', sqlType: 'INTEGER PRIMARY KEY AUTOINCREMENT', nullable: false });
  }

  return schema;
}

function buildCreateTableSQL(schema: TableSchema): string {
  const cols = schema.columns.map(col => {
    if (col.name === 'id') return 'id INTEGER PRIMARY KEY AUTOINCREMENT';
    const nullability = col.nullable ? '' : ' NOT NULL';
    return `${col.name} ${col.sqlType}${nullability}`;
  });
  return `CREATE TABLE IF NOT EXISTS ${schema.tableName} (\n  ${cols.join(',\n  ')}\n)`;
}

function sanitizeColumnName(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'col';
}

export async function importSpreadsheet(filePath: string, originalFileName: string): Promise<ImportResult> {
  const { headers, rows } = parseSpreadsheet(filePath);

  if (headers.length === 0) throw new Error('Spreadsheet is empty or has no headers');

  const sample = sampleRows(rows);
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const schema = await inferSchema(headers, sample, baseName);

  // Build a mapping from original header → sanitized column name (skipping id)
  const dataColumns = schema.columns.filter(c => c.name !== 'id');
  const headerToColumn: Record<string, string> = {};
  headers.forEach(h => {
    const sanitized = sanitizeColumnName(h);
    const matched = dataColumns.find(c => c.name === sanitized);
    if (matched) headerToColumn[h] = matched.name;
  });

  const ddl = buildCreateTableSQL(schema);
  db.exec(ddl);

  const colNames = dataColumns.map(c => c.name);
  const placeholders = colNames.map(() => '?').join(', ');
  const insert = db.prepare(
    `INSERT INTO ${schema.tableName} (${colNames.join(', ')}) VALUES (${placeholders})`
  );

  let rowsInserted = 0;
  let skippedRows = 0;
  const errors: string[] = [];

  const insertMany = db.transaction((dataRows: Record<string, unknown>[]) => {
    for (const row of dataRows) {
      try {
        const values = colNames.map(col => {
          const origHeader = Object.keys(headerToColumn).find(h => headerToColumn[h] === col);
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

  return { tableName: schema.tableName, schema, rowsInserted, skippedRows, errors };
}
