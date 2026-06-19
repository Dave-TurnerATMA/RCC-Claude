import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import db from '../db/database';

const router = Router();

// ── file upload setup ─────────────────────────────────────────────────────────

const uploadDir = path.join(__dirname, '../../uploads/evca');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, file.originalname.toLowerCase().endsWith('.xlsx')),
});

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '<em class="na">—</em>';
  return esc(v).replace(/\n/g, '<br>');
}

const RATING_BG: Record<string, string> = {
  HIGH: '#c0392b', TINGGI: '#c0392b',
  MODERATE: '#d68910', SEDANG: '#d68910',
  LOW: '#1e8449', RENDAH: '#1e8449',
  NONE: '#7f8c8d', 'TIDAK ADA': '#7f8c8d',
};

function badge(label: unknown): string {
  if (!label) return '<em class="na">—</em>';
  const s = String(label).trim();
  const bg = Object.entries(RATING_BG).find(([k]) => s.toUpperCase().includes(k))?.[1];
  return bg ? `<span class="badge" style="background:${bg}">${esc(s)}</span>` : esc(s);
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    pending: '#95a5a6', processing: '#2980b9', success: '#27ae60', failure: '#c0392b',
  };
  const bg = colors[status] ?? '#95a5a6';
  return `<span class="badge" style="background:${bg}">${esc(status)}</span>`;
}

function card(title: string, hint: string, body: string): string {
  const h = hint ? ` <small>(${esc(hint)})</small>` : '';
  return `<div class="card"><h3>${esc(title)}${h}</h3><div class="body">${body}</div></div>`;
}

function kv(pairs: [string, string][]): string {
  return '<table class="kv">' +
    pairs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('') +
    '</table>';
}

function dtable(headers: string[], rows: string[][]): string {
  const th = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const tr = rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
  const body = tr || `<tr><td colspan="${headers.length}" class="empty-row">No records yet</td></tr>`;
  return `<div class="scroll"><table class="dt"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function refList(items: { name_en: string; name_id: string }[]): string {
  return '<ul>' + items.map(r =>
    `<li>${esc(r.name_en)} <span class="id-label">(${esc(r.name_id)})</span></li>`
  ).join('') + '</ul>';
}

// Build a WHERE clause filtering through evca_assessments alias 'a'
function afilt(loadIds: number[]): string {
  if (loadIds.length === 0) return 'WHERE 1=0';
  return `WHERE a.load_id IN (${loadIds.join(',')})`;
}

// ── shared CSS / JS ───────────────────────────────────────────────────────────

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;background:#f4f6f7;color:#2c3e50}
h1{background:#c0392b;color:#fff;padding:14px 20px;font-size:18px;display:flex;align-items:center;gap:12px}
h1 small{font-size:12px;opacity:.8;font-weight:normal}
h1 a{color:#fff;text-decoration:none;font-size:12px;padding:4px 10px;border:1px solid rgba(255,255,255,.5);border-radius:3px;margin-left:auto}
h1 a:hover{background:rgba(255,255,255,.15)}
nav{display:flex;flex-wrap:wrap;background:#2c3e50;gap:1px}
nav button{padding:9px 15px;background:none;border:none;color:#aaa;cursor:pointer;font-size:12px;white-space:nowrap}
nav button:hover{background:#34495e;color:#fff}
nav button.on{background:#c0392b;color:#fff;font-weight:bold}
.tab{display:none;padding:16px 20px}
.tab.on{display:block}
.page{padding:16px 20px}
.card{background:#fff;border:1px solid #dde;border-radius:4px;margin-bottom:14px;overflow:hidden}
.card h3{padding:8px 12px;background:#ecf0f1;border-bottom:1px solid #dde;font-size:13px}
.card h3 small{font-size:11px;color:#7f8c8d;font-weight:normal}
.body{padding:10px 12px 12px}
.scroll{overflow-x:auto}
.upload-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:4px 0}
.upload-row input[type=file]{flex:1;min-width:0;padding:6px;border:1px solid #ccc;border-radius:3px;font-size:13px}
table.kv{border-collapse:collapse;width:100%}
table.kv th{background:#f9f9f9;border:1px solid #e0e0e0;padding:5px 10px;width:220px;font-weight:600;font-size:12px;text-align:left;vertical-align:top}
table.kv td{border:1px solid #e0e0e0;padding:5px 10px}
table.dt{border-collapse:collapse;width:100%;font-size:12px}
table.dt th{background:#2c3e50;color:#fff;padding:6px 8px;text-align:left;white-space:nowrap}
table.dt td{border:1px solid #e0e0e0;padding:4px 7px;vertical-align:top}
table.dt tbody tr:nth-child(even){background:#f9f9f9}
td.empty-row{color:#aaa;font-style:italic;text-align:center;padding:12px}
button,a.btn{display:inline-block;padding:6px 14px;border:none;border-radius:3px;cursor:pointer;font-size:12px;text-decoration:none;color:#fff}
.btn-primary{background:#c0392b}
.btn-primary:hover{background:#a93226}
.btn-process{background:#2980b9}
.btn-process:hover{background:#2471a3}
.btn-report{background:#7f8c8d;font-size:11px;padding:4px 10px}
.btn-report:hover{background:#626567}
.btn-view{background:#27ae60;font-size:11px;padding:4px 10px}
.btn-view:hover{background:#1e8449}
.btn-toggle{background:#34495e;font-size:11px;padding:4px 10px}
.btn-toggle:hover{background:#2c3e50}
.btn-disabled{background:#bdc3c7;cursor:not-allowed}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;color:#fff;font-size:11px;font-weight:bold}
em.na{color:#bbb;font-style:normal}
ul{margin:4px 0 4px 20px}
li{padding:2px 0;font-size:12px}
.id-label{color:#999;font-size:11px}
.hint{color:#777;font-size:12px;margin:6px 0 10px;font-style:italic}
.flash{padding:10px 14px;border-radius:3px;margin-bottom:12px;font-size:13px}
.flash.ok{background:#d5f5e3;color:#1e8449;border:1px solid #a9dfbf}
.flash.err{background:#fadbd8;color:#c0392b;border:1px solid #f1948a}
.runs-panel{padding:10px 14px 14px;border-top:2px solid #2c3e50;background:#f9fafb}
.runs-panel>strong{font-size:12px;color:#2c3e50;display:block;margin-bottom:6px}
.runs-table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px}
.runs-table th{background:#ecf0f1;border:1px solid #dde;padding:5px 8px;text-align:left;font-weight:600}
.runs-table td{border:1px solid #eee;padding:4px 8px;vertical-align:middle}
.new-run-bar{display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid #dde}
.new-run-bar label{font-size:12px;color:#555}
.new-run-bar select{font-size:12px;padding:4px 8px;border:1px solid #ccc;border-radius:3px}
`;

const SHARED_JS = `
function showTab(n){
  document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('on',i==n));
  document.querySelectorAll('.tab').forEach((d,i)=>d.classList.toggle('on',i==n));
}
function openReport(runId){
  window.open('/evca/loads/'+runId+'/report','evca_report_'+runId,'width=720,height=600,scrollbars=yes,resizable=yes');
}
function toggleRuns(uploadId){
  const panel=document.getElementById('runs-'+uploadId);
  const btn=document.getElementById('toggle-'+uploadId);
  const showing=panel.style.display!=='none';
  panel.style.display=showing?'none':'table-row';
  if(btn) btn.textContent=(showing?'▶ ':'▼ ')+btn.dataset.label;
}
function processUpload(uploadId){
  const sel=document.getElementById('lv-'+uploadId);
  const lvId=sel?parseInt(sel.value):1;
  const btn=document.getElementById('pbtn-'+uploadId);
  if(!confirm('Start new process run for upload #'+uploadId+'?')) return;
  if(btn){btn.disabled=true;btn.textContent='Processing…';btn.style.background='#95a5a6';}
  fetch('/evca/uploads/'+uploadId+'/process',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({layout_version_id:lvId})})
    .then(r=>r.json())
    .then(d=>{
      if(d.run_id) openReport(d.run_id);
      setTimeout(()=>location.reload(),300);
    })
    .catch(()=>{
      alert('Request failed — check server logs');
      if(btn){btn.disabled=false;btn.textContent='Process';btn.style.background='';}
    });
}
`;

// ── management page ───────────────────────────────────────────────────────────

function buildManagementPage(flash?: { type: 'ok' | 'err'; msg: string }, autoExpandId?: number): string {
  const uploads = db.prepare('SELECT * FROM evca_uploads ORDER BY id DESC').all() as any[];
  const layoutVersions = db.prepare('SELECT * FROM evca_layout_versions ORDER BY id').all() as any[];

  const flashHtml = flash ? `<div class="flash ${flash.type}">${esc(flash.msg)}</div>` : '';

  const lvOptions = layoutVersions.length > 0
    ? layoutVersions.map((lv: any) =>
        `<option value="${lv.id}"${lv.is_default ? ' selected' : ''}>${esc(lv.name)}</option>`
      ).join('')
    : '<option value="1">v1.0 (Standard)</option>';

  let uploadRowsHtml = '';
  if (uploads.length === 0) {
    uploadRowsHtml = `<tr><td colspan="5" class="empty-row">No spreadsheets uploaded yet</td></tr>`;
  } else {
    for (const up of uploads) {
      const runs = db.prepare(
        `SELECT sl.*, lv.name as lv_name
         FROM evca_spreadsheet_loads sl
         LEFT JOIN evca_layout_versions lv ON lv.id=sl.layout_version_id
         WHERE sl.upload_id=? ORDER BY sl.id DESC`
      ).all(up.id) as any[];

      const runCount = runs.length;
      const latestStatus: string | null = runCount > 0 ? (runs[0] as any).status : null;
      const statusHtml = latestStatus ? ` — ${statusBadge(latestStatus)}` : '';

      const runsSubTable = runs.length > 0
        ? `<table class="runs-table">
            <thead><tr>
              <th>Run #</th><th>Layout</th><th>Status</th><th>Run At</th><th>Actions</th>
            </tr></thead>
            <tbody>
            ${runs.map((r: any) => {
              const reportBtn = r.report
                ? `<button class="btn btn-report" onclick="openReport(${r.id})">Run Report</button> `
                : '';
              const viewBtn = r.status === 'success'
                ? `<a class="btn btn-view" href="/evca/report?run=${r.id}" target="_blank">View Data</a> `
                : '';
              const assessmentBtns = r.status === 'success'
                ? `<a class="btn" style="background:#8e44ad" href="/evca/loads/${r.id}/assessment-view" target="_blank">Assessment Report</a> ` +
                  `<a class="btn" style="background:#2c3e50" href="/evca/loads/${r.id}/assessment.json?download=1">⬇ JSON</a> ` +
                  `<a class="btn" style="background:#16a085" href="/evca/loads/${r.id}/prompt.txt?download=1">⬇ LLM Prompt</a> ` +
      `<a class="btn" style="background:#1a5276" href="/evca/loads/${r.id}/context-doc.md?download=1">⬇ Context Doc</a>`
                : '';
              return `<tr>
                <td>${fmt(r.id)}</td>
                <td>${fmt(r.lv_name || r.layout_version_id || 1)}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${fmt(r.uploaded_at)}</td>
                <td>${reportBtn}${viewBtn}${assessmentBtns}</td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>`
        : '<p style="color:#aaa;font-size:12px;margin:0 0 8px">No runs yet — click Process below to import data.</p>';

      uploadRowsHtml += `
      <tr>
        <td>${fmt(up.id)}</td>
        <td>${fmt(up.filename)}</td>
        <td>${fmt(up.uploaded_at)}</td>
        <td>${runCount} run${runCount !== 1 ? 's' : ''}${statusHtml}</td>
        <td>
          <button id="toggle-${up.id}" class="btn btn-toggle"
            data-label="${esc(up.filename)}"
            onclick="toggleRuns(${up.id})">▶ ${esc(up.filename)}</button>
        </td>
      </tr>
      <tr id="runs-${up.id}" style="display:none">
        <td colspan="5" style="padding:0">
          <div class="runs-panel">
            <strong>Process Runs — ${esc(up.filename)}</strong>
            ${runsSubTable}
            <div class="new-run-bar">
              <label>Layout:</label>
              <select id="lv-${up.id}">${lvOptions}</select>
              <button id="pbtn-${up.id}" class="btn btn-process" onclick="processUpload(${up.id})">Process</button>
            </div>
          </div>
        </td>
      </tr>`;
    }
  }

  const uploadsTable = `<div class="scroll"><table class="dt">
    <thead><tr><th>ID</th><th>Filename</th><th>Uploaded At</th><th>Runs</th><th>Actions</th></tr></thead>
    <tbody>${uploadRowsHtml}</tbody>
  </table></div>`;

  const autoExpandJs = autoExpandId
    ? `<script>document.addEventListener('DOMContentLoaded',()=>toggleRuns(${autoExpandId}));</script>`
    : '';

  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EVCA — Spreadsheet Management</title>
<style>${CSS}</style>
</head>
<body>
<h1>EVCA <small>Spreadsheet Management</small>
  <a href="/evca/report">View Full Data Report →</a>
</h1>
<div class="page">
${flashHtml}
${card('Upload Spreadsheet', '', `
  <p class="hint">Select an EVCA spreadsheet (.xlsx) to upload. After uploading, expand the row and click <strong>Process</strong> to import data into the database.</p>
  <form action="/evca/upload" method="post" enctype="multipart/form-data">
    <div class="upload-row">
      <input type="file" name="spreadsheet" accept=".xlsx" required>
      <button type="submit" class="btn btn-primary">Upload</button>
    </div>
  </form>
`)}
${card('Uploaded Spreadsheets', 'evca_uploads', uploadsTable)}
</div>
<script>${SHARED_JS}</script>
${autoExpandJs}
</body></html>`;
}

// ── popup report page ─────────────────────────────────────────────────────────

function buildPopupReport(load: any): string {
  const reportText = load.report ?? 'No report available yet.';
  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8">
<title>Run Report #${load.id}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#2c3e50;margin:0;padding:0}
h2{background:#2c3e50;color:#fff;padding:10px 16px;font-size:14px;margin:0}
.meta{background:#ecf0f1;padding:8px 16px;font-size:12px;color:#555;border-bottom:1px solid #dde}
.meta strong{color:#2c3e50}
.report{padding:14px 16px;white-space:pre-wrap;font-size:12px;line-height:1.7;background:#fff}
.none{padding:20px 16px;color:#aaa;font-style:italic}
</style>
</head>
<body>
<h2>Run Report — #${esc(String(load.id))}: ${esc(load.filename)}</h2>
<div class="meta">
  <strong>Run At:</strong> ${esc(load.uploaded_at)} &nbsp;|&nbsp;
  <strong>Status:</strong> ${esc(load.status)}
</div>
${load.report
  ? `<pre class="report">${esc(reportText)}</pre>`
  : `<p class="none">No report has been generated for this run yet.<br>Click <strong>Process</strong> on the management page to run import and validation.</p>`
}
</body></html>`;
}

// ── data report helpers ───────────────────────────────────────────────────────

function getDefaultLoadIds(): number[] {
  const rows = db.prepare(
    `SELECT MAX(id) as id FROM evca_spreadsheet_loads
     WHERE status='success'
     GROUP BY COALESCE(upload_id, id)`
  ).all() as any[];
  return rows.map((r: any) => r.id as number).filter(Boolean);
}

// ── data report tabs ──────────────────────────────────────────────────────────

function buildTab1(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const assessments = db.prepare(
    `SELECT a.*, s.filename as load_filename FROM evca_assessments a
     LEFT JOIN evca_spreadsheet_loads s ON s.id=a.load_id
     ${filt} ORDER BY a.id`
  ).all() as any[];

  const dimensions = db.prepare('SELECT * FROM evca_dimensions ORDER BY display_order').all() as any[];

  const riskSummary = db.prepare(
    `SELECT rs.dimension_number, rs.risk_label, h.hazard_number, h.hazard_name, a.village_name
     FROM evca_risk_summary rs
     JOIN evca_hazards h ON h.id=rs.hazard_id
     JOIN evca_assessments a ON a.id=rs.assessment_id
     ${filt} ORDER BY a.id, rs.dimension_number, h.hazard_number`
  ).all() as any[];

  const cards: string[] = [];

  const asmRows = assessments.map((a: any) => [
    fmt(a.id), fmt(a.load_filename || a.load_id), fmt(a.village_name),
    fmt(a.district), fmt(a.province), fmt(a.country), fmt(a.start_date), fmt(a.responsible_person),
  ]);
  cards.push(card('Assessments', 'evca_assessments',
    dtable(['ID', 'Source Load', 'Village', 'District', 'Province', 'Country', 'Start Date', 'Responsible Person'], asmRows)));

  if (riskSummary.length > 0) {
    const villages = [...new Set(riskSummary.map((r: any) => r.village_name as string))];
    for (const village of villages) {
      const vd = riskSummary.filter((r: any) => r.village_name === village);
      const hazards = [...new Map(vd.map((r: any) => [r.hazard_number as number, r.hazard_name as string])).entries()]
        .sort((a, b) => a[0] - b[0]);
      const dimNums = [...new Set(vd.map((r: any) => r.dimension_number as number))].sort((a, b) => a - b);

      const headers = ['Dimension', ...hazards.map(([n, name]) => `H${n}: ${name}`)];
      const matrixRows = dimNums.map(dimNum => {
        const dimName = (dimensions as any[]).find(d => d.display_order === dimNum)?.name_en || `Dim ${dimNum}`;
        const cells = hazards.map(([hNum]) => {
          const entry = vd.find((r: any) => r.dimension_number === dimNum && r.hazard_number === hNum);
          return entry ? badge(entry.risk_label) : '<em class="na">—</em>';
        });
        return [fmt(dimName), ...cells];
      });

      cards.push(card(`Risk Summary Matrix — ${village}`, 'evca_risk_summary',
        dtable(headers, matrixRows)));
    }
  }

  cards.push(card('EVCA Dimensions (reference)', 'evca_dimensions', refList(dimensions)));
  return cards;
}

function buildTab2(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const contexts = db.prepare(
    `SELECT cc.*, a.village_name FROM evca_community_context cc
     JOIN evca_assessments a ON a.id=cc.assessment_id ${filt}`
  ).all() as any[];

  const popRows = db.prepare(
    `SELECT p.*, a.village_name FROM evca_population p
     JOIN evca_assessments a ON a.id=p.assessment_id ${filt}
     ORDER BY a.id, p.age_group`
  ).all() as any[];

  const commTypes  = db.prepare('SELECT * FROM evca_ref_community_type').all() as any[];
  const geoEnvs    = db.prepare('SELECT * FROM evca_ref_geophysical_env ORDER BY env_type, id').all() as any[];
  const livelihoods = db.prepare('SELECT * FROM evca_ref_livelihood ORDER BY id').all() as any[];

  const cards: string[] = [];

  for (const c of contexts) {
    if (c.community_description) {
      cards.push(card(`Community Description — ${c.village_name}`, 'community_description',
        `<p style="line-height:1.7">${fmt(c.community_description)}</p>`));
    }
    if (c.assessment_process) {
      cards.push(card(`Assessment Process — ${c.village_name}`, 'assessment_process',
        `<p style="line-height:1.7">${fmt(c.assessment_process)}</p>`));
    }
  }

  cards.push(card('Community Context', 'evca_community_context',
    dtable(['Village', 'Community Type', 'Geo (location)', 'Geo (terrain)', 'Primary Livelihood', 'Secondary Livelihood'],
      contexts.map(c => [fmt(c.village_name), fmt(c.community_type), fmt(c.geophysical_env_1), fmt(c.geophysical_env_2), fmt(c.livelihood_primary), fmt(c.livelihood_secondary)]))));

  cards.push(card('Population', 'evca_population',
    dtable(['Village', 'Age Group', 'Male', 'Female', 'Disability M', 'Disability F'],
      popRows.map(p => [fmt(p.village_name), fmt(p.age_group.replace(/_/g, '–')), fmt(p.male_count), fmt(p.female_count), fmt(p.disability_male), fmt(p.disability_female)]))));

  cards.push(card('Reference: Community Types', 'evca_ref_community_type', refList(commTypes)));
  cards.push(card('Reference: Geophysical Environments', 'evca_ref_geophysical_env',
    '<ul>' + geoEnvs.map((r: any) => `<li><strong>${esc(r.env_type)}</strong>: ${esc(r.name_en)} (${esc(r.name_id)})</li>`).join('') + '</ul>'));
  cards.push(card('Reference: Livelihood Activities', 'evca_ref_livelihood', refList(livelihoods)));
  return cards;
}

function buildTab3(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const hazards = db.prepare(
    `SELECT h.*, a.village_name FROM evca_hazards h
     JOIN evca_assessments a ON a.id=h.assessment_id ${filt}
     ORDER BY a.id, h.hazard_number`
  ).all() as any[];

  const rationales = db.prepare(
    `SELECT a.village_name, a.hazard_selection_rationale, a.priority_hazard_count
     FROM evca_assessments a ${filt} ORDER BY a.id`
  ).all() as any[];

  const cards: string[] = [];

  for (const a of rationales) {
    if (a.hazard_selection_rationale) {
      cards.push(card(`Hazard Selection Rationale — ${a.village_name}`, 'hazard_selection_rationale',
        `<p style="line-height:1.7">${fmt(a.hazard_selection_rationale)}</p>`));
    }
  }

  cards.push(card('Hazards', 'evca_hazards',
    dtable(['Village', '#', 'Name', 'Cause/Origin', 'Warning Signs', 'Action Time', 'Frequency', 'Period', 'Duration'],
      hazards.map(h => [fmt(h.village_name), fmt(h.hazard_number), fmt(h.hazard_name), fmt(h.cause_origin), fmt(h.warning_signs), fmt(h.action_time), fmt(h.frequency), fmt(h.occurrence_period), fmt(h.duration)]))));

  return cards;
}

function buildTab4(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const overviews = db.prepare(
    `SELECT a.village_name, a.vulnerability_overview FROM evca_assessments a ${filt} ORDER BY a.id`
  ).all() as any[];

  const groups = db.prepare(
    `SELECT g.*, a.village_name FROM evca_vulnerable_groups g
     JOIN evca_assessments a ON a.id=g.assessment_id ${filt}
     ORDER BY a.id, g.group_number`
  ).all() as any[];

  const ratings = db.prepare(
    `SELECT vr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name
     FROM evca_vulnerability_ratings vr
     JOIN evca_hazards h ON h.id=vr.hazard_id
     JOIN evca_assessments a ON a.id=vr.assessment_id
     LEFT JOIN evca_dimensions d ON d.display_order=vr.dimension_number
     ${filt} ORDER BY a.id, h.hazard_number, vr.dimension_number`
  ).all() as any[];

  const vulnScale = db.prepare('SELECT * FROM evca_ref_vulnerability_rating ORDER BY numeric_value DESC').all() as any[];

  const cards: string[] = [];

  for (const a of overviews) {
    if (a.vulnerability_overview) {
      cards.push(card(`Vulnerability Overview — ${a.village_name}`, 'vulnerability_overview',
        `<p style="line-height:1.7">${fmt(a.vulnerability_overview)}</p>`));
    }
  }

  cards.push(card('Vulnerable Groups', 'evca_vulnerable_groups',
    dtable(['Village', '#', 'Group Name', 'Vulnerability Reasons'],
      groups.map(g => [fmt(g.village_name), fmt(g.group_number), fmt(g.group_name), fmt(g.vulnerability_reasons)]))));

  cards.push(card('Vulnerability Ratings', 'evca_vulnerability_ratings',
    dtable(['Village', 'Hazard', 'Dimension', 'Impact', 'Aspects', 'Rating', 'Value'],
      ratings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), fmt(r.impact_description), fmt(r.vulnerability_aspects), badge(r.rating_label), fmt(r.rating_value)]))));

  cards.push(card('Reference: Vulnerability Scale', 'evca_ref_vulnerability_rating',
    dtable(['Label (ID)', 'Label (EN)', 'Value'],
      vulnScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))));

  return cards;
}

function buildTab5(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const overviews = db.prepare(
    `SELECT a.village_name, a.capacity_overview FROM evca_assessments a ${filt} ORDER BY a.id`
  ).all() as any[];

  const ratings = db.prepare(
    `SELECT cr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name
     FROM evca_capacity_ratings cr
     JOIN evca_hazards h ON h.id=cr.hazard_id
     JOIN evca_assessments a ON a.id=cr.assessment_id
     LEFT JOIN evca_dimensions d ON d.display_order=cr.dimension_number
     ${filt} ORDER BY a.id, h.hazard_number, cr.dimension_number`
  ).all() as any[];

  const capScale = db.prepare('SELECT * FROM evca_ref_capacity_rating ORDER BY numeric_value DESC').all() as any[];

  const cards: string[] = [];

  for (const a of overviews) {
    if (a.capacity_overview) {
      cards.push(card(`Capacity Overview — ${a.village_name}`, 'capacity_overview',
        `<p style="line-height:1.7">${fmt(a.capacity_overview)}</p>`));
    }
  }

  cards.push(card('Capacity Ratings', 'evca_capacity_ratings',
    dtable(['Village', 'Hazard', 'Dimension', 'Capacity Description', 'Rating', 'Value'],
      ratings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), fmt(r.capacity_description), badge(r.rating_label), fmt(r.rating_value)]))));

  cards.push(card('Reference: Capacity Scale', 'evca_ref_capacity_rating',
    dtable(['Label (ID)', 'Label (EN)', 'Value'],
      capScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))));

  return cards;
}

function buildTab6(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const overviews = db.prepare(
    `SELECT a.village_name, a.social_dimensions_overview FROM evca_assessments a ${filt} ORDER BY a.id`
  ).all() as any[];

  const social = db.prepare(
    `SELECT sd.*, a.village_name FROM evca_social_dimensions sd
     JOIN evca_assessments a ON a.id=sd.assessment_id ${filt}
     ORDER BY a.id, sd.dimension`
  ).all() as any[];

  const socialScale = db.prepare('SELECT * FROM evca_ref_social_rating ORDER BY numeric_value DESC').all() as any[];

  const cards: string[] = [];

  for (const a of overviews) {
    if (a.social_dimensions_overview) {
      cards.push(card(`Social Dimensions Overview — ${a.village_name}`, 'social_dimensions_overview',
        `<p style="line-height:1.7">${fmt(a.social_dimensions_overview)}</p>`));
    }
  }

  cards.push(card('Social Cohesion, Inclusion & Connectedness', 'evca_social_dimensions',
    dtable(['Village', 'Dimension', 'Description', 'Rating', 'Value'],
      social.map(s => [fmt(s.village_name), fmt(s.dimension.replace(/_/g, ' ')), fmt(s.description), badge(s.rating_label), fmt(s.rating_value)]))));

  cards.push(card('Reference: Social Rating Scale', 'evca_ref_social_rating',
    dtable(['Label (ID)', 'Label (EN)', 'Value'],
      socialScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))));

  return cards;
}

function buildTab7(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const riskRatings = db.prepare(
    `SELECT rr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name
     FROM evca_risk_ratings rr
     JOIN evca_hazards h ON h.id=rr.hazard_id
     JOIN evca_assessments a ON a.id=rr.assessment_id
     LEFT JOIN evca_dimensions d ON d.display_order=rr.dimension_number
     ${filt} ORDER BY a.id, h.hazard_number, rr.dimension_number`
  ).all() as any[];

  return [
    card('Risk Ratings', 'evca_risk_ratings',
      dtable(['Village', 'Hazard', 'Dimension', 'Risk Rating'],
        riskRatings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), badge(r.risk_label)]))),
  ];
}

function buildTab8(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const analysis = db.prepare(
    `SELECT ra.*, h.hazard_name, h.hazard_number, cd.name_en as dim_name, a.village_name
     FROM evca_risk_analysis ra
     JOIN evca_hazards h ON h.id=ra.hazard_id
     JOIN evca_assessments a ON a.id=ra.assessment_id
     LEFT JOIN evca_ref_consolidated_dimensions cd ON cd.dimension_number=ra.consolidated_dimension
     ${filt} ORDER BY a.id, h.hazard_number, ra.consolidated_dimension`
  ).all() as any[];

  const narratives = db.prepare(
    `SELECT oa.*, a.village_name FROM evca_overall_analysis oa
     JOIN evca_assessments a ON a.id=oa.assessment_id ${filt}`
  ).all() as any[];

  const consolidatedDims = db.prepare('SELECT * FROM evca_ref_consolidated_dimensions ORDER BY dimension_number').all() as any[];

  return [
    card('Risk Consolidation Table', 'evca_risk_analysis',
      dtable(['Village', 'Hazard', 'Consolidated Dimension', 'Vulnerability Aspects', 'Capacity Aspects', 'Key Risk Summary'],
        analysis.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.consolidated_dimension}`), fmt(r.vulnerability_aspects), fmt(r.capacity_aspects), fmt(r.key_risk_summary)]))),
    card('Overall Risk Narrative', 'evca_overall_analysis',
      dtable(['Village', 'Narrative'],
        narratives.map(r => [fmt(r.village_name), fmt(r.overall_narrative)]))),
    card('Reference: Consolidated Dimensions', 'evca_ref_consolidated_dimensions', refList(consolidatedDims)),
  ];
}

function buildTab9(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const items = db.prepare(
    `SELECT ai.*, a.village_name FROM evca_action_items ai
     JOIN evca_assessments a ON a.id=ai.assessment_id ${filt}
     ORDER BY a.id, ai.item_order`
  ).all() as any[];

  const validations = db.prepare(
    `SELECT av.*, a.village_name FROM evca_action_validation av
     JOIN evca_assessments a ON a.id=av.assessment_id ${filt}`
  ).all() as any[];

  return [
    card('Action Plan Items', 'evca_action_items',
      dtable(['Village', '#', 'Priority Risk', 'Desired Outcome', 'Priority Activities', 'Required Resources', 'Tech Support', 'Schedule', 'Responsible Party'],
        items.map(i => [fmt(i.village_name), fmt(i.item_order), fmt(i.priority_risk_description), fmt(i.desired_outcome), fmt(i.priority_activities), fmt(i.required_resources), fmt(i.technical_support_needs), fmt(i.schedule), fmt(i.responsible_party)]))),
    card('Action Plan Validation', 'evca_action_validation',
      dtable(['Village', 'Community Rep', 'BPBD Rep', 'Village Rep', 'PMI Rep', 'Validation Date'],
        validations.map(v => [fmt(v.village_name), fmt(v.community_rep_name), fmt(v.bpbd_rep_name), fmt(v.village_rep_name), fmt(v.pmi_rep_name), fmt(v.validation_date)]))),
  ];
}

function buildTab10(loadIds: number[]): string[] {
  const filt = afilt(loadIds);

  const scores = db.prepare(
    `SELECT ps.*, a.village_name FROM evca_priority_scores_flat ps
     JOIN evca_assessments a ON a.id=ps.assessment_id ${filt}
     ORDER BY a.id, ps.id`
  ).all() as any[];

  const criteria = db.prepare('SELECT * FROM evca_priority_criteria ORDER BY criterion_number').all() as any[];

  return [
    card('Priority Scoring Matrix', 'evca_priority_scores_flat',
      dtable(['Village', 'Activity', 'Funding', 'Timeframe', 'Local Res.', 'Community', 'Govt Support', 'Sustainability', 'PMI Mandate', 'Effectiveness', 'Total'],
        scores.map(s => [
          fmt(s.village_name), fmt(s.activity_name),
          fmt(s.score_funding), fmt(s.score_timeframe), fmt(s.score_local_resources),
          fmt(s.score_community_participation), fmt(s.score_govt_support),
          fmt(s.score_sustainability), fmt(s.score_pmi_mandate), fmt(s.score_effectiveness),
          `<strong>${fmt((s.score_funding||0)+(s.score_timeframe||0)+(s.score_local_resources||0)+(s.score_community_participation||0)+(s.score_govt_support||0)+(s.score_sustainability||0)+(s.score_pmi_mandate||0)+(s.score_effectiveness||0))}</strong>`,
        ]))),
    card('Reference: Scoring Criteria', 'evca_priority_criteria',
      dtable(['#', 'Criterion (EN)', 'Criterion (ID)'],
        criteria.map(c => [fmt(c.criterion_number), fmt(c.name_en), fmt(c.name_id)]))),
  ];
}

const TAB_LABELS = [
  '1. Summary', '2. Background', '3. Hazards', '4. Vulnerability',
  '5. Capacity', '6. Social', '7. Risk', '8. Analysis', '9. Action Plan', '10. Priority Matrix',
];

function buildDataReport(loadIds?: number[]): string {
  const ids = loadIds ?? getDefaultLoadIds();

  let subtitle = 'Enhanced Vulnerability &amp; Capacity Assessment';
  if (loadIds && loadIds.length === 1) {
    const run = db.prepare(
      `SELECT sl.filename FROM evca_spreadsheet_loads sl WHERE sl.id=?`
    ).get(loadIds[0]) as any;
    if (run) subtitle += ` — Run #${loadIds[0]} (${esc(run.filename || '')})`;
  }

  const tabContents = [
    buildTab1(ids), buildTab2(ids), buildTab3(ids), buildTab4(ids), buildTab5(ids),
    buildTab6(ids), buildTab7(ids), buildTab8(ids), buildTab9(ids), buildTab10(ids),
  ];

  const btns = TAB_LABELS.map((t, i) => {
    const cls = i === 0 ? ' class="on"' : '';
    return `<button onclick="showTab(${i})"${cls}>${esc(t)}</button>`;
  }).join('');

  const tabs = tabContents.map((secs, i) => {
    const active = i === 0 ? ' on' : '';
    return `<section class="tab${active}" id="t${i}">${secs.join('')}</section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EVCA Data Report</title>
<style>${CSS}</style>
</head>
<body>
<h1>EVCA Data Report <small>${subtitle}</small>
  <a href="/evca">← Manage Uploads</a>
</h1>
<nav>${btns}</nav>
${tabs}
<script>${SHARED_JS}</script>
</body></html>`;
}

// ── routes ────────────────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  const uploaded = req.query.uploaded ? Number(req.query.uploaded) : undefined;
  const flash = uploaded
    ? { type: 'ok' as const, msg: `Spreadsheet uploaded — expand the row below and click Process to import data.` }
    : undefined;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildManagementPage(flash, uploaded));
});

router.post('/upload', upload.single('spreadsheet'), (req: Request, res: Response) => {
  if (!req.file) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(buildManagementPage({
      type: 'err',
      msg: 'No file received. Please select an .xlsx file and try again.',
    }));
  }

  const uploadId = (db.prepare(
    'INSERT INTO evca_uploads (filename, stored_filename) VALUES (?, ?)'
  ).run(req.file.originalname, req.file.filename) as any).lastInsertRowid;

  res.redirect(`/evca?uploaded=${uploadId}`);
});

router.post('/uploads/:id/process', (req: Request, res: Response) => {
  const up = db.prepare('SELECT * FROM evca_uploads WHERE id=?').get(req.params.id) as any;
  if (!up) return res.status(404).json({ error: 'Upload not found' });

  const layoutVersionId = Number(req.body.layout_version_id) || 1;

  const runId = (db.prepare(
    `INSERT INTO evca_spreadsheet_loads
       (upload_id, layout_version_id, filename, stored_filename, status)
     VALUES (?,?,?,?,?)`
  ).run(up.id, layoutVersionId, up.filename, up.stored_filename, 'processing') as any).lastInsertRowid;

  const scriptPath      = path.resolve(__dirname, '../../../evca/scripts/import_spreadsheet.py');
  const spreadsheetPath = path.resolve(__dirname, '../../uploads/evca', up.stored_filename);
  const dbPath          = path.resolve(__dirname, '../../data/community_prep.db');

  console.log(`[EVCA] upload #${up.id} → new run #${runId}: layout_version=${layoutVersionId}`);
  console.log(`[EVCA]   spreadsheet=${spreadsheetPath} exists=${fs.existsSync(spreadsheetPath)}`);
  console.log(`[EVCA]   script=${scriptPath} exists=${fs.existsSync(scriptPath)}`);

  if (!fs.existsSync(spreadsheetPath)) {
    const msg = `Spreadsheet file not found on disk: ${up.stored_filename}`;
    db.prepare("UPDATE evca_spreadsheet_loads SET status='failure', report=? WHERE id=?").run(msg, runId);
    return res.json({ success: false, run_id: Number(runId), message: msg });
  }

  execFile(
    'python3',
    [scriptPath, '--load-id', String(runId), '--db', dbPath, '--spreadsheet', spreadsheetPath,
     '--layout-version-id', String(layoutVersionId)],
    { timeout: 180_000 },
    (error, stdout, stderr) => {
      if (error) console.error(`[EVCA] execFile error (code ${(error as any).code}): ${error.message}`);
      if (stderr) console.error(`[EVCA] stderr: ${stderr.slice(0, 500)}`);
      const output = [stdout, stderr ? `STDERR:\n${stderr}` : ''].filter(Boolean).join('\n');
      try {
        const mid = db.prepare('SELECT status FROM evca_spreadsheet_loads WHERE id=?').get(runId) as any;
        if (mid?.status === 'processing') {
          const errReport = `Script exited (code ${(error as any)?.code ?? '?'}) before completing:\n\n${output || '(no output)'}`;
          console.error(`[EVCA] script did not update DB — saving fallback report for run #${runId}`);
          db.prepare("UPDATE evca_spreadsheet_loads SET status='failure', report=? WHERE id=?")
            .run(errReport, runId);
        }
      } catch (dbErr) {
        console.error(`[EVCA] DB update in callback failed: ${dbErr}`);
      }
      const final = db.prepare('SELECT status FROM evca_spreadsheet_loads WHERE id=?').get(runId) as any;
      res.json({
        success: final?.status === 'success',
        run_id: Number(runId),
        message: `Processing ${final?.status === 'success' ? 'completed successfully' : 'failed'} for upload #${up.id} (${up.filename}).`,
      });
    }
  );
});

router.get('/loads/:id/report', (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).send('<h2>Run not found</h2>');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildPopupReport(load));
});

// ── assessment JSON generation ─────────────────────────────────────────────────

function runAssessmentScript(assessmentId: number): Promise<string> {
  const scriptPath = path.resolve(__dirname, '../../../evca/scripts/get_village_assessment.py');
  const dbPath     = path.resolve(__dirname, '../../data/community_prep.db');
  return new Promise((resolve, reject) => {
    execFile('python3', [scriptPath, '--db', dbPath, '--assessment-id', String(assessmentId)],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve(stdout);
      }
    );
  });
}

function runPromptScript(assessmentId: number): Promise<string> {
  const scriptPath = path.resolve(__dirname, '../../../evca/scripts/generate_village_context_doc.py');
  const dbPath     = path.resolve(__dirname, '../../data/community_prep.db');
  return new Promise((resolve, reject) => {
    execFile('python3', [scriptPath, '--db', dbPath, '--assessment-id', String(assessmentId)],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve(stdout);
      }
    );
  });
}

function runContextDocScript(assessmentId: number): Promise<string> {
  const scriptPath = path.resolve(__dirname, '../../../evca/scripts/generate_village_context_doc.py');
  const dbPath     = path.resolve(__dirname, '../../data/community_prep.db');
  return new Promise((resolve, reject) => {
    let apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    if (!apiKey) {
      try {
        const eco = require('../../../ecosystem.config.js');
        apiKey = eco?.apps?.[0]?.env?.ANTHROPIC_API_KEY ?? '';
      } catch {}
    }
    execFile('python3', [scriptPath, '--db', dbPath, '--assessment-id', String(assessmentId)],
      { timeout: 120_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, ANTHROPIC_API_KEY: apiKey } },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve(stdout);
      }
    );
  });
}

function buildAssessmentPreview(json: any, runId: number): string {
  const v = json.village_profile ?? {};
  const profile = Object.entries(v).map(([k, val]) =>
    `<tr><th>${esc(k.replace(/_/g, ' '))}</th><td>${esc(String(val))}</td></tr>`
  ).join('');

  const hazardsHtml = (json.hazards ?? []).map((h: any, i: number) => {
    const riskRows = (h.risk_by_dimension ?? []).map((r: any) =>
      `<tr><td>${esc(r.dimension)}</td><td>${badge(r.risk_level)}</td></tr>`
    ).join('');
    return `<div class="card">
      <h3>Hazard ${i + 1}: ${esc(h.hazard_name)}</h3>
      <div class="body">
        ${h.cause_origin ? `<p><strong>Cause:</strong> ${esc(h.cause_origin)}</p>` : ''}
        ${h.warning_signs ? `<p><strong>Warning signs:</strong> ${esc(h.warning_signs)}</p>` : ''}
        ${h.frequency ? `<p><strong>Frequency:</strong> ${esc(h.frequency)}${h.occurrence_period ? ' · ' + esc(h.occurrence_period) : ''}</p>` : ''}
        ${riskRows ? `<h4 style="margin:10px 0 4px">Risk by dimension</h4>
          <table class="dt"><thead><tr><th>Dimension</th><th>Risk</th></tr></thead><tbody>${riskRows}</tbody></table>` : ''}
      </div>
    </div>`;
  }).join('');

  const actionRows = (json.action_plan?.items ?? []).map((a: any, i: number) =>
    `<tr><td>${i + 1}</td><td>${esc(a.priority_risk ?? '')}</td><td>${esc(a.desired_outcome ?? '')}</td><td>${esc(a.priority_activities ?? '')}</td><td>${esc(a.responsible_party ?? '')}</td></tr>`
  ).join('');

  const narratives = json.narratives ?? {};
  const narrativeCards = Object.entries(narratives).map(([k, v]) =>
    `<div class="card"><h3>${esc(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</h3>
    <div class="body"><p style="line-height:1.7">${esc(String(v)).replace(/\n/g, '<br>')}</p></div></div>`
  ).join('');

  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Assessment Report — ${esc(v.village_name ?? '')}</title>
<style>${CSS}
h4{margin:8px 0 4px;font-size:12px;color:#555}
p{margin:4px 0;font-size:13px}
</style>
</head>
<body>
<h1>Assessment Report <small>${esc(v.village_name ?? '')}${v.district ? ' · ' + esc(v.district) : ''}${v.province ? ', ' + esc(v.province) : ''}</small>
  <a href="/evca/loads/${runId}/assessment.json?download=1">⬇ Download JSON</a>
</h1>
<div class="page">
  <div class="card"><h3>Village Profile</h3><div class="body">
    <table class="kv">${profile}</table>
  </div></div>
  ${hazardsHtml}
  ${narrativeCards}
  ${actionRows ? `<div class="card"><h3>Action Plan</h3><div class="body">
    <div class="scroll"><table class="dt">
      <thead><tr><th>#</th><th>Priority Risk</th><th>Desired Outcome</th><th>Activities</th><th>Responsible</th></tr></thead>
      <tbody>${actionRows}</tbody>
    </table></div>
  </div></div>` : ''}
  <div class="card"><h3>Raw JSON</h3><div class="body">
    <pre style="font-size:11px;line-height:1.5;overflow-x:auto;white-space:pre-wrap">${esc(JSON.stringify(json, null, 2))}</pre>
  </div></div>
</div>
</body></html>`;
}

router.get('/loads/:id/assessment.json', async (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).json({ error: 'Load not found' });
  if (load.status !== 'success') return res.status(400).json({ error: 'Load is not successful — cannot generate assessment report' });

  const assessment = db.prepare('SELECT id, village_name FROM evca_assessments WHERE load_id=?').get(load.id) as any;
  if (!assessment) return res.status(404).json({ error: 'No assessment record found for this load' });

  try {
    const stdout = await runAssessmentScript(assessment.id);
    const filename = `evca_${(assessment.village_name ?? 'assessment').replace(/\s+/g, '_')}_run${load.id}.json`;
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(stdout);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate assessment report', detail: err.message });
  }
});

router.get('/loads/:id/assessment-view', async (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).send('<h2>Load not found</h2>');
  if (load.status !== 'success') return res.status(400).send('<h2>Load is not successful</h2>');

  const assessment = db.prepare('SELECT id, village_name FROM evca_assessments WHERE load_id=?').get(load.id) as any;
  if (!assessment) return res.status(404).send('<h2>No assessment found for this load</h2>');

  try {
    const stdout = await runAssessmentScript(assessment.id);
    const json = JSON.parse(stdout);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildAssessmentPreview(json, Number(req.params.id)));
  } catch (err: any) {
    res.status(500).send(`<h2>Error</h2><pre>${esc(err.message)}</pre>`);
  }
});

router.get('/loads/:id/prompt.txt', async (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).send('Load not found');
  if (load.status !== 'success') return res.status(400).send('Load is not successful');

  const assessment = db.prepare('SELECT id, village_name FROM evca_assessments WHERE load_id=?').get(load.id) as any;
  if (!assessment) return res.status(404).send('No assessment found for this load');

  try {
    const prompt = await runPromptScript(assessment.id);
    const filename = `evca_${(assessment.village_name ?? 'assessment').replace(/\s+/g, '_')}_run${load.id}_prompt.txt`;
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(prompt);
  } catch (err: any) {
    res.status(500).send(`Error generating prompt: ${err.message}`);
  }
});

router.get('/loads/:id/context-doc.md', async (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).send('Load not found');
  if (load.status !== 'success') return res.status(400).send('Load is not successful');

  const assessment = db.prepare('SELECT id, village_name FROM evca_assessments WHERE load_id=?').get(load.id) as any;
  if (!assessment) return res.status(404).send('No assessment found for this load');

  try {
    const markdown = await runContextDocScript(assessment.id);
    const filename = `evca_${(assessment.village_name ?? 'assessment').replace(/\s+/g, '_')}_run${load.id}_context.md`;
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(markdown);
  } catch (err: any) {
    res.status(500).send(`Error generating context document: ${err.message}`);
  }
});

router.get('/report', (req: Request, res: Response) => {
  let loadIds: number[] | undefined;
  if (req.query.run) {
    const n = Number(req.query.run);
    if (!isNaN(n) && n > 0) loadIds = [n];
  } else if (req.query.load) {
    const n = Number(req.query.load);
    if (!isNaN(n) && n > 0) loadIds = [n];
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildDataReport(loadIds));
});

export default router;
