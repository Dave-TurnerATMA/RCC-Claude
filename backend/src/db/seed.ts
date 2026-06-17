import db from './database';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pastDate(daysAgo: number): string {
  return addDays(today(), -daysAgo);
}

function futureDate(daysAhead: number): string {
  return addDays(today(), daysAhead);
}

export function seedDatabase() {
  const existingTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
  if (existingTeams.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  // ── Teams ─────────────────────────────────────────────────────────────────
  const team1Id = db.prepare('INSERT INTO teams (name) VALUES (?)').run('Desa Maju Flood Response Team').lastInsertRowid as number;
  const team2Id = db.prepare('INSERT INTO teams (name) VALUES (?)').run('Kampung Sejahtera Fire Safety Team').lastInsertRowid as number;
  const team3Id = db.prepare('INSERT INTO teams (name) VALUES (?)').run('Dusun Damai Earthquake Preparedness').lastInsertRowid as number;

  // ── Users ─────────────────────────────────────────────────────────────────
  const insertUser = db.prepare('INSERT INTO users (team_id, name, email, role, status, language) VALUES (?, ?, ?, ?, ?, ?)');

  // Team 1 — Flood
  const daveId  = insertUser.run(team1Id, 'Dave Turner',    'davet.home@gmail.com',  'administrator', 'active', 'en').lastInsertRowid as number;
  const budiId  = insertUser.run(team1Id, 'Budi Santoso',   'budi@example.com',      'team_lead',     'active', 'id').lastInsertRowid as number;
  const sitiId  = insertUser.run(team1Id, 'Siti Rahayu',    'siti@example.com',      'team_member',   'active', 'id').lastInsertRowid as number;
  const ahmadId = insertUser.run(team1Id, 'Ahmad Fauzi',    'ahmad@example.com',     'team_member',   'active', 'id').lastInsertRowid as number;
  const dewiId  = insertUser.run(team1Id, 'Dewi Kusuma',    'dewi@example.com',      'team_member',   'active', 'id').lastInsertRowid as number;
  const hendraId= insertUser.run(team1Id, 'Hendra Wijaya',  'hendra@example.com',    'team_member',   'active', 'id').lastInsertRowid as number;
  const rinaId  = insertUser.run(team1Id, 'Rina Wulandari', 'rina@example.com',      'team_member',   'active', 'id').lastInsertRowid as number;
  const jokoId  = insertUser.run(team1Id, 'Joko Purnomo',   'joko@example.com',      'team_member',   'active', 'id').lastInsertRowid as number;

  // Team 2 — Fire
  const admin2Id  = insertUser.run(team2Id, 'Supriyanto',   'supri@example.com',     'administrator', 'active', 'id').lastInsertRowid as number;
  const lead2Id   = insertUser.run(team2Id, 'Ratna Sari',   'ratna@example.com',     'team_lead',     'active', 'id').lastInsertRowid as number;
  const member2aId= insertUser.run(team2Id, 'Wahyu Prasetyo','wahyu@example.com',    'team_member',   'active', 'id').lastInsertRowid as number;
  const member2bId= insertUser.run(team2Id, 'Sri Mulyani',   'sri@example.com',      'team_member',   'active', 'id').lastInsertRowid as number;
  const member2cId= insertUser.run(team2Id, 'Carlos García', 'carlos@example.com',   'team_member',   'active', 'es').lastInsertRowid as number;

  // Team 3 — Earthquake
  const admin3Id  = insertUser.run(team3Id, 'Teguh Santoso', 'teguh@example.com',    'administrator', 'active', 'id').lastInsertRowid as number;
  const lead3Id   = insertUser.run(team3Id, 'Yuliana Putri', 'yuli@example.com',     'team_lead',     'active', 'id').lastInsertRowid as number;
  const member3aId= insertUser.run(team3Id, 'Agus Subagyo',  'agus@example.com',     'team_member',   'active', 'id').lastInsertRowid as number;
  const member3bId= insertUser.run(team3Id, 'Maria Santos',  'maria@example.com',    'team_member',   'active', 'es').lastInsertRowid as number;

  // ── Equipment Team 1 ──────────────────────────────────────────────────────
  const insertEq = db.prepare('INSERT INTO equipment (team_id, name_en, name_es, name_id) VALUES (?, ?, ?, ?)');
  const foodId       = insertEq.run(team1Id, 'Emergency food supplies',      'Suministros de alimentos de emergencia', 'Persediaan makanan darurat').lastInsertRowid as number;
  const waterId      = insertEq.run(team1Id, 'Water purification tablets',   'Tabletas purificadoras de agua',         'Tablet pemurnian air').lastInsertRowid as number;
  const firstAidId   = insertEq.run(team1Id, 'First aid kit',                'Botiquín de primeros auxilios',          'Kotak P3K').lastInsertRowid as number;
  const radioId      = insertEq.run(team1Id, 'Emergency radio',              'Radio de emergencia',                    'Radio darurat').lastInsertRowid as number;
  const flashlightId = insertEq.run(team1Id, 'Flashlights and batteries',    'Linternas y baterías',                   'Senter dan baterai').lastInsertRowid as number;
  const ropeId       = insertEq.run(team1Id, 'Rope (50m)',                   'Cuerda (50m)',                           'Tali (50m)').lastInsertRowid as number;
  const lifeJacketId = insertEq.run(team1Id, 'Life jackets',                 'Chalecos salvavidas',                    'Jaket pelampung').lastInsertRowid as number;
  const sandbagId    = insertEq.run(team1Id, 'Sandbags',                     'Sacos de arena',                         'Kantong pasir').lastInsertRowid as number;
  const megaphoneId  = insertEq.run(team1Id, 'Megaphone',                    'Megáfono',                               'Megafon').lastInsertRowid as number;
  const stretcherId  = insertEq.run(team1Id, 'First aid stretcher',          'Camilla de primeros auxilios',           'Tandu P3K').lastInsertRowid as number;
  const blanketId    = insertEq.run(team1Id, 'Emergency blankets',           'Mantas de emergencia',                   'Selimut darurat').lastInsertRowid as number;
  const generatorId  = insertEq.run(team1Id, 'Generator',                    'Generador',                              'Generator').lastInsertRowid as number;

  // Equipment Team 2
  const fireExtId  = insertEq.run(team2Id, 'Fire extinguishers',            'Extintores de incendios',                'APAR').lastInsertRowid as number;
  const fireHoseId = insertEq.run(team2Id, 'Fire hose (30m)',               'Manguera de incendios (30m)',             'Selang pemadam (30m)').lastInsertRowid as number;
  const heatMaskId = insertEq.run(team2Id, 'Heat-resistant masks',          'Máscaras resistentes al calor',          'Masker tahan panas').lastInsertRowid as number;
  const firstAid2Id= insertEq.run(team2Id, 'First aid kit',                 'Botiquín de primeros auxilios',          'Kotak P3K').lastInsertRowid as number;
  const megaphone2Id=insertEq.run(team2Id, 'Megaphone',                     'Megáfono',                               'Megafon').lastInsertRowid as number;

  // Equipment Team 3
  const firstAid3Id = insertEq.run(team3Id, 'First aid kit',                'Botiquín de primeros auxilios',          'Kotak P3K').lastInsertRowid as number;
  const harness3Id  = insertEq.run(team3Id, 'Safety harness',               'Arnés de seguridad',                    'Harness keselamatan').lastInsertRowid as number;
  const helmets3Id  = insertEq.run(team3Id, 'Safety helmets',               'Cascos de seguridad',                   'Helm keselamatan').lastInsertRowid as number;

  // ── Main Tasks ────────────────────────────────────────────────────────────
  const insertMT = db.prepare('INSERT INTO main_tasks (team_id, short_description, display_order) VALUES (?, ?, ?)');

  // Team 1
  const mt1WaterSanId   = insertMT.run(team1Id, 'Water & Sanitation', 1).lastInsertRowid as number;
  const mt1CommId       = insertMT.run(team1Id, 'Emergency Communication', 2).lastInsertRowid as number;
  const mt1EvacId       = insertMT.run(team1Id, 'Evacuation & Shelter', 3).lastInsertRowid as number;
  const mt1FoodId       = insertMT.run(team1Id, 'Food & Supplies', 4).lastInsertRowid as number;
  const mt1MedId        = insertMT.run(team1Id, 'Medical', 5).lastInsertRowid as number;

  // Team 2
  const mt2PrevId       = insertMT.run(team2Id, 'Fire Prevention', 1).lastInsertRowid as number;
  const mt2RespId       = insertMT.run(team2Id, 'Emergency Response', 2).lastInsertRowid as number;
  const mt2SafeId       = insertMT.run(team2Id, 'Community Safety', 3).lastInsertRowid as number;
  const mt2EqMaintId    = insertMT.run(team2Id, 'Equipment Maintenance', 4).lastInsertRowid as number;
  const mt2RecovId      = insertMT.run(team2Id, 'Recovery Planning', 5).lastInsertRowid as number;

  // Team 3
  const mt3StructId     = insertMT.run(team3Id, 'Structural Safety', 1).lastInsertRowid as number;
  const mt3PrepId       = insertMT.run(team3Id, 'Earthquake Preparedness', 2).lastInsertRowid as number;
  const mt3RespId       = insertMT.run(team3Id, 'Response Protocols', 3).lastInsertRowid as number;

  // ── Required Tasks helpers ────────────────────────────────────────────────
  const insertRT = db.prepare(`
    INSERT INTO required_tasks (team_id, main_task_id, short_description, task_overview, priority, type,
      scheduled_date, default_responsible_user_id, estimate_hours, frequency_days,
      planned_instances, top_tips, origin, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `);

  const insertStep = db.prepare('INSERT INTO required_task_steps (required_task_id, step_text, display_order) VALUES (?, ?, ?)');
  const addCrewDefault = db.prepare('INSERT OR IGNORE INTO required_task_crew_defaults (required_task_id, user_id) VALUES (?, ?)');

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM 1 — FLOOD RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════

  // RT1: Water Level Monitoring (Recurring, weekly)
  const rt1Id = insertRT.run(
    team1Id, mt1WaterSanId,
    'Water Level Monitoring',
    'Monitor water levels at all key monitoring points in the village: main river, drainage channels, and 3 monitoring wells. Record readings and compare to baseline. Alert team if any reading exceeds warning threshold.',
    'urgent', 'recurring',
    pastDate(7), budiId, 1.5, 7, 2,
    'Check all three wells in sequence starting from the north. After heavy rain, check every 6 hours. Keep the record book dry in a plastic sleeve.',
    daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt1Id, budiId);
  addCrewDefault.run(rt1Id, ahmadId);
  insertStep.run(rt1Id, 'Collect monitoring log book and waterproof gauge from village hall office', 0);
  insertStep.run(rt1Id, 'Check river level at the main gauge on Jembatan Maju — record reading', 1);
  insertStep.run(rt1Id, 'Walk drainage channels along Jl. Raya — note any blockages', 2);
  insertStep.run(rt1Id, 'Check Well 1 (RT01 north), Well 2 (RT03 centre), Well 3 (RT05 south) — record levels', 3);
  insertStep.run(rt1Id, 'Compare readings to baseline — flag if river > 2.5m or any well > normal +30cm', 4);
  insertStep.run(rt1Id, 'Update monitoring log and report findings to team lead', 5);

  // RT2: Flood Evacuation Route Inspection (Recurring, monthly)
  const rt2Id = insertRT.run(
    team1Id, mt1EvacId,
    'Flood Evacuation Route Inspection',
    'Inspect all three designated evacuation routes to ensure they are passable, clearly marked, and accessible for elderly and disabled residents. Check signage, bridge conditions, and surface conditions.',
    'high', 'recurring',
    pastDate(45), budiId, 4, 30, 2,
    'Bring a vehicle to test route passability for buses. Check culverts after heavy rain. Update the community map if any route changes.',
    daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt2Id, budiId);
  addCrewDefault.run(rt2Id, sitiId);
  insertStep.run(rt2Id, 'Collect evacuation route checklist and village map from office', 0);
  insertStep.run(rt2Id, 'Inspect Route 1 (Jl. Maju → Balai Desa): surface, signage, bridge', 1);
  insertStep.run(rt2Id, 'Inspect Route 2 (RT04 path → high ground): width, drainage, steps', 2);
  insertStep.run(rt2Id, 'Inspect Route 3 (riverside path → Masjid): handrails, culverts', 3);
  insertStep.run(rt2Id, 'Document any issues with photos — log in route inspection register', 4);
  insertStep.run(rt2Id, 'Update community evacuation map with current route status', 5);

  // RT3: Emergency Food & Water Stock Check (Recurring, fortnightly)
  const rt3Id = insertRT.run(
    team1Id, mt1FoodId,
    'Emergency Food & Water Stock Check',
    'Check and rotate emergency food and water supplies stored at the village hall. Count all stock items, check expiry dates, apply FIFO rotation, and replenish as needed.',
    'high', 'recurring',
    pastDate(10), null, 2, 14, 3,
    'Always check expiry dates first. Rotate stock FIFO. Keep at least 3 days supply for 50 families. Check for rodent damage.',
    daveId
  ).lastInsertRowid as number;
  insertStep.run(rt3Id, 'Open emergency supply room and retrieve the inventory log', 0);
  insertStep.run(rt3Id, 'Count all food items — record quantity and check expiry dates', 1);
  insertStep.run(rt3Id, 'Count all water purification tablets — check packaging for damage', 2);
  insertStep.run(rt3Id, 'Remove and set aside any expired or damaged items', 3);
  insertStep.run(rt3Id, 'Update inventory log with current counts', 4);
  insertStep.run(rt3Id, 'Create replenishment list for items below minimum level', 5);
  insertStep.run(rt3Id, 'Lock storage room and report status to administrator', 6);

  // RT4: Community Flood Warning Drill (Recurring, quarterly)
  const rt4Id = insertRT.run(
    team1Id, mt1EvacId,
    'Community Flood Warning Drill',
    'Conduct a full community drill to practice flood evacuation procedures. Notify all households, assemble at designated meeting points, practice evacuation routes, and debrief with community leaders.',
    'high', 'recurring',
    pastDate(80), daveId, 6, 90, 2,
    'Run the drill at different times to catch people at different activities. Always debrief with community leaders after. Practice with elderly and children separately.',
    daveId
  ).lastInsertRowid as number;
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    addCrewDefault.run(rt4Id, uid);
  }
  insertStep.run(rt4Id, 'Send notification to all RT heads 3 days in advance', 0);
  insertStep.run(rt4Id, 'Set up registration tables at both assembly points', 1);
  insertStep.run(rt4Id, 'Sound warning signal and start timing', 2);
  insertStep.run(rt4Id, 'Guide community along each evacuation route — assist elderly', 3);
  insertStep.run(rt4Id, 'Complete roll call at assembly point — record all names', 4);
  insertStep.run(rt4Id, 'Conduct debrief session with community leaders and record findings', 5);

  // RT5: Shelter Site Assessment (One-Off, future)
  const rt5Id = insertRT.run(
    team1Id, mt1EvacId,
    'Shelter Site Assessment',
    'Assess all three designated emergency shelter sites for capacity, structural integrity, water access, sanitation facilities, and accessibility. Prepare written assessment report for submission to kecamatan office.',
    'urgent', 'one_off',
    futureDate(14), daveId, 8, null, null, null, daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt5Id, daveId);
  addCrewDefault.run(rt5Id, budiId);
  addCrewDefault.run(rt5Id, sitiId);
  insertStep.run(rt5Id, 'Collect shelter assessment checklist and measuring tape', 0);
  insertStep.run(rt5Id, 'Assess Site 1 (Balai Desa): capacity, structure, water, sanitation', 1);
  insertStep.run(rt5Id, 'Assess Site 2 (Masjid Al-Ikhlas): capacity, structure, water, sanitation', 2);
  insertStep.run(rt5Id, 'Assess Site 3 (Sekolah Dasar): capacity, structure, water, sanitation', 3);
  insertStep.run(rt5Id, 'Photograph all issues found at each site', 4);
  insertStep.run(rt5Id, 'Compile assessment report and recommendations', 5);
  insertStep.run(rt5Id, 'Submit report to administrator for kecamatan submission', 6);

  // RT6: Emergency Supply Stockpile Acquisition (One-Off, not scheduled)
  const rt6Id = insertRT.run(
    team1Id, mt1FoodId,
    'Emergency Supply Stockpile Acquisition',
    'Purchase and store a minimum 5-day emergency supply for 100 people at the village hall. Items: rice (100kg), instant noodles (200 packs), canned food (300 cans), water purification tablets (10 packs), and basic medical supplies.',
    'high', 'one_off',
    null, daveId, 4, null, null, null, daveId
  ).lastInsertRowid as number;

  // RT7: Community Awareness Campaign (One-Off, future)
  const rt7Id = insertRT.run(
    team1Id, mt1CommId,
    'Community Awareness Campaign — Flood Season',
    'Conduct a village-wide awareness campaign before flood season. Activities: mosque announcements, WhatsApp broadcast, notice boards, and door-to-door visits for vulnerable households.',
    'high', 'one_off',
    futureDate(7), budiId, 3, null, null, null, daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt7Id, budiId);
  addCrewDefault.run(rt7Id, rinaId);

  // RT8: Emergency Communication Tree Test (Recurring, monthly)
  const rt8Id = insertRT.run(
    team1Id, mt1CommId,
    'Emergency Communication Tree Test',
    'Test the village emergency communication chain by activating the tree at 8am. Time how long it takes to reach all household leaders. Record who did not respond and update contact list.',
    'medium', 'recurring',
    pastDate(28), null, 1, 30, 3,
    'Start the chain at exactly 8am. Record the time each tier responds. Update contact list immediately after — inactive numbers are a risk.',
    daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt8Id, budiId);
  insertStep.run(rt8Id, 'Retrieve current communication tree list from village hall', 0);
  insertStep.run(rt8Id, 'Activate Tier 1 (RT Heads) at exactly 08:00 — start timer', 1);
  insertStep.run(rt8Id, 'Record time each RT head responds', 2);
  insertStep.run(rt8Id, 'Wait for Tier 2 (household heads) confirmation — note non-responders', 3);
  insertStep.run(rt8Id, 'Calculate total time — target is all households within 15 minutes', 4);
  insertStep.run(rt8Id, 'Update contact list and report results to administrator', 5);

  // RT9: First Aid Kit Inspection (Recurring, monthly)
  const rt9Id = insertRT.run(
    team1Id, mt1MedId,
    'First Aid Kit Inspection',
    'Inspect all first aid kits stored at the village hall and each RT meeting point. Check contents against the standard list, check expiry dates, replace depleted or expired items.',
    'medium', 'recurring',
    pastDate(15), null, 1.5, 30, 2,
    'Check the most used kits first — the ones at the community centre. Replace anything that looks worn even if not expired.',
    daveId
  ).lastInsertRowid as number;
  addCrewDefault.run(rt9Id, dewiId);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM 2 — FIRE SAFETY
  // ═══════════════════════════════════════════════════════════════════════════

  const insertRT2 = db.prepare(`
    INSERT INTO required_tasks (team_id, main_task_id, short_description, task_overview, priority, type,
      scheduled_date, default_responsible_user_id, estimate_hours, frequency_days,
      planned_instances, top_tips, origin, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `);

  // RT-T2-1: Fire Extinguisher Inspection (Recurring, monthly)
  const rt2t1Id = insertRT2.run(
    team2Id, mt2EqMaintId,
    'Fire Extinguisher Inspection',
    'Inspect all fire extinguishers in public buildings. Check pressure gauge, safety pin, seal, expiry date. Record in inspection register and arrange refilling or replacement as needed.',
    'high', 'recurring',
    pastDate(25), lead2Id, 2, 30, 2,
    'Check pressure gauge first — if in red zone, arrange replacement immediately. Never skip any building even if it looks recently checked.',
    admin2Id
  ).lastInsertRowid as number;
  addCrewDefault.run(rt2t1Id, lead2Id);
  addCrewDefault.run(rt2t1Id, member2aId);

  // RT-T2-2: Community Fire Safety Education (One-Off, no scheduled_date)
  const rt2t2Id = insertRT2.run(
    team2Id, mt2SafeId,
    'Community Fire Safety Education',
    'Deliver fire safety education to community members focusing on cooking fire prevention, safe use of LPG gas, and what to do if a fire starts.',
    'medium', 'one_off',
    null, admin2Id, 4, null, null, null, admin2Id
  ).lastInsertRowid as number;

  // RT-T2-3: Fire Hazard Assessment (Recurring, 6-weekly)
  const rt2t3Id = insertRT2.run(
    team2Id, mt2PrevId,
    'Fire Hazard Assessment',
    'Walk all streets and check for fire hazards: improper waste disposal near buildings, overloaded electrical wiring, unsafe LPG storage, and unsafe cooking practices near flammable materials.',
    'high', 'recurring',
    pastDate(42), lead2Id, 3, 45, 2,
    'Check the market area carefully — it has the highest fire risk. Talk to residents about their cooking practices near wooden structures.',
    admin2Id
  ).lastInsertRowid as number;
  addCrewDefault.run(rt2t3Id, lead2Id);
  addCrewDefault.run(rt2t3Id, member2aId);

  // RT-T2-4: Emergency Drill (Recurring, quarterly)
  const rt2t4Id = insertRT2.run(
    team2Id, mt2RespId,
    'Community Fire Emergency Drill',
    'Conduct quarterly fire emergency drill. Test evacuation procedures, fire response team activation, and first aid response. All team members expected to participate.',
    'high', 'recurring',
    pastDate(60), admin2Id, 4, 90, 2,
    'Coordinate with local fire station to have a unit present for the drill. Always debrief within 2 hours of the drill ending.',
    admin2Id
  ).lastInsertRowid as number;
  for (const uid of [lead2Id, member2aId, member2bId, member2cId]) {
    addCrewDefault.run(rt2t4Id, uid);
  }

  // RT-T2-5: Shelter Site Assessment (One-Off, scheduled)
  const rt2t5Id = insertRT2.run(
    team2Id, mt2RecovId,
    'Post-Fire Community Recovery Planning',
    'Develop a written community recovery plan for use after a significant fire event. Plan covers temporary shelter, food distribution, insurance assistance, and psychological support.',
    'medium', 'one_off',
    futureDate(30), admin2Id, 6, null, null, null, admin2Id
  ).lastInsertRowid as number;

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM 3 — EARTHQUAKE PREPAREDNESS (Required Tasks only, no Scheduled Tasks)
  // ═══════════════════════════════════════════════════════════════════════════

  const insertRT3 = db.prepare(`
    INSERT INTO required_tasks (team_id, main_task_id, short_description, task_overview, priority, type,
      scheduled_date, default_responsible_user_id, estimate_hours, frequency_days,
      planned_instances, top_tips, origin, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `);

  const rt3t1Id = insertRT3.run(
    team3Id, mt3StructId,
    'Building Safety Inspection',
    'Assess structural safety of key village buildings: balai dusun, masjid, sekolah, puskesmas. Use the structural assessment checklist. Look for cracks, foundation issues, and non-compliant extensions.',
    'urgent', 'one_off',
    null, admin3Id, 8, null, null, null, admin3Id
  ).lastInsertRowid as number;
  addCrewDefault.run(rt3t1Id, admin3Id);
  addCrewDefault.run(rt3t1Id, lead3Id);

  const rt3t2Id = insertRT3.run(
    team3Id, mt3PrepId,
    'Earthquake Emergency Kit Assembly',
    'Assemble complete earthquake emergency kits for all 5 RT areas. Each kit must contain: first aid supplies, flashlights, emergency blankets, water and food for 3 days, and communication equipment.',
    'high', 'one_off',
    null, lead3Id, 4, null, null, null, admin3Id
  ).lastInsertRowid as number;

  const rt3t3Id = insertRT3.run(
    team3Id, mt3PrepId,
    'Earthquake Preparedness Household Survey',
    'Survey all 120 households to assess earthquake preparedness: structural safety awareness, emergency kit possession, knowledge of drop-cover-hold, and evacuation route familiarity.',
    'medium', 'one_off',
    null, lead3Id, 8, null, null, null, admin3Id
  ).lastInsertRowid as number;
  for (const uid of [lead3Id, member3aId, member3bId]) {
    addCrewDefault.run(rt3t3Id, uid);
  }

  const rt3t4Id = insertRT3.run(
    team3Id, mt3RespId,
    'Community Earthquake Response Training',
    'Train all community members in earthquake response: drop-cover-hold procedure, post-earthquake safety checks, identifying structural damage, and the community alert system.',
    'high', 'recurring',
    null, admin3Id, 8, 180, 1,
    'Invite BPBD officer to co-facilitate. Run elderly and children sessions separately. Practice with mobile phones to simulate communication disruption.',
    admin3Id
  ).lastInsertRowid as number;
  for (const uid of [lead3Id, member3aId, member3bId]) {
    addCrewDefault.run(rt3t4Id, uid);
  }

  const rt3t5Id = insertRT3.run(
    team3Id, mt3RespId,
    'Search & Rescue Team Formation & Training',
    'Form a 6-person search and rescue team and conduct initial training. Cover: building search techniques, victim extraction, basic first aid, team communication protocols.',
    'high', 'one_off',
    null, admin3Id, 12, null, null, null, admin3Id
  ).lastInsertRowid as number;

  const rt3t6Id = insertRT3.run(
    team3Id, mt3StructId,
    'Early Warning System Installation',
    'Install manual hand-crank warning sirens at 3 strategic locations. Mount at 3-4 metres height for maximum coverage. Train assigned operators and develop maintenance schedule.',
    'urgent', 'one_off',
    null, lead3Id, 3, null, null, null, admin3Id
  ).lastInsertRowid as number;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULED TASKS — Teams 1 & 2 only
  // ═══════════════════════════════════════════════════════════════════════════

  function createST(data: {
    teamId: number;
    requiredTaskId: number | null;
    parentTaskId?: number | null;
    type: string;
    desc: string;
    overview: string;
    scheduledDate: string | null;
    priority: string;
    state: string;
    responsibleId: number | null;
    participants?: string;
    participationType?: string;
    estimateHours: number | null;
    actualHours?: number | null;
    workDescription?: string | null;
    problems?: string | null;
    completedAt?: string | null;
    planningNotes?: string | null;
    location?: string | null;
    createdBy?: number | null;
  }): number {
    return db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, parent_scheduled_task_id, type,
        short_description, task_overview, scheduled_date, priority, state,
        responsible_user_id, participants, participation_type, estimate_hours, actual_hours,
        work_description, problems, completed_at, planning_notes, location, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.teamId, data.requiredTaskId ?? null, data.parentTaskId ?? null, data.type,
      data.desc, data.overview, data.scheduledDate, data.priority, data.state,
      data.responsibleId, data.participants ?? 'crew', data.participationType ?? 'picked',
      data.estimateHours, data.actualHours ?? null,
      data.workDescription ?? null, data.problems ?? null,
      data.completedAt ?? null, data.planningNotes ?? null,
      data.location ?? 'Base', data.createdBy ?? null
    ).lastInsertRowid as number;
  }

  function addCrew(stId: number, userId: number, source: string, addedBy: number | null, status: string, confirmedAt?: string | null): void {
    db.prepare(`
      INSERT OR IGNORE INTO crew_participation (scheduled_task_id, user_id, source, added_by_user_id, status, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(stId, userId, source, addedBy, status, confirmedAt ?? null);
  }

  function addEquip(stId: number, eqId: number): void {
    db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(stId, eqId);
  }

  // ─── Team 1 Historical Completed Tasks ────────────────────────────────────

  // RT1 Water Level Monitoring — 3 historical completions
  const hist1a = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: pastDate(49), priority: 'urgent', state: 'completed',
    responsibleId: budiId, estimateHours: 1.5, actualHours: 2,
    workDescription: 'Pemeriksaan selesai. Level air sungai normal (1.8m). Saluran di RT02 tersumbat sampah, sudah dibersihkan. 3 sumur pantau dalam batas normal.',
    problems: 'Saluran RT02 tersumbat. Dibersihkan saat kunjungan. Perlu monitoring rutin.',
    completedAt: pastDate(49) + 'T10:30:00.000Z'
  });
  addCrew(hist1a, budiId, 'required_task_default', daveId, 'confirmed', pastDate(49) + 'T08:00:00.000Z');
  addCrew(hist1a, ahmadId, 'required_task_default', daveId, 'confirmed', pastDate(49) + 'T08:00:00.000Z');

  const hist1b = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: pastDate(28), priority: 'urgent', state: 'completed',
    responsibleId: budiId, estimateHours: 1.5, actualHours: 1.5,
    workDescription: 'Level air sungai naik 30cm dari minggu lalu akibat hujan deras 2 hari. Masih dalam batas aman (2.1m, ambang 2.5m). Semua sumur pantau normal.',
    problems: 'Tidak ada masalah.',
    completedAt: pastDate(28) + 'T09:00:00.000Z'
  });
  addCrew(hist1b, budiId, 'required_task_default', daveId, 'confirmed', pastDate(28) + 'T08:00:00.000Z');
  addCrew(hist1b, ahmadId, 'required_task_default', daveId, 'confirmed', pastDate(28) + 'T08:00:00.000Z');

  const hist1c = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: pastDate(14), priority: 'urgent', state: 'completed',
    responsibleId: budiId, estimateHours: 1.5, actualHours: 1.75,
    workDescription: 'Level air kembali normal setelah musim kering. Semua titik pantau dalam kondisi baik. Buku log diperbarui.',
    problems: 'Tidak ada masalah signifikan.',
    completedAt: pastDate(14) + 'T09:30:00.000Z'
  });
  addCrew(hist1c, budiId, 'required_task_default', daveId, 'confirmed', pastDate(14) + 'T08:00:00.000Z');
  addCrew(hist1c, ahmadId, 'required_task_default', daveId, 'confirmed', pastDate(14) + 'T08:00:00.000Z');

  // RT1 Current Pending (overdue by 7 days)
  const rt1Pending = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: pastDate(7), priority: 'urgent', state: 'pending',
    responsibleId: budiId, estimateHours: 1.5
  });
  addCrew(rt1Pending, budiId, 'required_task_default', daveId, 'confirmed');
  addCrew(rt1Pending, ahmadId, 'required_task_default', daveId, 'invited');

  // RT1 Planned instances
  const rt1Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: futureDate(0), priority: 'urgent', state: 'planned',
    responsibleId: budiId, estimateHours: 1.5
  });
  addCrew(rt1Plan1, budiId, 'required_task_default', daveId, 'invited');
  addCrew(rt1Plan1, ahmadId, 'required_task_default', daveId, 'invited');

  const rt1Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Water Level Monitoring', overview: 'Monitor water levels at all key monitoring points.',
    scheduledDate: futureDate(7), priority: 'urgent', state: 'planned',
    responsibleId: budiId, estimateHours: 1.5
  });
  addCrew(rt1Plan2, budiId, 'required_task_default', daveId, 'invited');
  addCrew(rt1Plan2, ahmadId, 'required_task_default', daveId, 'invited');

  // RT2 Evacuation Route Inspection — historical
  const hist2a = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes.',
    scheduledDate: pastDate(105), priority: 'high', state: 'completed',
    responsibleId: budiId, estimateHours: 4, actualHours: 5,
    workDescription: 'Semua 3 jalur evakuasi diperiksa. Rambu baru dipasang di persimpangan utama. Jalan dalam kondisi dapat dilalui kendaraan roda 4.',
    problems: 'Jembatan di Jalan Melati perlu perbaikan minor pada pegangan tangan. Sudah dilaporkan ke dinas PU.',
    completedAt: pastDate(105) + 'T14:00:00.000Z'
  });
  addCrew(hist2a, budiId, 'required_task_default', daveId, 'confirmed');
  addCrew(hist2a, sitiId, 'required_task_default', daveId, 'confirmed');

  const hist2b = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes.',
    scheduledDate: pastDate(75), priority: 'high', state: 'completed',
    responsibleId: budiId, estimateHours: 4, actualHours: 3.5,
    workDescription: 'Inspeksi selesai. Jembatan Melati sudah diperbaiki oleh dinas PU. Semua rute dalam kondisi baik. Peta evakuasi diperbarui.',
    problems: 'Tidak ada masalah baru.',
    completedAt: pastDate(75) + 'T13:30:00.000Z'
  });
  addCrew(hist2b, budiId, 'required_task_default', daveId, 'confirmed');
  addCrew(hist2b, sitiId, 'required_task_default', daveId, 'confirmed');

  // RT2 Current Pending (overdue by 45 days)
  const rt2Pending = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes.',
    scheduledDate: pastDate(45), priority: 'high', state: 'pending',
    responsibleId: budiId, estimateHours: 4,
    planningNotes: 'Perlu membawa kendaraan untuk pengujian akses jalur bagian selatan.'
  });
  addCrew(rt2Pending, budiId, 'required_task_default', daveId, 'confirmed');
  addCrew(rt2Pending, sitiId, 'required_task_default', daveId, 'invited');
  addEquip(rt2Pending, megaphoneId);
  addEquip(rt2Pending, ropeId);

  const rt2Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes.',
    scheduledDate: futureDate(15), priority: 'high', state: 'planned',
    responsibleId: budiId, estimateHours: 4
  });
  addCrew(rt2Plan1, budiId, 'required_task_default', daveId, 'invited');

  const rt2Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes.',
    scheduledDate: futureDate(45), priority: 'high', state: 'planned',
    responsibleId: budiId, estimateHours: 4
  });
  addCrew(rt2Plan2, budiId, 'required_task_default', daveId, 'invited');

  // RT3 Food & Water Stock Check — historical
  const hist3a = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies.',
    scheduledDate: pastDate(38), priority: 'high', state: 'completed',
    responsibleId: sitiId, estimateHours: 2, actualHours: 2,
    workDescription: 'Stok makanan lengkap. 5 kaleng kadaluarsa diganti. Tablet air cukup untuk 60 hari.',
    problems: 'Tidak ada masalah.',
    completedAt: pastDate(38) + 'T09:00:00.000Z'
  });
  addCrew(hist3a, sitiId, 'manually_added', daveId, 'confirmed');

  const hist3b = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies.',
    scheduledDate: pastDate(24), priority: 'high', state: 'completed',
    responsibleId: dewiId, estimateHours: 2, actualHours: 1.5,
    workDescription: 'Inventaris lengkap. Semua stok dalam kondisi baik. Rotasi FIFO diterapkan.',
    problems: '',
    completedAt: pastDate(24) + 'T10:00:00.000Z'
  });
  addCrew(hist3b, dewiId, 'manually_added', daveId, 'confirmed');

  // RT3 Current Pending (overdue 10 days)
  const rt3Pending = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies.',
    scheduledDate: pastDate(10), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 2
  });
  addEquip(rt3Pending, foodId);
  addEquip(rt3Pending, waterId);

  for (let i = 1; i <= 3; i++) {
    const rt3Plan = createST({
      teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
      desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies.',
      scheduledDate: futureDate(14 * i - 10), priority: 'high', state: 'planned',
      responsibleId: null, estimateHours: 2
    });
    addEquip(rt3Plan, foodId);
    addEquip(rt3Plan, waterId);
  }

  // RT4 Community Flood Warning Drill — historical
  const hist4a = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation.',
    scheduledDate: pastDate(170), priority: 'high', state: 'completed',
    responsibleId: daveId, estimateHours: 6, actualHours: 7,
    workDescription: 'Simulasi banjir dengan 120 peserta. Semua rute evakuasi berhasil dalam 12 menit. Anak sekolah turut berpartisipasi.',
    problems: 'Warga lansia memerlukan bantuan lebih. Perlu sistem pendampingan khusus.',
    completedAt: pastDate(170) + 'T15:00:00.000Z'
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    addCrew(hist4a, uid, 'required_task_default', daveId, 'confirmed');
  }

  // RT4 Current Pending (overdue 80 days)
  const rt4Pending = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation.',
    scheduledDate: pastDate(80), priority: 'high', state: 'pending',
    responsibleId: daveId, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    addCrew(rt4Pending, uid, 'required_task_default', daveId, 'invited');
  }
  addEquip(rt4Pending, megaphoneId);
  addEquip(rt4Pending, lifeJacketId);
  addEquip(rt4Pending, radioId);

  const rt4Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation.',
    scheduledDate: futureDate(10), priority: 'high', state: 'planned',
    responsibleId: daveId, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    addCrew(rt4Plan1, uid, 'required_task_default', daveId, 'invited');
  }

  const rt4Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation.',
    scheduledDate: futureDate(100), priority: 'high', state: 'planned',
    responsibleId: daveId, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    addCrew(rt4Plan2, uid, 'required_task_default', daveId, 'invited');
  }

  // RT8 Communication Tree Test — historical
  const hist8a = createST({
    teamId: team1Id, requiredTaskId: rt8Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain.',
    scheduledDate: pastDate(88), priority: 'medium', state: 'completed',
    responsibleId: budiId, estimateHours: 1, actualHours: 1,
    workDescription: 'Rantai komunikasi diaktifkan pukul 08:00. Semua 45 kepala RT berhasil dihubungi dalam 14 menit.',
    problems: '3 nomor tidak aktif. Daftar kontak diperbarui.',
    completedAt: pastDate(88) + 'T09:30:00.000Z'
  });
  addCrew(hist8a, budiId, 'required_task_default', daveId, 'confirmed');

  const hist8b = createST({
    teamId: team1Id, requiredTaskId: rt8Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain.',
    scheduledDate: pastDate(58), priority: 'medium', state: 'completed',
    responsibleId: budiId, estimateHours: 1, actualHours: 0.75,
    workDescription: 'Waktu respons meningkat menjadi 11 menit. Semua RT berhasil dihubungi.',
    problems: 'Tidak ada masalah.',
    completedAt: pastDate(58) + 'T09:15:00.000Z'
  });
  addCrew(hist8b, sitiId, 'manually_added', daveId, 'confirmed');

  // RT8 Current Pending (overdue 28 days)
  const rt8Pending = createST({
    teamId: team1Id, requiredTaskId: rt8Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain.',
    scheduledDate: pastDate(28), priority: 'medium', state: 'pending',
    responsibleId: null, estimateHours: 1
  });
  addEquip(rt8Pending, radioId);
  addEquip(rt8Pending, megaphoneId);

  for (let i = 1; i <= 3; i++) {
    const rt8Plan = createST({
      teamId: team1Id, requiredTaskId: rt8Id, type: 'recurring',
      desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain.',
      scheduledDate: futureDate(30 * i - 28), priority: 'medium', state: 'planned',
      responsibleId: null, estimateHours: 1
    });
    addEquip(rt8Plan, radioId);
    addEquip(rt8Plan, megaphoneId);
  }

  // RT5 Shelter Site Assessment (One-Off, future pending)
  const rt5ST = createST({
    teamId: team1Id, requiredTaskId: rt5Id, type: 'planned',
    desc: 'Shelter Site Assessment', overview: 'Assess all three designated emergency shelter sites.',
    scheduledDate: futureDate(14), priority: 'urgent', state: 'pending',
    responsibleId: daveId, estimateHours: 8
  });
  addCrew(rt5ST, daveId, 'required_task_default', daveId, 'confirmed');
  addCrew(rt5ST, budiId, 'required_task_default', daveId, 'invited');
  addCrew(rt5ST, sitiId, 'required_task_default', daveId, 'invited');

  // RT7 Community Awareness Campaign (One-Off, future pending)
  const rt7ST = createST({
    teamId: team1Id, requiredTaskId: rt7Id, type: 'planned',
    desc: 'Community Awareness Campaign — Flood Season', overview: 'Conduct a village-wide awareness campaign before flood season.',
    scheduledDate: futureDate(7), priority: 'high', state: 'pending',
    responsibleId: budiId, estimateHours: 3
  });
  addCrew(rt7ST, budiId, 'required_task_default', daveId, 'confirmed');
  addCrew(rt7ST, rinaId, 'required_task_default', daveId, 'invited');
  addEquip(rt7ST, megaphoneId);

  // Manual tasks Team 1
  const manualTask1 = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Repair Village Hall Roof',
    overview: 'Urgent repair needed on the village hall roof due to storm damage. Several tiles displaced and rain is entering the building.',
    scheduledDate: futureDate(3), priority: 'urgent', state: 'pending',
    responsibleId: jokoId, estimateHours: 4, createdBy: daveId,
    planningNotes: 'Need approx 30 replacement roof tiles. Check with camat office for emergency maintenance budget approval.'
  });
  addCrew(manualTask1, jokoId, 'manually_added', daveId, 'confirmed');
  addCrew(manualTask1, hendraId, 'manually_added', daveId, 'invited');

  const manualTask2 = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Update Emergency Contact List',
    overview: 'Update the village emergency contact list with current phone numbers for all household heads, government contacts, and emergency services.',
    scheduledDate: futureDate(7), priority: 'medium', state: 'pending',
    responsibleId: sitiId, estimateHours: 2, createdBy: daveId
  });
  addCrew(manualTask2, sitiId, 'manually_added', daveId, 'confirmed');

  // Open volunteer patrol task
  const patrolTask = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Monthly Flood Zone Volunteer Patrol',
    overview: 'Monthly patrol of flood-prone areas, evacuation routes, and key infrastructure. Open to all team members who wish to participate.',
    scheduledDate: futureDate(5), priority: 'medium', state: 'pending',
    responsibleId: budiId, estimateHours: 2,
    participants: 'open_optional', participationType: 'open', createdBy: daveId
  });
  addCrew(patrolTask, budiId, 'manually_added', daveId, 'confirmed');

  // All-expected assembly drill
  const assemblyTask = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Emergency Assembly Drill — All Members',
    overview: 'All team members expected to report to village hall assembly point within 15 minutes of alarm sounding.',
    scheduledDate: futureDate(21), priority: 'high', state: 'pending',
    responsibleId: daveId, estimateHours: 2,
    participants: 'all_expected', participationType: 'picked', createdBy: daveId
  });
  addEquip(assemblyTask, megaphoneId);
  addEquip(assemblyTask, radioId);

  // Notes
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note_text) VALUES (?, ?, ?)').run(
    rt1Pending, daveId, 'Prioritas pemeriksaan minggu ini karena musim hujan akan segera tiba.'
  );
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note_text) VALUES (?, ?, ?)').run(
    rt2Pending, budiId, 'Perlu membawa kendaraan untuk pengujian akses jalur bagian selatan.'
  );
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note_text) VALUES (?, ?, ?)').run(
    manualTask1, jokoId, 'Sudah mendapat persetujuan anggaran dari kepala desa. Material bisa dibeli besok.'
  );

  // ─── Team 2 Historical Completed Tasks ────────────────────────────────────

  // Fire Extinguisher Inspection — 2 historical
  const hist_t2_ext1 = createST({
    teamId: team2Id, requiredTaskId: rt2t1Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings.',
    scheduledDate: pastDate(55), priority: 'high', state: 'completed',
    responsibleId: lead2Id, estimateHours: 2, actualHours: 2,
    workDescription: 'Semua 12 APAR diperiksa. 2 unit tekanan rendah sudah diisi ulang. Semua segel baik.',
    problems: '2 APAR di balai desa tekanan rendah. Sudah diisi ulang oleh teknisi.',
    completedAt: pastDate(55) + 'T10:00:00.000Z'
  });
  addCrew(hist_t2_ext1, lead2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(hist_t2_ext1, member2aId, 'required_task_default', admin2Id, 'confirmed');

  const hist_t2_ext2 = createST({
    teamId: team2Id, requiredTaskId: rt2t1Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings.',
    scheduledDate: pastDate(25), priority: 'high', state: 'completed',
    responsibleId: lead2Id, estimateHours: 2, actualHours: 2.5,
    workDescription: 'Pemeriksaan rutin selesai. 1 APAR di pasar sudah kadaluarsa, diganti unit baru. 11 unit lainnya normal.',
    problems: '1 APAR kadaluarsa di pasar. Unit baru sudah dipasang.',
    completedAt: pastDate(25) + 'T11:00:00.000Z'
  });
  addCrew(hist_t2_ext2, lead2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(hist_t2_ext2, member2aId, 'required_task_default', admin2Id, 'confirmed');

  // Fire Extinguisher Inspection — current pending
  const t2_ext_pending = createST({
    teamId: team2Id, requiredTaskId: rt2t1Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings.',
    scheduledDate: futureDate(5), priority: 'high', state: 'pending',
    responsibleId: lead2Id, estimateHours: 2
  });
  addCrew(t2_ext_pending, lead2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(t2_ext_pending, member2aId, 'required_task_default', admin2Id, 'invited');
  addEquip(t2_ext_pending, fireExtId);

  const t2_ext_plan1 = createST({
    teamId: team2Id, requiredTaskId: rt2t1Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings.',
    scheduledDate: futureDate(35), priority: 'high', state: 'planned',
    responsibleId: lead2Id, estimateHours: 2
  });
  addCrew(t2_ext_plan1, lead2Id, 'required_task_default', admin2Id, 'invited');
  const t2_ext_plan2 = createST({
    teamId: team2Id, requiredTaskId: rt2t1Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings.',
    scheduledDate: futureDate(65), priority: 'high', state: 'planned',
    responsibleId: lead2Id, estimateHours: 2
  });
  addCrew(t2_ext_plan2, lead2Id, 'required_task_default', admin2Id, 'invited');

  // Fire Hazard Assessment — historical
  const hist_t2_hazard = createST({
    teamId: team2Id, requiredTaskId: rt2t3Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: pastDate(87), priority: 'high', state: 'completed',
    responsibleId: lead2Id, estimateHours: 3, actualHours: 3,
    workDescription: 'Area pasar diidentifikasi sebagai risiko tertinggi. 8 titik bahaya didokumentasikan dan dilaporkan.',
    problems: 'Kabel listrik tidak aman di 3 rumah dekat pasar. Pemilik diberi waktu 2 minggu untuk memperbaiki.',
    completedAt: pastDate(87) + 'T12:00:00.000Z'
  });
  addCrew(hist_t2_hazard, lead2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(hist_t2_hazard, member2aId, 'required_task_default', admin2Id, 'confirmed');

  // Fire Hazard Assessment — current pending (overdue 42 days)
  const t2_hazard_pending = createST({
    teamId: team2Id, requiredTaskId: rt2t3Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: pastDate(42), priority: 'high', state: 'pending',
    responsibleId: lead2Id, estimateHours: 3
  });
  addCrew(t2_hazard_pending, lead2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(t2_hazard_pending, member2aId, 'required_task_default', admin2Id, 'invited');

  const t2_hazard_plan1 = createST({
    teamId: team2Id, requiredTaskId: rt2t3Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: futureDate(3), priority: 'high', state: 'planned',
    responsibleId: lead2Id, estimateHours: 3
  });
  addCrew(t2_hazard_plan1, lead2Id, 'required_task_default', admin2Id, 'invited');

  // Emergency Drill — historical
  const hist_t2_drill = createST({
    teamId: team2Id, requiredTaskId: rt2t4Id, type: 'recurring',
    desc: 'Community Fire Emergency Drill', overview: 'Quarterly fire emergency drill.',
    scheduledDate: pastDate(150), priority: 'high', state: 'completed',
    responsibleId: admin2Id, estimateHours: 4, actualHours: 4.5,
    workDescription: 'Latihan kebakaran dengan 95 peserta. Unit pemadam dari kecamatan hadir. Waktu respons 8 menit.',
    problems: 'Beberapa peserta tidak mengetahui lokasi APAR terdekat. Perlu sosialisasi lebih.',
    completedAt: pastDate(150) + 'T15:00:00.000Z'
  });
  for (const uid of [lead2Id, member2aId, member2bId, member2cId]) {
    addCrew(hist_t2_drill, uid, 'required_task_default', admin2Id, 'confirmed');
  }

  // Emergency Drill — current pending (overdue 60 days)
  const t2_drill_pending = createST({
    teamId: team2Id, requiredTaskId: rt2t4Id, type: 'recurring',
    desc: 'Community Fire Emergency Drill', overview: 'Quarterly fire emergency drill.',
    scheduledDate: pastDate(60), priority: 'high', state: 'pending',
    responsibleId: admin2Id, estimateHours: 4
  });
  for (const uid of [lead2Id, member2aId, member2bId, member2cId]) {
    addCrew(t2_drill_pending, uid, 'required_task_default', admin2Id, 'invited');
  }

  const t2_drill_plan1 = createST({
    teamId: team2Id, requiredTaskId: rt2t4Id, type: 'recurring',
    desc: 'Community Fire Emergency Drill', overview: 'Quarterly fire emergency drill.',
    scheduledDate: futureDate(30), priority: 'high', state: 'planned',
    responsibleId: admin2Id, estimateHours: 4
  });
  for (const uid of [lead2Id, member2aId, member2bId, member2cId]) {
    addCrew(t2_drill_plan1, uid, 'required_task_default', admin2Id, 'invited');
  }

  // Post-Fire Recovery Planning (One-Off)
  const t2_recovery_st = createST({
    teamId: team2Id, requiredTaskId: rt2t5Id, type: 'planned',
    desc: 'Post-Fire Community Recovery Planning', overview: 'Develop a written community recovery plan.',
    scheduledDate: futureDate(30), priority: 'medium', state: 'pending',
    responsibleId: admin2Id, estimateHours: 6
  });
  addCrew(t2_recovery_st, admin2Id, 'required_task_default', admin2Id, 'confirmed');
  addCrew(t2_recovery_st, lead2Id, 'manually_added', admin2Id, 'invited');

  // ── Required Task Logs ────────────────────────────────────────────────────
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt1Id, daveId, 'Required task created');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt2Id, daveId, 'Required task created');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt3Id, daveId, 'Required task created');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt4Id, daveId, 'Required task created');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt1Id, budiId, 'Scheduled date updated; frequency confirmed as 7 days');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt2t1Id, admin2Id, 'Required task created');
  db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_description) VALUES (?, ?, ?)').run(rt2t3Id, admin2Id, 'Required task created');

  // ── Notifications ──────────────────────────────────────────────────────────
  db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)').run(
    team1Id, daveId, 'Flood Evacuation Route Inspection is 45 days overdue. Please action immediately.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)').run(
    team1Id, budiId, 'Water Level Monitoring is overdue. Please complete or update status.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)').run(
    team1Id, daveId, 'Shelter Site Assessment is scheduled in 14 days. Ensure team is ready.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)').run(
    team2Id, admin2Id, 'Fire Hazard Assessment is 42 days overdue. Please action immediately.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, message) VALUES (?, ?, ?)').run(
    team2Id, admin2Id, 'Community Fire Emergency Drill is 60 days overdue. Please schedule urgently.'
  );

  console.log('Database seeded successfully!');
  console.log(`Teams: Desa Maju (id:${team1Id}), Kampung Sejahtera (id:${team2Id}), Dusun Damai (id:${team3Id})`);
}
