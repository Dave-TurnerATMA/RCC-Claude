-- =============================================================================
-- EVCA_reference.sql
-- Pre-populated reference / lookup data for EVCA database
-- Source: EVCA_Desa_Para_Lando.xlsx  drop-down lists and fixed value sets
-- =============================================================================
-- These INSERT statements seed all reference tables with the known valid values.
-- Run after EVCA_schema.sql has created the tables.
-- =============================================================================


-- =============================================================================
-- Tab 1, Block 4  —  evca_dimensions
-- The canonical 11 EVCA assessment dimensions
-- =============================================================================

INSERT INTO evca_dimensions (display_order, name_id, name_en) VALUES
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


-- =============================================================================
-- Tab 2, Block 9  —  evca_ref_community_type
-- =============================================================================

INSERT INTO evca_ref_community_type (name_id, name_en) VALUES
    ('Perkotaan', 'Urban'),
    ('Pedesaan',  'Rural'),
    ('Campuran',  'Mixed');


-- =============================================================================
-- Tab 2, Blocks 10-11  —  evca_ref_geophysical_env
-- Block 10: location type (3 rows)
-- Block 11: terrain type (2 rows)
-- =============================================================================

INSERT INTO evca_ref_geophysical_env (env_type, name_id, name_en) VALUES
    ('location', 'Pesisir',                                  'Coastal'),
    ('location', 'Perkotaan, dengan sungai-sungai besar',    'Urban with large rivers'),
    ('location', 'Pedalaman, tidak ada sungai besar',        'Inland, no large rivers'),
    ('terrain',  'Terutama medan datar',                     'Mainly flat terrain'),
    ('terrain',  'Terutama daerah pegunungan',               'Mainly mountainous');


-- =============================================================================
-- Tab 2, Block 12  —  evca_ref_livelihood
-- =============================================================================

INSERT INTO evca_ref_livelihood (name_id, name_en) VALUES
    ('Produksi tanaman dan sayuran',                          'Crop and vegetable production'),
    ('Pertanian dan Peternakan',                              'Farming and Livestock'),
    ('Memancing, budidaya ikan, koleksi produk perairan',     'Fishing / aquaculture'),
    ('Manufaktur',                                            'Manufacturing'),
    ('Layanan',                                               'Services'),
    ('Nelayan, Perkebunan, Pedagang',                         'Fisher / Plantation / Trader'),
    ('Wiraswasta',                                            'Self-employed');


-- =============================================================================
-- Tab 4, Block 20  —  evca_ref_vulnerability_rating
-- =============================================================================

INSERT INTO evca_ref_vulnerability_rating (label_original, label_english, numeric_value) VALUES
    ('Kerentanan TINGGI',    'HIGH',     1.00),
    ('Kerentanan SEDANG',    'MODERATE', 0.67),
    ('Kerentanan RENDAH',    'LOW',      0.33),
    ('Kerentanan TIDAK ADA', 'NONE',     0.00);


-- =============================================================================
-- Tab 5, Block 25  —  evca_ref_capacity_rating
-- =============================================================================

INSERT INTO evca_ref_capacity_rating (label_original, label_english, numeric_value) VALUES
    ('Kapasitas TINGGI',    'HIGH',     1.00),
    ('Kapasitas SEDANG',    'MODERATE', 0.67),
    ('Kapasitas RENDAH',    'LOW',      0.33),
    ('Kapasitas TIDAK ADA', 'NONE',     0.00);


-- =============================================================================
-- Tab 6, Block 28  —  evca_ref_social_rating
-- (3 levels only — no TIDAK ADA for social dimensions)
-- =============================================================================

INSERT INTO evca_ref_social_rating (label_original, label_english, numeric_value) VALUES
    ('TINGGI', 'HIGH',     1.00),
    ('SEDANG', 'MODERATE', 0.67),
    ('RENDAH', 'LOW',      0.33);


-- =============================================================================
-- Tab 10  —  evca_priority_criteria
-- Scoring criteria for the activity priority scoring matrix
-- =============================================================================

INSERT INTO evca_priority_criteria (criterion_number, name_id, name_en) VALUES
    (1, 'Dana',                                    'Funding availability'),
    (2, 'Jangka waktu',                            'Timeframe feasibility'),
    (3, 'Sumber daya lokal (Material, sarana)',     'Local resources (materials, facilities)'),
    (4, 'Partisipasi masyarakat (Keterlibatan)',    'Community participation'),
    (5, 'Dukungan teknis dari pemerintah daerah',  'Technical support from local government'),
    (6, 'Keberlanjutan (Pemeliharaan dan penanganan)', 'Sustainability'),
    (7, 'Mandat PMI',                              'PMI mandate'),
    (8, 'Efektivitas/ketepatan/fungsi aksi',        'Effectiveness / appropriateness');
