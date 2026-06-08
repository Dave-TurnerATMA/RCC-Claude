-- =============================================================================
-- EVCA_schema.sql
-- Database schema for EVCA (Enhanced Vulnerability and Capacity Assessment)
-- Source: EVCA_Desa_Para_Lando.xlsx  (PMI / IFRC methodology)
-- Tabs covered: 1-7 (verified), 8-10 (proposed, pending tab-by-tab review)
-- =============================================================================
--
-- Load order (foreign key dependencies):
--   1. Reference tables (no FK)
--   2. evca_assessments
--   3. evca_community_context, evca_population
--   4. evca_hazards
--   5. evca_vulnerable_groups, evca_vulnerability_ratings, evca_capacity_ratings,
--      evca_social_dimensions, evca_risk_ratings, evca_risk_summary
--   6. evca_risk_analysis, evca_overall_analysis
--   7. evca_action_items → evca_action_validation
--   8. evca_priority_scores_flat
--
-- POST-LOAD MERGE (after all tabs imported and verified):
--   ALTER TABLE evca_hazards ADD COLUMN risk_management TEXT ... (11 columns)
--   UPDATE evca_hazards SET ... FROM evca_risk_summary WHERE hazard_id = evca_hazards.id
--   DROP TABLE evca_risk_summary
--
-- =============================================================================


-- =============================================================================
-- REFERENCE / LOOKUP TABLES  (pre-populated; see EVCA_reference.sql)
-- =============================================================================

CREATE TABLE evca_dimensions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    display_order INTEGER NOT NULL UNIQUE,   -- 1-11
    name_id       TEXT    NOT NULL,          -- Indonesian label
    name_en       TEXT    NOT NULL           -- English label
);

CREATE TABLE evca_ref_community_type (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name_id   TEXT    NOT NULL UNIQUE,       -- e.g. 'Perkotaan'
    name_en   TEXT    NOT NULL               -- e.g. 'Urban'
);

CREATE TABLE evca_ref_geophysical_env (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    env_type TEXT    NOT NULL CHECK(env_type IN ('location','terrain')),
    name_id  TEXT    NOT NULL,
    name_en  TEXT    NOT NULL,
    UNIQUE(env_type, name_id)
);

CREATE TABLE evca_ref_livelihood (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name_id TEXT    NOT NULL UNIQUE,
    name_en TEXT    NOT NULL
);

CREATE TABLE evca_ref_vulnerability_rating (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    label_original TEXT   NOT NULL UNIQUE,   -- e.g. 'Kerentanan TINGGI'
    label_english  TEXT   NOT NULL,          -- e.g. 'HIGH'
    numeric_value  REAL   NOT NULL
);

CREATE TABLE evca_ref_capacity_rating (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    label_original TEXT    NOT NULL UNIQUE,  -- e.g. 'Kapasitas TINGGI'
    label_english  TEXT    NOT NULL,         -- e.g. 'HIGH'
    numeric_value  REAL    NOT NULL
);

CREATE TABLE evca_ref_social_rating (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    label_original TEXT    NOT NULL UNIQUE,  -- e.g. 'TINGGI'
    label_english  TEXT    NOT NULL,         -- e.g. 'HIGH'
    numeric_value  REAL    NOT NULL
);

-- Scoring criteria for Tab 10 priority matrix
CREATE TABLE evca_priority_criteria (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    criterion_number INTEGER NOT NULL UNIQUE,   -- 1-8
    name_id         TEXT    NOT NULL,           -- Indonesian criterion name
    name_en         TEXT    NOT NULL            -- English criterion name
);


-- =============================================================================
-- TAB 1  —  Top-level assessment record
-- =============================================================================

CREATE TABLE evca_assessments (
    id                              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Block 1: General information (cells E6:G16)
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

    -- Block 2: Tab 1 — main summary narrative (merged cell C24:Z32)
    assessment_selection_narrative  TEXT,

    -- Block 13: Tab 3 — hazard selection rationale (merged C14:W14)
    hazard_selection_rationale      TEXT,

    -- Block 15: Tab 3 — count of priority hazards (V48)
    priority_hazard_count           INTEGER CHECK(priority_hazard_count IN (1,2,3)),

    -- Block 17: Tab 4 — overall vulnerability overview (merged C12:V12)
    vulnerability_overview          TEXT,

    -- Block 21: Tab 5 — overall capacity summary (merged C14:R14)
    capacity_overview               TEXT,

    -- Block 26: Tab 6 — social dimensions overview (merged C12:R12)
    social_dimensions_overview      TEXT,

    created_at                      DATETIME DEFAULT (datetime('now')),
    updated_at                      DATETIME DEFAULT (datetime('now'))
);


-- =============================================================================
-- TAB 2  —  Community background
-- =============================================================================

-- Note: named evca_community_context (not evca_community_background)
CREATE TABLE evca_community_context (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id           INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,

    -- Block 5: community description narrative (merged C13:W13)
    community_description   TEXT,

    -- Block 6: eVCA participant counts (row 26, cols U/V)
    evca_participants_male   INTEGER,
    evca_participants_female INTEGER,

    -- Block 7: context type and environment (rows 29-33)
    community_type          TEXT    CHECK(community_type IN ('Perkotaan','Pedesaan','Campuran')),
    community_type_comments TEXT,
    geophysical_env_1       TEXT,   -- location (from evca_ref_geophysical_env where env_type='location')
    geophysical_env_2       TEXT,   -- terrain  (from evca_ref_geophysical_env where env_type='terrain')
    geophysical_comments    TEXT,
    livelihood_primary      TEXT,   -- from evca_ref_livelihood
    livelihood_secondary    TEXT,   -- from evca_ref_livelihood
    livelihood_other        TEXT,   -- free text

    -- Block 8: assessment process narrative (merged C42:W42)
    assessment_process      TEXT
);

CREATE TABLE evca_population (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    age_group           TEXT    NOT NULL CHECK(age_group IN ('0_5','6_17','18_65','66_plus')),
    male_count          INTEGER,
    female_count        INTEGER,
    disability_male     INTEGER DEFAULT 0,
    disability_female   INTEGER DEFAULT 0,
    UNIQUE(assessment_id, age_group)
);


-- =============================================================================
-- TAB 3  —  Priority hazards  (up to 3 per assessment)
-- =============================================================================

-- Initial state (pre-merge).
-- Post-load merge adds 11 risk_* columns from evca_risk_summary — see note below.
CREATE TABLE evca_hazards (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_number       INTEGER NOT NULL CHECK(hazard_number IN (1,2,3)),
    hazard_name         TEXT    NOT NULL,
    cause_origin        TEXT,
    warning_signs       TEXT,
    action_time         TEXT,
    frequency           TEXT,
    occurrence_period   TEXT,
    duration            TEXT,
    UNIQUE(assessment_id, hazard_number)
);

-- POST-LOAD MERGE: after evca_risk_summary is loaded and verified, run:
--
-- ALTER TABLE evca_hazards ADD COLUMN risk_management           TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_health               TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_water_and_sanitation TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_shelter_housing      TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_food_and_nutrition   TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_social_cohesion      TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_inclusion            TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_economic_opportunity TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_infrastructure       TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_natural_resources    TEXT;
-- ALTER TABLE evca_hazards ADD COLUMN risk_connectedness        TEXT;
--
-- UPDATE evca_hazards SET
--     risk_management           = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 1),
--     risk_health               = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 2),
--     risk_water_and_sanitation = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 3),
--     risk_shelter_housing      = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 4),
--     risk_food_and_nutrition   = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 5),
--     risk_social_cohesion      = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 6),
--     risk_inclusion            = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 7),
--     risk_economic_opportunity = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 8),
--     risk_infrastructure       = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 9),
--     risk_natural_resources    = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 10),
--     risk_connectedness        = (SELECT risk_label FROM evca_risk_summary WHERE hazard_id = evca_hazards.id AND dimension_number = 11);
--
-- DROP TABLE evca_risk_summary;


-- =============================================================================
-- TAB 4  —  Vulnerability
-- =============================================================================

CREATE TABLE evca_vulnerable_groups (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id         INTEGER NOT NULL REFERENCES evca_assessments(id),
    group_number          INTEGER NOT NULL CHECK(group_number IN (1,2,3,4)),
    group_name            TEXT    NOT NULL,
    vulnerability_reasons TEXT,
    UNIQUE(assessment_id, group_number)
);

-- Dimensions 1-8 per hazard (standard); dims 9-11 skipped (#REF! → NULL)
CREATE TABLE evca_vulnerability_ratings (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id         INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id             INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number      INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 8),
    impact_description    TEXT,
    vulnerability_aspects TEXT,
    rating_label          TEXT    CHECK(rating_label IN (
                              'Kerentanan TINGGI', 'Kerentanan SEDANG',
                              'Kerentanan RENDAH', 'Kerentanan TIDAK ADA')),
    rating_value          REAL    CHECK(rating_value IN (0, 0.33, 0.67, 1)),
    UNIQUE(hazard_id, dimension_number)
);


-- =============================================================================
-- TAB 5  —  Capacity
-- =============================================================================

-- Dimensions 1-8 per hazard (standard); dims 9-10 are #REF! cross-cutting → not stored here
CREATE TABLE evca_capacity_ratings (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id        INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id            INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number     INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 8),
    capacity_description TEXT,
    rating_label         TEXT    CHECK(rating_label IN (
                             'Kapasitas TINGGI', 'Kapasitas SEDANG',
                             'Kapasitas RENDAH', 'Kapasitas TIDAK ADA')),
    rating_value         REAL    CHECK(rating_value IN (0, 0.33, 0.67, 1)),
    UNIQUE(hazard_id, dimension_number)
);


-- =============================================================================
-- TAB 6  —  Social Cohesion, Inclusion, Connectedness
-- =============================================================================

-- 3 rows per assessment (one per cross-cutting dimension)
-- These values are also referenced (via formula) in Tabs 4 and 5 dims 9-11
CREATE TABLE evca_social_dimensions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL REFERENCES evca_assessments(id),
    dimension     TEXT    NOT NULL CHECK(dimension IN ('social_cohesion','inclusion','connectedness')),
    description   TEXT,
    rating_label  TEXT    CHECK(rating_label IN ('TINGGI','SEDANG','RENDAH')),
    rating_value  REAL    CHECK(rating_value IN (0.33, 0.67, 1)),
    UNIQUE(assessment_id, dimension)
);


-- =============================================================================
-- TAB 7  —  Risk ratings  (all computed, no manual entry)
-- =============================================================================

-- All cells are formula-derived; import with data_only=True.
-- Dims 1-8: risk computed from vuln × capacity lookup table.
-- Dims 9-11: copied from evca_social_dimensions.rating_label (same value for each hazard).
CREATE TABLE evca_risk_ratings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id    INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id        INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    risk_label       TEXT    CHECK(risk_label IN ('HIGH','MODERATE','LOW','TINGGI','SEDANG','RENDAH')),
    UNIQUE(hazard_id, dimension_number)
);

-- Temporary staging table for Tab 1 Block 3 (risk pattern summary).
-- Loaded during import; merged into evca_hazards columns; then dropped.
-- See POST-LOAD MERGE comment under evca_hazards above.
CREATE TABLE evca_risk_summary (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id    INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id        INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    risk_label       TEXT    CHECK(risk_label IN ('HIGH','MODERATE','LOW','TINGGI','SEDANG','RENDAH')),
    UNIQUE(hazard_id, dimension_number)
);


-- =============================================================================
-- TABS 8-10  —  Analysis, Action Plan, Priority Scoring
-- (Proposed — pending tab-by-tab structural review)
-- =============================================================================

-- Tab 8: Consolidated risk analysis (7 consolidated dimensions per hazard)
CREATE TABLE evca_risk_analysis (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id          INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id              INTEGER NOT NULL REFERENCES evca_hazards(id),
    consolidated_dimension INTEGER NOT NULL CHECK(consolidated_dimension BETWEEN 1 AND 7),
    vulnerability_aspects  TEXT,
    capacity_aspects       TEXT,
    key_risk_summary       TEXT,
    UNIQUE(hazard_id, consolidated_dimension)
);

-- Tab 8: Overall risk narrative (one per assessment)
CREATE TABLE evca_overall_analysis (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id     INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
    overall_narrative TEXT    NOT NULL
);

-- Tab 9: Action plan items
CREATE TABLE evca_action_items (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id            INTEGER NOT NULL REFERENCES evca_assessments(id),
    item_order               INTEGER NOT NULL,
    priority_risk_description TEXT   NOT NULL,
    desired_outcome          TEXT,
    priority_activities      TEXT,
    required_resources       TEXT,
    technical_support_needs  TEXT,
    schedule                 TEXT,
    responsible_party        TEXT
);

-- Tab 9: Stakeholder validation / signatures
CREATE TABLE evca_action_validation (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id        INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
    community_rep_name   TEXT,
    community_rep_signed INTEGER DEFAULT 0,   -- BOOLEAN (0/1)
    bpbd_rep_name        TEXT,
    bpbd_rep_signed      INTEGER DEFAULT 0,
    village_rep_name     TEXT,
    village_rep_signed   INTEGER DEFAULT 0,
    pmi_rep_name         TEXT,
    pmi_rep_signed       INTEGER DEFAULT 0,
    validation_date      DATE
);

-- Tab 10: Activity priority scoring — one row per activity, 8 criteria as columns
CREATE TABLE evca_priority_scores_flat (
    id                              INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id                   INTEGER NOT NULL REFERENCES evca_assessments(id),
    action_item_id                  INTEGER REFERENCES evca_action_items(id),
    activity_name                   TEXT    NOT NULL,
    score_funding                   INTEGER,
    score_timeframe                 INTEGER,
    score_local_resources           INTEGER,
    score_community_participation   INTEGER,
    score_govt_support              INTEGER,
    score_sustainability            INTEGER,
    score_pmi_mandate               INTEGER,
    score_effectiveness             INTEGER,
    total_score                     INTEGER GENERATED ALWAYS AS (
        COALESCE(score_funding,0) +
        COALESCE(score_timeframe,0) +
        COALESCE(score_local_resources,0) +
        COALESCE(score_community_participation,0) +
        COALESCE(score_govt_support,0) +
        COALESCE(score_sustainability,0) +
        COALESCE(score_pmi_mandate,0) +
        COALESCE(score_effectiveness,0)
    ) STORED
);
