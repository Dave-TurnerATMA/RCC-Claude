#!/usr/bin/env python3
"""
validate_blocks.py — Verify EVCA spreadsheet structure against metadata.sql

For each block in evca_sheet_blocks:
  - Goes directly to the known fixed row position (no structural scanning)
  - Checks the anchor cell and specific block_field cells
  - For reference blocks: counts non-empty rows vs expected
  - Per-hazard repeating blocks: checks the first and last data rows
    of the actual-data column (not the dimension-label column)

PASS  = data found at the expected position
EMPTY = no data, but expected (H3 block in a 2-hazard assessment)
WARN! = missing or unexpected data

Usage (from repo root):
    python3 evca/scripts/validate_blocks.py
"""

import sqlite3
import os
import sys
from openpyxl import load_workbook
from openpyxl.utils import column_index_from_string

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR  = os.path.dirname(SCRIPT_DIR)
METADATA_SQL = os.path.join(PROJECT_DIR, 'output', 'metadata.sql')
SPREADSHEET  = os.path.join(PROJECT_DIR, 'data', 'EVCA_Desa_Para_Lando.xlsx')

EXCEL_ERRORS = frozenset({
    '#N/A', '#REF!', '#VALUE!', '#DIV/0!', '#NULL!', '#NAME?', '#NUM!'
})

# Per-hazard repeating blocks: the column holding actual entered/computed data
# (col C always has static dimension labels and is not a useful data-presence check)
HAZARD_DATA_COL = {
    22: 'G',   # Tab 5 H1 capacity — capacity_description
    23: 'G',   # Tab 5 H2 capacity — capacity_description
    24: 'G',   # Tab 5 H3 capacity — expected empty in Para Lando
    29: 'M',   # Tab 7 H1 risk     — risk_label
    30: 'M',   # Tab 7 H2 risk     — risk_label
    31: 'M',   # Tab 7 H3 risk     — dims 1-8 empty; dims 9-11 carry social ratings
}


# ── helpers ──────────────────────────────────────────────────────────────────

def load_metadata(path):
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    with open(path, encoding='utf-8') as f:
        conn.executescript(f.read())
    return conn


def cell_val(ws, col_letter, row_num):
    """Return raw cell value, or None if blank/error."""
    col = column_index_from_string(col_letter)
    v = ws.cell(row=row_num, column=col).value
    if v is None:
        return None
    s = str(v).strip()
    return None if (not s or s in EXCEL_ERRORS) else v


def count_nonempty_in_col(ws, col_letter, row_start, row_end):
    col = column_index_from_string(col_letter)
    n = 0
    for r in range(row_start, row_end + 1):
        v = ws.cell(row=r, column=col).value
        if v is not None:
            s = str(v).strip()
            if s and s not in EXCEL_ERRORS:
                n += 1
    return n


def preview(val, width=28):
    s = str(val)
    return s[:width] + '…' if len(s) > width else s


# ── main validator ────────────────────────────────────────────────────────────

def validate_block(block, ws, conn):
    """Returns (status, details_list).  status ∈ {'PASS', 'WARN!', 'EMPTY'}."""
    bid       = block['id']
    col_start = block['col_start']
    row_start = block['row_start']
    row_end   = block['row_end']
    btype     = block['block_type']
    bname     = block['block_name_english'] or block['block_name_original'] or ''
    is_h3     = 'Hazard 3' in bname

    details = []

    # ── Reference block: count populated rows vs expected ─────────────────
    if btype == 'reference':
        expected = conn.execute(
            'SELECT COUNT(*) FROM evca_reference_data WHERE block_id=?', (bid,)
        ).fetchone()[0]
        actual = count_nonempty_in_col(ws, col_start, row_start, row_end)
        details.append(f'ref rows: {actual}/{expected}')
        if actual == 0:
            return 'EMPTY', details
        return ('WARN!' if actual < expected else 'PASS'), details

    # ── Per-hazard repeating block: check data column at first + last row ──
    if bid in HAZARD_DATA_COL:
        dc = HAZARD_DATA_COL[bid]
        details.append(f'[fixed rows {row_start}–{row_end}]')

        first = cell_val(ws, dc, row_start)
        last  = cell_val(ws, dc, row_end)

        if first is not None:
            details.append(f'{dc}{row_start}="{preview(first)}"')
            return 'PASS', details

        if last is not None:
            # H3 risk block: dims 1-8 are #N/A but dims 9-11 carry social ratings
            details.append(f'{dc}{row_start}=empty  {dc}{row_end}="{preview(last)}" (social dims only)')
            return 'PASS', details

        if is_h3:
            details.append(f'{dc}{row_start}..{row_end}=all empty (expected — 2-hazard assessment)')
            return 'EMPTY', details

        details.append(f'{dc}{row_start}..{row_end}=all empty')
        return 'WARN!', details

    # ── All other blocks: anchor cell + known block_field cells ───────────
    anchor = cell_val(ws, col_start, row_start)
    details.append(f'anchor {col_start}{row_start}={"OK" if anchor else "empty"}')

    fields = conn.execute(
        '''SELECT field_name_english, column_letter, row_number
           FROM evca_block_fields
           WHERE block_id=? AND column_letter IS NOT NULL AND row_number IS NOT NULL''',
        (bid,)
    ).fetchall()

    hits = sum(
        1 for f in fields
        if cell_val(ws, f['column_letter'], f['row_number']) is not None
    )
    if fields:
        details.append(f'fields {hits}/{len(fields)}')

    if anchor is not None or hits > 0:
        return 'PASS', details

    if is_h3:
        details.append('expected empty')
        return 'EMPTY', details
    return 'WARN!', details


# ── report ────────────────────────────────────────────────────────────────────

def main():
    for path, label in [(METADATA_SQL, 'metadata.sql'), (SPREADSHEET, 'spreadsheet')]:
        if not os.path.exists(path):
            print(f'ERROR: {label} not found: {path}', file=sys.stderr)
            sys.exit(1)

    print(f'Metadata : {METADATA_SQL}')
    print(f'Workbook : {SPREADSHEET}')

    conn   = load_metadata(METADATA_SQL)
    wb     = load_workbook(SPREADSHEET, data_only=True)
    sheets = wb.worksheets
    blocks = conn.execute('SELECT * FROM evca_sheet_blocks ORDER BY id').fetchall()

    counts     = {'PASS': 0, 'WARN!': 0, 'EMPTY': 0}
    cur_sheet  = None

    print()
    print('=' * 76)
    print('Block Validation — EVCA_Desa_Para_Lando.xlsx  vs  metadata.sql')
    print('=' * 76)

    for block in blocks:
        si = block['sheet_index']
        if si != cur_sheet:
            cur_sheet = si
            ws = sheets[si]
            print()
            sname = f'{block["sheet_name_original"]}  ({block["sheet_name_english"]})'
            print(f'  Sheet {si}  {sname}')
            print(f'  {"─" * 68}')

        status, detail_list = validate_block(block, ws, conn)
        counts[status] += 1

        bname  = block['block_name_english'] or block['block_name_original'] or f'(block {block["id"]})'
        tname  = block['table_name'] or ''
        icon   = {'PASS': 'PASS ', 'WARN!': 'WARN!', 'EMPTY': 'EMPTY'}[status]
        rng    = f'{block["cell_range_start"]}:{block["cell_range_end"]}'

        print(f'  [{icon}] #{block["id"]:02d}  {bname}')
        print(f'         table={tname:<36s} range={rng}')
        if detail_list:
            print(f'         {" | ".join(detail_list)}')

    wb.close()
    conn.close()

    total = sum(counts.values())
    print()
    print('=' * 76)
    print(f'  PASS {counts["PASS"]}  |  WARN {counts["WARN!"]}  |  EMPTY {counts["EMPTY"]}  |  Total {total}')
    print('=' * 76)

    sys.exit(1 if counts['WARN!'] > 0 else 0)


if __name__ == '__main__':
    main()
