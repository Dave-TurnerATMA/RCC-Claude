-- EVCA Spreadsheet Metadata
-- Blocks 1-31 covering Tabs 1-7 of EVCA_Desa_Para_Lando.xlsx
-- All positions are 1-based row numbers, Excel column letters.

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS evca_sheet_blocks (
    id                    INTEGER PRIMARY KEY,
    sheet_index           INTEGER NOT NULL,
    sheet_name_original   TEXT    NOT NULL,
    sheet_name_english    TEXT    NOT NULL,
    block_name_original   TEXT,
    block_name_english    TEXT,
    table_name            TEXT,
    target_column         TEXT,
    block_type            TEXT    NOT NULL CHECK(block_type IN ('single','repeating','reference')),
    identification_method TEXT,
    cell_range_start      TEXT,
    cell_range_end        TEXT,
    row_start             INTEGER,
    row_end               INTEGER,
    col_start             TEXT,
    col_end               TEXT,
    is_reference_data     INTEGER DEFAULT 0,
    notes                 TEXT
);

CREATE TABLE IF NOT EXISTS evca_block_fields (
    id                   INTEGER PRIMARY KEY,
    block_id             INTEGER NOT NULL REFERENCES evca_sheet_blocks(id),
    field_name_original  TEXT    NOT NULL,
    field_name_english   TEXT    NOT NULL,
    column_letter        TEXT,
    row_number           INTEGER,
    db_column_name       TEXT,
    db_data_type         TEXT,
    is_computed          INTEGER DEFAULT 0,
    valid_values         TEXT,
    notes                TEXT
);

CREATE TABLE IF NOT EXISTS evca_reference_data (
    id            INTEGER PRIMARY KEY,
    block_id      INTEGER NOT NULL REFERENCES evca_sheet_blocks(id),
    row_number    INTEGER NOT NULL,
    value_original TEXT,
    value_english  TEXT,
    numeric_value  REAL,
    display_order  INTEGER
);


-- ============================================================
-- TAB 1  (sheet_index=0)  "1. Ringkasan"  —  blocks 1-4
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (1, 0, '1. Ringkasan', 'Summary',
     'Informasi Umum', 'General Information', 'evca_assessments', NULL,
     'single', 'light gray fill #F2F2F2, gray header #BFBFBF row 5, medium-bordered data cells',
     'E6', 'G16', 6, 16, 'E', 'G', 0,
     'Top-level record. Cell values contain embedded label prefix before colon — strip on import.'),

    (2, 0, '1. Ringkasan', 'Summary',
     '1.a Ringkasan Utama', 'Main Summary Narrative', 'evca_assessments', 'assessment_selection_narrative',
     'single', 'red fill #F7323F section; medium-border merged text area; row 22 is template instruction (blue-gray #8496B0)',
     'C24', 'Z32', 24, 32, 'C', 'Z', 0,
     'UPDATE evca_assessments SET assessment_selection_narrative. Row 22 is instruction text not data.'),

    (3, 0, '1. Ringkasan', 'Summary',
     '1.b Pola Risiko', 'Risk Pattern Summary', 'evca_risk_summary', NULL,
     'repeating', 'red #F7323F section header row 36; dark red #C00000 hazard sub-headers rows 39/53/67; gray #BFBFBF col headers; alternating fills; bordered',
     'C39', 'E79', 39, 79, 'C', 'E', 0,
     'DERIVED — formula refs from Sheet 7. 3 hazard sub-blocks x 11 rows. H1: rows 41-51, H2: rows 55-65, H3: rows 69-79. #N/A = NULL.'),

    (4, 0, '1. Ringkasan', 'Summary',
     'Dimensi', 'Assessment Dimensions', 'evca_dimensions', NULL,
     'reference', 'gray #BFBFBF col header row 40; 11 dimension rows 41-51; alternating fills within 1.b block',
     'C40', 'C51', 40, 51, 'C', 'C', 1,
     'Canonical list of 11 EVCA dimensions. Row 40 = column header ''Dimensi''; rows 41-51 = dimension labels.');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (1, 'Nama Desa/Kelurahan',   'Village name',       'E', 6,  'village_name',                  'TEXT', 0, NULL, 'Value only, no label prefix'),
    (1, 'KabupatenKota',         'District',           'G', 6,  'district',                      'TEXT', 0, NULL, 'Strip prefix "KabupatenKota: "'),
    (1, 'Provinsi',              'Province',           'E', 8,  'province',                      'TEXT', 0, NULL, 'Strip prefix "Provinsi: "'),
    (1, 'Negara',                'Country',            'G', 8,  'country',                       'TEXT', 0, NULL, 'Strip prefix "Negara: "'),
    (1, 'Perhimpunan Nasional',  'National society',   'E', 10, 'national_society',              'TEXT', 0, NULL, 'Strip prefix "Perhimpunan Nasional: "'),
    (1, 'Cabang',                'Branch',             'G', 10, 'branch',                        'TEXT', 0, NULL, 'Strip prefix "Cabang: "'),
    (1, 'Tanggal mulai eVCA',    'Start date',         'E', 12, 'start_date',                    'DATE', 0, NULL, 'Strip prefix; parse Indonesian date format'),
    (1, 'Penanggung jawab',      'Responsible person', 'G', 12, 'responsible_person',            'TEXT', 0, NULL, 'Strip prefix "Penanggung jawab: "'),
    (1, 'Tanggal berakhir eVCA', 'End date',           'E', 14, 'end_date',                      'DATE', 0, NULL, 'Strip prefix; parse Indonesian date format'),
    (1, 'Posisi',                'Position/role',      'G', 14, 'responsible_position',          'TEXT', 0, NULL, 'Strip prefix "Posisi: "'),
    (1, 'Koordinat GPS',         'GPS coordinates',    'E', 16, 'gps_coordinates',               'TEXT', 0, NULL, 'Strip prefix "Koordinat GPS Desa/Kelurahan: "'),
    (1, 'Email',                 'Email',              'G', 16, 'email',                         'TEXT', 0, NULL, 'Strip prefix "email: "'),
    (2, '1.a Ringkasan Utama',   'Selection narrative','C', 24, 'assessment_selection_narrative', 'TEXT', 0, NULL, 'Merged text area C24:Z32'),
    (3, 'Ancaman - Dimensi',     'Hazard - Dimension', 'C', 40, NULL,                            'TEXT', 0, NULL, 'Col header row within block; actual data rows 41-51/55-65/69-79'),
    (3, 'Rating Risiko',         'Risk rating',        'E', 41, 'risk_label',                    'TEXT', 0, '["HIGH","MODERATE","LOW","TINGGI","SEDANG","RENDAH"]', 'First data row; #N/A stored as NULL'),
    (4, 'Dimensi',               'Dimension name',     'C', NULL, 'name_id',                     'TEXT', 0, NULL, '11 rows 41-51');

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, display_order)
VALUES
    (4, 41, '1. Manajemen Risiko',             'Risk/Disaster Management',    1),
    (4, 42, '2. Kesehatan',                    'Health',                      2),
    (4, 43, '3. Air dan Sanitasi',             'Water and Sanitation',        3),
    (4, 44, '4. Hunian',                       'Shelter/Housing',             4),
    (4, 45, '5. Pangan dan Nutrisi',           'Food and Nutrition',          5),
    (4, 46, '6. Kohesi Sosial',                'Social Cohesion',             6),
    (4, 47, '7. Inklusi',                      'Inclusion',                   7),
    (4, 48, '8. Peluang Ekonomi',              'Economic Opportunity',        8),
    (4, 49, '9. Infrastruktur dan Layanan',    'Infrastructure and Services', 9),
    (4, 50, '10. Pengelolaan Sumber Daya Alam','Natural Resource Management', 10),
    (4, 51, '11. Keterhubungan',               'Connectedness',               11);


-- ============================================================
-- TAB 2  (sheet_index=1)  "2. Latarbelakang"  —  blocks 5-12
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (5, 1, '2. Latarbelakang', 'Background',
     'Deskripsi komunitas', 'Community Description', 'evca_community_context', 'community_description',
     'single', 'teal fill #7A9090, medium border all sides, merged C13:W13',
     'C13', 'W13', 13, 13, 'C', 'W', 0,
     'UPDATE evca_community_context SET community_description'),

    (6, 1, '2. Latarbelakang', 'Background',
     '3a Populasi', 'Population Table', 'evca_population', NULL,
     'single', 'teal fill section header row 15; medium borders on data-entry rows (R20 counts, R24 disability); thin borders on computed rows (R22 proportions)',
     'C15', 'W27', 15, 27, 'C', 'W', 0,
     'Matrix: age groups across cols (E-G=0-5, I-K=6-17, M-O=18-65, Q-S=66+, U-W=total). 4 INSERT rows. R22/R27 are computed — do not import. R26 participants stored on evca_community_context.'),

    (7, 1, '2. Latarbelakang', 'Background',
     '3b/3c/3d Konteks', 'Community Context', 'evca_community_context', NULL,
     'single', 'teal fill, medium borders; 3 side-by-side field groups rows 29-33',
     'C29', 'W33', 29, 33, 'C', 'W', 0,
     'Primary INSERT for evca_community_context. community_type E29; geophysical M29/M31; livelihood U29/U31; comments row 33.'),

    (8, 1, '2. Latarbelakang', 'Background',
     '3. Proses penilaian', 'Assessment Process Narrative', 'evca_community_context', 'assessment_process',
     'single', 'teal fill, medium border, merged C42:W42; row 40 is instruction text',
     'C42', 'W42', 42, 42, 'C', 'W', 0,
     'UPDATE evca_community_context SET assessment_process. Row 40 is instruction, not data.'),

    (9, 1, '2. Latarbelakang', 'Background',
     'Drop-down list 2b', 'Ref: Community Type', 'evca_ref_community_type', NULL,
     'reference', 'no fill, no borders, col C rows 47-49',
     'C47', 'C49', 47, 49, 'C', 'C', 1, NULL),

    (10, 1, '2. Latarbelakang', 'Background',
     'Drop-down list 2c1', 'Ref: Geophysical Location', 'evca_ref_geophysical_env', NULL,
     'reference', 'no fill, no borders, col C rows 52-54',
     'C52', 'C54', 52, 54, 'C', 'C', 1, 'env_type=location'),

    (11, 1, '2. Latarbelakang', 'Background',
     'Drop-down list 2c2', 'Ref: Terrain Type', 'evca_ref_geophysical_env', NULL,
     'reference', 'no fill, no borders, col C rows 57-58',
     'C57', 'C58', 57, 58, 'C', 'C', 1, 'env_type=terrain; same table as block 10'),

    (12, 1, '2. Latarbelakang', 'Background',
     'Drop-down list 2d', 'Ref: Livelihood Activities', 'evca_ref_livelihood', NULL,
     'reference', 'no fill, no borders, col E rows 47-54',
     'E47', 'E54', 47, 54, 'E', 'E', 1, NULL);

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (5,  'Deskripsi komunitas',       'Community description',      'C', 13,  'community_description',   'TEXT',    0, NULL, 'Merged C13:W13'),
    (6,  'Jumlah orang',              'Population count',           NULL, 20, NULL,                      'INTEGER', 0, NULL, 'Data row 20; medium borders. Cols E/F=0-5M/F, I/J=6-17M/F, M/N=18-65M/F, Q/R=66+M/F, U/V=totals'),
    (6,  'Penyandang disabilitas',    'Disability count',           NULL, 24, NULL,                      'INTEGER', 0, NULL, 'Data row 24; same column layout as row 20'),
    (6,  'Peserta eVCA',              'eVCA participants',          'U', 26,  'evca_participants_male',  'INTEGER', 0, NULL, 'Cols U/V; stored on evca_community_context'),
    (7,  '3b Jenis konteks',          'Community type',             'E', 29,  'community_type',          'TEXT',    0, '["Perkotaan","Pedesaan","Campuran"]', 'Merged E29:G31'),
    (7,  'Komentar konteks',          'Community type comments',    'E', 33,  'community_type_comments', 'TEXT',    0, NULL, 'Merged E33:G33'),
    (7,  '3c Lingkungan geofisika 1', 'Geophysical env (location)', 'M', 29,  'geophysical_env_1',       'TEXT',    0, NULL, 'Merged M29:O29; from drop-down 2c1'),
    (7,  '3c Lingkungan geofisika 2', 'Geophysical env (terrain)',  'M', 31,  'geophysical_env_2',       'TEXT',    0, NULL, 'Merged M31:O31; from drop-down 2c2'),
    (7,  'Komentar geofisika',        'Geophysical comments',       'M', 33,  'geophysical_comments',    'TEXT',    0, NULL, 'Merged M33:O33'),
    (7,  '3d Mata pencaharian 1',     'Livelihood primary',         'U', 29,  'livelihood_primary',      'TEXT',    0, NULL, 'Merged U29:W29; from drop-down 2d'),
    (7,  '3d Mata pencaharian 2',     'Livelihood secondary',       'U', 31,  'livelihood_secondary',    'TEXT',    0, NULL, 'Merged U31:W31; from drop-down 2d'),
    (7,  'Mata pencaharian lainnya',  'Other livelihoods',          'U', 33,  'livelihood_other',        'TEXT',    0, NULL, 'Merged U33:W33; free text'),
    (8,  'Proses penilaian',          'Assessment process',         'C', 42,  'assessment_process',      'TEXT',    0, NULL, 'Merged C42:W42');

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, display_order)
VALUES
    (9,  47, 'Perkotaan',  'Urban',  1),
    (9,  48, 'Pedesaan',   'Rural',  2),
    (9,  49, 'Campuran',   'Mixed',  3),
    (10, 52, 'Pesisir',                           'Coastal',                  1),
    (10, 53, 'Perkotaan, dengan sungai-sungai besar', 'Urban with large rivers', 2),
    (10, 54, 'Pedalaman, tidak ada sungai besar', 'Inland, no large rivers',  3),
    (11, 57, 'Terutama medan datar',              'Mainly flat terrain',      1),
    (11, 58, 'Terutama daerah pegunungan',        'Mainly mountainous',       2),
    (12, 47, 'Produksi tanaman dan sayuran',      'Crop and vegetable production', 1),
    (12, 48, 'Pertanian dan Peternakan',          'Farming and Livestock',    2),
    (12, 49, 'Memancing, budidaya ikan, koleksi produk perairan', 'Fishing/aquaculture', 3),
    (12, 51, 'Manufaktur',                        'Manufacturing',            4),
    (12, 52, 'Layanan',                           'Services',                 5),
    (12, 53, 'Nelayan, Perkebunan, Pedagang',     'Fisher/Plantation/Trader', 6),
    (12, 54, 'Wiraswasta',                        'Self-employed',            7);


-- ============================================================
-- TAB 3  (sheet_index=2)  "3. Ancaman"  —  blocks 13-16
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (13, 2, '3. Ancaman', 'Priority Hazards',
     'Seleksi ancaman', 'Hazard selection rationale', 'evca_assessments', 'hazard_selection_rationale',
     'single', 'teal #7A9090 + light gray #F2F2F2, medium border, merged C14:W14',
     'C14', 'W14', 14, 14, 'C', 'W', 0,
     'UPDATE evca_assessments SET hazard_selection_rationale'),

    (14, 2, '3. Ancaman', 'Priority Hazards',
     'Ancaman 1/2/3', 'Hazard Data', 'evca_hazards', NULL,
     'repeating', 'dark red #C00000 / orange #F7323F sub-headers; #D8D8D8/#F2F2F2 field label rows; medium borders on data cells; label col C or M, value merged E-K or O-W',
     'C16', 'W46', 16, 46, 'C', 'W', 0,
     'Non-standard layout: H1+H2 side-by-side rows 16-30 (H1 cols C-K, H2 cols M-W); H3 below rows 32-46 cols C-K. Field row offsets from hazard header: +2=name, +4=cause, +6=warnings, +8=action_time, +10=frequency, +12=period, +14=duration.'),

    (15, 2, '3. Ancaman', 'Priority Hazards',
     'Jumlah bahaya prioritas', 'Priority hazard count', 'evca_assessments', 'priority_hazard_count',
     'single', 'medium border; value in col V row 48',
     'V48', 'V48', 48, 48, 'V', 'V', 0,
     'UPDATE evca_assessments SET priority_hazard_count. Integer 1-3.'),

    (16, 2, '3. Ancaman', 'Priority Hazards',
     'Referensi nama ancaman', 'Hazard name helper (col AA)', 'evca_hazards', NULL,
     'reference', 'no fill, no borders; col AA outside visible form area; AA1=header, AA2=H1 name, AA3=H2 name',
     'AA1', 'AA3', 1, 3, 'AA', 'AA', 1,
     'Hidden formula helper. AA2=hazard 1 canonical name, AA3=hazard 2. Read to validate evca_hazards rows after import.');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (13, 'Seleksi ancaman',       'Hazard selection rationale', 'C', 14, 'hazard_selection_rationale', 'TEXT',    0, NULL, 'Merged C14:W14'),
    (14, 'Nama Ancaman/tipe',     'Hazard name/type',           'E', 18, 'hazard_name',                'TEXT',    0, NULL, 'H1=E18 merged E-K; H2=O18 merged O-W; H3=E34 merged E-K'),
    (14, 'Penyebab/asal',         'Cause/origin',               'E', 20, 'cause_origin',               'TEXT',    0, NULL, 'H1=E20; H2=O20; H3=E36'),
    (14, 'Tanda peringatan',      'Warning signs',              'E', 22, 'warning_signs',              'TEXT',    0, NULL, 'H1=E22; H2=O22; H3=E38'),
    (14, 'Waktu aksi',            'Action time',                'E', 24, 'action_time',                'TEXT',    0, NULL, 'H1=E24; H2=O24; H3=E40'),
    (14, 'Frekuensi',             'Frequency',                  'E', 26, 'frequency',                  'TEXT',    0, NULL, 'H1=E26; H2=O26; H3=E42'),
    (14, 'Periode terjadinya',    'Occurrence period',          'E', 28, 'occurrence_period',          'TEXT',    0, NULL, 'H1=E28; H2=O28; H3=E44'),
    (14, 'Durasi',                'Duration',                   'E', 30, 'duration',                   'TEXT',    0, NULL, 'H1=E30; H2=O30; H3=E46'),
    (15, 'Jumlah bahaya prioritas','Priority hazard count',     'V', 48, 'priority_hazard_count',      'INTEGER', 0, '[1,2,3]', 'Value cell V48');

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, display_order)
VALUES
    (16, 2, 'Banjir Rob',    'Tidal Flooding',  1),
    (16, 3, 'Abrasi Pantai', 'Coastal Erosion', 2);


-- ============================================================
-- TAB 4  (sheet_index=3)  "4. Kerentanan"  —  blocks 17-20
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (17, 3, '4. Kerentanan', 'Vulnerability',
     'Analisis kerentanan', 'Vulnerability overview', 'evca_assessments', 'vulnerability_overview',
     'single', 'teal #7A9090 + light gray #F2F2F2, medium border, merged C12:V12',
     'C12', 'V12', 12, 12, 'C', 'V', 0,
     'UPDATE evca_assessments SET vulnerability_overview'),

    (18, 3, '4. Kerentanan', 'Vulnerability',
     'Kelompok rentan', 'Vulnerable groups', 'evca_vulnerable_groups', NULL,
     'repeating', 'teal + gray #BFBFBF header row 14; 4 data rows alternating fills; medium borders; group name merged E-K, reasons merged O-V',
     'C14', 'V22', 14, 22, 'C', 'V', 0,
     '4 groups. Label col C, name cols E-K, reasons cols O-V. Data rows 16/18/20/22; odd rows are spacers.'),

    (19, 3, '4. Kerentanan', 'Vulnerability',
     'Ancaman 1/2/3 Kerentanan', 'Vulnerability ratings by hazard', 'evca_vulnerability_ratings', NULL,
     'repeating', 'dark red #C00000 / orange #F7323F / theme hazard headers; gray #A5A5A5 col headers; medium borders on data cells',
     'C24', 'V66', 24, 66, 'C', 'V', 0,
     'One table, FK to evca_hazards. 8 standard dims per hazard. Cols: C=dim label, G-K=impact, M-R=aspects, S-U=rating, V=value. H1 data rows 29-36; H2 rows 43-50; H3 rows 57-64. Cross-cutting rows (#REF!) skipped. #N/A = NULL.'),

    (20, 3, '4. Kerentanan', 'Vulnerability',
     'Skala penilaian kerentanan', 'Ref: Vulnerability rating scale', 'evca_ref_vulnerability_rating', NULL,
     'reference', 'no fill, no borders; col C=label, D=value; rows 69-72',
     'C69', 'D73', 69, 73, 'C', 'D', 1, NULL);

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (17, 'Analisis kerentanan',  'Vulnerability overview',    'C', 12,  'vulnerability_overview',  'TEXT',    0, NULL, 'Merged C12:V12'),
    (18, 'Kelompok rentan',      'Vulnerable group name',     'E', NULL, 'group_name',              'TEXT',    0, NULL, 'Merged E-K; rows 16/18/20/22'),
    (18, 'Kerentanan khusus',    'Vulnerability reasons',     'O', NULL, 'vulnerability_reasons',   'TEXT',    0, NULL, 'Merged O-V; same rows as group_name'),
    (19, 'Dimensi',              'Dimension',                 'C', NULL, 'dimension_number',        'INTEGER', 0, '[1,2,3,4,5,6,7,8]', 'Parsed from label e.g. "1. Manajemen Risiko" → 1'),
    (19, 'Dampak',               'Impact description',        'G', NULL, 'impact_description',      'TEXT',    0, NULL, 'Merged G-K'),
    (19, 'Aspek kerentanan',     'Vulnerability aspects',     'M', NULL, 'vulnerability_aspects',   'TEXT',    0, NULL, 'Merged M-R'),
    (19, 'Peringkat kerentanan', 'Rating label',              'S', NULL, 'rating_label',            'TEXT',    0, '["Kerentanan TINGGI","Kerentanan SEDANG","Kerentanan RENDAH","Kerentanan TIDAK ADA"]', 'Merged S-U'),
    (19, 'Nilai Kerentanan',     'Rating value',              'V', NULL, 'rating_value',            'REAL',    1, '[0,0.33,0.67,1]', 'Computed from rating label; #N/A = NULL');

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, numeric_value, display_order)
VALUES
    (20, 69, 'Kerentanan TINGGI',    'HIGH',     1.00, 1),
    (20, 70, 'Kerentanan SEDANG',    'MODERATE', 0.67, 2),
    (20, 71, 'Kerentanan RENDAH',    'LOW',      0.33, 3),
    (20, 72, 'Kerentanan TIDAK ADA', 'NONE',     0.00, 4);


-- ============================================================
-- TAB 5  (sheet_index=4)  "5. Kapasitas"  —  blocks 21-25
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (21, 4, '5. Kapasitas', 'Capacity',
     'Analisis Singkat Keseluruhan Kapasitas', 'Overall Capacity Summary',
     'evca_assessments', 'capacity_overview', 'single',
     'medium border all sides, light-gray fill #F2F2F2, row 14',
     'C14', 'R14', 14, 14, 'C', 'R', 0,
     'UPDATE evca_assessments SET capacity_overview; one text box per assessment'),

    (22, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 1 Kapasitas', 'Hazard 1 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'dark-red header fill #C00000, row 16; data rows 19-28 cols C/G/M/P',
     'C19', 'P28', 19, 28, 'C', 'P', 0,
     '8 standard dimensions; dims 9-10 are #REF! → skip'),

    (23, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 2 Kapasitas', 'Hazard 2 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'red header fill #F7323F, row 30; data rows 33-42 cols C/G/M/P',
     'C33', 'P42', 33, 42, 'C', 'P', 0,
     '8 standard dimensions; same table as block 22, different hazard_id'),

    (24, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 3 Kapasitas', 'Hazard 3 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'theme fill header row 44; data rows 47-56 cols C/G/M/P',
     'C47', 'P56', 47, 56, 'C', 'P', 0,
     'Empty in Para Lando; #N/A → NULL; same table as blocks 22-23'),

    (25, 4, '5. Kapasitas', 'Capacity',
     'Skala Rating Kapasitas', 'Capacity Rating Scale',
     'evca_ref_capacity_rating', NULL, 'reference',
     'unformatted rows below main data, rows 60-63',
     'C60', 'D63', 60, 63, 'C', 'D', 1,
     'Drop-down validation list; 4 rating levels');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (21, 'Analisis Singkat Keseluruhan Kapasitas', 'Overall Capacity Narrative',    'C', 14, 'capacity_overview',   'TEXT',    0, NULL, NULL),
    (22, 'Dimensi',           'Dimension Number',     'C', 18, 'dimension_number',    'INTEGER', 0, NULL, 'Col header row'),
    (22, 'Kapasitas',         'Capacity Description', 'G', 18, 'capacity_description','TEXT',    0, NULL, 'Medium border data entry'),
    (22, 'Rating Kapasitas',  'Capacity Rating Label','M', 18, 'rating_label',        'TEXT',    0, NULL, NULL),
    (22, 'Nilai Kapasitas',   'Capacity Rating Value','P', 18, 'rating_value',        'REAL',    1, NULL, 'Computed; thin border'),
    (23, 'Dimensi',           'Dimension Number',     'C', 32, 'dimension_number',    'INTEGER', 0, NULL, 'Col header row'),
    (23, 'Rating Kapasitas',  'Capacity Rating Label','M', 32, 'rating_label',        'TEXT',    0, NULL, NULL),
    (24, 'Dimensi',           'Dimension Number',     'C', 46, 'dimension_number',    'INTEGER', 0, NULL, 'Col header row'),
    (25, 'Rating Label',      'Rating Label',         'C', 60, 'label_original',      'TEXT',    0, NULL, NULL),
    (25, 'Nilai',             'Numeric Value',        'D', 60, 'numeric_value',       'REAL',    0, NULL, NULL);

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, numeric_value, display_order)
VALUES
    (25, 60, 'Kapasitas TINGGI',    'HIGH',     1.00, 1),
    (25, 61, 'Kapasitas SEDANG',    'MODERATE', 0.67, 2),
    (25, 62, 'Kapasitas RENDAH',    'LOW',      0.33, 3),
    (25, 63, 'Kapasitas TIDAK ADA', 'NONE',     0.00, 4);


-- ============================================================
-- TAB 6  (sheet_index=5)  "6. Kohesi, Inklusi, Terhubung"  —  blocks 26-28
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (26, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Analisis Keseluruhan Dimensi Ketahanan', 'Overall Resilience Dimensions Narrative',
     'evca_assessments', 'social_dimensions_overview', 'single',
     'medium border all sides, light-gray fill #F2F2F2, row 12',
     'C12', 'R12', 12, 12, 'C', 'R', 0,
     'UPDATE evca_assessments; one text box per assessment'),

    (27, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Peringkat Kohesi Sosial, Inklusi & Keterhubungan', 'Social Cohesion, Inclusion & Connectedness Ratings',
     'evca_social_dimensions', NULL, 'repeating',
     'thin-border dim labels col C; medium-border description col G; rating col S; value col T; rows 16-18',
     'C16', 'T18', 16, 18, 'C', 'T', 0,
     '3 rows, one per dimension. Col layout differs from Tabs 4-5: S=rating, T=value.'),

    (28, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Skala Rating Sosial', 'Social Dimension Rating Scale',
     'evca_ref_social_rating', NULL, 'reference',
     'unformatted rows below main data, rows 22-24',
     'C22', 'D24', 22, 24, 'C', 'D', 1,
     '3 rating levels only (no TIDAK ADA)');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (26, 'Analisis Keseluruhan', 'Overall Narrative',   'C', 12, 'social_dimensions_overview', 'TEXT', 0, NULL, NULL),
    (27, 'Dimensi',              'Dimension',           'C', 16, 'dimension',    'TEXT', 0, NULL, NULL),
    (27, 'Deskripsi',            'Description',         'G', 16, 'description',  'TEXT', 0, NULL, 'Medium border data entry'),
    (27, 'Peringkat',            'Rating Label',        'S', 16, 'rating_label', 'TEXT', 0, NULL, NULL),
    (27, 'Nilai',                'Rating Value',        'T', 16, 'rating_value', 'REAL', 1, NULL, 'Computed; thin border'),
    (28, 'Rating Label',         'Rating Label',        'C', 22, 'label_original','TEXT',0, NULL, NULL),
    (28, 'Nilai',                'Numeric Value',       'D', 22, 'numeric_value', 'REAL',0, NULL, NULL);

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, numeric_value, display_order)
VALUES
    (28, 22, 'TINGGI', 'HIGH',     1.00, 1),
    (28, 23, 'SEDANG', 'MODERATE', 0.67, 2),
    (28, 24, 'RENDAH', 'LOW',      0.33, 3);


-- ============================================================
-- TAB 7  (sheet_index=6)  "7. Risiko"  —  blocks 29-31
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (29, 6, '7. Risiko', 'Risk',
     'Ancaman 1 Risiko', 'Hazard 1 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'dark-red header fill #C00000, row 12; data rows 15-25, cols C/H/J/M',
     'C15', 'M25', 15, 25, 'C', 'M', 0,
     'ALL cells computed (thin borders). Dims 9-11: H/J = literal N/A.'),

    (30, 6, '7. Risiko', 'Risk',
     'Ancaman 2 Risiko', 'Hazard 2 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'red header fill #F7323F, row 27; data rows 30-40, cols C/H/J/M',
     'C30', 'M40', 30, 40, 'C', 'M', 0,
     'Dims 5 and 7 have #N/A in vulnerability col → NULL; same table as block 29'),

    (31, 6, '7. Risiko', 'Risk',
     'Ancaman 3 Risiko', 'Hazard 3 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'theme fill header, row 42; data rows 45-55, cols C/H/J/M',
     'C45', 'M55', 45, 55, 'C', 'M', 0,
     'Dims 1-8 all #N/A → NULL; dims 9-11 carry social ratings; same table as blocks 29-30');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (29, 'Dimensi',       'Dimension Number',    'C', 14, 'dimension_number', 'INTEGER', 0, NULL, 'Col header row 14'),
    (29, 'KERENTANAN',    'Vulnerability Value', 'H', 14, NULL,               'REAL',    1, NULL, 'Read-only; not stored'),
    (29, 'KAPASITAS',     'Capacity Value',      'J', 14, NULL,               'REAL',    1, NULL, 'Read-only; not stored'),
    (29, 'Rating RISIKO', 'Risk Rating Label',   'M', 14, 'risk_label',       'TEXT',    1, '["HIGH","MODERATE","LOW","TINGGI","SEDANG","RENDAH"]', NULL),
    (30, 'Dimensi',       'Dimension Number',    'C', 29, 'dimension_number', 'INTEGER', 0, NULL, 'Col header row 29'),
    (30, 'Rating RISIKO', 'Risk Rating Label',   'M', 29, 'risk_label',       'TEXT',    1, NULL, NULL),
    (31, 'Dimensi',       'Dimension Number',    'C', 44, 'dimension_number', 'INTEGER', 0, NULL, 'Col header row 44'),
    (31, 'Rating RISIKO', 'Risk Rating Label',   'M', 44, 'risk_label',       'TEXT',    1, NULL, NULL);


-- ============================================================
-- TAB 8  (sheet_index=7)  "8. Analisis"  —  blocks 32-34
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (32, 7, '8. Analisis', 'Analysis',
     'Konsolidasi Informasi Risiko', 'Risk Consolidation Table',
     'evca_risk_analysis', NULL, 'repeating',
     'alternating #D8D8D8/#F2F2F2 fills; thin borders; col C merged C-E per row; col headers row 12',
     'C14', 'N22', 14, 22, 'C', 'N', 0,
     'Col C=hazard name (first row of each hazard group only; merged-cell None for subsequent rows). H1 rows 14-20 (data present); H2 rows 21-22 (2 placeholder rows, no data entered); H3 row 25 (merge exists, no data). Import: track current hazard_id; step through rows while G has a dimension name.'),

    (33, 7, '8. Analisis', 'Analysis',
     'Analisa Risiko', 'Overall Risk Narrative',
     'evca_overall_analysis', NULL, 'single',
     'medium border, light-gray #F2F2F2 fill, single merged cell C30:O30; instruction text #333F4F row 28',
     'C30', 'O30', 30, 30, 'C', 'O', 0,
     'Row 28 is instruction text (not data). Single narrative per assessment.'),

    (34, 7, '8. Analisis', 'Analysis',
     'Referensi dimensi konsolidasi', 'Ref: Consolidated Dimensions',
     'evca_ref_consolidated_dimensions', NULL, 'reference',
     'no fill, no borders; col G; row 33 = "Drop-down" label; rows 34-40 = 7 values',
     'G34', 'G40', 34, 40, 'G', 'G', 1, NULL);

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (32, 'Ancaman',                'Hazard name',             'C', 12, NULL,                    'TEXT',    0, NULL, 'First row of each hazard group only; look up hazard_id from evca_hazards'),
    (32, 'Dimensi',                'Consolidated dimension',  'G', 12, 'consolidated_dimension', 'INTEGER', 0, '[1,2,3,4,5,6,7]', 'Parse number prefix from label e.g. "1. Manajemen…" → 1'),
    (32, 'Aspek kerentanan',       'Vulnerability aspects',   'J', 12, 'vulnerability_aspects',  'TEXT',    0, NULL, NULL),
    (32, 'Aspek kapasitas',        'Capacity aspects',        'L', 12, 'capacity_aspects',       'TEXT',    0, NULL, NULL),
    (32, 'Ringkasan risiko utama', 'Key risk summary',        'N', 12, 'key_risk_summary',       'TEXT',    0, NULL, NULL),
    (33, 'Analisa Risiko',         'Overall risk narrative',  'C', 30, 'overall_narrative',      'TEXT',    0, NULL, 'Merged C30:O30'),
    (34, 'Dimensi konsolidasi',    'Consolidated dim name',   'G', 34, 'name_id',                'TEXT',    0, NULL, '7 rows 34-40');

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, display_order)
VALUES
    (34, 34, 'Manajemen pengetahuan risiko',                     'Risk Knowledge Management',                     1),
    (34, 35, 'Kebutuhan dasar (makanan, air & Sanitasi, hunian)', 'Basic Needs (food, water, sanitation, shelter)', 2),
    (34, 36, 'Kohesi & Inklusi Sosial',                          'Social Cohesion & Inclusion',                   3),
    (34, 37, 'Peluang ekonomi',                                  'Economic Opportunity',                          4),
    (34, 38, 'Infrastruktur dan layanan',                        'Infrastructure and Services',                   5),
    (34, 39, 'Pengelolaan sumber daya alam',                     'Natural Resource Management',                   6),
    (34, 40, 'Keterhubungan',                                    'Connectedness',                                 7);


-- ============================================================
-- TAB 9  (sheet_index=8)  "9. Rencana Aksi"  —  blocks 35-36
-- ============================================================

INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english, table_name, target_column,
     block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (35, 8, '9. Rencana Aksi', 'Action Plan',
     'Rencana Aksi', 'Action Plan Items',
     'evca_action_items', NULL, 'repeating',
     'thin-bordered data cells; alternating D8D8D8/F2F2F2 fills; teal spacer rows between each item; col headers row 11',
     'C13', 'O31', 13, 31, 'C', 'O', 0,
     'Data rows at 13,15,17,19,21,23,25 (step=2); even rows are teal spacers (skip). Rows 27,29,31 are empty medium-bordered placeholders. Import: read odd rows; assign item_order 1..N; stop when C col is empty. Schedule col M not filled in Para Lando.'),

    (36, 8, '9. Rencana Aksi', 'Action Plan',
     'Validasi rencana aksi', 'Action Plan Validation',
     'evca_action_validation', NULL, 'single',
     'row 35 = party label row; row 36 = medium-bordered name/signature cells; header C33:O33 merged dark-navy',
     'C35', 'I36', 35, 36, 'C', 'I', 0,
     'Row 35 = structural labels (not data). Row 36 = representative names; empty in Para Lando. Import reads C36, E36, G36, I36 for the four rep names.');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed, valid_values, notes)
VALUES
    (35, 'Daftar Risiko Prioritas Tinggi', 'Priority risk description', 'C', 11, 'priority_risk_description', 'TEXT', 0, NULL, 'Col header row 11'),
    (35, 'Hasil',                          'Desired outcome',           'E', 11, 'desired_outcome',           'TEXT', 0, NULL, NULL),
    (35, 'Aktivitas prioritas/Keluaran',   'Priority activities',       'G', 11, 'priority_activities',       'TEXT', 0, NULL, NULL),
    (35, 'Sumber daya yang dibutuhkan',    'Required resources',        'I', 11, 'required_resources',        'TEXT', 0, NULL, NULL),
    (35, 'Kebutuhan pendampingan teknis',  'Technical support needs',   'K', 11, 'technical_support_needs',   'TEXT', 0, NULL, NULL),
    (35, 'Jadwal',                         'Schedule',                  'M', 11, 'schedule',                  'TEXT', 0, NULL, 'Not filled in Para Lando'),
    (35, 'Penanggung jawab',               'Responsible party',         'O', 11, 'responsible_party',         'TEXT', 0, NULL, NULL),
    (36, 'Perwakilan Masyarakat',         'Community rep name',         'C', 36, 'community_rep_name',        'TEXT', 0, NULL, 'Name cell row 36; label at row 35'),
    (36, 'Perwakilan BPBD',               'BPBD rep name',              'E', 36, 'bpbd_rep_name',             'TEXT', 0, NULL, NULL),
    (36, 'Perwakilan Desa',               'Village rep name',           'G', 36, 'village_rep_name',          'TEXT', 0, NULL, NULL),
    (36, 'Perwakilan PMI Kabupaten/Kota', 'PMI rep name',               'I', 36, 'pmi_rep_name',              'TEXT', 0, NULL, NULL);
