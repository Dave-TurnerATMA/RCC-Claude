import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnDef {
  name: string;
  sqlType: string;
  nullable: boolean;
  translatable?: boolean;
}

interface TabResult {
  tabName: string;
  tableName: string;
  description: string;
  columns: ColumnDef[];
  rowsInserted: number;
  skippedRows: number;
  errors: string[];
}

interface ImportResponse {
  success: boolean;
  fileName: string;
  tabs: TabResult[];
}

interface TableInfo {
  tableName: string;
  columns: { name: string; type: string; notnull: number; pk: number }[];
  rowCount: number;
}

interface RowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  availableTabs: string[];
}

interface ImportHistory {
  id: number;
  fileName: string;
  importedAt: string;
  tabs: { tabName: string; tableName: string; rowCount: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SqlTypeBadge({ type, translatable }: { type: string; translatable?: boolean }) {
  const color =
    type === 'INTEGER' || type.includes('INT') ? 'bg-blue-100 text-blue-700' :
    type === 'REAL' || type === 'NUMERIC' ? 'bg-purple-100 text-purple-700' :
    'bg-gray-100 text-gray-600';
  return (
    <span className="flex items-center gap-1">
      <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${color}`}>{type}</span>
      {translatable && <span title="Translated to English" className="text-xs">🌐</span>}
    </span>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-gray-300 italic text-xs">null</span>;
  const str = String(value);
  return <span className="text-xs text-gray-700 truncate max-w-xs" title={str}>{str}</span>;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onImport }: { onImport: (result: ImportResponse) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress('Uploading and analysing…');
    try {
      const result = await api.importSpreadsheet(file);
      setProgress('');
      onImport(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
        <span className="text-lg">📤</span>
        <div>
          <h2 className="font-semibold text-gray-900">Import Spreadsheet</h2>
          <p className="text-xs text-gray-500">CSV, XLSX, XLS, ODS — all tabs imported automatically</p>
        </div>
      </div>

      <div className="p-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}
            ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.ods"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="text-3xl animate-pulse">⏳</div>
              <p className="text-sm text-blue-600 font-medium">{progress}</p>
              <p className="text-xs text-gray-400">Claude is analysing column types and translating text…</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📊</div>
              <p className="font-medium text-gray-700">Drop a spreadsheet here or click to browse</p>
              <p className="text-xs text-gray-400">Supports CSV · XLSX · XLS · ODS · up to 20 MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Import Result ────────────────────────────────────────────────────────────

function ImportResult({ result, onViewTable }: { result: ImportResponse; onViewTable: (name: string) => void }) {
  const [expandedTab, setExpandedTab] = useState<string | null>(result.tabs[0]?.tableName ?? null);

  return (
    <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
      <div className="px-4 py-3 border-b bg-green-50 flex items-center gap-2">
        <span className="text-lg">✅</span>
        <div>
          <h2 className="font-semibold text-green-900">Import Complete — {result.fileName}</h2>
          <p className="text-xs text-green-700">{result.tabs.length} tab{result.tabs.length !== 1 ? 's' : ''} imported</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {result.tabs.map(tab => (
          <div key={tab.tableName}>
            <button
              onClick={() => setExpandedTab(expandedTab === tab.tableName ? null : tab.tableName)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{tab.tabName}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{tab.tableName}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{tab.description}</p>
              </div>
              <div className="flex items-center gap-3 text-right flex-shrink-0 ml-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{tab.rowsInserted.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">rows</div>
                </div>
                {tab.skippedRows > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-amber-600">{tab.skippedRows}</div>
                    <div className="text-xs text-amber-500">skipped</div>
                  </div>
                )}
                <span className="text-gray-400 text-xs">{expandedTab === tab.tableName ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedTab === tab.tableName && (
              <div className="px-4 pb-4 bg-gray-50 space-y-3">
                {/* Schema table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Column</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tab.columns.map(col => (
                        <tr key={col.name} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-800">{col.name}</td>
                          <td className="px-3 py-2">
                            <SqlTypeBadge type={col.sqlType} translatable={col.translatable} />
                          </td>
                          <td className="px-3 py-2 text-gray-500">{col.nullable ? 'yes' : 'no'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tab.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                    <p className="text-xs font-medium text-amber-700">Row errors (first {tab.errors.length}):</p>
                    {tab.errors.map((e, i) => <p key={i} className="text-xs text-amber-600">{e}</p>)}
                  </div>
                )}

                <button
                  onClick={() => onViewTable(tab.tableName)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Browse data →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Table Browser ────────────────────────────────────────────────────────────

function TableBrowser({ tables, initialTable }: { tables: TableInfo[]; initialTable?: string }) {
  const [selectedTable, setSelectedTable] = useState<string>(initialTable ?? tables[0]?.tableName ?? '');
  const [activeTab, setActiveTab] = useState<string>('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<RowsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const PAGE_SIZE = 50;

  const currentTable = tables.find(t => t.tableName === selectedTable);

  const loadRows = useCallback(async (table: string, tab: string, pageNum: number) => {
    if (!table) return;
    setLoading(true);
    try {
      const result = await api.getSpreadsheetRows(table, {
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
        tab: tab || undefined,
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    setActiveTab('');
    setData(null);
    if (selectedTable) loadRows(selectedTable, '', 0);
  }, [selectedTable, loadRows]);

  useEffect(() => {
    if (selectedTable) loadRows(selectedTable, activeTab, page);
  }, [activeTab, page, selectedTable, loadRows]);

  useEffect(() => {
    if (initialTable) setSelectedTable(initialTable);
  }, [initialTable]);

  const dataColumns = currentTable?.columns.filter(c => c.name !== 'id') ?? [];
  const rows = data?.rows ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
        <span className="text-lg">🗂️</span>
        <h2 className="font-semibold text-gray-900">Browse Tables</h2>
        <span className="text-xs text-gray-400">({tables.length} imported)</span>
      </div>

      {tables.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No imported tables yet. Upload a spreadsheet above.</div>
      ) : (
        <div className="flex flex-col">
          {/* Table selector */}
          <div className="px-4 py-3 border-b">
            <label className="text-xs font-medium text-gray-600 block mb-1">Select table</label>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {tables.map(t => (
                <option key={t.tableName} value={t.tableName}>
                  {t.tableName} ({t.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Tab filter */}
          {data && data.availableTabs.length > 1 && (
            <div className="px-4 py-2 border-b flex gap-2 flex-wrap">
              <button
                onClick={() => { setActiveTab(''); setPage(0); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                  ${!activeTab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All tabs
              </button>
              {data.availableTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setPage(0); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Schema toggle */}
          {currentTable && (
            <div className="border-b">
              <button
                onClick={() => setSchemaOpen(!schemaOpen)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50"
              >
                <span className="font-medium">Schema — {currentTable.columns.length} columns</span>
                <span>{schemaOpen ? '▲ hide' : '▼ show'}</span>
              </button>
              {schemaOpen && (
                <div className="px-4 pb-3 overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead className="text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="pb-1 text-left pr-4">Column</th>
                        <th className="pb-1 text-left pr-4">Type</th>
                        <th className="pb-1 text-left">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentTable.columns.map(col => (
                        <tr key={col.name}>
                          <td className="py-1 pr-4 font-mono text-gray-800">{col.name}</td>
                          <td className="py-1 pr-4">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded font-mono text-gray-600">{col.type}</span>
                          </td>
                          <td className="py-1 text-gray-400">{col.notnull ? 'no' : 'yes'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Data grid */}
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No rows found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {dataColumns.map(col => (
                      <th key={col.name} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                      {dataColumns.map(col => (
                        <td key={col.name} className="px-3 py-2 align-top">
                          <CellValue value={row[col.name]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-500">
              <span>
                {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0).toLocaleString()} of {data?.total.toLocaleString()} rows
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="px-2 py-1">p. {page + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Import History ───────────────────────────────────────────────────────────

function ImportHistory({ onViewTable }: { onViewTable: (name: string) => void }) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) api.getSpreadsheetImports().then(setHistory).catch(() => {});
  }, [open]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🕓</span>
          <span className="font-semibold text-gray-900">Import History</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <div className="border-t divide-y divide-gray-100">
          {history.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No imports yet.</div>
          ) : history.map(imp => (
            <div key={imp.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-sm text-gray-900">{imp.fileName}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(imp.importedAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {imp.tabs.map(t => (
                  <button
                    key={t.tableName}
                    onClick={() => onViewTable(t.tableName)}
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 text-xs px-2 py-0.5 rounded-full transition-colors"
                  >
                    <span className="font-mono">{t.tableName}</span>
                    <span className="text-gray-400">({t.rowCount.toLocaleString()})</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpreadsheetImport() {
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [jumpTable, setJumpTable] = useState<string | undefined>();

  const refreshTables = useCallback(async () => {
    try {
      const data = await api.getSpreadsheetTables();
      setTables(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshTables(); }, [refreshTables]);

  const handleImport = (result: ImportResponse) => {
    setLastResult(result);
    refreshTables();
    if (result.tabs.length > 0) setJumpTable(result.tabs[0].tableName);
  };

  const handleViewTable = (name: string) => {
    setJumpTable(name);
    // Scroll to browser
    setTimeout(() => document.getElementById('table-browser')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 sticky top-16 z-20">
        <h1 className="font-bold text-gray-900 text-lg">📊 Spreadsheet Import</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Upload any spreadsheet — all tabs imported, text auto-translated to English
        </p>
      </div>

      <div className="p-3 space-y-4 max-w-5xl mx-auto">
        <UploadZone onImport={handleImport} />

        {lastResult && (
          <ImportResult result={lastResult} onViewTable={handleViewTable} />
        )}

        <div id="table-browser">
          <TableBrowser tables={tables} initialTable={jumpTable} />
        </div>

        <ImportHistory onViewTable={handleViewTable} />
      </div>
    </div>
  );
}
