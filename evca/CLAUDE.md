# EVCA Spreadsheet Analysis System

This subdirectory contains tools for analysing EVCA (Enhanced Vulnerability and Capacity Assessment) spreadsheets used by PMI (Indonesian Red Cross) and other Red Cross/Red Crescent National Societies.

## Stack
- Python 3 + openpyxl — read .xlsx cell values, fill colours, font bold, border styles
- python-docx — generate .docx output (if needed)
- SQLite — target database for generated CREATE TABLE / INSERT statements
- Output documents go in `evca/output/`
- Source spreadsheets go in `evca/data/`
- Analysis scripts go in `evca/scripts/`

---

## What This System Does

Given an EVCA `.xlsx` spreadsheet, the system:

### 1. Structural Extraction
Uses openpyxl to read each cell's:
- Value
- Fill colour (RGB hex)
- Font bold flag
- Border styles per edge (none / thin / medium / thick)

Processes one tab at a time. For each row, captures: row number, bold flag, unique fill colours, bordered flag, and non-empty cell values with column letters (truncated to ~40 chars for readability).

### 2. Block Identification
Uses colour, borders, and empty-row gaps to identify distinct data blocks:
- **Dark/accent fill** = section headings
- **Medium/thick borders** = deliberate block boundaries (table edges)
- **Light gray fill** = data entry cells
- **Empty rows** = block separators
- **Unformatted rows at sheet bottom** = drop-down reference / lookup data

For each block, classify it as:
- **Single-instance** — appears once per sheet (e.g. community info, narrative text box)
- **Repeating** — repeats over multiple rows (e.g. one row per hazard × dimension)
- **Reference data** — lookup/validation lists (drop-downs), fixed small sets of values

### 3. Translation
Translate all Indonesian block names and field names to English.
Use the context of the EVCA methodology (PMI/IFRC framework) to inform translations.

### 4. Table Generation
For each identified block, generate a `CREATE TABLE` statement using English names for the table and all columns. Estimate appropriate SQLite data types:
- `TEXT` — free-text narratives, names, labels
- `INTEGER` — counts, ordinals, boolean flags
- `REAL` — numeric scores (e.g. 0, 0.33, 0.67, 1.0)
- `DATE` — date fields
- `BOOLEAN` — signed/yes-no fields (stored as INTEGER 0/1 in SQLite)

Add `CHECK` constraints for enum columns where valid values are known.
Add `UNIQUE` constraints for natural keys.

### 5. Reference Data
If a block appears to be reference/lookup data (small fixed set of rows, typically drop-down validation lists):
- Generate `INSERT` statements to pre-populate the table with those rows.
- Mark the block as reference data in the metadata tables (see rule 6).

### 6. Foreign Keys
For non-reference blocks, link back to the first tab's primary table (which holds the village/community record) via a foreign key: `assessment_id INTEGER NOT NULL REFERENCES evca_assessments(id)`.

### 7. Metadata Tables (Critical)
Generate a set of metadata tables that record the full structural mapping of the spreadsheet. These tables serve as the basis for a future import program that can:
- Open any EVCA spreadsheet
- Check whether it matches the known structure
- Extract and load matching blocks automatically
- Report blocks that are missing or have shifted position

#### `evca_sheet_blocks`
Records each identified block of data, one row per block:

```sql
CREATE TABLE evca_sheet_blocks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    sheet_index         INTEGER NOT NULL,       -- 0-based sheet position
    sheet_name_original TEXT    NOT NULL,       -- e.g. '4. Kerentanan'
    sheet_name_english  TEXT    NOT NULL,       -- e.g. 'Vulnerability'
    block_name_original TEXT,                   -- Indonesian block heading
    block_name_english  TEXT,                   -- English translation
    table_name          TEXT,                   -- mapped database table name
    block_type          TEXT NOT NULL CHECK(block_type IN ('single','repeating','reference')),
    identification_method TEXT,                 -- e.g. 'dark-red fill #C00000 + medium border'
    cell_range_start    TEXT,                   -- e.g. 'C28'
    cell_range_end      TEXT,                   -- e.g. 'V37'
    row_start           INTEGER,
    row_end             INTEGER,
    col_start           TEXT,                   -- e.g. 'C'
    col_end             TEXT,                   -- e.g. 'V'
    is_reference_data   BOOLEAN DEFAULT FALSE,
    notes               TEXT
);
```

#### `evca_block_fields`
Records each field within each block:

```sql
CREATE TABLE evca_block_fields (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id            INTEGER NOT NULL REFERENCES evca_sheet_blocks(id),
    field_name_original TEXT    NOT NULL,       -- Indonesian column header
    field_name_english  TEXT    NOT NULL,       -- English translation
    column_letter       TEXT,                   -- spreadsheet column, e.g. 'G'
    row_number          INTEGER,                -- row where header appears
    db_column_name      TEXT,                   -- snake_case column name in target table
    db_data_type        TEXT,                   -- TEXT / INTEGER / REAL / DATE / BOOLEAN
    is_computed         BOOLEAN DEFAULT FALSE,  -- true if cell contains a formula
    valid_values        TEXT,                   -- JSON array of allowed values if known
    notes               TEXT
);
```

#### `evca_reference_data`
Records rows from reference/lookup blocks:

```sql
CREATE TABLE evca_reference_data (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id            INTEGER NOT NULL REFERENCES evca_sheet_blocks(id),
    row_number          INTEGER NOT NULL,       -- original spreadsheet row
    value_original      TEXT,                   -- Indonesian value
    value_english       TEXT,                   -- English translation
    numeric_value       REAL,                   -- if the reference data includes a numeric code
    display_order       INTEGER
);
```

---

## Output Files

For each analysed spreadsheet, produce in `evca/output/`:

1. **`<filename>_analysis.md`** — human-readable analysis document, one section per sheet, with CREATE TABLE statements and example data
2. **`<filename>_schema.sql`** — all CREATE TABLE statements for the data tables
3. **`<filename>_metadata.sql`** — CREATE TABLE + INSERT statements for the three metadata tables above, pre-populated with the block/field mapping discovered
4. **`<filename>_reference.sql`** — INSERT statements for all reference data tables

---

## Reference Spreadsheet

The first spreadsheet analysed was `EVCA_Desa_Para_Lando.xlsx` (10 sheets, PMI Indonesia).
The full analysis is in `evca/output/EVCA_Analysis.md`.
The 14 proposed data tables are documented there.

Key characteristics of the EVCA format:
- Sheet 1: Assessment/village metadata (top-level record)
- Sheets 2–6: Input data (population, hazards, vulnerability, capacity, social dimensions)
- Sheet 7: Calculated risk ratings (derived from sheets 4–6)
- Sheet 8: Consolidated analysis narratives
- Sheet 9: Action plan with validation signatures
- Sheet 10: Activity priority scoring matrix
- Colour scheme: Red title bar, teal section frames, dark-red (#C00000) filled hazard blocks, gray column headers, light-gray data entry cells
- Drop-down reference lists appear as unformatted rows at the bottom of the sheet they apply to

---

## Workflow Summary

```
Upload .xlsx
    → Run extraction script (openpyxl, one sheet at a time)
    → Identify blocks by colour + border + empty-row gaps
    → Classify each block (single / repeating / reference)
    → Translate names (Indonesian → English)
    → Generate CREATE TABLE statements
    → Generate INSERT statements for reference blocks
    → Generate metadata INSERT statements (evca_sheet_blocks, evca_block_fields, evca_reference_data)
    → Write output files to evca/output/
```
