# EVCA Spreadsheet Analysis
## EVCA_Desa_Para_Lando.xlsx — Database Design Document

**Source:** Enhanced Vulnerability and Capacity Assessment (EVCA) — PMI (Indonesian Red Cross)  
**Community:** Desa Para Lando, Indonesia  
**Methodology:** IFRC/PMI EVCA framework

---

## Overview

The spreadsheet contains 10 sheets covering the full EVCA process. Each sheet is a structured data entry form with headers, drop-down validation lists, and computed cells. The proposed database design normalises the data across 12 tables linked by `assessment_id` (the top-level assessment record).

**Colour coding used in the spreadsheet:**
- Red (`#F7323F`) — document title / section headings
- Teal (`#7A9090`) — form background / section frames
- Dark red (`#C00000`) — hazard sub-blocks (with data entered)
- Gray (`#A5A5A5` / `#D8D8D8`) — column headers / alternating rows
- Green (`#00B050`) — completed/active data rows
- Light gray (`#F2F2F2`) — data entry cells
- Yellow (`#FFFF00`) — priority scoring matrix header

---

## Sheet 1 — "1. Informasi Penilaian" (Assessment Information)

### Description
Top-level assessment record. Captures metadata about who conducted the assessment, the target community, facilitating organisation, dates, and method.

### Fields Identified
| Field (ID) | English | Example Value | Data Type |
|---|---|---|---|
| community_name | Village/community name | Desa Para Lando | VARCHAR(255) |
| country | Country | Indonesia | VARCHAR(100) |
| national_society | National Society | PMI | VARCHAR(255) |
| province | Province | (text) | VARCHAR(255) |
| district | District/Kabupaten | (text) | VARCHAR(255) |
| assessment_date | Date assessment conducted | DATE | DATE |
| facilitator_name | Lead facilitator | VARCHAR(255) | VARCHAR(255) |
| team_members | Assessment team members | TEXT | TEXT |
| method | Assessment method (workshop/interview/etc) | TEXT | TEXT |
| notes | Additional notes | TEXT | TEXT |

### Proposed Table

```sql
CREATE TABLE evca_assessments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_name      TEXT    NOT NULL,
    country             TEXT    NOT NULL DEFAULT 'Indonesia',
    national_society    TEXT    NOT NULL DEFAULT 'PMI',
    province            TEXT,
    district            TEXT,
    assessment_date     DATE,
    facilitator_name    TEXT,
    team_members        TEXT,
    method              TEXT,
    notes               TEXT,
    created_at          DATETIME DEFAULT (datetime('now')),
    updated_at          DATETIME DEFAULT (datetime('now'))
);
```

---

## Sheet 2 — "2. Latarbelakang" (Background)

### Description
Community background data: population breakdown by gender and age group, disability counts, context type (urban/rural/mixed), geophysical environment, livelihood activities, and two narrative sections (community context description and assessment process description).

### Structure
The sheet has three distinct data blocks:
1. **Population table** (rows 17–27): gender × 4 age groups with sub-totals and proportions; separate disability row; "at-risk" count
2. **Context block** (row 29–33): three side-by-side fields — community type, geophysical environment, livelihood activities — each with a comments row
3. **Narrative blocks** (rows 13, 42): free-text boxes for community description and assessment process

### Drop-down Reference Values (from rows 47–58)
- **Community type:** Perkotaan (Urban), Pedesaan (Rural), Campuran (Mixed)
- **Geophysical environment:** Pesisir (Coastal), Perkotaan dengan sungai (Urban with rivers), Pedalaman tidak ada sungai (Inland no rivers), Terutama medan datar (Mainly flat), Terutama daerah pegunungan (Mainly mountainous)
- **Livelihoods:** Produksi tanaman (Crop production), Pertanian dan Peternakan (Farming & Livestock), Memancing/budidaya ikan (Fishing/aquaculture), Manufaktur (Manufacturing), Layanan (Services), Nelayan/Perkebunan/Pedagang (Fisher/Plantation/Trader), Wiraswasta (Self-employed)

### Example Data (Para Lando)
- Rural, coastal/flat terrain
- Livelihoods: Fishers and farmers; also private employees, civil servants, health workers
- Population: ~627 total (partial data visible in truncated cells)
- Age 0-5: Male 206, Female 176 (382 total); Age 6-17: Male 136, Female 107; 66+: 27 male, 17 female (44 total, 3.8% of pop)
- Disability: 3 male + 1 female in 6-17 age group

### Proposed Tables

```sql
CREATE TABLE evca_population (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id           INTEGER NOT NULL REFERENCES evca_assessments(id),
    -- Age group: 0_5, 6_17, 18_65, 66_plus
    age_group               TEXT    NOT NULL CHECK(age_group IN ('0_5','6_17','18_65','66_plus')),
    male_count              INTEGER,
    female_count            INTEGER,
    subtotal                INTEGER,        -- computed: male + female
    male_proportion         REAL,           -- computed: male / subtotal
    female_proportion       REAL,           -- computed: female / subtotal
    disability_male         INTEGER DEFAULT 0,
    disability_female       INTEGER DEFAULT 0
);

CREATE TABLE evca_community_background (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id               INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
    community_type              TEXT CHECK(community_type IN ('urban','rural','mixed')),
    geophysical_environment     TEXT,   -- from drop-down; multiple may apply, store as CSV or separate table
    livelihood_activities       TEXT,   -- free-text summary; primary activity
    livelihood_comments         TEXT,   -- additional livelihoods free-text
    context_type_comments       TEXT,   -- free-text notes on community type
    environment_comments        TEXT,   -- free-text notes on geophysical environment
    at_risk_population_male     INTEGER,
    at_risk_population_female   INTEGER,
    community_description       TEXT,   -- narrative: community context
    assessment_process          TEXT    -- narrative: how assessment was conducted
);
```

---

## Sheet 3 — "3. Ancaman" (Priority Hazards)

### Description
Up to 3 priority hazards per assessment. Each hazard block captures: name/type, cause/origin, warning signs, action time, occurrence frequency, occurrence period, and duration. A final row records the total count of priority hazards identified.

### Structure
- **Hazard 1** (rows 16–30): dark red block — data present (Banjir Rob = Tidal Flooding)
- **Hazard 2** (rows 16–30, columns M+): dark red block — data present (Abrasi Pantai = Coastal Erosion)
- **Hazard 3** (rows 32–46): gray/empty block — not filled in
- **Priority count** (row 48): integer, value = 3 (despite only 2 filled in — 3rd counted as named)

### Example Data (Para Lando)
**Hazard 1 — Banjir Rob (Tidal Flooding)**
- Cause: Seawater overflow due to climate change
- Warning signs: Heavy rain with strong winds
- Action time: When seawater enters settlement area
- Frequency: Several times per year
- Period: Every rainy season
- Duration: 1 day

**Hazard 2 — Abrasi Pantai (Coastal Erosion)**
- Cause: Seasonal changes
- Warning signs: Natural signs — unusually large waves
- Action time: After water passes the seawall
- Frequency: Occurs during December of each year
- Period: Irregular
- Duration: 1–2 days

### Proposed Table

```sql
CREATE TABLE evca_hazards (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_number       INTEGER NOT NULL CHECK(hazard_number IN (1,2,3)),
    hazard_name         TEXT    NOT NULL,
    hazard_type         TEXT,           -- e.g. flood, erosion, earthquake
    cause_origin        TEXT,
    warning_signs       TEXT,
    action_time         TEXT,           -- narrative: when to act
    frequency           TEXT,           -- narrative: how often
    occurrence_period   TEXT,           -- narrative: what time of year
    duration            TEXT,           -- narrative: how long each event lasts
    UNIQUE(assessment_id, hazard_number)
);

-- Separate table for the summary count (row 48)
-- Alternatively store as a field on evca_assessments
-- priority_hazard_count INTEGER  -- could be added to evca_assessments
```

---

## Sheet 4 — "4. Kerentanan" (Vulnerability)

### Description
Vulnerability assessment per hazard × dimension. For each of the 3 hazards, up to 11 dimensions are rated. Dimensions 1–8 are standard EVCA dimensions; dimensions 9–11 (Social Cohesion, Inclusion, Connectedness) are cross-cutting and pulled from Sheet 6 by formula (`#REF!` indicates a formula reference).

Also includes a **vulnerable groups** section (rows 14–22) listing up to 4 groups with their vulnerability reasons.

### Dimensions (8 standard + 3 cross-cutting)
| # | Indonesian | English |
|---|---|---|
| 1 | Manajemen Risiko/Bencana | Risk/Disaster Management |
| 2 | Kesehatan | Health |
| 3 | Air dan Sanitasi | Water and Sanitation |
| 4 | Hunian | Shelter/Housing |
| 5 | Pangan dan Nutrisi | Food and Nutrition |
| 6 | Peluang Ekonomi | Economic Opportunity |
| 7 | Infrastruktur dan Layanan | Infrastructure and Services |
| 8 | Pengelolaan Sumber Daya Alam | Natural Resource Management |
| 9 | Kohesi Sosial & Inklusi | Social Cohesion & Inclusion |
| 10 | Inklusi | Inclusion |
| 11 | Keterhubungan | Connectedness |

### Rating Scale (drop-down, rows 69–72)
| Indonesian | English | Numeric |
|---|---|---|
| Kerentanan TINGGI | HIGH | 1.00 |
| Kerentanan SEDANG | MODERATE | 0.67 |
| Kerentanan RENDAH | LOW | 0.33 |
| Kerentanan TIDAK ADA | NONE | 0.00 |

### Example Data (Para Lando — Hazard 1: Tidal Flooding)
| Dimension | Rating | Value |
|---|---|---|
| Risk Management | TINGGI | 1.00 |
| Health | SEDANG | 0.67 |
| Water & Sanitation | TINGGI | 1.00 |
| Housing | SEDANG | 0.67 |
| Food & Nutrition | SEDANG | 0.67 |
| Economic Opportunity | TINGGI | 1.00 |
| Infrastructure & Services | SEDANG | 0.67 |
| Natural Resources | SEDANG | 0.67 |

### Proposed Tables

```sql
CREATE TABLE evca_vulnerable_groups (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id   INTEGER NOT NULL REFERENCES evca_assessments(id),
    group_number    INTEGER NOT NULL CHECK(group_number IN (1,2,3,4)),
    group_name      TEXT    NOT NULL,   -- e.g. Elderly, Infants, Disabled, Pregnant women
    vulnerability_reasons TEXT,         -- why they are vulnerable
    UNIQUE(assessment_id, group_number)
);

CREATE TABLE evca_vulnerability_ratings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id           INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number    INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    impact_description  TEXT,           -- narrative: impact before and after event
    vulnerability_aspects TEXT,         -- narrative: vulnerability aspects and causes
    rating_label        TEXT CHECK(rating_label IN ('TINGGI','SEDANG','RENDAH','TIDAK ADA')),
    rating_value        REAL CHECK(rating_value IN (0, 0.33, 0.67, 1)),
    UNIQUE(hazard_id, dimension_number)
);
```

---

## Sheet 5 — "5. Kapasitas" (Capacity)

### Description
Capacity assessment per hazard × dimension — mirror structure to Sheet 4. For each of the 3 hazards, the same 8 standard dimensions are rated for existing capacity (community strengths and resources available). Dimensions 9–11 (Social Cohesion, Inclusion, Connectedness) are cross-cutting and pulled from Sheet 6 by `#REF!` formula — they are **not** stored here.

An overall capacity narrative (row 14, medium-bordered text box) is stored as a new column on `evca_assessments`.

### Layout
- **Row 14:** Overall capacity narrative (medium borders, light-gray fill) → `evca_assessments.capacity_overview`
- **Rows 16–28:** Hazard 1 block (dark red `#C00000` header) — columns C (dimension), G (description), M (rating label), P (rating value)
- **Rows 30–42:** Hazard 2 block (red `#F7323F` header) — same column layout
- **Rows 44–56:** Hazard 3 block (empty/unfilled) — same structure, no data
- **Rows 60–63:** Reference data — rating scale

### Rating Scale (rows 60–63)
| Indonesian | English | Numeric |
|---|---|---|
| Kapasitas TINGGI | HIGH | 1.00 |
| Kapasitas SEDANG | MODERATE | 0.67 |
| Kapasitas RENDAH | LOW | 0.33 |
| Kapasitas TIDAK ADA | NONE | 0.00 |

### Example Data (Para Lando)

**Overall capacity narrative (row 14):**
> "Pada Dasarnya, Kapasitas Desa Leksula sudah lumayan Bagus, ini terbukti dari..." (Basically, the capacity of Leksula Village is already quite good, as evidenced by...)

**Hazard 1 — Banjir Rob (Tidal Flooding):**
| # | Dimension | Capacity Description (excerpt) | Rating | Value |
|---|---|---|---|---|
| 1 | Manajemen Bencana | Pemdes: 11 orang, BPD: 5 orang, Kader: 15 orang, Babink... | Kapasitas RENDAH | 0.33 |
| 2 | Kesehatan | 1 unit Pustu, 3 Unit Posyandu, 40 Kader PKK, 4 Perawat... | Kapasitas SEDANG | 0.67 |
| 3 | Air dan Sanitasi | 1 bak penampungan, 2 titik sumber air... | Kapasitas SEDANG | 0.67 |
| 4 | Hunian | Rumah penduduk sebagian permanen dan sebagian semi permanen... | Kapasitas SEDANG | 0.67 |
| 5 | Pangan dan Nutrisi | Sumber makanan mudah didapatkan... | Kapasitas TINGGI | 1.00 |
| 6 | Peluang Ekonomi | Kelompok Tani dan Nelayan, Koperasi Bumdes... | Kapasitas SEDANG | 0.67 |
| 7 | Infrastruktur dan Layanan | SD MIS Al Fitrah, Paud Suka Maju, SDK Sante... | Kapasitas TINGGI | 1.00 |
| 8 | Pengelolaan SDA | 2 titik sumber mata air, pengelolaan hutan... | Kapasitas SEDANG | 0.67 |
| 9 | Social cohesion & Inclusion | #REF! → NULL | — | — |
| 10 | Connectedness | #REF! → NULL | — | — |

**Hazard 2 — Abrasi Pantai (Coastal Erosion):**
| # | Dimension | Rating | Value |
|---|---|---|---|
| 1 | Manajemen Bencana | Kapasitas SEDANG | 0.67 |
| 2 | Kesehatan | Kapasitas TINGGI | 1.00 |
| 3 | Air dan Sanitasi | Kapasitas SEDANG | 0.67 |
| 4 | Hunian | Kapasitas SEDANG | 0.67 |
| 5 | Pangan dan Nutrisi | Kapasitas TINGGI | 1.00 |
| 6 | Peluang Ekonomi | Kapasitas SEDANG | 0.67 |
| 7 | Infrastruktur dan Layanan | Kapasitas SEDANG | 0.67 |
| 8 | Pengelolaan SDA | Kapasitas SEDANG | 0.67 |
| 9–10 | Cross-cutting | #REF! → NULL | — |

**Hazard 3:** No data entered (G column empty, P column shows `#N/A` → NULL).

### Schema Changes

```sql
-- New column on evca_assessments (capacity overview narrative)
ALTER TABLE evca_assessments ADD COLUMN capacity_overview TEXT;

-- New reference table for capacity rating scale
CREATE TABLE evca_ref_capacity_rating (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label_original  TEXT NOT NULL UNIQUE,   -- e.g. 'Kapasitas TINGGI'
    label_english   TEXT NOT NULL,          -- e.g. 'HIGH'
    numeric_value   REAL NOT NULL
);

-- Main capacity ratings table
CREATE TABLE evca_capacity_ratings (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id        INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id            INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number     INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 8),
    capacity_description TEXT,
    rating_label         TEXT CHECK(rating_label IN ('Kapasitas TINGGI','Kapasitas SEDANG','Kapasitas RENDAH','Kapasitas TIDAK ADA')),
    rating_value         REAL CHECK(rating_value IN (0, 0.33, 0.67, 1)),
    UNIQUE(hazard_id, dimension_number)
);
```

### Reference Data

```sql
INSERT INTO evca_ref_capacity_rating (label_original, label_english, numeric_value) VALUES
    ('Kapasitas TINGGI',    'HIGH',     1.00),
    ('Kapasitas SEDANG',    'MODERATE', 0.67),
    ('Kapasitas RENDAH',    'LOW',      0.33),
    ('Kapasitas TIDAK ADA', 'NONE',     0.00);
```

### Metadata SQL

```sql
-- Block 21: Capacity overview narrative (row 14)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (21, 4, '5. Kapasitas', 'Capacity',
     'Analisis Singkat Keseluruhan Kapasitas', 'Overall Capacity Summary',
     'evca_assessments', 'capacity_overview', 'single',
     'medium border all sides, light-gray fill #F2F2F2, row 14',
     'C14', 'R14', 14, 14, 'C', 'R',
     FALSE, 'UPDATE evca_assessments; one text box per assessment');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (21, 'Analisis Singkat Keseluruhan Kapasitas', 'Overall Capacity Narrative',
     'C', 14, 'capacity_overview', 'TEXT', FALSE);

-- Block 22: Hazard 1 capacity ratings (rows 19–28)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (22, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 1 Kapasitas', 'Hazard 1 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'dark-red header fill #C00000, row 16; data rows 19–28 cols C/G/M/P',
     'C19', 'P28', 19, 28, 'C', 'P',
     FALSE, '8 standard dimensions per hazard; dims 9–10 are #REF! → skip');

INSERT INTO evca_block_fields (block_id, field_name_original, field_name_english, column_letter, row_number, db_column_name, db_data_type, is_computed) VALUES
    (22, 'Dimensi', 'Dimension Number', 'C', 18, 'dimension_number', 'INTEGER', FALSE),
    (22, 'Kapasitas (masyarakat, rumah tangga, individu)', 'Capacity Description', 'G', 18, 'capacity_description', 'TEXT', FALSE),
    (22, 'Rating Kapasitas', 'Capacity Rating Label', 'M', 18, 'rating_label', 'TEXT', FALSE),
    (22, 'Nilai Kapasitas', 'Capacity Rating Value', 'P', 18, 'rating_value', 'REAL', TRUE);

-- Block 23: Hazard 2 capacity ratings (rows 33–42)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (23, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 2 Kapasitas', 'Hazard 2 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'red header fill #F7323F, row 30; data rows 33–42 cols C/G/M/P',
     'C33', 'P42', 33, 42, 'C', 'P',
     FALSE, '8 standard dimensions; same table as block 22, different hazard_id');

INSERT INTO evca_block_fields (block_id, field_name_original, field_name_english, column_letter, row_number, db_column_name, db_data_type, is_computed) VALUES
    (23, 'Dimensi', 'Dimension Number', 'C', 32, 'dimension_number', 'INTEGER', FALSE),
    (23, 'Kapasitas (masyarakat, rumah tangga, individu)', 'Capacity Description', 'G', 32, 'capacity_description', 'TEXT', FALSE),
    (23, 'Rating Kapasitas', 'Capacity Rating Label', 'M', 32, 'rating_label', 'TEXT', FALSE),
    (23, 'Nilai Kapasitas', 'Capacity Rating Value', 'P', 32, 'rating_value', 'REAL', TRUE);

-- Block 24: Hazard 3 capacity ratings (rows 47–56)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (24, 4, '5. Kapasitas', 'Capacity',
     'Ancaman 3 Kapasitas', 'Hazard 3 Capacity Ratings',
     'evca_capacity_ratings', NULL, 'repeating',
     'theme fill header, row 44; data rows 47–56 cols C/G/M/P',
     'C47', 'P56', 47, 56, 'C', 'P',
     FALSE, 'Empty in Para Lando; #N/A values → NULL; same table as blocks 22–23');

INSERT INTO evca_block_fields (block_id, field_name_original, field_name_english, column_letter, row_number, db_column_name, db_data_type, is_computed) VALUES
    (24, 'Dimensi', 'Dimension Number', 'C', 46, 'dimension_number', 'INTEGER', FALSE),
    (24, 'Kapasitas (masyarakat, rumah tangga, individu)', 'Capacity Description', 'G', 46, 'capacity_description', 'TEXT', FALSE),
    (24, 'Rating Kapasitas', 'Capacity Rating Label', 'M', 46, 'rating_label', 'TEXT', FALSE),
    (24, 'Nilai Kapasitas', 'Capacity Rating Value', 'P', 46, 'rating_value', 'REAL', TRUE);

-- Block 25: Reference data — capacity rating scale (rows 60–63)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (25, 4, '5. Kapasitas', 'Capacity',
     'Skala Rating Kapasitas', 'Capacity Rating Scale',
     'evca_ref_capacity_rating', NULL, 'reference',
     'unformatted rows below main data, rows 60–63',
     'C60', 'D63', 60, 63, 'C', 'D',
     TRUE, 'Drop-down validation list; 4 rating levels');

INSERT INTO evca_block_fields (block_id, field_name_original, field_name_english, column_letter, row_number, db_column_name, db_data_type, is_computed) VALUES
    (25, 'Rating Label', 'Rating Label (original)', 'C', 60, 'label_original', 'TEXT', FALSE),
    (25, 'Nilai', 'Numeric Value', 'D', 60, 'numeric_value', 'REAL', FALSE);

INSERT INTO evca_reference_data (block_id, row_number, value_original, value_english, numeric_value, display_order) VALUES
    (25, 60, 'Kapasitas TINGGI',    'HIGH',     1.00, 1),
    (25, 61, 'Kapasitas SEDANG',    'MODERATE', 0.67, 2),
    (25, 62, 'Kapasitas RENDAH',    'LOW',      0.33, 3),
    (25, 63, 'Kapasitas TIDAK ADA', 'NONE',     0.00, 4);
```

---

## Sheet 6 — "6. Kohesi, Inklusi, Terhubung" (Social Cohesion, Inclusion, Connectedness)

### Description
Three cross-cutting dimensions assessed independently (not per-hazard). These feed by formula reference into Sheets 4 and 5 as dimensions 9–11. This is the authoritative source for those values. The sheet also has a single free-text narrative summarising all three dimensions.

### Layout
- **Row 12:** Overall narrative (medium borders, light-gray fill) → `evca_assessments.social_dimensions_overview`
- **Rows 16–18:** Three dimension rows — C (dimension name), G (description), S (rating label), T (rating value)
- **Rows 22–24:** Reference data — rating scale (3 levels only; no TIDAK ADA)

Note: column layout differs from Sheets 4–5 — rating label is col S (not M) and value is col T (not P).

### Dimensions
| Row | Indonesian | English | db value |
|---|---|---|---|
| 16 | Kohesi Sosial | Social Cohesion | `social_cohesion` |
| 17 | Inklusi | Inclusion | `inclusion` |
| 18 | Keterhubungan | Connectedness | `connectedness` |

### Rating Scale (rows 22–24)
| Label | English | Numeric |
|---|---|---|
| TINGGI | HIGH | 1.00 |
| SEDANG | MODERATE | 0.67 |
| RENDAH | LOW | 0.33 |

### Example Data (Para Lando)
| Dimension | Description (excerpt) | Rating | Value |
|---|---|---|---|
| Kohesi Sosial | Kegiatan Gotong royong dalam Pembangunan Rumah, Kegiatan stunting... | RENDAH | 0.33 |
| Inklusi | Membutuhkan dan membuat peraturan tentang bencana yang berkaitan dengan penyelamatan... | TINGGI | 1.00 |
| Keterhubungan | Tingkat desa belum memiliki koneksi khusus dengan pemerintah, BPBD, DESTANA... | SEDANG | 0.67 |

Overall narrative (row 12): "Secara umum, masyarakat sudah memiliki kohesi sosial tinggi sehingga tingkat res..." (Generally, the community already has high social cohesion so the level of response...)

### Schema Changes

```sql
-- New column on evca_assessments (social dimensions overview narrative)
ALTER TABLE evca_assessments ADD COLUMN social_dimensions_overview TEXT;

-- Reference table for social dimension rating scale
CREATE TABLE evca_ref_social_rating (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label_original  TEXT NOT NULL UNIQUE,
    label_english   TEXT NOT NULL,
    numeric_value   REAL NOT NULL
);

-- Social dimensions table (3 rows per assessment)
CREATE TABLE evca_social_dimensions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id   INTEGER NOT NULL REFERENCES evca_assessments(id),
    dimension       TEXT    NOT NULL CHECK(dimension IN ('social_cohesion','inclusion','connectedness')),
    description     TEXT,
    rating_label    TEXT    CHECK(rating_label IN ('TINGGI','SEDANG','RENDAH')),
    rating_value    REAL    CHECK(rating_value IN (0.33, 0.67, 1)),
    UNIQUE(assessment_id, dimension)
);
```

### Reference Data

```sql
INSERT INTO evca_ref_social_rating (label_original, label_english, numeric_value) VALUES
    ('TINGGI', 'HIGH',     1.00),
    ('SEDANG', 'MODERATE', 0.67),
    ('RENDAH', 'LOW',      0.33);
```

### Metadata SQL

```sql
-- Block 26: Overall social dimensions narrative (row 12)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (26, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Analisis Keseluruhan Dimensi Ketahanan', 'Overall Resilience Dimensions Narrative',
     'evca_assessments', 'social_dimensions_overview', 'single',
     'medium border all sides, light-gray fill #F2F2F2, row 12',
     'C12', 'R12', 12, 12, 'C', 'R',
     FALSE, 'UPDATE evca_assessments; one text box per assessment');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (26, 'Analisis Keseluruhan Dimensi Ketahanan', 'Overall Resilience Dimensions Narrative',
     'C', 12, 'social_dimensions_overview', 'TEXT', FALSE);

-- Block 27: Social dimension ratings (rows 16–18)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (27, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Peringkat Kohesi Sosial, Inklusi & Keterhubungan', 'Social Cohesion, Inclusion & Connectedness Ratings',
     'evca_social_dimensions', NULL, 'repeating',
     'thin-border dimension labels col C; medium-border description col G; rating col S; value col T; rows 16–18',
     'C16', 'T18', 16, 18, 'C', 'T',
     FALSE, '3 rows, one per dimension; col layout differs from Tabs 4–5 (S=rating, T=value)');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (27, 'Dimensi', 'Dimension',                   'C', 16, 'dimension',    'TEXT', FALSE),
    (27, 'Deskripsi', 'Description',               'G', 16, 'description',  'TEXT', FALSE),
    (27, 'Peringkat', 'Rating Label',               'S', 16, 'rating_label', 'TEXT', FALSE),
    (27, 'Nilai',     'Rating Value',               'T', 16, 'rating_value', 'REAL', TRUE);

-- Block 28: Reference data — social rating scale (rows 22–24)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (28, 5, '6. Kohesi, Inklusi, Terhubung', 'Social Cohesion, Inclusion, Connectedness',
     'Skala Rating Sosial', 'Social Dimension Rating Scale',
     'evca_ref_social_rating', NULL, 'reference',
     'unformatted rows below main data, rows 22–24',
     'C22', 'D24', 22, 24, 'C', 'D',
     TRUE, '3 rating levels only (no TIDAK ADA); used as drop-down validation');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (28, 'Rating Label', 'Rating Label (original)', 'C', 22, 'label_original', 'TEXT', FALSE),
    (28, 'Nilai',        'Numeric Value',           'D', 22, 'numeric_value',  'REAL', FALSE);

INSERT INTO evca_reference_data
    (block_id, row_number, value_original, value_english, numeric_value, display_order)
VALUES
    (28, 22, 'TINGGI', 'HIGH',     1.00, 1),
    (28, 23, 'SEDANG', 'MODERATE', 0.67, 2),
    (28, 24, 'RENDAH', 'LOW',      0.33, 3);
```

---

## Sheet 7 — "7. Risiko" (Risk)

### Description
Risk ratings per hazard × dimension. Every cell in this sheet is a formula — no manual data entry. Values are computed from Sheets 4–6 using an internal CAP−VUL lookup table (rows 61–263, 203 rows). **No data from this sheet needs to be entered by a user; it is all derived.** The import program reads formula results with `data_only=True`.

- Dims 1–8: `risk_label` is computed from vulnerability (col H) and capacity (col J) via the lookup table
- Dims 9–11 (cross-cutting): H/J show literal 'N/A' (grayed cells); risk label is copied directly from Tab 6 ratings

The lookup table is **not stored** — it is a calculation aid only. The formula is approximately linear: `risk_numeric = (vuln − cap + 1) / 2`. Categorical cutoffs: LOW < 0.5, MODERATE 0.5–0.75, HIGH > 0.75.

### Layout
- **Row 12:** Hazard 1 header (dark red `#C00000`) — "Ancaman 1 — Banjir Rob"
- **Row 14:** Column headers — Dimensi (C), KERENTANAN (H), KAPASITAS (J), Rating RISIKO (M)
- **Rows 15–25:** Hazard 1 — dims 1–8 with vuln/cap/risk values; dims 9–11 with N/A vuln/cap and social ratings
- **Row 27:** Hazard 2 header (red `#F7323F`) — "Ancaman 2 — Abrasi Pantai"
- **Rows 30–40:** Hazard 2 — same structure
- **Row 42:** Hazard 3 header (empty/theme fill)
- **Rows 45–55:** Hazard 3 — dims 1–8 all `#N/A` → NULL; dims 9–11 same social ratings as other hazards
- **Rows 61–263:** CAP−VUL lookup table — **not stored**
- **Cols S–X:** Internal risk matrix legend — **not stored**

### Example Data (Para Lando)

**Hazard 1 — Banjir Rob (Tidal Flooding):**
| # | Dimension | Vuln | Cap | Risk Label |
|---|---|---|---|---|
| 1 | Manajemen Bencana | 1.00 | 0.33 | HIGH |
| 2 | Kesehatan | 0.67 | 0.67 | MODERATE |
| 3 | Air dan Sanitasi | 1.00 | 0.67 | HIGH |
| 4 | Hunian | 0.67 | 0.67 | MODERATE |
| 5 | Pangan dan Nutrisi | 0.67 | 1.00 | MODERATE |
| 6 | Peluang Ekonomi | 1.00 | 0.67 | HIGH |
| 7 | Infrastruktur dan Layanan | 0.67 | 1.00 | MODERATE |
| 8 | Pengelolaan SDA | 0.67 | 0.67 | MODERATE |
| 9 | Kohesi Sosial | N/A | N/A | RENDAH |
| 10 | Inklusi | N/A | N/A | TINGGI |
| 11 | Keterhubungan | N/A | N/A | SEDANG |

**Hazard 2 — Abrasi Pantai (Coastal Erosion):**
| # | Dimension | Vuln | Cap | Risk Label |
|---|---|---|---|---|
| 1 | Manajemen Bencana | 1.00 | 0.67 | HIGH |
| 2 | Kesehatan | 0.00 | 1.00 | LOW |
| 3 | Air dan Sanitasi | 0.33 | 0.67 | LOW |
| 4 | Hunian | 0.67 | 0.67 | MODERATE |
| 5 | Pangan dan Nutrisi | #N/A → NULL | 1.00 | NULL |
| 6 | Peluang Ekonomi | 0.67 | 0.67 | MODERATE |
| 7 | Infrastruktur dan Layanan | #N/A → NULL | 0.67 | NULL |
| 8 | Pengelolaan SDA | 1.00 | 0.67 | HIGH |
| 9 | Kohesi Sosial | N/A | N/A | RENDAH |
| 10 | Inklusi | — | — | TINGGI |
| 11 | Keterhubungan | N/A | N/A | SEDANG |

**Hazard 3:** All dims 1–8 = NULL; dims 9–11 same cross-cutting ratings (shared at assessment level).

### Proposed Table

```sql
CREATE TABLE evca_risk_ratings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id    INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id        INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    risk_label       TEXT CHECK(risk_label IN ('HIGH','MODERATE','LOW','TINGGI','SEDANG','RENDAH')),
    UNIQUE(hazard_id, dimension_number)
);
```

> `vulnerability_value` and `capacity_value` are not stored here — they already exist in `evca_vulnerability_ratings` and `evca_capacity_ratings` and can be joined. Denormalising them would risk inconsistency.
>
> Dims 9–11 share the same risk label across all hazards (they are assessment-level, not hazard-level). The import program copies the same `evca_social_dimensions.rating_label` value into each hazard's rows 9–11.

### Metadata SQL

```sql
-- Block 29: Hazard 1 risk ratings (rows 15–25)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (29, 6, '7. Risiko', 'Risk',
     'Ancaman 1 Risiko', 'Hazard 1 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'dark-red header fill #C00000, row 12; data rows 15–25, cols C/H/J/M',
     'C15', 'M25', 15, 25, 'C', 'M',
     FALSE, 'All cells computed (thin borders); dims 9–11 H/J = N/A text');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (29, 'Dimensi',       'Dimension Number',          'C', 14, 'dimension_number', 'INTEGER', FALSE),
    (29, 'KERENTANAN',    'Vulnerability Value',        'H', 14, NULL,               'REAL',    TRUE),
    (29, 'KAPASITAS',     'Capacity Value',             'J', 14, NULL,               'REAL',    TRUE),
    (29, 'Rating RISIKO', 'Risk Rating Label',          'M', 14, 'risk_label',       'TEXT',    TRUE);

-- Block 30: Hazard 2 risk ratings (rows 30–40)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (30, 6, '7. Risiko', 'Risk',
     'Ancaman 2 Risiko', 'Hazard 2 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'red header fill #F7323F, row 27; data rows 30–40, cols C/H/J/M',
     'C30', 'M40', 30, 40, 'C', 'M',
     FALSE, 'Dims 5 and 7 have #N/A in vulnerability col → NULL; same table as block 29');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (30, 'Dimensi',       'Dimension Number',          'C', 29, 'dimension_number', 'INTEGER', FALSE),
    (30, 'KERENTANAN',    'Vulnerability Value',        'H', 29, NULL,               'REAL',    TRUE),
    (30, 'KAPASITAS',     'Capacity Value',             'J', 29, NULL,               'REAL',    TRUE),
    (30, 'Rating RISIKO', 'Risk Rating Label',          'M', 29, 'risk_label',       'TEXT',    TRUE);

-- Block 31: Hazard 3 risk ratings (rows 45–55)
INSERT INTO evca_sheet_blocks
    (id, sheet_index, sheet_name_original, sheet_name_english,
     block_name_original, block_name_english,
     table_name, target_column, block_type, identification_method,
     cell_range_start, cell_range_end, row_start, row_end, col_start, col_end,
     is_reference_data, notes)
VALUES
    (31, 6, '7. Risiko', 'Risk',
     'Ancaman 3 Risiko', 'Hazard 3 Risk Ratings',
     'evca_risk_ratings', NULL, 'repeating',
     'theme fill header, row 42; data rows 45–55, cols C/H/J/M',
     'C45', 'M55', 45, 55, 'C', 'M',
     FALSE, 'Dims 1–8 all #N/A → NULL; dims 9–11 same social ratings as other hazards; same table as blocks 29–30');

INSERT INTO evca_block_fields
    (block_id, field_name_original, field_name_english,
     column_letter, row_number, db_column_name, db_data_type, is_computed)
VALUES
    (31, 'Dimensi',       'Dimension Number',          'C', 44, 'dimension_number', 'INTEGER', FALSE),
    (31, 'KERENTANAN',    'Vulnerability Value',        'H', 44, NULL,               'REAL',    TRUE),
    (31, 'KAPASITAS',     'Capacity Value',             'J', 44, NULL,               'REAL',    TRUE),
    (31, 'Rating RISIKO', 'Risk Rating Label',          'M', 44, 'risk_label',       'TEXT',    TRUE);
```

> No reference data table for this sheet — the risk labels (HIGH/MODERATE/LOW/TINGGI/SEDANG/RENDAH) are bilingual variants of the same 3 levels. No lookup rows appear at the bottom of this sheet; the only unformatted rows are the CAP−VUL lookup table which is not stored.

---

## Sheet 8 — "8. Analisis" (Analysis)

### Description
Consolidated risk analysis. For each hazard × consolidated dimension, the assessor records:
- Vulnerability aspects (copied from Sheet 4)
- Capacity aspects (copied from Sheet 5)
- Key risk summary narrative

Additionally, a free-text overall risk analysis narrative is captured.

This sheet consolidates the 8 standard dimensions into **7 consolidated dimensions** (drop-down list visible in rows 34–40):

| # | Indonesian | English |
|---|---|---|
| 1 | Manajemen pengetahuan risiko | Risk Knowledge Management |
| 2 | Kebutuhan dasar (makanan, air & hunian) | Basic Needs (food, water & shelter) |
| 3 | Kohesi & Inklusi Sosial | Social Cohesion & Inclusion |
| 4 | Peluang ekonomi | Economic Opportunity |
| 5 | Infrastruktur dan layanan | Infrastructure and Services |
| 6 | Pengelolaan sumber daya alam | Natural Resource Management |
| 7 | Keterhubungan | Connectedness |

### Example Data (Para Lando — Hazard 1: Tidal Flooding)
| Consolidated Dimension | Key Risk Summary (excerpt) |
|---|---|
| Risk Knowledge Management | Low education levels; community awareness still weak... |
| Basic Needs | Housing: still many non-permanent houses in flood-prone areas... |
| Social Cohesion & Inclusion | Community understanding of disasters still low; regulations needed... |
| Economic Opportunity | No alternative livelihoods; direct dependence on sea/farm... |
| Infrastructure & Services | Infrastructure fairly good but lacks emergency response resources... |
| Natural Resource Management | Natural resource management limited; soil type susceptible... |
| Connectedness | Community interest in inter-institutional connectivity low... |

### Proposed Tables

```sql
CREATE TABLE evca_risk_analysis (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id           INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id               INTEGER NOT NULL REFERENCES evca_hazards(id),
    -- consolidated dimension number 1-7 per drop-down
    consolidated_dimension  INTEGER NOT NULL CHECK(consolidated_dimension BETWEEN 1 AND 7),
    vulnerability_aspects   TEXT,       -- copied/summarised from vulnerability sheet
    capacity_aspects        TEXT,       -- copied/summarised from capacity sheet
    key_risk_summary        TEXT,       -- assessor's narrative summary
    UNIQUE(hazard_id, consolidated_dimension)
);

CREATE TABLE evca_overall_analysis (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
    overall_narrative   TEXT    NOT NULL    -- free-text overall risk analysis
);
```

---

## Sheet 9 — "9. Rencana Aksi" (Action Plan)

### Description
Priority action plan. For each identified priority risk, the assessor records the desired outcome, priority activities/outputs, required resources, technical support needs, schedule, and responsible party. The sheet ends with a validation block for signatures from 4 stakeholder representatives.

### Columns (row 11 headers)
| Indonesian | English |
|---|---|
| Daftar Risiko Prioritas Tinggi | List of High-Priority Risks |
| Hasil | Desired Outcome |
| Aktivitas prioritas/Keluaran | Priority Activities/Outputs |
| Sumber daya yang dibutuhkan | Required Resources |
| Kebutuhan pendampingan teknis | Technical Support Needs |
| Jadwal | Schedule |
| (implied) Penanggung Jawab | Responsible Party |

### Example Data (Para Lando — 6 action items visible)
1. Low education/awareness → Training and materials (TDB equipment, curriculum, draft docs)
2. Non-permanent housing in flood zone → DRR socialisation, building standards advice
3. Community disaster understanding → Advocacy to government re: disaster management policy
4. No alternative livelihoods → Creative economy training, livelihood programmes
5. Infrastructure gaps → Seawall construction (PTPO), riprap
6. NRM issues → Training on maximising agricultural/fisheries products

### Validation Parties (row 35)
- Community Representative (Perwakilan Masyarakat)
- BPBD Representative (Disaster Management Agency)
- Village Representative (Perwakilan Desa)
- PMI District/City Representative

### Proposed Tables

```sql
CREATE TABLE evca_action_items (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id           INTEGER NOT NULL REFERENCES evca_assessments(id),
    item_order              INTEGER NOT NULL,
    priority_risk_description TEXT  NOT NULL,   -- the risk being addressed
    desired_outcome         TEXT,
    priority_activities     TEXT,               -- may list multiple numbered activities
    required_resources      TEXT,               -- budget, materials, etc (free-text)
    technical_support_needs TEXT,               -- facilitators, modules, agencies
    schedule                TEXT,               -- date or period description
    responsible_party       TEXT                -- e.g. "Sibat Commander and Village Government"
);

CREATE TABLE evca_action_validation (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id               INTEGER NOT NULL REFERENCES evca_assessments(id) UNIQUE,
    community_rep_name          TEXT,
    community_rep_signed        BOOLEAN DEFAULT FALSE,
    bpbd_rep_name               TEXT,
    bpbd_rep_signed             BOOLEAN DEFAULT FALSE,
    village_rep_name            TEXT,
    village_rep_signed          BOOLEAN DEFAULT FALSE,
    pmi_rep_name                TEXT,
    pmi_rep_signed              BOOLEAN DEFAULT FALSE,
    validation_date             DATE
);
```

---

## Sheet 10 — "Sheet1" (Priority Scoring Matrix)

### Description
Activity prioritisation scoring matrix. Each action plan activity is scored against 8 criteria. Scores are summed to produce a priority ranking. The sheet appears to evaluate the top activities from the action plan.

### Scoring Criteria (rows 4–11, column B)
| # (col A) | Criterion (Indonesian) | English |
|---|---|---|
| 1 | Dana | Funding availability |
| 2 | Jangka waktu | Timeframe feasibility |
| 3 | Sumber daya lokal (Material, sarana) | Local resources (materials, facilities) |
| 4 | Partisipasi masyarakat (Keterlibatan) | Community participation |
| 5 | Dukungan teknis dari pemerintah daerah | Technical support from local government |
| 9 | Keberlanjutan (Pemeliharaan dan penanganan) | Sustainability (maintenance and management) |
| 7 | Mandat PMI | PMI mandate |
| 8 | Efektivitas/ketepatan/fungsi aksi | Effectiveness/appropriateness/function |

### Activities Scored (column headers, row 2)
| Column | Activity |
|---|---|
| C | Perlengkapan TDB (Emergency equipment) |
| D | Pelatihan TDB (Emergency training) |
| E | Penyusunan Rencana Kontinjensi di Masyarakat (Community contingency planning) |
| F | Pembangunan Sarana Prasarana Sistem (System infrastructure development) |
| G–H | Additional activities (names truncated in raw data) |

### Example Scores (row 12 totals)
| Activity | Total Score |
|---|---|
| Perlengkapan TDB | 30 |
| Pelatihan TDB | 36 |
| Kontinjensi (Community planning) | 41 |
| Sistem Infrastructure | 35 |
| Activity 5 | 49 |
| Activity 6 | 55 |

### Proposed Tables

```sql
CREATE TABLE evca_priority_criteria (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    criterion_number INTEGER NOT NULL,
    name_id         TEXT    NOT NULL,   -- Indonesian name
    name_en         TEXT    NOT NULL,   -- English name
    UNIQUE(criterion_number)
);

-- Seed data:
-- (1, 'Dana', 'Funding availability')
-- (2, 'Jangka waktu', 'Timeframe feasibility')
-- (3, 'Sumber daya lokal', 'Local resources')
-- (4, 'Partisipasi masyarakat', 'Community participation')
-- (5, 'Dukungan teknis pemerintah', 'Government technical support')
-- (6, 'Keberlanjutan', 'Sustainability')
-- (7, 'Mandat PMI', 'PMI mandate')
-- (8, 'Efektivitas', 'Effectiveness')

CREATE TABLE evca_priority_scores (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    action_item_id      INTEGER REFERENCES evca_action_items(id),
    activity_name       TEXT    NOT NULL,   -- short name/label for the activity
    criterion_number    INTEGER NOT NULL,
    score               INTEGER,            -- numeric score for this criterion
    UNIQUE(assessment_id, action_item_id, criterion_number)
);

-- Or alternatively, store as a flat pivot with one row per activity:
CREATE TABLE evca_priority_scores_flat (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    action_item_id      INTEGER REFERENCES evca_action_items(id),
    activity_name       TEXT    NOT NULL,
    score_funding               INTEGER,
    score_timeframe             INTEGER,
    score_local_resources       INTEGER,
    score_community_participation INTEGER,
    score_govt_support          INTEGER,
    score_sustainability        INTEGER,
    score_pmi_mandate           INTEGER,
    score_effectiveness         INTEGER,
    total_score         INTEGER GENERATED ALWAYS AS (
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
```

---

## Summary — All Proposed Tables

| Table | Description | ~Rows per Assessment |
|---|---|---|
| `evca_assessments` | Top-level assessment record | 1 |
| `evca_population` | Population counts by gender × age group | 4 (one per age group) |
| `evca_community_background` | Context type, environment, livelihoods, narratives | 1 |
| `evca_vulnerable_groups` | Named vulnerable groups (max 4) | up to 4 |
| `evca_hazards` | Priority hazards (max 3) | up to 3 |
| `evca_vulnerability_ratings` | Vulnerability score per hazard × dimension | up to 33 (3 × 11) |
| `evca_capacity_ratings` | Capacity score per hazard × dimension | up to 33 (3 × 11) |
| `evca_social_dimensions` | Social cohesion / inclusion / connectedness | 3 |
| `evca_risk_ratings` | Risk rating per hazard × dimension | up to 33 (3 × 11) |
| `evca_risk_analysis` | Consolidated analysis per hazard × 7 dimensions | up to 21 (3 × 7) |
| `evca_overall_analysis` | Overall risk narrative | 1 |
| `evca_action_items` | Action plan activities | typically 6–10 |
| `evca_action_validation` | Stakeholder signatures | 1 |
| `evca_priority_scores_flat` | Activity priority scoring matrix | typically 6–10 |

---

## Design Notes

1. **Language normalisation:** All rating labels have bilingual variants (TINGGI/HIGH, SEDANG/MODERATE, RENDAH/LOW). Recommend storing the English canonical form internally and displaying localised labels in the UI.

2. **Hazard linking:** `evca_vulnerability_ratings`, `evca_capacity_ratings`, and `evca_risk_ratings` all link to `evca_hazards` via `hazard_id`, not directly to the hazard number. This allows hazards to be referenced across sheets consistently.

3. **Computed fields:** Risk ratings are computed from vulnerability − capacity. The `evca_risk_ratings` table stores the computed output; the formula does not need to be stored. The `evca_priority_scores_flat.total_score` can be a GENERATED column or computed application-side.

4. **Cross-cutting dimensions (9–11):** In the spreadsheet, dimensions 9–11 in Sheets 4 and 5 are formula references (`#REF!`) to Sheet 6. In the database, these should be populated by copying the values from `evca_social_dimensions` — not stored redundantly. The application layer handles this linkage.

5. **NULL vs #N/A:** Cells showing `#N/A` or `#REF!` in the spreadsheet indicate either formula errors (when the referenced hazard is empty) or genuinely no data. In the database, store as NULL.

6. **Action plan to scoring link:** `evca_priority_scores_flat.action_item_id` is optional (REFERENCES with no NOT NULL) to allow scoring of activities before they are formally recorded as action items, or when the scoring sheet lists slightly different activity names.
