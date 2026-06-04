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

  // Teams
  const team1Id = db.prepare('INSERT INTO teams (name) VALUES (?)').run('Desa Suka Maju').lastInsertRowid as number;
  const team2Id = db.prepare('INSERT INTO teams (name) VALUES (?)').run('Desa Harapan Baru').lastInsertRowid as number;

  // Users Team 1
  const insertUser = db.prepare('INSERT INTO users (team_id, name, email, role, status, language) VALUES (?, ?, ?, ?, ?, ?)');
  const daveId = insertUser.run(team1Id, 'Dave Turner', 'davet.home@gmail.com', 'administrator', 'active', 'en').lastInsertRowid as number;
  const budiId = insertUser.run(team1Id, 'Budi Santoso', 'budi@example.com', 'team_lead', 'active', 'id').lastInsertRowid as number;
  const sitiId = insertUser.run(team1Id, 'Siti Rahayu', 'siti@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;
  const ahmadId = insertUser.run(team1Id, 'Ahmad Fauzi', 'ahmad@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;
  const dewiId = insertUser.run(team1Id, 'Dewi Kusuma', 'dewi@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;
  const hendraId = insertUser.run(team1Id, 'Hendra Wijaya', 'hendra@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;
  const rinaId = insertUser.run(team1Id, 'Rina Wulandari', 'rina@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;
  const jokoId = insertUser.run(team1Id, 'Joko Purnomo', 'joko@example.com', 'team_member', 'active', 'id').lastInsertRowid as number;

  // Users Team 2
  insertUser.run(team2Id, 'Admin User', 'admin2@example.com', 'administrator', 'active', 'en');
  insertUser.run(team2Id, 'Member User', 'member2@example.com', 'team_member', 'active', 'id');

  // Equipment Team 1
  const insertEq = db.prepare('INSERT INTO equipment (team_id, name_en, name_es, name_id) VALUES (?, ?, ?, ?)');
  const foodId = insertEq.run(team1Id, 'Emergency food supplies', 'Suministros de alimentos de emergencia', 'Persediaan makanan darurat').lastInsertRowid as number;
  const waterId = insertEq.run(team1Id, 'Water purification tablets', 'Tabletas purificadoras de agua', 'Tablet pemurnian air').lastInsertRowid as number;
  const firstAidId = insertEq.run(team1Id, 'First aid kit', 'Botiquín de primeros auxilios', 'Kotak P3K').lastInsertRowid as number;
  const radioId = insertEq.run(team1Id, 'Emergency radio', 'Radio de emergencia', 'Radio darurat').lastInsertRowid as number;
  const flashlightId = insertEq.run(team1Id, 'Flashlights and batteries', 'Linternas y baterías', 'Senter dan baterai').lastInsertRowid as number;
  const ropeId = insertEq.run(team1Id, 'Rope (50m)', 'Cuerda (50m)', 'Tali (50m)').lastInsertRowid as number;
  const lifeJacketId = insertEq.run(team1Id, 'Life jackets', 'Chalecos salvavidas', 'Jaket pelampung').lastInsertRowid as number;
  const sandbagId = insertEq.run(team1Id, 'Sandbags', 'Sacos de arena', 'Kantong pasir').lastInsertRowid as number;
  const shovelId = insertEq.run(team1Id, 'Shovels', 'Palas', 'Sekop').lastInsertRowid as number;
  const megaphoneId = insertEq.run(team1Id, 'Megaphone', 'Megáfono', 'Megafon').lastInsertRowid as number;
  const stretcherId = insertEq.run(team1Id, 'First aid stretcher', 'Camilla de primeros auxilios', 'Tandu P3K').lastInsertRowid as number;
  const fireExtId = insertEq.run(team1Id, 'Fire extinguishers', 'Extintores de incendios', 'APAR').lastInsertRowid as number;
  const blanketId = insertEq.run(team1Id, 'Emergency blankets', 'Mantas de emergencia', 'Selimut darurat').lastInsertRowid as number;
  const chainsawId = insertEq.run(team1Id, 'Chainsaw', 'Motosierra', 'Gergaji mesin').lastInsertRowid as number;
  const generatorId = insertEq.run(team1Id, 'Generator', 'Generador', 'Generator').lastInsertRowid as number;

  // Required Task Categories Team 1
  const insertCat = db.prepare('INSERT INTO required_task_categories (team_id, name, display_order) VALUES (?, ?, ?)');
  const floodCatId = insertCat.run(team1Id, 'Flood Preparedness', 1).lastInsertRowid as number;
  const fireCatId = insertCat.run(team1Id, 'Fire Safety', 2).lastInsertRowid as number;
  const quakeCatId = insertCat.run(team1Id, 'Earthquake Readiness', 3).lastInsertRowid as number;

  const insertRT = db.prepare(`
    INSERT INTO required_tasks (team_id, category_id, short_description, overview, priority, is_recurring,
      scheduled_date, default_responsible_user_id, estimate_hours, task_overview, frequency_days,
      planned_instances, top_tips, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `);

  // --- FLOOD PREPAREDNESS ---

  // RT1: Monthly Flood Risk Assessment
  const rt1Id = insertRT.run(
    team1Id, floodCatId,
    'Monthly Flood Risk Assessment',
    'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    'high', 1,
    pastDate(20),
    budiId, 3,
    'Walk the perimeter of the flood-prone areas with a checklist. Document water levels in the monitoring wells. Check all drainage channels for blockages.',
    30, 2,
    'Always bring the village map. Check wells after rainfall. Note any new construction that may affect drainage.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt1Id, budiId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt1Id, ahmadId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt1Id, ropeId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt1Id, megaphoneId);
  const insertStep = db.prepare('INSERT INTO required_task_steps (required_task_id, step_text, display_order) VALUES (?, ?, ?)');
  insertStep.run(rt1Id, 'Collect village flood risk checklist and map from village hall', 0);
  insertStep.run(rt1Id, 'Walk perimeter of flood-prone zones, note water levels at each monitoring point', 1);
  insertStep.run(rt1Id, 'Inspect all drainage channels for blockages — clear minor blockages on the spot', 2);
  insertStep.run(rt1Id, 'Visit and record water level at the 3 main monitoring wells', 3);
  insertStep.run(rt1Id, 'Identify any new construction that may affect drainage flow', 4);
  insertStep.run(rt1Id, 'Update flood risk log and report findings to team lead', 5);

  // RT2: Flood Evacuation Route Inspection
  const rt2Id = insertRT.run(
    team1Id, floodCatId,
    'Flood Evacuation Route Inspection',
    'Inspect all designated evacuation routes to ensure they are passable and clearly marked.',
    'urgent', 1,
    pastDate(45),
    budiId, 4,
    'Walk each of the 3 main evacuation routes. Check signage, bridge conditions, and accessibility for elderly and disabled residents.',
    60, 2,
    'Bring a vehicle if possible to test route passability. Check culverts after heavy rain. Update the community map with any route changes.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt2Id, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt2Id, ropeId);

  // RT3: Emergency Food & Water Stock Check
  const rt3Id = insertRT.run(
    team1Id, floodCatId,
    'Emergency Food & Water Stock Check',
    'Check and rotate emergency food and water supplies stored at the village hall.',
    'high', 1,
    pastDate(10),
    null, 2,
    'Count all stock items. Check expiry dates. Update the inventory log. Replenish any items that are expired or below minimum levels.',
    14, 3,
    'Always check expiry dates first. Rotate stock FIFO. Keep at least 3 days supply for 50 families.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt3Id, foodId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt3Id, waterId);
  insertStep.run(rt3Id, 'Open the emergency supply storage room and retrieve the inventory log', 0);
  insertStep.run(rt3Id, 'Count all food items — record quantity and check expiry dates', 1);
  insertStep.run(rt3Id, 'Count all water purification tablets — check packaging for damage', 2);
  insertStep.run(rt3Id, 'Remove and set aside any expired or damaged items', 3);
  insertStep.run(rt3Id, 'Update the inventory log with current counts', 4);
  insertStep.run(rt3Id, 'Create a replenishment list for any items below minimum level', 5);
  insertStep.run(rt3Id, 'Lock storage room and report status to administrator', 6);

  // RT4: Community Flood Warning Drill
  const rt4Id = insertRT.run(
    team1Id, floodCatId,
    'Community Flood Warning Drill',
    'Conduct a community drill to practice flood evacuation procedures.',
    'high', 1,
    pastDate(80),
    null, 6,
    'Notify all households 3 days in advance. Assemble at the designated meeting points. Practice evacuation routes. Debrief after completion.',
    90, 2,
    'Run the drill at different times to catch people at different activities. Always debrief with community leaders after.'
  ).lastInsertRowid as number;
  // crew: all 6 non-admin users
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt4Id, uid);
  }
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt4Id, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt4Id, lifeJacketId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt4Id, radioId);

  // --- FIRE SAFETY ---

  // RT5: Fire Extinguisher Inspection
  const rt5Id = insertRT.run(
    team1Id, fireCatId,
    'Fire Extinguisher Inspection',
    'Inspect all fire extinguishers in public buildings and ensure they are functional.',
    'high', 1,
    pastDate(25),
    null, 2,
    'Check pressure gauge on each extinguisher. Verify seals are intact. Check expiry dates. Record locations and condition in the fire safety log.',
    30, 2,
    'Check the pressure gauge first — if in red zone, arrange replacement immediately. Never skip any building even if it looks recently checked.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt5Id, fireExtId);
  insertStep.run(rt5Id, 'Collect the fire extinguisher inspection register from the office', 0);
  insertStep.run(rt5Id, 'Visit each location on the register — Village Hall, Mosque, School, Health Clinic, Market', 1);
  insertStep.run(rt5Id, 'For each extinguisher: check pressure gauge is in green zone', 2);
  insertStep.run(rt5Id, 'Check safety pin and seal are intact and tamper tag is present', 3);
  insertStep.run(rt5Id, 'Check expiry date on label — flag any expiring within 3 months', 4);
  insertStep.run(rt5Id, 'Record condition and any issues in the inspection register', 5);
  insertStep.run(rt5Id, 'Report any failed extinguishers to administrator for replacement', 6);

  // RT6: Community Fire Safety Education (one-off, no scheduled_date)
  const rt6Id = insertRT.run(
    team1Id, fireCatId,
    'Community Fire Safety Education',
    'Deliver fire safety education to community members focusing on cooking fire prevention.',
    'medium', 0,
    null,
    null, 4,
    null, null, 2, null
  ).lastInsertRowid as number;

  // RT7: Fire Hazard Assessment
  const rt7Id = insertRT.run(
    team1Id, fireCatId,
    'Fire Hazard Assessment',
    'Identify and document fire hazards throughout the village.',
    'high', 1,
    pastDate(40),
    hendraId, 3,
    'Walk all streets and check for improper waste disposal near buildings, overloaded electrical wiring, and unsafe cooking practices.',
    45, 2,
    'Check the market area carefully — it has the highest fire risk. Talk to residents about their cooking practices.'
  ).lastInsertRowid as number;

  // --- EARTHQUAKE READINESS ---

  // RT8: Building Safety Inspection (one-off, future)
  const rt8Id = insertRT.run(
    team1Id, quakeCatId,
    'Building Safety Inspection',
    'Assess structural safety of key village buildings including the hall, school, and health clinic.',
    'urgent', 0,
    futureDate(5),
    null, 8,
    'Use the structural assessment checklist. Look for cracks, foundation issues, and non-compliant extensions.',
    null, 2, null
  ).lastInsertRowid as number;

  // RT9: Earthquake Emergency Kit Check
  const rt9Id = insertRT.run(
    team1Id, quakeCatId,
    'Earthquake Emergency Kit Check',
    'Verify all emergency kits are complete, accessible, and ready for earthquake emergency response.',
    'high', 1,
    pastDate(50),
    null, 2,
    'Check each kit location. Verify contents match the required list. Replace any expired items.',
    60, 2,
    'Check the kits in the storage room first — they are hardest to access. Keep a log of what was replaced and when.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt9Id, firstAidId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt9Id, blanketId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt9Id, flashlightId);

  // RT10: Community Earthquake Response Training
  const rt10Id = insertRT.run(
    team1Id, quakeCatId,
    'Community Earthquake Response Training',
    'Train community members in earthquake response procedures including drop-cover-hold and post-earthquake safety checks.',
    'high', 1,
    pastDate(150),
    null, 8,
    'Book the village hall. Prepare training materials. Conduct morning theory session and afternoon practical.',
    180, 1,
    'Invite the local BPBD officer to co-facilitate. Practice with elderly and children separately.'
  ).lastInsertRowid as number;
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt10Id, uid);
  }

  // RT11: Emergency Communication Tree Test
  const rt11Id = insertRT.run(
    team1Id, quakeCatId,
    'Emergency Communication Tree Test',
    'Test the village emergency communication chain to ensure all household leaders can be reached within 15 minutes.',
    'medium', 1,
    pastDate(28),
    null, 1,
    'Start the chain at 8am. Time how long it takes to reach each tier of the communication tree. Record who did not respond.',
    30, 3, null
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt11Id, radioId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt11Id, megaphoneId);

  // RT12: Search & Rescue Team Practice
  const rt12Id = insertRT.run(
    team1Id, quakeCatId,
    'Search & Rescue Team Practice',
    'Practice search and rescue techniques for locating and extracting trapped survivors after earthquake or building collapse.',
    'high', 1,
    pastDate(42),
    null, 5,
    'Set up simulated rescue scenarios. Practice using ropes and stretchers. Rotate team roles.',
    45, 2,
    'Always have a safety officer present. Practice communication between rescuers especially with the radio.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt12Id, budiId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt12Id, ahmadId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt12Id, hendraId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt12Id, ropeId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt12Id, stretcherId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt12Id, firstAidId);

  // --- ONE-OFF REQUIRED TASKS WITH STEPS ---

  // RT13: Install Emergency Water Storage Tanks (one-off, scheduled)
  const rt13Id = insertRT.run(
    team1Id, floodCatId,
    'Install Emergency Water Storage Tanks',
    'Install three 1,000-litre water storage tanks at the village hall for use during flood emergencies when tap water is contaminated.',
    'high', 0,
    futureDate(14),
    budiId, 6,
    'Tanks must be elevated off the ground on concrete blocks. Position near the emergency supply room. Connect to existing roof catchment if possible.',
    null, null, null
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt13Id, budiId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt13Id, jokoId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt13Id, hendraId);
  insertStep.run(rt13Id, 'Confirm tank delivery and inspect for any damage before signing receipt', 0);
  insertStep.run(rt13Id, 'Prepare concrete block foundations at the 3 designated positions', 1);
  insertStep.run(rt13Id, 'Position and level each tank on its foundation', 2);
  insertStep.run(rt13Id, 'Connect inlet and outlet pipes — check all fittings for leaks', 3);
  insertStep.run(rt13Id, 'Fill each tank and check for leaks at all connection points', 4);
  insertStep.run(rt13Id, 'Install padlocks on all tank outlets and hand keys to administrator', 5);
  insertStep.run(rt13Id, 'Label each tank with contents, capacity, and emergency contact', 6);
  insertStep.run(rt13Id, 'Update village emergency resource map with new tank locations', 7);

  // RT14: Create Community Evacuation Map (one-off, not yet scheduled)
  const rt14Id = insertRT.run(
    team1Id, floodCatId,
    'Create Community Evacuation Map',
    'Design and print a detailed evacuation map for the village showing all evacuation routes, assembly points, and hazard zones for flood and earthquake scenarios.',
    'medium', 0,
    null,
    sitiId, 4,
    'Map should cover all 5 RT areas. Use clear symbols. Print at A3 size for public display and A4 for household distribution.',
    null, null, null
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt14Id, sitiId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt14Id, daveId);
  insertStep.run(rt14Id, 'Collect existing village maps and aerial photos from kelurahan office', 0);
  insertStep.run(rt14Id, 'Walk all 3 evacuation routes and mark on draft map', 1);
  insertStep.run(rt14Id, 'Identify and mark all assembly points, water sources, and hazard zones', 2);
  insertStep.run(rt14Id, 'Identify households with elderly, disabled, or young children — mark on map', 3);
  insertStep.run(rt14Id, 'Create draft digital map — review with team lead and administrator', 4);
  insertStep.run(rt14Id, 'Finalise map design and arrange printing (min 20 copies)', 5);
  insertStep.run(rt14Id, 'Distribute maps to all RT heads and post copies in public areas', 6);

  // RT15: Install Early Warning Siren System (one-off, urgent, scheduled soon)
  const rt15Id = insertRT.run(
    team1Id, quakeCatId,
    'Install Early Warning Siren System',
    'Install manual hand-crank warning sirens at 3 strategic locations in the village to provide audible alerts for earthquake and flood emergencies.',
    'urgent', 0,
    futureDate(7),
    hendraId, 3,
    'Siren locations: Village Hall, RT01 meeting point, RT04 meeting point. Mount at height of 3-4 metres for maximum coverage.',
    null, null, null
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt15Id, hendraId);
  db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(rt15Id, jokoId);
  insertStep.run(rt15Id, 'Inspect siren units received — test each one before installation', 0);
  insertStep.run(rt15Id, 'Prepare mounting brackets at Village Hall (3.5m on corner post)', 1);
  insertStep.run(rt15Id, 'Install siren at Village Hall — test audibility at 200m radius', 2);
  insertStep.run(rt15Id, 'Install siren at RT01 meeting point', 3);
  insertStep.run(rt15Id, 'Install siren at RT04 meeting point', 4);
  insertStep.run(rt15Id, 'Conduct community awareness session on siren signal meanings', 5);
  insertStep.run(rt15Id, 'Document siren locations and assign maintenance responsibility to RT heads', 6);

  // RT16: Community Emergency Volunteer Patrol (open_optional - anyone can join)
  const rt16Id = db.prepare(`
    INSERT INTO required_tasks (team_id, category_id, short_description, overview, priority, is_recurring,
      scheduled_date, default_responsible_user_id, estimate_hours, task_overview, frequency_days,
      planned_instances, top_tips, crew_type, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).run(
    team1Id, floodCatId,
    'Community Emergency Volunteer Patrol',
    'Monthly patrol of flood-prone areas, evacuation routes, and key infrastructure. Open to all team members who wish to participate.',
    'medium', 1,
    futureDate(5),
    budiId, 2,
    'Walk the main flood risk zones and check key infrastructure. Log any concerns in the patrol register.',
    30, 2,
    'Anyone is welcome to join — the more eyes the better. Bring a phone to photograph any issues found.',
    'open_optional'
  ).lastInsertRowid as number;

  // RT17: Village Emergency Assembly Drill (all_expected - everyone must attend)
  const rt17Id = db.prepare(`
    INSERT INTO required_tasks (team_id, category_id, short_description, overview, priority, is_recurring,
      scheduled_date, default_responsible_user_id, estimate_hours, task_overview, frequency_days,
      planned_instances, top_tips, crew_type, origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).run(
    team1Id, quakeCatId,
    'Village Emergency Assembly Drill',
    'Quarterly drill where ALL team members are expected to report to the village hall emergency assembly point within 15 minutes of the alarm being sounded.',
    'high', 1,
    futureDate(21),
    daveId, 2,
    'Test the full assembly process including roll call and task assignment. All team members must attend and be accounted for.',
    90, 2,
    'Make sure everyone knows the assembly point location. Send reminder 24 hours before. Test the communication chain first.',
    'all_expected'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt17Id, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(rt17Id, radioId);

  // ---- SCHEDULED TASKS ----
  // Helper to create a scheduled task and return its id
  function createST(data: {
    teamId: number;
    requiredTaskId: number | null;
    type: string;
    desc: string;
    overview: string;
    scheduledDate: string | null;
    priority: string;
    state: string;
    responsibleId: number | null;
    estimateHours: number | null;
    actualHours?: number | null;
    workDescription?: string | null;
    problems?: string | null;
    completedAt?: string | null;
    planningNotes?: string | null;
    crewType?: string;
  }): number {
    return db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview,
        scheduled_date, priority, state, responsible_user_id, estimate_hours, actual_hours,
        work_description, problems, completed_at, planning_notes, crew_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.teamId, data.requiredTaskId, data.type, data.desc, data.overview,
      data.scheduledDate, data.priority, data.state, data.responsibleId,
      data.estimateHours, data.actualHours ?? null,
      data.workDescription ?? null, data.problems ?? null,
      data.completedAt ?? null, data.planningNotes ?? null,
      data.crewType ?? 'specific'
    ).lastInsertRowid as number;
  }

  // --- Historical completed tasks (2-4 months ago) ---

  // RT1 - Flood Risk Assessment historical completions
  const hist1a = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Monthly Flood Risk Assessment', overview: 'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    scheduledDate: pastDate(80), priority: 'high', state: 'completed',
    responsibleId: budiId, estimateHours: 3, actualHours: 3.5,
    workDescription: 'Pemeriksaan selesai. Ditemukan 3 saluran air yang tersumbat di RT 02. Sudah dibersihkan. Level air sungai dalam batas normal.',
    problems: 'Saluran air di RT 02 tersumbat oleh sampah. Sudah dibersihkan tetapi perlu monitoring rutin.',
    completedAt: pastDate(80) + 'T10:30:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist1a, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist1a, ahmadId);

  const hist1b = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Monthly Flood Risk Assessment', overview: 'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    scheduledDate: pastDate(50), priority: 'high', state: 'completed',
    responsibleId: budiId, estimateHours: 3, actualHours: 2.5,
    workDescription: 'Level air sungai meningkat 20cm dari bulan lalu akibat hujan deras. 45 rumah tangga rentan sudah diidentifikasi dan diberitahu.',
    problems: 'Pompa air tidak berfungsi, perlu perbaikan segera. Sudah dilaporkan ke kepala desa.',
    completedAt: pastDate(50) + 'T11:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist1b, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist1b, ahmadId);

  // RT1 pending (current)
  const rt1Pending = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Monthly Flood Risk Assessment', overview: 'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    scheduledDate: pastDate(20), priority: 'high', state: 'pending',
    responsibleId: budiId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Pending, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Pending, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt1Pending, ropeId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt1Pending, megaphoneId);

  // RT1 planned instances
  const rt1Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Monthly Flood Risk Assessment', overview: 'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    scheduledDate: futureDate(10), priority: 'high', state: 'planned',
    responsibleId: budiId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Plan1, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Plan1, ahmadId);

  const rt1Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt1Id, type: 'recurring',
    desc: 'Monthly Flood Risk Assessment', overview: 'Assess flood risk in the village by checking river levels, drainage systems, and identifying vulnerable households.',
    scheduledDate: futureDate(40), priority: 'high', state: 'planned',
    responsibleId: budiId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Plan2, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt1Plan2, ahmadId);

  // RT2 - Flood Evacuation Route Inspection historical
  const hist2a = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes to ensure they are passable and clearly marked.',
    scheduledDate: pastDate(105), priority: 'urgent', state: 'completed',
    responsibleId: budiId, estimateHours: 4, actualHours: 5,
    workDescription: 'Jalur evakuasi dalam kondisi baik. Rambu baru dipasang di persimpangan utama. Semua 3 jalur diperiksa dan dapat dilalui kendaraan.',
    problems: 'Jembatan di Jalan Melati memerlukan perbaikan minor pada pegangan tangan. Sudah dilaporkan ke dinas PU.',
    completedAt: pastDate(105) + 'T14:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist2a, budiId);

  const rt2Pending = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes to ensure they are passable and clearly marked.',
    scheduledDate: pastDate(45), priority: 'urgent', state: 'pending',
    responsibleId: budiId, estimateHours: 4
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt2Pending, budiId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt2Pending, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt2Pending, ropeId);

  const rt2Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes to ensure they are passable and clearly marked.',
    scheduledDate: futureDate(15), priority: 'urgent', state: 'planned',
    responsibleId: budiId, estimateHours: 4
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt2Plan1, budiId);

  const rt2Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt2Id, type: 'recurring',
    desc: 'Flood Evacuation Route Inspection', overview: 'Inspect all designated evacuation routes to ensure they are passable and clearly marked.',
    scheduledDate: futureDate(75), priority: 'urgent', state: 'planned',
    responsibleId: budiId, estimateHours: 4
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt2Plan2, budiId);

  // RT3 - Food & Water Stock Check historical
  const hist3a = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies stored at the village hall.',
    scheduledDate: pastDate(38), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 2, actualHours: 2,
    workDescription: 'Stok makanan lengkap. 5 kaleng makanan kadaluarsa diganti. Tablet pemurnian air cukup untuk 60 hari ke depan.',
    problems: 'Tidak ada masalah signifikan.',
    completedAt: pastDate(38) + 'T09:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist3a, sitiId);

  const hist3b = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies stored at the village hall.',
    scheduledDate: pastDate(24), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 2, actualHours: 1.5,
    workDescription: 'Inventaris lengkap. Semua stok dalam kondisi baik. Rotasi FIFO diterapkan dengan benar.',
    problems: '',
    completedAt: pastDate(24) + 'T10:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist3b, dewiId);

  const rt3Pending = createST({
    teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
    desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies stored at the village hall.',
    scheduledDate: pastDate(10), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt3Pending, foodId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt3Pending, waterId);

  // RT3 planned instances (3)
  for (let i = 1; i <= 3; i++) {
    const rt3Plan = createST({
      teamId: team1Id, requiredTaskId: rt3Id, type: 'recurring',
      desc: 'Emergency Food & Water Stock Check', overview: 'Check and rotate emergency food and water supplies stored at the village hall.',
      scheduledDate: futureDate(14 * i - 10), priority: 'high', state: 'planned',
      responsibleId: null, estimateHours: 2
    });
    db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt3Plan, foodId);
    db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt3Plan, waterId);
  }

  // RT4 - Community Flood Warning Drill historical
  const hist4a = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation procedures.',
    scheduledDate: pastDate(170), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 6, actualHours: 7,
    workDescription: 'Simulasi banjir dilaksanakan dengan 120 peserta. Semua rute evakuasi berhasil dilalui dalam waktu 12 menit. Anak-anak sekolah turut berpartisipasi.',
    problems: 'Beberapa warga lanjut usia memerlukan bantuan lebih di jalur evakuasi. Perlu sistem pendampingan khusus.',
    completedAt: pastDate(170) + 'T15:00:00.000Z'
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist4a, uid);
  }

  const rt4Pending = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation procedures.',
    scheduledDate: pastDate(80), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt4Pending, uid);
  }
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt4Pending, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt4Pending, lifeJacketId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt4Pending, radioId);

  const rt4Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation procedures.',
    scheduledDate: futureDate(10), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt4Plan1, uid);
  }

  const rt4Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt4Id, type: 'recurring',
    desc: 'Community Flood Warning Drill', overview: 'Conduct a community drill to practice flood evacuation procedures.',
    scheduledDate: futureDate(100), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 6
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt4Plan2, uid);
  }

  // RT5 - Fire Extinguisher Inspection historical
  const hist5a = createST({
    teamId: team1Id, requiredTaskId: rt5Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings and ensure they are functional.',
    scheduledDate: pastDate(55), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 2, actualHours: 2,
    workDescription: 'Semua 12 APAR diperiksa. 2 unit tekanan rendah sudah diisi ulang. Semua segel dalam kondisi baik.',
    problems: '2 APAR di balai desa menunjukkan tekanan rendah. Sudah diisi ulang oleh teknisi.',
    completedAt: pastDate(55) + 'T10:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist5a, hendraId);

  const rt5Pending = createST({
    teamId: team1Id, requiredTaskId: rt5Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings and ensure they are functional.',
    scheduledDate: pastDate(25), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt5Pending, fireExtId);

  const rt5Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt5Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings and ensure they are functional.',
    scheduledDate: futureDate(5), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt5Plan1, fireExtId);

  const rt5Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt5Id, type: 'recurring',
    desc: 'Fire Extinguisher Inspection', overview: 'Inspect all fire extinguishers in public buildings and ensure they are functional.',
    scheduledDate: futureDate(35), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt5Plan2, fireExtId);

  // RT7 - Fire Hazard Assessment historical
  const hist7a = createST({
    teamId: team1Id, requiredTaskId: rt7Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: pastDate(85), priority: 'high', state: 'completed',
    responsibleId: hendraId, estimateHours: 3, actualHours: 3,
    workDescription: 'Penilaian bahaya kebakaran selesai. Area pasar diidentifikasi sebagai risiko tertinggi. 8 titik berbahaya didokumentasikan dan dilaporkan ke kepala desa.',
    problems: 'Ditemukan kabel listrik tidak aman di 3 rumah dekat pasar. Pemilik sudah dihubungi dan diberi waktu 2 minggu untuk memperbaiki.',
    completedAt: pastDate(85) + 'T12:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist7a, hendraId);

  const rt7Pending = createST({
    teamId: team1Id, requiredTaskId: rt7Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: pastDate(40), priority: 'high', state: 'pending',
    responsibleId: hendraId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt7Pending, hendraId);

  const rt7Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt7Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: futureDate(5), priority: 'high', state: 'planned',
    responsibleId: hendraId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt7Plan1, hendraId);

  const rt7Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt7Id, type: 'recurring',
    desc: 'Fire Hazard Assessment', overview: 'Identify and document fire hazards throughout the village.',
    scheduledDate: futureDate(50), priority: 'high', state: 'planned',
    responsibleId: hendraId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt7Plan2, hendraId);

  // RT8 - Building Safety Inspection (one-off future)
  const rt8Pending = createST({
    teamId: team1Id, requiredTaskId: rt8Id, type: 'planned',
    desc: 'Building Safety Inspection', overview: 'Assess structural safety of key village buildings including the hall, school, and health clinic.',
    scheduledDate: futureDate(5), priority: 'urgent', state: 'pending',
    responsibleId: null, estimateHours: 8
  });

  // RT9 - Earthquake Emergency Kit Check historical
  const hist9a = createST({
    teamId: team1Id, requiredTaskId: rt9Id, type: 'recurring',
    desc: 'Earthquake Emergency Kit Check', overview: 'Verify all emergency kits are complete, accessible, and ready for earthquake emergency response.',
    scheduledDate: pastDate(110), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 2, actualHours: 2.5,
    workDescription: 'Semua 8 kit darurat diperiksa. Kit di ruang penyimpanan memerlukan akses yang lebih baik. Lampu senter di 3 kit diganti baterainya.',
    problems: 'Kit di gudang penyimpanan sulit diakses karena terhalang barang lain. Sudah diatur ulang penempatannya.',
    completedAt: pastDate(110) + 'T11:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist9a, rinaId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist9a, jokoId);

  const rt9Pending = createST({
    teamId: team1Id, requiredTaskId: rt9Id, type: 'recurring',
    desc: 'Earthquake Emergency Kit Check', overview: 'Verify all emergency kits are complete, accessible, and ready for earthquake emergency response.',
    scheduledDate: pastDate(50), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Pending, firstAidId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Pending, blanketId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Pending, flashlightId);

  const rt9Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt9Id, type: 'recurring',
    desc: 'Earthquake Emergency Kit Check', overview: 'Verify all emergency kits are complete, accessible, and ready for earthquake emergency response.',
    scheduledDate: futureDate(10), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan1, firstAidId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan1, blanketId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan1, flashlightId);

  const rt9Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt9Id, type: 'recurring',
    desc: 'Earthquake Emergency Kit Check', overview: 'Verify all emergency kits are complete, accessible, and ready for earthquake emergency response.',
    scheduledDate: futureDate(70), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan2, firstAidId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan2, blanketId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt9Plan2, flashlightId);

  // RT10 - Community Earthquake Response Training historical
  const hist10a = createST({
    teamId: team1Id, requiredTaskId: rt10Id, type: 'recurring',
    desc: 'Community Earthquake Response Training', overview: 'Train community members in earthquake response procedures including drop-cover-hold and post-earthquake safety checks.',
    scheduledDate: pastDate(330), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 8, actualHours: 9,
    workDescription: 'Pelatihan dilaksanakan di balai desa dengan 85 peserta. Sesi teori pagi dan praktik siang berjalan lancar. Pejabat BPBD hadir sebagai fasilitator.',
    problems: 'Peserta lansia dan anak-anak perlu sesi terpisah. Sudah direncanakan untuk pelatihan berikutnya.',
    completedAt: pastDate(330) + 'T16:00:00.000Z'
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist10a, uid);
  }

  const rt10Pending = createST({
    teamId: team1Id, requiredTaskId: rt10Id, type: 'recurring',
    desc: 'Community Earthquake Response Training', overview: 'Train community members in earthquake response procedures including drop-cover-hold and post-earthquake safety checks.',
    scheduledDate: pastDate(150), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 8
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt10Pending, uid);
  }

  const rt10Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt10Id, type: 'recurring',
    desc: 'Community Earthquake Response Training', overview: 'Train community members in earthquake response procedures including drop-cover-hold and post-earthquake safety checks.',
    scheduledDate: futureDate(30), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 8
  });
  for (const uid of [budiId, sitiId, ahmadId, dewiId, hendraId, rinaId, jokoId]) {
    db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt10Plan1, uid);
  }

  // RT11 - Emergency Communication Tree Test historical
  const hist11a = createST({
    teamId: team1Id, requiredTaskId: rt11Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain to ensure all household leaders can be reached within 15 minutes.',
    scheduledDate: pastDate(88), priority: 'medium', state: 'completed',
    responsibleId: null, estimateHours: 1, actualHours: 1,
    workDescription: 'Rantai komunikasi diaktifkan pukul 08:00. Semua 45 kepala rumah tangga berhasil dihubungi dalam 14 menit.',
    problems: '3 nomor telepon sudah tidak aktif. Daftar kontak sudah diperbarui.',
    completedAt: pastDate(88) + 'T09:30:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist11a, budiId);

  const hist11b = createST({
    teamId: team1Id, requiredTaskId: rt11Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain to ensure all household leaders can be reached within 15 minutes.',
    scheduledDate: pastDate(58), priority: 'medium', state: 'completed',
    responsibleId: null, estimateHours: 1, actualHours: 0.75,
    workDescription: 'Tes komunikasi berhasil. Waktu respons meningkat menjadi 11 menit. Semua RT berhasil dihubungi.',
    problems: 'Tidak ada masalah.',
    completedAt: pastDate(58) + 'T09:15:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist11b, sitiId);

  const rt11Pending = createST({
    teamId: team1Id, requiredTaskId: rt11Id, type: 'recurring',
    desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain to ensure all household leaders can be reached within 15 minutes.',
    scheduledDate: pastDate(28), priority: 'medium', state: 'pending',
    responsibleId: null, estimateHours: 1
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt11Pending, radioId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt11Pending, megaphoneId);

  // RT11 planned (3 instances)
  for (let i = 1; i <= 3; i++) {
    const rt11Plan = createST({
      teamId: team1Id, requiredTaskId: rt11Id, type: 'recurring',
      desc: 'Emergency Communication Tree Test', overview: 'Test the village emergency communication chain to ensure all household leaders can be reached within 15 minutes.',
      scheduledDate: futureDate(30 * i - 28), priority: 'medium', state: 'planned',
      responsibleId: null, estimateHours: 1
    });
    db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt11Plan, radioId);
    db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt11Plan, megaphoneId);
  }

  // RT12 - Search & Rescue Team Practice historical
  const hist12a = createST({
    teamId: team1Id, requiredTaskId: rt12Id, type: 'recurring',
    desc: 'Search & Rescue Team Practice', overview: 'Practice search and rescue techniques for locating and extracting trapped survivors after earthquake or building collapse.',
    scheduledDate: pastDate(87), priority: 'high', state: 'completed',
    responsibleId: null, estimateHours: 5, actualHours: 5.5,
    workDescription: 'Latihan SAR dilaksanakan dengan 3 skenario penyelamatan. Tim berhasil mengekstrak korban simulasi dalam rata-rata 8 menit. Rotasi peran tim berjalan baik.',
    problems: 'Tali pengaman memerlukan penggantian segera — terlihat aus di beberapa bagian. Sudah dipesan yang baru.',
    completedAt: pastDate(87) + 'T15:00:00.000Z'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist12a, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist12a, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(hist12a, hendraId);

  const rt12Pending = createST({
    teamId: team1Id, requiredTaskId: rt12Id, type: 'recurring',
    desc: 'Search & Rescue Team Practice', overview: 'Practice search and rescue techniques for locating and extracting trapped survivors after earthquake or building collapse.',
    scheduledDate: pastDate(42), priority: 'high', state: 'pending',
    responsibleId: null, estimateHours: 5
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Pending, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Pending, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Pending, hendraId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt12Pending, ropeId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt12Pending, stretcherId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt12Pending, firstAidId);

  const rt12Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt12Id, type: 'recurring',
    desc: 'Search & Rescue Team Practice', overview: 'Practice search and rescue techniques for locating and extracting trapped survivors after earthquake or building collapse.',
    scheduledDate: futureDate(3), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 5
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan1, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan1, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan1, hendraId);

  const rt12Plan2 = createST({
    teamId: team1Id, requiredTaskId: rt12Id, type: 'recurring',
    desc: 'Search & Rescue Team Practice', overview: 'Practice search and rescue techniques for locating and extracting trapped survivors after earthquake or building collapse.',
    scheduledDate: futureDate(48), priority: 'high', state: 'planned',
    responsibleId: null, estimateHours: 5
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan2, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan2, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt12Plan2, hendraId);

  // --- Planned tasks for one-off required tasks ---
  const rt13ST = createST({
    teamId: team1Id, requiredTaskId: rt13Id, type: 'planned',
    desc: 'Install Emergency Water Storage Tanks', overview: 'Install three 1,000-litre water storage tanks at the village hall for use during flood emergencies when tap water is contaminated.',
    scheduledDate: futureDate(14), priority: 'high', state: 'pending',
    responsibleId: budiId, estimateHours: 6
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt13ST, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt13ST, jokoId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt13ST, hendraId);

  const rt15ST = createST({
    teamId: team1Id, requiredTaskId: rt15Id, type: 'planned',
    desc: 'Install Early Warning Siren System', overview: 'Install manual hand-crank warning sirens at 3 strategic locations in the village to provide audible alerts for earthquake and flood emergencies.',
    scheduledDate: futureDate(7), priority: 'urgent', state: 'pending',
    responsibleId: hendraId, estimateHours: 3
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt15ST, hendraId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt15ST, jokoId);

  // --- Pending one-off/manual tasks ---
  const manualTask1 = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Repair Village Hall Roof', overview: 'Urgent repair needed on the village hall roof due to storm damage. Several tiles have been displaced and rain is entering the building.',
    scheduledDate: futureDate(3), priority: 'urgent', state: 'pending',
    responsibleId: jokoId, estimateHours: 4,
    planningNotes: 'Need to purchase approximately 30 replacement roof tiles. Check with the camat office for emergency maintenance budget approval.'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(manualTask1, jokoId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(manualTask1, hendraId);

  const manualTask2 = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Update Emergency Contact List', overview: 'Update the village emergency contact list with current phone numbers for all household heads, government contacts, and emergency services.',
    scheduledDate: futureDate(7), priority: 'medium', state: 'pending',
    responsibleId: sitiId, estimateHours: 2
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(manualTask2, sitiId);

  const manualTask3 = createST({
    teamId: team1Id, requiredTaskId: null, type: 'manual',
    desc: 'Community Announcement - Upcoming Flood Season Preparation',
    overview: 'Coordinate community announcement through mosque speakers, WhatsApp group, and village notice boards about the upcoming flood season and preparation actions each family should take.',
    scheduledDate: futureDate(2), priority: 'high', state: 'pending',
    responsibleId: budiId, estimateHours: 1.5,
    planningNotes: 'Coordinate with pak RW for mosque announcement time. Prepare flyer for notice boards.'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(manualTask3, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(manualTask3, rinaId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(manualTask3, megaphoneId);

  // RT16 - Community Emergency Volunteer Patrol (open_optional)
  const rt16Pending = createST({
    teamId: team1Id, requiredTaskId: rt16Id, type: 'recurring',
    desc: 'Community Emergency Volunteer Patrol',
    overview: 'Monthly patrol of flood-prone areas, evacuation routes, and key infrastructure. Open to all team members who wish to participate.',
    scheduledDate: futureDate(5), priority: 'medium', state: 'pending',
    responsibleId: budiId, estimateHours: 2, crewType: 'open_optional'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt16Pending, budiId);

  const rt16Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt16Id, type: 'recurring',
    desc: 'Community Emergency Volunteer Patrol',
    overview: 'Monthly patrol of flood-prone areas, evacuation routes, and key infrastructure. Open to all team members who wish to participate.',
    scheduledDate: futureDate(35), priority: 'medium', state: 'planned',
    responsibleId: budiId, estimateHours: 2, crewType: 'open_optional'
  });
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(rt16Plan1, budiId);

  // RT17 - Village Emergency Assembly Drill (all_expected)
  const rt17Pending = createST({
    teamId: team1Id, requiredTaskId: rt17Id, type: 'recurring',
    desc: 'Village Emergency Assembly Drill',
    overview: 'Quarterly drill where ALL team members are expected to report to the village hall emergency assembly point within 15 minutes of the alarm being sounded.',
    scheduledDate: futureDate(21), priority: 'high', state: 'pending',
    responsibleId: daveId, estimateHours: 2, crewType: 'all_expected'
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt17Pending, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt17Pending, radioId);

  const rt17Plan1 = createST({
    teamId: team1Id, requiredTaskId: rt17Id, type: 'recurring',
    desc: 'Village Emergency Assembly Drill',
    overview: 'Quarterly drill where ALL team members are expected to report to the village hall emergency assembly point within 15 minutes of the alarm being sounded.',
    scheduledDate: futureDate(111), priority: 'high', state: 'planned',
    responsibleId: daveId, estimateHours: 2, crewType: 'all_expected'
  });
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt17Plan1, megaphoneId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(rt17Plan1, radioId);

  // Add some notes to tasks
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(
    rt1Pending, daveId, 'Prioritas pemeriksaan minggu ini karena musim hujan akan segera tiba.'
  );
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(
    rt2Pending, budiId, 'Perlu membawa kendaraan untuk pengujian akses jalur bagian selatan.'
  );
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(
    manualTask1, jokoId, 'Sudah mendapat persetujuan anggaran dari kepala desa. Material bisa dibeli besok.'
  );

  // Notifications
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(
    team1Id, daveId, 'task_overdue', 'Flood Evacuation Route Inspection is 45 days overdue. Please action immediately.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(
    team1Id, budiId, 'task_overdue', 'Monthly Flood Risk Assessment is overdue. Please complete or update status.'
  );
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(
    team1Id, daveId, 'task_due_soon', 'Building Safety Inspection is scheduled in 5 days. Ensure team is ready.'
  );

  console.log('Database seeded successfully!');
  console.log(`Teams: Desa Suka Maju (id:${team1Id}), Desa Harapan Baru (id:${team2Id})`);
}
