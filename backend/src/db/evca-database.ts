import db from './database';

export function initializeEvcaDatabase(): void {
  // Layout versions (referenced by uploads/runs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS evca_layout_versions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL UNIQUE,
        description TEXT,
        is_default  INTEGER DEFAULT 0
    );
  `);
  db.prepare(
    `INSERT OR IGNORE INTO evca_layout_versions (id, name, description, is_default) VALUES (?,?,?,?)`
  ).run(1, 'v1.0 (Standard)', 'Standard EVCA layout (2024)', 1);

  // evca_uploads — one row per file upload
  db.exec(`
    CREATE TABLE IF NOT EXISTS evca_uploads (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        filename        TEXT    NOT NULL,
        stored_filename TEXT    NOT NULL,
        uploaded_at     DATETIME DEFAULT (datetime('now'))
    );
  `);

  // evca_spreadsheet_loads — one row per process run (FK to upload + layout version)
  db.exec(`
    CREATE TABLE IF NOT EXISTS evca_spreadsheet_loads (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_id         INTEGER REFERENCES evca_uploads(id),
        layout_version_id INTEGER DEFAULT 1 REFERENCES evca_layout_versions(id),
        filename          TEXT    NOT NULL,
        stored_filename   TEXT,
        uploaded_at       DATETIME DEFAULT (datetime('now')),
        status            TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','processing','success','failure')),
        report            TEXT
    );
  `);

  db.exec(`
    -- ── Reference / lookup tables (no load_id) ───────────────────────────────

    CREATE TABLE IF NOT EXISTS evca_dimensions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        display_order INTEGER NOT NULL UNIQUE,
        name_id       TEXT    NOT NULL,
        name_en       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_community_type (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name_id TEXT    NOT NULL UNIQUE,
        name_en TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_geophysical_env (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        env_type TEXT    NOT NULL CHECK(env_type IN ('location','terrain')),
        name_id  TEXT    NOT NULL,
        name_en  TEXT    NOT NULL,
        UNIQUE(env_type, name_id)
    );

    CREATE TABLE IF NOT EXISTS evca_ref_livelihood (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name_id TEXT    NOT NULL UNIQUE,
        name_en TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_vulnerability_rating (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        label_original TEXT    NOT NULL UNIQUE,
        label_english  TEXT    NOT NULL,
        numeric_value  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_capacity_rating (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        label_original TEXT    NOT NULL UNIQUE,
        label_english  TEXT    NOT NULL,
        numeric_value  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_social_rating (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        label_original TEXT    NOT NULL UNIQUE,
        label_english  TEXT    NOT NULL,
        numeric_value  REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_ref_consolidated_dimensions (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        dimension_number INTEGER NOT NULL UNIQUE CHECK(dimension_number BETWEEN 1 AND 7),
        name_id          TEXT    NOT NULL,
        name_en          TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_priority_criteria (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        criterion_number INTEGER NOT NULL UNIQUE,
        name_id          TEXT    NOT NULL,
        name_en          TEXT    NOT NULL
    );

    -- ── Data tables — include load_id for new databases ───────────────────────

    CREATE TABLE IF NOT EXISTS evca_assessments (
        id                              INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id                         INTEGER REFERENCES evca_spreadsheet_loads(id),
        village_name                    TEXT    NOT NULL,
        district                        TEXT,
        province                        TEXT,
        country                         TEXT    NOT NULL DEFAULT 'Indonesia',
        national_society                TEXT    NOT NULL DEFAULT 'PMI',
        branch                          TEXT,
        start_date                      DATE,
        responsible_person              TEXT,
        end_date                        DATE,
        responsible_position            TEXT,
        gps_coordinates                 TEXT,
        email                           TEXT,
        assessment_selection_narrative  TEXT,
        hazard_selection_rationale      TEXT,
        priority_hazard_count           INTEGER CHECK(priority_hazard_count IN (1,2,3)),
        vulnerability_overview          TEXT,
        capacity_overview               TEXT,
        social_dimensions_overview      TEXT,
        created_at                      DATETIME DEFAULT (datetime('now')),
        updated_at                      DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evca_community_context (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id                  INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id            INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
        community_description    TEXT,
        evca_participants_male   INTEGER,
        evca_participants_female INTEGER,
        community_type           TEXT,
        community_type_comments  TEXT,
        geophysical_env_1        TEXT,
        geophysical_env_2        TEXT,
        geophysical_comments     TEXT,
        livelihood_primary       TEXT,
        livelihood_secondary     TEXT,
        livelihood_other         TEXT,
        assessment_process       TEXT
    );

    CREATE TABLE IF NOT EXISTS evca_population (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id           INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id     INTEGER NOT NULL REFERENCES evca_assessments(id),
        age_group         TEXT    NOT NULL CHECK(age_group IN ('0_5','6_17','18_65','66_plus')),
        male_count        INTEGER,
        female_count      INTEGER,
        disability_male   INTEGER DEFAULT 0,
        disability_female INTEGER DEFAULT 0,
        UNIQUE(assessment_id, age_group)
    );

    CREATE TABLE IF NOT EXISTS evca_hazards (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id           INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id     INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_number     INTEGER NOT NULL CHECK(hazard_number IN (1,2,3)),
        hazard_name       TEXT    NOT NULL,
        cause_origin      TEXT,
        warning_signs     TEXT,
        action_time       TEXT,
        frequency         TEXT,
        occurrence_period TEXT,
        duration          TEXT,
        UNIQUE(assessment_id, hazard_number)
    );

    CREATE TABLE IF NOT EXISTS evca_vulnerable_groups (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id               INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id         INTEGER NOT NULL REFERENCES evca_assessments(id),
        group_number          INTEGER NOT NULL CHECK(group_number IN (1,2,3,4)),
        group_name            TEXT    NOT NULL,
        vulnerability_reasons TEXT,
        UNIQUE(assessment_id, group_number)
    );

    CREATE TABLE IF NOT EXISTS evca_vulnerability_ratings (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id               INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id         INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_id             INTEGER NOT NULL REFERENCES evca_hazards(id),
        dimension_number      INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 8),
        impact_description    TEXT,
        vulnerability_aspects TEXT,
        rating_label          TEXT,
        rating_value          REAL,
        UNIQUE(hazard_id, dimension_number)
    );

    CREATE TABLE IF NOT EXISTS evca_capacity_ratings (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id              INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id        INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_id            INTEGER NOT NULL REFERENCES evca_hazards(id),
        dimension_number     INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 8),
        capacity_description TEXT,
        rating_label         TEXT,
        rating_value         REAL,
        UNIQUE(hazard_id, dimension_number)
    );

    CREATE TABLE IF NOT EXISTS evca_social_dimensions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id       INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id INTEGER NOT NULL REFERENCES evca_assessments(id),
        dimension     TEXT    NOT NULL CHECK(dimension IN ('social_cohesion','inclusion','connectedness')),
        description   TEXT,
        rating_label  TEXT,
        rating_value  REAL,
        UNIQUE(assessment_id, dimension)
    );

    CREATE TABLE IF NOT EXISTS evca_risk_ratings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id          INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id    INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_id        INTEGER NOT NULL REFERENCES evca_hazards(id),
        dimension_number INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
        risk_label       TEXT,
        UNIQUE(hazard_id, dimension_number)
    );

    CREATE TABLE IF NOT EXISTS evca_risk_summary (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id          INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id    INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_id        INTEGER NOT NULL REFERENCES evca_hazards(id),
        dimension_number INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
        risk_label       TEXT,
        UNIQUE(hazard_id, dimension_number)
    );

    CREATE TABLE IF NOT EXISTS evca_risk_analysis (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id                INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id          INTEGER NOT NULL REFERENCES evca_assessments(id),
        hazard_id              INTEGER NOT NULL REFERENCES evca_hazards(id),
        consolidated_dimension INTEGER NOT NULL CHECK(consolidated_dimension BETWEEN 1 AND 7),
        vulnerability_aspects  TEXT,
        capacity_aspects       TEXT,
        key_risk_summary       TEXT,
        UNIQUE(hazard_id, consolidated_dimension)
    );

    CREATE TABLE IF NOT EXISTS evca_overall_analysis (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id           INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id     INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
        overall_narrative TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evca_action_items (
        id                         INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id                    INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id              INTEGER NOT NULL REFERENCES evca_assessments(id),
        item_order                 INTEGER NOT NULL,
        priority_risk_description  TEXT    NOT NULL,
        desired_outcome            TEXT,
        priority_activities        TEXT,
        required_resources         TEXT,
        technical_support_needs    TEXT,
        schedule                   TEXT,
        responsible_party          TEXT
    );

    CREATE TABLE IF NOT EXISTS evca_action_validation (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id              INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id        INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
        community_rep_name   TEXT,
        community_rep_signed INTEGER DEFAULT 0,
        bpbd_rep_name        TEXT,
        bpbd_rep_signed      INTEGER DEFAULT 0,
        village_rep_name     TEXT,
        village_rep_signed   INTEGER DEFAULT 0,
        pmi_rep_name         TEXT,
        pmi_rep_signed       INTEGER DEFAULT 0,
        validation_date      DATE
    );

    CREATE TABLE IF NOT EXISTS evca_priority_scores_flat (
        id                            INTEGER PRIMARY KEY AUTOINCREMENT,
        load_id                       INTEGER REFERENCES evca_spreadsheet_loads(id),
        assessment_id                 INTEGER NOT NULL REFERENCES evca_assessments(id),
        action_item_id                INTEGER REFERENCES evca_action_items(id),
        activity_name                 TEXT    NOT NULL,
        score_funding                 INTEGER,
        score_timeframe               INTEGER,
        score_local_resources         INTEGER,
        score_community_participation INTEGER,
        score_govt_support            INTEGER,
        score_sustainability          INTEGER,
        score_pmi_mandate             INTEGER,
        score_effectiveness           INTEGER
    );
  `);

  // Migrations — add load_id to data tables that existed before this column was introduced
  const dataTables = [
    'evca_assessments', 'evca_community_context', 'evca_population',
    'evca_hazards', 'evca_vulnerable_groups', 'evca_vulnerability_ratings',
    'evca_capacity_ratings', 'evca_social_dimensions', 'evca_risk_ratings',
    'evca_risk_summary', 'evca_risk_analysis', 'evca_overall_analysis',
    'evca_action_items', 'evca_action_validation', 'evca_priority_scores_flat',
  ];
  for (const t of dataTables) {
    try { db.exec(`ALTER TABLE ${t} ADD COLUMN load_id INTEGER REFERENCES evca_spreadsheet_loads(id)`); }
    catch { /* already exists */ }
  }

  // Migrations — add upload_id and layout_version_id to evca_spreadsheet_loads
  try { db.exec(`ALTER TABLE evca_spreadsheet_loads ADD COLUMN upload_id INTEGER REFERENCES evca_uploads(id)`); }
  catch { /* already exists */ }
  try { db.exec(`ALTER TABLE evca_spreadsheet_loads ADD COLUMN layout_version_id INTEGER DEFAULT 1 REFERENCES evca_layout_versions(id)`); }
  catch { /* already exists */ }

  // Migrate existing evca_spreadsheet_loads rows that have a stored file but no upload_id yet
  const orphanLoads = db.prepare(
    `SELECT id, filename, stored_filename, uploaded_at FROM evca_spreadsheet_loads
     WHERE stored_filename IS NOT NULL AND upload_id IS NULL`
  ).all() as any[];
  for (const load of orphanLoads) {
    const uploadId = (db.prepare(
      `INSERT INTO evca_uploads (filename, stored_filename, uploaded_at) VALUES (?,?,?)`
    ).run(load.filename, load.stored_filename, load.uploaded_at) as any).lastInsertRowid;
    db.prepare(`UPDATE evca_spreadsheet_loads SET upload_id=? WHERE id=?`).run(uploadId, load.id);
  }

  seedReferenceData();
}

function seedReferenceData(): void {
  const already = (db.prepare('SELECT COUNT(*) as n FROM evca_dimensions').get() as any).n;
  if (already > 0) return;

  db.exec(`
    INSERT OR IGNORE INTO evca_dimensions (display_order, name_id, name_en) VALUES
        (1,  '1. Manajemen Risiko',              'Risk/Disaster Management'),
        (2,  '2. Kesehatan',                     'Health'),
        (3,  '3. Air dan Sanitasi',              'Water and Sanitation'),
        (4,  '4. Hunian',                        'Shelter/Housing'),
        (5,  '5. Pangan dan Nutrisi',            'Food and Nutrition'),
        (6,  '6. Kohesi Sosial',                 'Social Cohesion'),
        (7,  '7. Inklusi',                       'Inclusion'),
        (8,  '8. Peluang Ekonomi',               'Economic Opportunity'),
        (9,  '9. Infrastruktur dan Layanan',     'Infrastructure and Services'),
        (10, '10. Pengelolaan Sumber Daya Alam', 'Natural Resource Management'),
        (11, '11. Keterhubungan',                'Connectedness');

    INSERT OR IGNORE INTO evca_ref_community_type (name_id, name_en) VALUES
        ('Perkotaan', 'Urban'),
        ('Pedesaan',  'Rural'),
        ('Campuran',  'Mixed');

    INSERT OR IGNORE INTO evca_ref_geophysical_env (env_type, name_id, name_en) VALUES
        ('location', 'Pesisir',                               'Coastal'),
        ('location', 'Perkotaan, dengan sungai-sungai besar', 'Urban with large rivers'),
        ('location', 'Pedalaman, tidak ada sungai besar',     'Inland, no large rivers'),
        ('terrain',  'Terutama medan datar',                  'Mainly flat terrain'),
        ('terrain',  'Terutama daerah pegunungan',            'Mainly mountainous');

    INSERT OR IGNORE INTO evca_ref_livelihood (name_id, name_en) VALUES
        ('Produksi tanaman dan sayuran',                      'Crop and vegetable production'),
        ('Pertanian dan Peternakan',                          'Farming and Livestock'),
        ('Memancing, budidaya ikan, koleksi produk perairan', 'Fishing / aquaculture'),
        ('Manufaktur',                                        'Manufacturing'),
        ('Layanan',                                           'Services'),
        ('Nelayan, Perkebunan, Pedagang',                     'Fisher / Plantation / Trader'),
        ('Wiraswasta',                                        'Self-employed');

    INSERT OR IGNORE INTO evca_ref_vulnerability_rating (label_original, label_english, numeric_value) VALUES
        ('Kerentanan TINGGI',    'HIGH',     1.00),
        ('Kerentanan SEDANG',    'MODERATE', 0.67),
        ('Kerentanan RENDAH',    'LOW',      0.33),
        ('Kerentanan TIDAK ADA', 'NONE',     0.00);

    INSERT OR IGNORE INTO evca_ref_capacity_rating (label_original, label_english, numeric_value) VALUES
        ('Kapasitas TINGGI',    'HIGH',     1.00),
        ('Kapasitas SEDANG',    'MODERATE', 0.67),
        ('Kapasitas RENDAH',    'LOW',      0.33),
        ('Kapasitas TIDAK ADA', 'NONE',     0.00);

    INSERT OR IGNORE INTO evca_ref_social_rating (label_original, label_english, numeric_value) VALUES
        ('TINGGI', 'HIGH',     1.00),
        ('SEDANG', 'MODERATE', 0.67),
        ('RENDAH', 'LOW',      0.33);

    INSERT OR IGNORE INTO evca_ref_consolidated_dimensions (dimension_number, name_id, name_en) VALUES
        (1, 'Manajemen pengetahuan risiko',                      'Risk Knowledge Management'),
        (2, 'Kebutuhan dasar (makanan, air & Sanitasi, hunian)', 'Basic Needs (food, water, sanitation, shelter)'),
        (3, 'Kohesi & Inklusi Sosial',                          'Social Cohesion & Inclusion'),
        (4, 'Peluang ekonomi',                                  'Economic Opportunity'),
        (5, 'Infrastruktur dan layanan',                        'Infrastructure and Services'),
        (6, 'Pengelolaan sumber daya alam',                     'Natural Resource Management'),
        (7, 'Keterhubungan',                                    'Connectedness');

    INSERT OR IGNORE INTO evca_priority_criteria (criterion_number, name_id, name_en) VALUES
        (1, 'Dana',                                        'Funding availability'),
        (2, 'Jangka waktu',                                'Timeframe feasibility'),
        (3, 'Sumber daya lokal (Material, sarana)',         'Local resources (materials, facilities)'),
        (4, 'Partisipasi masyarakat (Keterlibatan)',        'Community participation'),
        (5, 'Dukungan teknis dari pemerintah daerah',      'Technical support from local government'),
        (6, 'Keberlanjutan (Pemeliharaan dan penanganan)', 'Sustainability'),
        (7, 'Mandat PMI',                                  'PMI mandate'),
        (8, 'Efektivitas/ketepatan/fungsi aksi',            'Effectiveness / appropriateness');
  `);
}

