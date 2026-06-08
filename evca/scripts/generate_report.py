#!/usr/bin/env python3
"""generate_report.py — Extract EVCA spreadsheet data → 10-tab HTML report."""

import sqlite3
import os
import sys
from html import escape as esc
from openpyxl import load_workbook
from openpyxl.utils import column_index_from_string, get_column_letter

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR  = os.path.dirname(SCRIPT_DIR)
METADATA_SQL = os.path.join(PROJECT_DIR, 'output', 'metadata.sql')
SPREADSHEET  = os.path.join(PROJECT_DIR, 'data', 'EVCA_Desa_Para_Lando.xlsx')
OUTPUT_HTML  = os.path.join(PROJECT_DIR, 'output', 'EVCA_Report.html')

EXCEL_ERRORS = frozenset({'#N/A', '#REF!', '#VALUE!', '#DIV/0!', '#NULL!', '#NAME?', '#NUM!'})

RATING_BG = {
    'HIGH': '#c0392b',     'TINGGI': '#c0392b',
    'MODERATE': '#d68910', 'SEDANG': '#d68910',
    'LOW': '#1e8449',      'RENDAH': '#1e8449',
    'NONE': '#7f8c8d',     'TIDAK ADA': '#7f8c8d',
}


# ── cell helpers ─────────────────────────────────────────────────────────────

def cv(ws, col, row):
    """Clean cell value — returns None for blank/error."""
    v = ws.cell(row=row, column=column_index_from_string(col)).value
    if v is None:
        return None
    s = str(v).strip()
    return None if (not s or s in EXCEL_ERRORS) else v


def fmt(val):
    """HTML-safe display of a value."""
    if val is None:
        return '<em class="na">—</em>'
    s = str(val).strip()
    if not s:
        return '<em class="na">—</em>'
    return esc(s).replace('\n', '<br>')


def strip_pfx(val):
    """Strip 'Label: ' prefix from Tab 1 embedded-label cells."""
    if val is None:
        return None
    s = str(val).strip()
    return (s.split(':', 1)[1].strip() if ':' in s else s) or None


def badge(val):
    """Colored badge span for rating labels."""
    if val is None:
        return '<em class="na">—</em>'
    s = str(val).strip()
    upper = s.upper()
    bg = next((c for k, c in RATING_BG.items() if k in upper), None)
    if bg:
        return f'<span class="badge" style="background:{bg}">{esc(s)}</span>'
    return esc(s)


# ── HTML component helpers ────────────────────────────────────────────────────

def card(title, hint, body):
    h = f' <small>({esc(hint)})</small>' if hint else ''
    return (
        f'<div class="card">'
        f'<h3>{esc(title)}{h}</h3>'
        f'<div class="body">{body}</div>'
        f'</div>'
    )


def kv(pairs):
    rows = ''.join(
        f'<tr><th>{esc(str(k))}</th><td>{v}</td></tr>'
        for k, v in pairs
    )
    return f'<table class="kv">{rows}</table>'


def dtable(headers, rows):
    th = ''.join(f'<th>{esc(h)}</th>' for h in headers)
    tr = ''.join(
        '<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>'
        for r in rows
    )
    return f'<div class="scroll"><table class="dt"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def load_meta(path):
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    with open(path, encoding='utf-8') as f:
        conn.executescript(f.read())
    return conn


# ── Tab 1: Summary ────────────────────────────────────────────────────────────

def tab1(ws, conn, hn):
    out = []

    # Block 1 — General Information (embedded label prefix)
    pairs = [
        (f['field_name_english'], fmt(strip_pfx(cv(ws, f['column_letter'], f['row_number']))))
        for f in conn.execute(
            'SELECT field_name_english, column_letter, row_number '
            'FROM evca_block_fields WHERE block_id=1 ORDER BY row_number, column_letter'
        ).fetchall()
    ]
    out.append(card('General Information', 'evca_assessments', kv(pairs)))

    # Block 2 — Assessment Selection Narrative
    out.append(card('Assessment Selection Narrative', 'evca_assessments',
                    f'<p class="narr">{fmt(cv(ws, "C", 24))}</p>'))

    # Block 3 — Risk Pattern Summary (11 dims × 3 hazards)
    # H1 rows 41-51, H2 rows 55-65, H3 rows 69-79; rating col E
    risk_rows = [
        [fmt(cv(ws, 'C', r)), badge(cv(ws, 'E', r)), badge(cv(ws, 'E', r + 14)), badge(cv(ws, 'E', r + 28))]
        for r in range(41, 52)
    ]
    out.append(card('Risk Pattern Summary', 'evca_risk_summary',
                    dtable(['Dimension', f'H1: {hn[0]}', f'H2: {hn[1]}', 'H3'], risk_rows)))

    return out


# ── Tab 2: Background ─────────────────────────────────────────────────────────

def tab2(ws, conn, hn):
    out = []

    # Block 5 — Community Description
    out.append(card('Community Description', 'evca_community_context',
                    f'<p class="narr">{fmt(cv(ws, "C", 13))}</p>'))

    # Block 6 — Population Table
    # Cols: E/F/G = 0-5 M/F/T, I/J/K = 6-17, M/N/O = 18-65, Q/R/S = 66+, U/V/W = Total
    age_cols = ['E', 'F', 'G', 'I', 'J', 'K', 'M', 'N', 'O', 'Q', 'R', 'S', 'U', 'V', 'W']
    pop_hdrs = ['Category',
                '0–5 M', '0–5 F', '0–5 T',
                '6–17 M', '6–17 F', '6–17 T',
                '18–65 M', '18–65 F', '18–65 T',
                '66+ M', '66+ F', '66+ T',
                'Total M', 'Total F', 'Grand T']
    pop_rows = [
        ['Population'] + [fmt(cv(ws, c, 20)) for c in age_cols],
        ['Disability'] + [fmt(cv(ws, c, 24)) for c in age_cols],
    ]
    participants = kv([
        ('eVCA Participants (M)', fmt(cv(ws, 'U', 26))),
        ('eVCA Participants (F)', fmt(cv(ws, 'V', 26))),
    ])
    out.append(card('Population Table', 'evca_population',
                    dtable(pop_hdrs, pop_rows) + participants))

    # Block 7 — Community Context
    ctx = [
        (f['field_name_english'], fmt(cv(ws, f['column_letter'], f['row_number'])))
        for f in conn.execute(
            'SELECT field_name_english, column_letter, row_number '
            'FROM evca_block_fields WHERE block_id=7 ORDER BY row_number, column_letter'
        ).fetchall()
    ]
    out.append(card('Community Context', 'evca_community_context', kv(ctx)))

    # Block 8 — Assessment Process Narrative
    out.append(card('Assessment Process Narrative', 'evca_community_context',
                    f'<p class="narr">{fmt(cv(ws, "C", 42))}</p>'))

    return out


# ── Tab 3: Priority Hazards ───────────────────────────────────────────────────

def tab3(ws, conn, hn):
    out = []

    # Block 13 — Selection rationale
    out.append(card('Hazard Selection Rationale', 'evca_assessments',
                    f'<p class="narr">{fmt(cv(ws, "C", 14))}</p>'))

    # Block 14 — Hazard data (H1+H2 side-by-side, H3 below)
    # H1: col E at rows 18/20/22/24/26/28/30
    # H2: col O at same rows
    # H3: col E at rows 34/36/38/40/42/44/46
    field_labels = [f['field_name_english'] for f in conn.execute(
        'SELECT field_name_english FROM evca_block_fields WHERE block_id=14 ORDER BY row_number'
    ).fetchall()]
    h1_rows = [18, 20, 22, 24, 26, 28, 30]
    h3_rows = [34, 36, 38, 40, 42, 44, 46]
    hazard_rows = [
        [esc(lbl),
         fmt(cv(ws, 'E', h1_rows[i])),
         fmt(cv(ws, 'O', h1_rows[i])),
         fmt(cv(ws, 'E', h3_rows[i]))]
        for i, lbl in enumerate(field_labels)
    ]
    out.append(card('Hazard Data', 'evca_hazards',
                    dtable(['Field', f'H1: {hn[0]}', f'H2: {hn[1]}', 'H3'], hazard_rows)))

    # Block 15 — Priority hazard count
    out.append(card('Priority Hazard Count', 'evca_assessments',
                    kv([('Priority hazard count', fmt(cv(ws, 'V', 48)))])))

    return out


# ── Tab 4: Vulnerability ──────────────────────────────────────────────────────

def tab4(ws, conn, hn):
    out = []

    # Block 17 — Overview
    out.append(card('Vulnerability Overview', 'evca_assessments',
                    f'<p class="narr">{fmt(cv(ws, "C", 12))}</p>'))

    # Block 18 — Vulnerable groups (rows 16/18/20/22; even rows are spacers)
    vg_rows = [
        [fmt(cv(ws, 'E', r)), fmt(cv(ws, 'O', r))]
        for r in [16, 18, 20, 22]
        if cv(ws, 'E', r)
    ]
    out.append(card('Vulnerable Groups', 'evca_vulnerable_groups',
                    dtable(['Group Name', 'Vulnerability Reasons'], vg_rows)))

    # Block 19 — Vulnerability ratings: H1 rows 29-36, H2 43-50, H3 57-64
    vr_hdrs = ['Dimension', 'Impact Description', 'Vulnerability Aspects', 'Rating', 'Value']
    for h_name, r_start, r_end in [(hn[0], 29, 36), (hn[1], 43, 50), ('Hazard 3', 57, 64)]:
        vr_rows = [
            [fmt(cv(ws, 'C', r)), fmt(cv(ws, 'G', r)), fmt(cv(ws, 'M', r)),
             badge(cv(ws, 'S', r)), fmt(cv(ws, 'V', r))]
            for r in range(r_start, r_end + 1)
            if cv(ws, 'C', r)
        ]
        if vr_rows:
            out.append(card(f'Vulnerability Ratings — {h_name}', 'evca_vulnerability_ratings',
                            dtable(vr_hdrs, vr_rows)))

    return out


# ── Tab 5: Capacity ───────────────────────────────────────────────────────────

def tab5(ws, conn, hn):
    out = []

    # Block 21 — Overall capacity summary
    out.append(card('Overall Capacity Summary', 'evca_assessments',
                    f'<p class="narr">{fmt(cv(ws, "C", 14))}</p>'))

    # Blocks 22/23/24 — per-hazard capacity ratings
    # H1 data rows 19-28, H2 33-42, H3 47-56; cols C/G/M/P
    cap_hdrs = ['Dimension', 'Capacity Description', 'Rating', 'Value']
    for h_name, r_start, r_end in [(hn[0], 19, 28), (hn[1], 33, 42), ('Hazard 3', 47, 56)]:
        cap_rows = [
            [fmt(cv(ws, 'C', r)), fmt(cv(ws, 'G', r)),
             badge(cv(ws, 'M', r)), fmt(cv(ws, 'P', r))]
            for r in range(r_start, r_end + 1)
            if cv(ws, 'C', r)
        ]
        if cap_rows:
            out.append(card(f'Capacity Ratings — {h_name}', 'evca_capacity_ratings',
                            dtable(cap_hdrs, cap_rows)))
        else:
            out.append(card(f'Capacity Ratings — {h_name}', 'evca_capacity_ratings',
                            '<p class="empty">No data (hazard not assessed)</p>'))

    return out


# ── Tab 6: Social Cohesion / Inclusion / Connectedness ───────────────────────

def tab6(ws, conn, hn):
    out = []

    # Block 26 — Narrative
    out.append(card('Overall Resilience Dimensions Narrative', 'evca_assessments',
                    f'<p class="narr">{fmt(cv(ws, "C", 12))}</p>'))

    # Block 27 — Social ratings rows 16-18; cols C/G/S/T
    soc_hdrs = ['Dimension', 'Description', 'Rating', 'Value']
    soc_rows = [
        [fmt(cv(ws, 'C', r)), fmt(cv(ws, 'G', r)),
         badge(cv(ws, 'S', r)), fmt(cv(ws, 'T', r))]
        for r in [16, 17, 18]
        if cv(ws, 'C', r)
    ]
    out.append(card('Social Cohesion, Inclusion & Connectedness', 'evca_social_dimensions',
                    dtable(soc_hdrs, soc_rows)))

    return out


# ── Tab 7: Risk ───────────────────────────────────────────────────────────────

def tab7(ws, conn, hn):
    out = []

    # Blocks 29/30/31 — risk ratings per hazard; cols C/H/J/M
    # H1 rows 15-25, H2 30-40, H3 45-55
    risk_hdrs = ['Dimension', 'Vulnerability', 'Capacity', 'Risk Rating']
    for h_name, r_start, r_end in [(hn[0], 15, 25), (hn[1], 30, 40), ('Hazard 3', 45, 55)]:
        risk_rows = [
            [fmt(cv(ws, 'C', r)), fmt(cv(ws, 'H', r)),
             fmt(cv(ws, 'J', r)), badge(cv(ws, 'M', r))]
            for r in range(r_start, r_end + 1)
            if cv(ws, 'C', r)
        ]
        if risk_rows:
            out.append(card(f'Risk Ratings — {h_name}', 'evca_risk_ratings',
                            dtable(risk_hdrs, risk_rows)))
        else:
            out.append(card(f'Risk Ratings — {h_name}', 'evca_risk_ratings',
                            '<p class="empty">No data</p>'))

    return out


# ── Tab 8: Analysis ───────────────────────────────────────────────────────────

def tab8(ws, conn, hn):
    out = []

    # Block 32 — Risk Consolidation Table
    # Col C = hazard name (first row of group only, merged), G = consolidated dim,
    # J = vuln aspects, L = cap aspects, N = key risk summary
    an_hdrs = ['Hazard', 'Consolidated Dimension',
               'Vulnerability Aspects', 'Capacity Aspects', 'Key Risk Summary']
    an_rows = []
    cur_haz = None
    for r in range(14, 28):
        raw_c = cv(ws, 'C', r)
        if raw_c:
            cur_haz = str(raw_c).strip()
        dim = cv(ws, 'G', r)
        if not dim:
            continue
        an_rows.append([
            esc(cur_haz) if cur_haz else '',
            fmt(dim),
            fmt(cv(ws, 'J', r)),
            fmt(cv(ws, 'L', r)),
            fmt(cv(ws, 'N', r)),
        ])
    out.append(card('Risk Consolidation Table', 'evca_risk_analysis',
                    dtable(an_hdrs, an_rows)))

    # Block 33 — Overall Risk Narrative
    out.append(card('Overall Risk Narrative', 'evca_overall_analysis',
                    f'<p class="narr">{fmt(cv(ws, "C", 30))}</p>'))

    return out


# ── Tab 9: Action Plan ────────────────────────────────────────────────────────

def tab9(ws, conn, hn):
    out = []

    # Block 35 — Action items; odd rows 13,15,17,19,21,23,25; stop at first empty C
    ai_hdrs = ['#', 'Priority Risk', 'Desired Outcome', 'Priority Activities',
               'Required Resources', 'Tech Support', 'Schedule', 'Responsible Party']
    ai_rows = []
    for i, r in enumerate([13, 15, 17, 19, 21, 23, 25], start=1):
        if not cv(ws, 'C', r):
            break
        ai_rows.append([
            str(i),
            fmt(cv(ws, 'C', r)), fmt(cv(ws, 'E', r)), fmt(cv(ws, 'G', r)),
            fmt(cv(ws, 'I', r)), fmt(cv(ws, 'K', r)),
            fmt(cv(ws, 'M', r)), fmt(cv(ws, 'O', r)),
        ])
    out.append(card('Action Plan Items', 'evca_action_items',
                    dtable(ai_hdrs, ai_rows)))

    # Block 36 — Validation signatures
    out.append(card('Action Plan Validation', 'evca_action_validation', kv([
        ('Community Representative', fmt(cv(ws, 'C', 36))),
        ('BPBD Representative',      fmt(cv(ws, 'E', 36))),
        ('Village Representative',   fmt(cv(ws, 'G', 36))),
        ('PMI Rep (Kab/Kota)',       fmt(cv(ws, 'I', 36))),
    ])))

    return out


# ── Tab 10: Priority Scoring Matrix ──────────────────────────────────────────

def tab10(ws, conn, hn):
    out = []

    # Block 37 — Column-major layout
    # Activity names row 2, cols C-T (up to 18 activities)
    # Criteria labels col B rows 4-11; scores at intersections; totals row 12
    criteria = [cv(ws, 'B', r) or f'Criterion {r - 3}' for r in range(4, 12)]

    activities = []
    for col_idx in range(3, 21):                        # C=3 .. T=20
        col = get_column_letter(col_idx)
        name = cv(ws, col, 2)
        if not name:
            continue
        scores = [cv(ws, col, r) for r in range(4, 12)]
        total  = cv(ws, col, 12)
        activities.append((str(name), scores, total))

    if not activities:
        out.append(card('Priority Scoring Matrix', 'evca_priority_scores_flat',
                        '<p class="empty">No activities found</p>'))
        return out

    # Criteria as rows, activities as columns
    headers = ['Criterion'] + [a[0] for a in activities]
    rows = [
        [esc(str(crit))] + [fmt(a[1][i]) for a in activities]
        for i, crit in enumerate(criteria)
    ]
    rows.append(['<strong>Total</strong>'] + [f'<strong>{fmt(a[2])}</strong>' for a in activities])

    out.append(card('Priority Scoring Matrix', 'evca_priority_scores_flat',
                    dtable(headers, rows)))

    return out


# ── HTML template ─────────────────────────────────────────────────────────────

CSS = """\
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;background:#f4f6f7;color:#2c3e50}
h1{background:#c0392b;color:#fff;padding:14px 20px;font-size:18px}
h1 small{font-size:12px;opacity:.8;margin-left:10px;font-weight:normal}
nav{display:flex;flex-wrap:wrap;background:#2c3e50;gap:1px}
nav button{padding:9px 15px;background:none;border:none;color:#aaa;cursor:pointer;font-size:12px;white-space:nowrap}
nav button:hover{background:#34495e;color:#fff}
nav button.on{background:#c0392b;color:#fff;font-weight:bold}
.tab{display:none;padding:16px 20px}
.tab.on{display:block}
.card{background:#fff;border:1px solid #dde;border-radius:4px;margin-bottom:14px;overflow:hidden}
.card h3{padding:8px 12px;background:#ecf0f1;border-bottom:1px solid #dde;font-size:13px}
.card h3 small{font-size:11px;color:#7f8c8d;font-weight:normal}
.body{padding:10px 12px 12px}
.scroll{overflow-x:auto}
table.kv{border-collapse:collapse;width:100%;margin-bottom:6px}
table.kv th{background:#f9f9f9;border:1px solid #e0e0e0;padding:5px 10px;width:220px;font-weight:600;font-size:12px;text-align:left;vertical-align:top}
table.kv td{border:1px solid #e0e0e0;padding:5px 10px}
table.dt{border-collapse:collapse;width:100%;font-size:12px}
table.dt th{background:#2c3e50;color:#fff;padding:6px 8px;text-align:left;white-space:nowrap}
table.dt td{border:1px solid #e0e0e0;padding:4px 7px;vertical-align:top}
table.dt tbody tr:nth-child(even){background:#f9f9f9}
p.narr{font-style:italic;color:#555;line-height:1.65;padding:2px 0}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;color:#fff;font-size:11px;font-weight:bold}
em.na{color:#bbb;font-style:normal}
p.empty{color:#aaa;font-style:italic}
"""

JS = """\
function show(n){
  document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('on',i==n));
  document.querySelectorAll('.tab').forEach((d,i)=>d.classList.toggle('on',i==n));
}
"""


def render_html(tabs_data):
    btns = []
    for i, (t, _) in enumerate(tabs_data):
        cls = ' class="on"' if i == 0 else ''
        btns.append(f'<button onclick="show({i})"{cls}>{esc(t)}</button>')
    btns = ''.join(btns)

    tab_sections = []
    for i, (_, secs) in enumerate(tabs_data):
        active = ' on' if i == 0 else ''
        content = ''.join(secs)
        tab_sections.append(f'<section class="tab{active}" id="t{i}">{content}</section>')
    tabs = ''.join(tab_sections)
    return (
        '<!DOCTYPE html><html lang="en">\n'
        '<head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>EVCA Report — Desa Para Lando</title>'
        f'<style>{CSS}</style></head>\n'
        '<body>'
        '<h1>EVCA Report <small>Desa Para Lando — EVCA_Desa_Para_Lando.xlsx</small></h1>'
        f'<nav>{btns}</nav>'
        f'{tabs}'
        f'<script>{JS}</script>'
        '</body></html>\n'
    )


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    for path, label in [(METADATA_SQL, 'metadata.sql'), (SPREADSHEET, 'spreadsheet')]:
        if not os.path.exists(path):
            sys.exit(f'ERROR: {label} not found: {path}')

    print(f'Metadata : {METADATA_SQL}')
    print(f'Workbook : {SPREADSHEET}')

    conn = load_meta(METADATA_SQL)

    wb = load_workbook(SPREADSHEET, data_only=True)
    sheets = wb.worksheets

    # Read canonical hazard names from Tab 3 col AA
    ws3 = sheets[2]
    h1 = cv(ws3, 'AA', 2) or 'Hazard 1'
    h2 = cv(ws3, 'AA', 3) or 'Hazard 2'
    hazard_names = (h1, h2, 'Hazard 3')
    print(f'Hazards  : {h1} / {h2} / Hazard 3')

    extractors = [tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10]
    tabs_data = []

    for i, (fn, ws) in enumerate(zip(extractors, sheets)):
        print(f'  Sheet {i}: {ws.title}')
        try:
            secs = fn(ws, conn, hazard_names)
        except Exception as ex:
            import traceback
            traceback.print_exc()
            secs = [card(f'Error in sheet {i}', '', f'<p class="empty">{esc(str(ex))}</p>')]
        tabs_data.append((ws.title, secs))

    wb.close()
    conn.close()

    out = render_html(tabs_data)
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'\nWritten: {OUTPUT_HTML}  ({os.path.getsize(OUTPUT_HTML):,} bytes)')


if __name__ == '__main__':
    main()
