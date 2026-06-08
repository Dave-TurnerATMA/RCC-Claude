import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
`;

const SHARED_JS = `
function showTab(n){
  document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('on',i==n));
  document.querySelectorAll('.tab').forEach((d,i)=>d.classList.toggle('on',i==n));
}
function openReport(id){
  window.open('/evca/loads/'+id+'/report','evca_report_'+id,'width=720,height=560,scrollbars=yes,resizable=yes');
}
function processLoad(id){
  if(!confirm('Run processing for load #'+id+'?')) return;
  fetch('/evca/process/'+id,{method:'POST'})
    .then(r=>r.json())
    .then(d=>{ alert(d.message); })
    .catch(()=>alert('Request failed'));
}
`;

// ── management page ───────────────────────────────────────────────────────────

function buildManagementPage(flash?: { type: 'ok' | 'err'; msg: string }): string {
  const loads = db.prepare(
    'SELECT * FROM evca_spreadsheet_loads ORDER BY id DESC'
  ).all() as any[];

  const flashHtml = flash
    ? `<div class="flash ${flash.type}">${esc(flash.msg)}</div>`
    : '';

  const loadRows = loads.map(l => {
    const report = l.report
      ? `<button class="btn-report btn" onclick="openReport(${l.id})">View Report</button>`
      : `<span class="id-label">none</span>`;
    const process = `<button class="btn-process btn" onclick="processLoad(${l.id})">Process</button>`;
    const view = `<a class="btn-view btn" href="/evca/report?load=${l.id}" target="_blank">View Data</a>`;
    return [
      fmt(l.id),
      fmt(l.filename),
      fmt(l.uploaded_at),
      statusBadge(l.status),
      report,
      `<div style="display:flex;gap:6px;flex-wrap:wrap">${process} ${view}</div>`,
    ];
  });

  const loadsTable = dtable(
    ['ID', 'Filename', 'Uploaded At', 'Status', 'Report', 'Actions'],
    loadRows
  );

  const uploadCard = card('Upload Spreadsheet', '', `
    <p class="hint">Select an EVCA spreadsheet (.xlsx) to upload. After uploading, click <strong>Process</strong> to import data into the database.</p>
    <form action="/evca/upload" method="post" enctype="multipart/form-data">
      <div class="upload-row">
        <input type="file" name="spreadsheet" accept=".xlsx" required>
        <button type="submit" class="btn btn-primary">Upload</button>
      </div>
    </form>
  `);

  const loadsCard = card('Uploaded Spreadsheets', 'evca_spreadsheet_loads', loadsTable);

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
${uploadCard}
${loadsCard}
</div>
<script>${SHARED_JS}</script>
</body></html>`;
}

// ── popup report page ─────────────────────────────────────────────────────────

function buildPopupReport(load: any): string {
  const reportText = load.report ?? 'No report available yet.';
  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8">
<title>Load Report #${load.id}</title>
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
<h2>Load Report — #${esc(String(load.id))}: ${esc(load.filename)}</h2>
<div class="meta">
  <strong>Uploaded:</strong> ${esc(load.uploaded_at)} &nbsp;|&nbsp;
  <strong>Status:</strong> ${esc(load.status)}
</div>
${load.report
  ? `<pre class="report">${esc(reportText)}</pre>`
  : `<p class="none">No report has been generated for this load yet.<br>Click <strong>Process</strong> on the management page to run import and validation.</p>`
}
</body></html>`;
}

// ── data report (10 tabs) ─────────────────────────────────────────────────────

function buildTab1(): string[] {
  const assessments = db.prepare('SELECT a.*, s.filename as load_filename FROM evca_assessments a LEFT JOIN evca_spreadsheet_loads s ON s.id=a.load_id ORDER BY a.id').all() as any[];
  const dimensions  = db.prepare('SELECT * FROM evca_dimensions ORDER BY display_order').all() as any[];

  const asmRows = assessments.map(a => [
    fmt(a.id), fmt(a.load_filename || a.load_id), fmt(a.village_name),
    fmt(a.district), fmt(a.province), fmt(a.country), fmt(a.start_date), fmt(a.responsible_person),
  ]);

  return [
    card('Assessments', 'evca_assessments',
      dtable(['ID', 'Source Load', 'Village', 'District', 'Province', 'Country', 'Start Date', 'Responsible Person'], asmRows)),
    card('EVCA Dimensions (reference)', 'evca_dimensions', refList(dimensions)),
  ];
}

function buildTab2(): string[] {
  const contexts = db.prepare(
    'SELECT cc.*, a.village_name FROM evca_community_context cc JOIN evca_assessments a ON a.id=cc.assessment_id'
  ).all() as any[];
  const popRows = db.prepare(
    'SELECT p.*, a.village_name FROM evca_population p JOIN evca_assessments a ON a.id=p.assessment_id ORDER BY a.id, p.age_group'
  ).all() as any[];
  const commTypes  = db.prepare('SELECT * FROM evca_ref_community_type').all() as any[];
  const geoEnvs    = db.prepare('SELECT * FROM evca_ref_geophysical_env ORDER BY env_type, id').all() as any[];
  const livelihoods = db.prepare('SELECT * FROM evca_ref_livelihood ORDER BY id').all() as any[];

  return [
    card('Community Context', 'evca_community_context',
      dtable(['Village', 'Community Type', 'Geo (location)', 'Geo (terrain)', 'Primary Livelihood', 'Secondary Livelihood'],
        contexts.map(c => [fmt(c.village_name), fmt(c.community_type), fmt(c.geophysical_env_1), fmt(c.geophysical_env_2), fmt(c.livelihood_primary), fmt(c.livelihood_secondary)]))),
    card('Population', 'evca_population',
      dtable(['Village', 'Age Group', 'Male', 'Female', 'Disability M', 'Disability F'],
        popRows.map(p => [fmt(p.village_name), fmt(p.age_group.replace(/_/g, '–')), fmt(p.male_count), fmt(p.female_count), fmt(p.disability_male), fmt(p.disability_female)]))),
    card('Reference: Community Types', 'evca_ref_community_type', refList(commTypes)),
    card('Reference: Geophysical Environments', 'evca_ref_geophysical_env',
      '<ul>' + geoEnvs.map(r => `<li><strong>${esc(r.env_type)}</strong>: ${esc(r.name_en)} (${esc(r.name_id)})</li>`).join('') + '</ul>'),
    card('Reference: Livelihood Activities', 'evca_ref_livelihood', refList(livelihoods)),
  ];
}

function buildTab3(): string[] {
  const hazards = db.prepare(
    'SELECT h.*, a.village_name FROM evca_hazards h JOIN evca_assessments a ON a.id=h.assessment_id ORDER BY a.id, h.hazard_number'
  ).all() as any[];
  return [
    card('Hazards', 'evca_hazards',
      dtable(['Village', '#', 'Name', 'Cause/Origin', 'Warning Signs', 'Action Time', 'Frequency', 'Period', 'Duration'],
        hazards.map(h => [fmt(h.village_name), fmt(h.hazard_number), fmt(h.hazard_name), fmt(h.cause_origin), fmt(h.warning_signs), fmt(h.action_time), fmt(h.frequency), fmt(h.occurrence_period), fmt(h.duration)]))),
  ];
}

function buildTab4(): string[] {
  const groups = db.prepare(
    'SELECT g.*, a.village_name FROM evca_vulnerable_groups g JOIN evca_assessments a ON a.id=g.assessment_id ORDER BY a.id, g.group_number'
  ).all() as any[];
  const ratings = db.prepare(
    'SELECT vr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name ' +
    'FROM evca_vulnerability_ratings vr ' +
    'JOIN evca_hazards h ON h.id=vr.hazard_id ' +
    'JOIN evca_assessments a ON a.id=vr.assessment_id ' +
    'LEFT JOIN evca_dimensions d ON d.display_order=vr.dimension_number ' +
    'ORDER BY a.id, h.hazard_number, vr.dimension_number'
  ).all() as any[];
  const vulnScale = db.prepare('SELECT * FROM evca_ref_vulnerability_rating ORDER BY numeric_value DESC').all() as any[];

  return [
    card('Vulnerable Groups', 'evca_vulnerable_groups',
      dtable(['Village', '#', 'Group Name', 'Vulnerability Reasons'],
        groups.map(g => [fmt(g.village_name), fmt(g.group_number), fmt(g.group_name), fmt(g.vulnerability_reasons)]))),
    card('Vulnerability Ratings', 'evca_vulnerability_ratings',
      dtable(['Village', 'Hazard', 'Dimension', 'Impact', 'Aspects', 'Rating', 'Value'],
        ratings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), fmt(r.impact_description), fmt(r.vulnerability_aspects), badge(r.rating_label), fmt(r.rating_value)]))),
    card('Reference: Vulnerability Scale', 'evca_ref_vulnerability_rating',
      dtable(['Label (ID)', 'Label (EN)', 'Value'],
        vulnScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))),
  ];
}

function buildTab5(): string[] {
  const ratings = db.prepare(
    'SELECT cr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name ' +
    'FROM evca_capacity_ratings cr ' +
    'JOIN evca_hazards h ON h.id=cr.hazard_id ' +
    'JOIN evca_assessments a ON a.id=cr.assessment_id ' +
    'LEFT JOIN evca_dimensions d ON d.display_order=cr.dimension_number ' +
    'ORDER BY a.id, h.hazard_number, cr.dimension_number'
  ).all() as any[];
  const capScale = db.prepare('SELECT * FROM evca_ref_capacity_rating ORDER BY numeric_value DESC').all() as any[];

  return [
    card('Capacity Ratings', 'evca_capacity_ratings',
      dtable(['Village', 'Hazard', 'Dimension', 'Capacity Description', 'Rating', 'Value'],
        ratings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), fmt(r.capacity_description), badge(r.rating_label), fmt(r.rating_value)]))),
    card('Reference: Capacity Scale', 'evca_ref_capacity_rating',
      dtable(['Label (ID)', 'Label (EN)', 'Value'],
        capScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))),
  ];
}

function buildTab6(): string[] {
  const social = db.prepare(
    'SELECT sd.*, a.village_name FROM evca_social_dimensions sd JOIN evca_assessments a ON a.id=sd.assessment_id ORDER BY a.id, sd.dimension'
  ).all() as any[];
  const socialScale = db.prepare('SELECT * FROM evca_ref_social_rating ORDER BY numeric_value DESC').all() as any[];

  return [
    card('Social Cohesion, Inclusion & Connectedness', 'evca_social_dimensions',
      dtable(['Village', 'Dimension', 'Description', 'Rating', 'Value'],
        social.map(s => [fmt(s.village_name), fmt(s.dimension.replace(/_/g, ' ')), fmt(s.description), badge(s.rating_label), fmt(s.rating_value)]))),
    card('Reference: Social Rating Scale', 'evca_ref_social_rating',
      dtable(['Label (ID)', 'Label (EN)', 'Value'],
        socialScale.map(r => [fmt(r.label_original), badge(r.label_english), fmt(r.numeric_value)]))),
  ];
}

function buildTab7(): string[] {
  const riskRatings = db.prepare(
    'SELECT rr.*, h.hazard_name, h.hazard_number, d.name_en as dim_name, a.village_name ' +
    'FROM evca_risk_ratings rr ' +
    'JOIN evca_hazards h ON h.id=rr.hazard_id ' +
    'JOIN evca_assessments a ON a.id=rr.assessment_id ' +
    'LEFT JOIN evca_dimensions d ON d.display_order=rr.dimension_number ' +
    'ORDER BY a.id, h.hazard_number, rr.dimension_number'
  ).all() as any[];

  return [
    card('Risk Ratings', 'evca_risk_ratings',
      dtable(['Village', 'Hazard', 'Dimension', 'Risk Rating'],
        riskRatings.map(r => [fmt(r.village_name), fmt(`H${r.hazard_number}: ${r.hazard_name}`), fmt(r.dim_name || `Dim ${r.dimension_number}`), badge(r.risk_label)]))),
  ];
}

function buildTab8(): string[] {
  const analysis = db.prepare(
    'SELECT ra.*, h.hazard_name, h.hazard_number, cd.name_en as dim_name, a.village_name ' +
    'FROM evca_risk_analysis ra ' +
    'JOIN evca_hazards h ON h.id=ra.hazard_id ' +
    'JOIN evca_assessments a ON a.id=ra.assessment_id ' +
    'LEFT JOIN evca_ref_consolidated_dimensions cd ON cd.dimension_number=ra.consolidated_dimension ' +
    'ORDER BY a.id, h.hazard_number, ra.consolidated_dimension'
  ).all() as any[];
  const narratives = db.prepare(
    'SELECT oa.*, a.village_name FROM evca_overall_analysis oa JOIN evca_assessments a ON a.id=oa.assessment_id'
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

function buildTab9(): string[] {
  const items = db.prepare(
    'SELECT ai.*, a.village_name FROM evca_action_items ai JOIN evca_assessments a ON a.id=ai.assessment_id ORDER BY a.id, ai.item_order'
  ).all() as any[];
  const validations = db.prepare(
    'SELECT av.*, a.village_name FROM evca_action_validation av JOIN evca_assessments a ON a.id=av.assessment_id'
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

function buildTab10(): string[] {
  const scores = db.prepare(
    'SELECT ps.*, a.village_name FROM evca_priority_scores_flat ps JOIN evca_assessments a ON a.id=ps.assessment_id ORDER BY a.id, ps.id'
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

function buildDataReport(): string {
  const tabContents = [
    buildTab1(), buildTab2(), buildTab3(), buildTab4(), buildTab5(),
    buildTab6(), buildTab7(), buildTab8(), buildTab9(), buildTab10(),
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
<h1>EVCA Data Report <small>Enhanced Vulnerability &amp; Capacity Assessment</small>
  <a href="/evca">← Manage Uploads</a>
</h1>
<nav>${btns}</nav>
${tabs}
<script>${SHARED_JS}</script>
</body></html>`;
}

// ── routes ────────────────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  const uploaded = req.query.uploaded as string | undefined;
  const flash = uploaded
    ? { type: 'ok' as const, msg: `Spreadsheet uploaded successfully as load #${uploaded}. Click Process to import data.` }
    : undefined;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildManagementPage(flash));
});

router.post('/upload', upload.single('spreadsheet'), (req: Request, res: Response) => {
  if (!req.file) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(buildManagementPage({
      type: 'err',
      msg: 'No file received. Please select an .xlsx file and try again.',
    }));
  }

  const loadId = (db.prepare(
    'INSERT INTO evca_spreadsheet_loads (filename, stored_filename, status) VALUES (?, ?, ?)'
  ).run(req.file.originalname, req.file.filename, 'pending') as any).lastInsertRowid;

  res.redirect(`/evca?uploaded=${loadId}`);
});

router.post('/process/:id', (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).json({ error: 'Load not found' });

  res.json({
    message: `Processing is not yet implemented. Load #${load.id} (${load.filename}) is queued. The import script will be added in a future step.`,
  });
});

router.get('/loads/:id/report', (req: Request, res: Response) => {
  const load = db.prepare('SELECT * FROM evca_spreadsheet_loads WHERE id=?').get(req.params.id) as any;
  if (!load) return res.status(404).send('<h2>Load not found</h2>');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildPopupReport(load));
});

router.get('/report', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildDataReport());
});

export default router;
