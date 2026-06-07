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
Capacity assessment per hazard × dimension — mirror structure to Sheet 4. For each of the 3 hazards, the same 11 dimensions are rated for capacity (existing strengths and resources).

### Rating Scale (rows 60–63)
| Indonesian | English | Numeric |
|---|---|---|
| Kapasitas TINGGI | HIGH | 1.00 |
| Kapasitas SEDANG | MODERATE | 0.67 |
| Kapasitas RENDAH | LOW | 0.33 |
| Kapasitas TIDAK ADA | NONE | 0.00 |

### Example Data (Para Lando — Hazard 1: Tidal Flooding)
| Dimension | Rating | Value |
|---|---|---|
| Disaster Management | RENDAH | 0.33 |
| Health | SEDANG | 0.67 |
| Water & Sanitation | SEDANG | 0.67 |
| Housing | SEDANG | 0.67 |
| Food & Nutrition | TINGGI | 1.00 |
| Economic Opportunity | SEDANG | 0.67 |
| Infrastructure & Services | TINGGI | 1.00 |
| Natural Resources | SEDANG | 0.67 |

Capacity notes captured include: village governance (11 committee + 5 BPD members), health posts (1 Pustu, 3 Posyandu, 40 cadres), water sources, schools (SD MIS Al Fitrah, PAUD).

### Proposed Table

```sql
CREATE TABLE evca_capacity_ratings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id           INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number    INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    capacity_description TEXT,          -- narrative: existing capacity (institutions, resources)
    rating_label        TEXT CHECK(rating_label IN ('TINGGI','SEDANG','RENDAH','TIDAK ADA')),
    rating_value        REAL CHECK(rating_value IN (0, 0.33, 0.67, 1)),
    UNIQUE(hazard_id, dimension_number)
);
```

---

## Sheet 6 — "6. Kohesi, Inklusi, Terhubung" (Social Cohesion, Inclusion, Connectedness)

### Description
Three cross-cutting dimensions assessed independently (not per-hazard). These feed by formula into the vulnerability and capacity sheets as dimensions 9–11. Each dimension has a description, a rating label, and a numeric value.

### Dimensions
| Indonesian | English |
|---|---|
| Kohesi Sosial | Social Cohesion |
| Inklusi | Inclusion |
| Keterhubungan | Connectedness |

### Rating Scale (rows 22–24)
| Label | Numeric |
|---|---|
| TINGGI | 1.00 |
| SEDANG | 0.67 |
| RENDAH | 0.33 |

### Example Data (Para Lando)
| Dimension | Description (excerpt) | Rating | Value |
|---|---|---|---|
| Social Cohesion | Gotong royong activities in community development... | RENDAH | 0.33 |
| Inclusion | Needs and creates regulations for... | TINGGI | 1.00 |
| Connectedness | Village level has no connection to... | SEDANG | 0.67 |

Note: The sheet also includes a free-text overall narrative (row 12): "Generally, the community already has good..." 

### Proposed Table

```sql
CREATE TABLE evca_social_dimensions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id   INTEGER NOT NULL REFERENCES evca_assessments(id),
    -- dimension: social_cohesion, inclusion, connectedness
    dimension       TEXT    NOT NULL CHECK(dimension IN ('social_cohesion','inclusion','connectedness')),
    description     TEXT,       -- narrative description
    rating_label    TEXT        CHECK(rating_label IN ('TINGGI','SEDANG','RENDAH')),
    rating_value    REAL        CHECK(rating_value IN (0.33, 0.67, 1)),
    overall_narrative TEXT,     -- shared narrative (store once, e.g. only on first row or separate field)
    UNIQUE(assessment_id, dimension)
);
```

---

## Sheet 7 — "7. Risiko" (Risk)

### Description
Risk calculation per hazard × dimension. Risk is computed from vulnerability and capacity values using the formula: `risk_numeric = f(vulnerability - capacity)`. A hidden lookup table (rows 61–263) maps the VUL−CAP difference (range −1 to +1 in 0.01 steps) to a risk numeric value (0 to 1). The output is a categorical rating: HIGH/MODERATE/LOW (or TINGGI/SEDANG/RENDAH for cross-cutting dimensions).

The lookup table is an internal calculation tool only — it should **not** be stored in the database. Risk ratings are the stored output.

### Structure
- Rows 12–25: Hazard 1 (Tidal Flooding) — 8 standard + 3 cross-cutting dimensions
- Rows 27–40: Hazard 2 (Coastal Erosion) — same structure
- Rows 42–55: Hazard 3 (empty) — same structure

### Risk Rating Values
| Label | English |
|---|---|
| HIGH / TINGGI | High |
| MODERATE / SEDANG | Moderate |
| LOW / RENDAH | Low |

The numeric conversion (0–1) is also available as a decimal in the lookup table but the categorical label is the primary stored value.

### Example Data (Para Lando — Hazard 1: Tidal Flooding)
| Dimension | Vulnerability | Capacity | Risk |
|---|---|---|---|
| Disaster Management | 1.00 | 0.33 | HIGH |
| Health | 0.67 | 0.67 | MODERATE |
| Water & Sanitation | 1.00 | 0.67 | HIGH |
| Housing | 0.67 | 0.67 | MODERATE |
| Food & Nutrition | 0.67 | 1.00 | MODERATE |
| Economic Opportunity | 1.00 | 0.67 | HIGH |
| Infrastructure & Services | 0.67 | 1.00 | MODERATE |
| Natural Resources | 0.67 | 0.67 | MODERATE |
| Social Cohesion | N/A | N/A | RENDAH |
| Inclusion | N/A | N/A | TINGGI |
| Connectedness | N/A | N/A | SEDANG |

### Proposed Table

```sql
CREATE TABLE evca_risk_ratings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id       INTEGER NOT NULL REFERENCES evca_assessments(id),
    hazard_id           INTEGER NOT NULL REFERENCES evca_hazards(id),
    dimension_number    INTEGER NOT NULL CHECK(dimension_number BETWEEN 1 AND 11),
    vulnerability_value REAL,           -- from evca_vulnerability_ratings (denormalized for convenience)
    capacity_value      REAL,           -- from evca_capacity_ratings (denormalized for convenience)
    risk_label          TEXT CHECK(risk_label IN ('HIGH','MODERATE','LOW','TINGGI','SEDANG','RENDAH')),
    -- Normalised label (computed on insert/update):
    risk_level          TEXT GENERATED ALWAYS AS (
                            CASE risk_label
                                WHEN 'HIGH'     THEN 'high'
                                WHEN 'TINGGI'   THEN 'high'
                                WHEN 'MODERATE' THEN 'moderate'
                                WHEN 'SEDANG'   THEN 'moderate'
                                WHEN 'LOW'      THEN 'low'
                                WHEN 'RENDAH'   THEN 'low'
                                ELSE NULL
                            END
                        ) STORED,
    UNIQUE(hazard_id, dimension_number)
);
```

> **Note on the lookup table:** The 203-row CAP−VUL → risk numeric conversion table (rows 61–263) is a spreadsheet calculation aid. The conversion formula is linear: `risk_numeric = (vuln - cap + 1) / 2`. No need to store this table; it can be recomputed. The categorical cutoffs are: LOW < 0.5, MODERATE 0.5–0.75, HIGH > 0.75 (approximate based on the data observed).

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
