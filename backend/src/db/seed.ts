import db, { initializeDatabase } from './database';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function pastDate(daysAgo: number): string {
  return dateStr(addDays(new Date(), -daysAgo));
}

function futureDate(daysAhead: number): string {
  return dateStr(addDays(new Date(), daysAhead));
}

export function seedDatabase() {
  initializeDatabase();

  const existingTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
  if (existingTeams.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database with Indonesian village disaster preparedness data...');

  const team1Id = db.prepare('INSERT INTO teams (name, code) VALUES (?, ?)').run('Desa Suka Maju', 'desa-suka-maju').lastInsertRowid as number;
  const team2Id = db.prepare('INSERT INTO teams (name, code) VALUES (?, ?)').run('Desa Harapan Baru', 'desa-harapan-baru').lastInsertRowid as number;

  // Users Team 1
  const insertUser = db.prepare('INSERT INTO users (team_id, name, email, role, language) VALUES (?, ?, ?, ?, ?)');

  const daveId = insertUser.run(team1Id, 'Dave Turner', 'davet.home@gmail.com', 'administrator', 'en').lastInsertRowid as number;
  const budiId = insertUser.run(team1Id, 'Budi Santoso', 'budi.santoso@example.com', 'team_lead', 'id').lastInsertRowid as number;
  const sitiId = insertUser.run(team1Id, 'Siti Rahayu', 'siti.rahayu@example.com', 'team_lead', 'id').lastInsertRowid as number;
  const ahmadId = insertUser.run(team1Id, 'Ahmad Wijaya', 'ahmad.wijaya@example.com', 'team_member', 'id').lastInsertRowid as number;
  const dewiId = insertUser.run(team1Id, 'Dewi Kusuma', 'dewi.kusuma@example.com', 'team_member', 'id').lastInsertRowid as number;
  const ekoId = insertUser.run(team1Id, 'Eko Prasetyo', 'eko.prasetyo@example.com', 'team_member', 'id').lastInsertRowid as number;
  const fitriId = insertUser.run(team1Id, 'Fitri Handayani', 'fitri.handayani@example.com', 'team_member', 'id').lastInsertRowid as number;
  const gunawanId = insertUser.run(team1Id, 'Gunawan Kusuma', 'gunawan.kusuma@example.com', 'team_member', 'id').lastInsertRowid as number;

  // Users Team 2
  insertUser.run(team2Id, 'Carlos Mendoza', 'carlos.mendoza@example.com', 'administrator', 'es');
  insertUser.run(team2Id, 'Maria Santos', 'maria.santos@example.com', 'team_lead', 'es');
  insertUser.run(team2Id, 'Juan Reyes', 'juan.reyes@example.com', 'team_member', 'es');

  // Equipment
  const insertEq = db.prepare('INSERT INTO equipment (team_id, name_en, name_es, name_id) VALUES (?, ?, ?, ?)');
  const firstAidId = insertEq.run(team1Id, 'First Aid Kit', 'Botiquín de Primeros Auxilios', 'Kotak P3K').lastInsertRowid as number;
  const megaphoneId = insertEq.run(team1Id, 'Megaphone', 'Megáfono', 'Megafon').lastInsertRowid as number;
  const lifeJacketsId = insertEq.run(team1Id, 'Life Jackets', 'Chalecos Salvavidas', 'Pelampung').lastInsertRowid as number;
  const flashlightsId = insertEq.run(team1Id, 'Emergency Flashlights', 'Linternas de Emergencia', 'Senter Darurat').lastInsertRowid as number;
  const radioId = insertEq.run(team1Id, 'Emergency Radio', 'Radio de Emergencia', 'Radio Darurat').lastInsertRowid as number;
  const ropeId = insertEq.run(team1Id, 'Rope (50m)', 'Cuerda (50m)', 'Tali (50m)').lastInsertRowid as number;
  const chainsawId = insertEq.run(team1Id, 'Chainsaw', 'Motosierra', 'Gergaji Mesin').lastInsertRowid as number;
  const sandbagsId = insertEq.run(team1Id, 'Sandbags (50 units)', 'Sacos de Arena (50 unidades)', 'Karung Pasir (50 buah)').lastInsertRowid as number;
  const pumpId = insertEq.run(team1Id, 'Water Pump', 'Bomba de Agua', 'Pompa Air').lastInsertRowid as number;
  const generatorId = insertEq.run(team1Id, 'Generator', 'Generador', 'Generator').lastInsertRowid as number;
  const foodId = insertEq.run(team1Id, 'Emergency Food Supplies', 'Suministros Alimentarios de Emergencia', 'Persediaan Makanan Darurat').lastInsertRowid as number;
  const waterContainersId = insertEq.run(team1Id, 'Water Containers (200L)', 'Contenedores de Agua (200L)', 'Wadah Air (200L)').lastInsertRowid as number;
  const shovelsId = insertEq.run(team1Id, 'Shovels', 'Palas', 'Sekop').lastInsertRowid as number;
  const fireExtId = insertEq.run(team1Id, 'Fire Extinguisher', 'Extintor de Incendios', 'Alat Pemadam Api').lastInsertRowid as number;
  const stretcherId = insertEq.run(team1Id, 'Emergency Stretcher', 'Camilla de Emergencia', 'Tandu Darurat').lastInsertRowid as number;
  const glovesId = insertEq.run(team1Id, 'Protective Gloves', 'Guantes Protectores', 'Sarung Tangan Pelindung').lastInsertRowid as number;
  const helmetsId = insertEq.run(team1Id, 'Safety Helmets', 'Cascos de Seguridad', 'Helm Keselamatan').lastInsertRowid as number;
  const tarpaulinId = insertEq.run(team1Id, 'Waterproof Tarpaulin', 'Lona Impermeable', 'Terpal Tahan Air').lastInsertRowid as number;
  const walkieTalkieId = insertEq.run(team1Id, 'Walkie-Talkies', 'Walkie-Talkies', 'Walkie-Talkie').lastInsertRowid as number;
  const waterFilterId = insertEq.run(team1Id, 'Portable Water Filter', 'Filtro de Agua Portátil', 'Filter Air Portabel').lastInsertRowid as number;

  // Required Tasks
  const insertRT = db.prepare(`
    INSERT INTO required_tasks (team_id, short_description, overview, priority, first_scheduled_date, frequency_days, default_responsible_user_id, estimate_hours, planned_instances)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const requiredTasks = [
    {
      desc: 'Monthly Flood Evacuation Route Inspection',
      overview: 'Inspect all designated flood evacuation routes in the village to ensure they are clear, accessible, and properly marked. Check all signage, bridges, and assembly points. Document any obstacles or damage found and arrange for repairs.',
      priority: 'urgent', freq: 30, resp: budiId, est: 3, planned: 3,
      firstDate: pastDate(90),
      equipment: [megaphoneId, flashlightsId, walkieTalkieId],
      crew: [budiId, ahmadId, ekoId],
    },
    {
      desc: 'Emergency Food Stock Quarterly Check',
      overview: 'Conduct a thorough inventory of all emergency food and water supplies stored in the village emergency depot. Check expiry dates, quantity, and quality. Replace expired items and replenish stocks that are below minimum levels for a 72-hour emergency.',
      priority: 'high', freq: 90, resp: sitiId, est: 4, planned: 2,
      firstDate: pastDate(120),
      equipment: [foodId, waterContainersId, waterFilterId],
      crew: [sitiId, dewiId, fitriId],
    },
    {
      desc: 'Monthly First Aid Kit Inventory',
      overview: 'Check all first aid kits stored throughout the village including the community hall, school, mosque, and medical post. Verify completeness, check expiry dates of medicines and supplies. Replace any expired or used items.',
      priority: 'high', freq: 30, resp: dewiId, est: 2, planned: 3,
      firstDate: pastDate(75),
      equipment: [firstAidId, glovesId],
      crew: [dewiId, fitriId],
    },
    {
      desc: 'Semi-Annual Community Shelter Inspection',
      overview: 'Inspect the primary community disaster shelter (community hall) for structural integrity, cleanliness, and readiness. Check roof, walls, ventilation, sanitation facilities, emergency lighting, and capacity. Document findings and arrange for necessary repairs.',
      priority: 'high', freq: 180, resp: budiId, est: 5, planned: 2,
      firstDate: pastDate(180),
      equipment: [flashlightsId, helmetsId],
      crew: [budiId, gunawanId, ahmadId],
    },
    {
      desc: 'Monthly Emergency Communication Test',
      overview: 'Test all emergency communication systems including the emergency radio network, phone tree, village alarm system, and walkie-talkie network. Contact all team members and verify response times. Document any communication failures for follow-up.',
      priority: 'urgent', freq: 30, resp: budiId, est: 2, planned: 3,
      firstDate: pastDate(60),
      equipment: [radioId, walkieTalkieId, megaphoneId],
      crew: [budiId, sitiId, ahmadId, ekoId],
    },
    {
      desc: 'Quarterly Water Pump Maintenance',
      overview: 'Perform maintenance on all emergency water pumps. Clean filters, check fuel levels, test operation, lubricate moving parts, and ensure all hoses and connections are in good condition. Replace any worn parts and update the maintenance log.',
      priority: 'medium', freq: 90, resp: ekoId, est: 4, planned: 2,
      firstDate: pastDate(100),
      equipment: [pumpId, glovesId],
      crew: [ekoId, gunawanId],
    },
    {
      desc: 'Monthly Firebreak Maintenance',
      overview: 'Clear and maintain firebreak lines around the village perimeter. Remove dry brush, dead trees, and debris that could fuel a fire. Ensure firebreaks are at least 10 meters wide. Document areas that need further attention.',
      priority: 'high', freq: 30, resp: gunawanId, est: 8, planned: 3,
      firstDate: pastDate(45),
      equipment: [chainsawId, shovelsId, glovesId, helmetsId, fireExtId],
      crew: [gunawanId, ahmadId, ekoId],
    },
    {
      desc: 'Semi-Annual Emergency Contact List Update',
      overview: 'Update the village emergency contact list. Verify phone numbers for all team members, local government emergency contacts, hospitals, fire department, and the district disaster management agency (BPBD). Distribute updated lists to all households.',
      priority: 'medium', freq: 180, resp: sitiId, est: 2, planned: 2,
      firstDate: pastDate(150),
      equipment: [],
      crew: [sitiId],
    },
    {
      desc: 'Monthly Earthquake Preparedness Drill',
      overview: 'Conduct earthquake preparedness drill with village residents. Practice drop, cover, and hold on procedures. Practice evacuation to designated assembly points. Test the communication chain. Provide immediate feedback to participants on their performance.',
      priority: 'high', freq: 30, resp: budiId, est: 3, planned: 3,
      firstDate: pastDate(30),
      equipment: [megaphoneId, walkieTalkieId, firstAidId],
      crew: [budiId, sitiId, dewiId, ahmadId],
    },
    {
      desc: 'Quarterly Generator Maintenance',
      overview: 'Perform full maintenance on the emergency generator. Check oil levels, fuel, coolant, battery, and belts. Run a test under load for at least 30 minutes. Clean the air filter. Check and tighten all connections. Update the maintenance log.',
      priority: 'medium', freq: 90, resp: ekoId, est: 3, planned: 2,
      firstDate: pastDate(110),
      equipment: [generatorId, glovesId],
      crew: [ekoId],
    },
    {
      desc: 'Monthly Flood Early Warning System Check',
      overview: 'Test and verify all flood early warning system components including river level sensors, alarm sirens, and notification systems. Calibrate sensors if needed. Ensure backup power for all monitoring equipment is fully charged.',
      priority: 'urgent', freq: 30, resp: budiId, est: 2, planned: 3,
      firstDate: pastDate(55),
      equipment: [radioId, walkieTalkieId],
      crew: [budiId, ekoId],
    },
    {
      desc: 'Quarterly Life Jacket and Rescue Equipment Check',
      overview: 'Inspect all life jackets, ropes, and water rescue equipment stored in the emergency depot. Check for damage, wear, and proper inflation of life jackets. Ensure all equipment is properly stored and accessible. Replace any damaged items.',
      priority: 'high', freq: 90, resp: ahmadId, est: 3, planned: 2,
      firstDate: pastDate(80),
      equipment: [lifeJacketsId, ropeId, stretcherId],
      crew: [ahmadId, gunawanId],
    },
  ];

  interface HistoryNote {
    work: string;
    problems: string;
    actual_hours: number;
    crew: number[];
  }

  function createHistory(rtId: number, rt: typeof requiredTasks[0], pastInstances: number, notes: HistoryNote[]) {
    const today = new Date();
    let currentDate = new Date(rt.firstDate + 'T00:00:00Z');
    let instanceNum = 1;

    const insertST = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, actual_hours, state, completed_at, work_description, problems, feedback_notes, instance_number)
      VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < pastInstances; i++) {
      const note = notes[i % notes.length];
      const scheduledDate = dateStr(currentDate);
      const isCompleted = currentDate < today;
      const state = isCompleted ? 'completed' : 'pending';
      const completedAt = isCompleted ? new Date(currentDate.getTime() + 4 * 3600000).toISOString() : null;

      const taskId = insertST.run(
        team1Id, rtId, rt.desc, rt.overview, scheduledDate, rt.priority, rt.resp,
        rt.est, isCompleted ? note.actual_hours : null,
        state, completedAt, isCompleted ? note.work : null, isCompleted ? note.problems : null,
        isCompleted ? 'Task completed as scheduled.' : null, instanceNum
      ).lastInsertRowid as number;

      const crewToAdd = isCompleted ? note.crew : rt.crew;
      for (const uid of crewToAdd) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(taskId, uid);
      for (const eqId of rt.equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(taskId, eqId);

      currentDate = addDays(currentDate, rt.freq);
      instanceNum++;
    }

    // Pending instance
    const pendingDate = dateStr(currentDate);
    const pendingId = db.prepare(`
      INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, instance_number)
      VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(team1Id, rtId, rt.desc, rt.overview, pendingDate, rt.priority, rt.resp, rt.est, instanceNum).lastInsertRowid as number;
    for (const uid of rt.crew) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(pendingId, uid);
    for (const eqId of rt.equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(pendingId, eqId);
    currentDate = addDays(currentDate, rt.freq);
    instanceNum++;

    // Planned instances
    for (let i = 0; i < rt.planned; i++) {
      const plannedDate = dateStr(currentDate);
      const plannedId = db.prepare(`
        INSERT INTO scheduled_tasks (team_id, required_task_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, instance_number)
        VALUES (?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, 'planned', ?)
      `).run(team1Id, rtId, rt.desc, rt.overview, plannedDate, rt.priority, rt.resp, rt.est, instanceNum).lastInsertRowid as number;
      for (const uid of rt.crew) db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(plannedId, uid);
      for (const eqId of rt.equipment) db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(plannedId, eqId);
      currentDate = addDays(currentDate, rt.freq);
      instanceNum++;
    }
  }

  // Create required tasks and history
  const rtHistories: HistoryNote[][] = [
    // 0: Flood Route
    [
      { work: 'Completed full inspection of all 4 evacuation routes. All signs are in good condition. Bridge at Jalan Melati requires minor repair - one handrail is loose.', problems: 'Handrail on Melati bridge is loose and needs repair. Contacted public works department.', actual_hours: 3.5, crew: [budiId, ahmadId, ekoId] },
      { work: 'Conducted thorough inspection. Found debris blocking Route 3 near river bend. Cleared the debris with team. All signage checked and 2 faded signs replaced.', problems: 'Large fallen tree blocking Route 3. Required chainsaw to clear. Coordinated with Pak Eko for equipment.', actual_hours: 4, crew: [budiId, ahmadId, gunawanId] },
      { work: 'All routes clear and accessible. Replaced 3 faded evacuation signs. Assembly points all marked clearly. Added reflective tape to night visibility markers.', problems: 'Some minor vegetation growth along Route 2 edges. Trimmed back by team.', actual_hours: 2.5, crew: [budiId, ekoId] },
    ],
    // 1: Food Stock
    [
      { work: 'Completed full inventory. Found 15 items past expiry date. Replaced all expired items. Total stock now meets 72-hour requirement for 200 people. Organized storage system.', problems: '15 canned goods expired. Water purification tablets running low - only 30% of recommended stock. Placed order for replacement stock.', actual_hours: 5, crew: [sitiId, dewiId, fitriId] },
    ],
    // 2: First Aid
    [
      { work: 'Checked all 6 first aid kits. 3 kits needed restocking. Replaced expired bandages and antiseptic. Added new tourniquet to each kit as per updated protocol.', problems: 'Kit at school was partially used and not reported to team. Spoke with school principal about protocol for reporting use.', actual_hours: 2, crew: [dewiId, fitriId] },
      { work: 'All kits in good condition. Replaced latex gloves in 2 kits that showed signs of degradation. Tourniquets in proper condition. Documented all kit locations on map.', problems: 'No significant issues found. Suggested moving mosque kit to more accessible location.', actual_hours: 1.5, crew: [dewiId] },
      { work: 'Full kit inspection completed. Added new CPR face shields to all kits per new national standard. Updated inventory records.', problems: 'Two kits at mosque had water damage on inside of case. Cases replaced immediately. Investigating cause of water ingress.', actual_hours: 2.5, crew: [dewiId, fitriId] },
    ],
    // 3: Shelter
    [
      { work: 'Complete structural inspection done. Roof is solid. Installed 4 new emergency lights. Cleaned sanitation facilities thoroughly. Updated capacity signs.', problems: 'Roof tiles in south section showing wear and need attention before rainy season. Several windows have cracked seals allowing moisture in. Submitted maintenance request to village head.', actual_hours: 6, crew: [budiId, gunawanId, ahmadId] },
    ],
    // 4: Communication
    [
      { work: 'Full communication test completed. Phone tree activated - all 45 households contacted within 23 minutes. Radio network checked and all 8 units responding.', problems: 'Two households could not be reached by phone - numbers had changed. Updated contact list immediately. One radio battery weak.', actual_hours: 2, crew: [budiId, sitiId, ahmadId] },
      { work: 'Emergency radio network tested with full drill. All 8 radios responding clearly. Alarm siren tested at 6am with prior community notice. Response time improved from last month.', problems: 'Siren at south end of village has intermittent issue - sometimes fails to activate. Reported to maintenance team for urgent repair.', actual_hours: 2.5, crew: [budiId, sitiId, ahmadId, ekoId] },
    ],
    // 5: Water Pump
    [
      { work: 'Full maintenance on both pumps completed. Replaced fuel filters on both units, checked all seals and hoses. Both pumps tested and running smoothly for 1 hour.', problems: 'Main pump had a worn impeller seal causing minor leak. Replaced seal. Fuel supply was at 40% - purchased additional 50L of diesel.', actual_hours: 4.5, crew: [ekoId, gunawanId] },
    ],
    // 6: Firebreak
    [
      { work: 'Cleared 2.3km of firebreak on north and east perimeter. Removed 3 dead trees that posed fire risk. Firebreak width maintained at 10-12m throughout.', problems: "One area near Pak Hasan's farm had encroachment by bamboo growth extending into firebreak. Owner agreed to keep it cleared going forward.", actual_hours: 9, crew: [gunawanId, ahmadId, ekoId] },
    ],
    // 7: Contact List
    [
      { work: 'Updated all emergency contacts. Verified 89 household contacts, 12 government emergency contacts, and 5 hospital numbers. Printed and distributed 50 updated copies to households.', problems: 'BPBD district coordinator changed position - had to verify new contact details. Found 8 outdated household phone numbers.', actual_hours: 2, crew: [sitiId] },
    ],
    // 8: Earthquake Drill
    [
      { work: 'Drill conducted with 78 participants including 15 children from the school. All assembly points reached within target time of 8 minutes. Evacuation routes practiced successfully.', problems: 'Elderly residents at south end of village took longer than target time to reach assembly point. Discussed setting up buddy system for vulnerable residents.', actual_hours: 3.5, crew: [budiId, sitiId, dewiId, ahmadId] },
    ],
    // 9: Generator
    [
      { work: 'Full maintenance completed. Changed oil and oil filter, checked spark plugs and air filter. Generator ran for 2 hours under test load without any issues.', problems: 'Battery showing signs of low charge - may need replacement in next quarter. Fuel tank was below 50% - topped up.', actual_hours: 3, crew: [ekoId] },
    ],
    // 10: Flood Warning
    [
      { work: 'Tested all flood sensors. River level sensors calibrated against reference gauge. All 3 alarm sirens tested successfully. Backup power batteries fully charged.', problems: 'Sensor 2 at main bridge was giving slightly inconsistent readings. Cleaned sensor housing and recalibrated. Problem resolved.', actual_hours: 2, crew: [budiId, ekoId] },
      { work: 'Full system test conducted. All sensors responding within normal parameters. Test alarm activated for 30 seconds at 7am as per community notice.', problems: 'No issues found this month. System operating correctly. Community well-prepared after last month drill.', actual_hours: 1.5, crew: [budiId, ekoId] },
    ],
    // 11: Life Jackets
    [
      { work: 'Inspected all 25 life jackets. All properly inflated and in good condition. Ropes coiled correctly and properly stored. Stretchers cleaned and folded.', problems: '3 life jackets show wear on straps. Flagged for replacement in next quarter budget. All currently safe for use.', actual_hours: 3, crew: [ahmadId, gunawanId] },
    ],
  ];

  const rtIds: number[] = [];
  for (let i = 0; i < requiredTasks.length; i++) {
    const rt = requiredTasks[i];
    const id = insertRT.run(team1Id, rt.desc, rt.overview, rt.priority, rt.firstDate, rt.freq, rt.resp, rt.est, rt.planned).lastInsertRowid as number;
    rtIds.push(id);
    for (const eqId of rt.equipment) db.prepare('INSERT OR IGNORE INTO required_task_equipment VALUES (?, ?)').run(id, eqId);
    for (const uid of rt.crew) db.prepare('INSERT OR IGNORE INTO required_task_crew VALUES (?, ?)').run(id, uid);
    db.prepare('INSERT INTO required_task_logs (required_task_id, user_id, change_type, details) VALUES (?, ?, ?, ?)').run(id, daveId, 'created', 'Required task created during initial system setup');
    createHistory(id, rt, rtHistories[i].length, rtHistories[i]);
  }

  // One-off tasks
  const oneOff1 = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, planning_notes)
    VALUES (?, 'one_off', ?, ?, ?, 'high', ?, ?, 'pending', ?)
  `).run(team1Id,
    'Flood Risk Area Mapping Update',
    'Update the village flood risk map with latest data from BMKG (Meteorology Agency). Include new housing developments built in the last year and recent changes to drainage systems after road construction.',
    futureDate(7), budiId, 4,
    'Need to collect latest satellite imagery from BMKG website and coordinate with their local representative. Check with camat office for new building permits.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(oneOff1, budiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(oneOff1, sitiId);
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(oneOff1, daveId, 'Please coordinate with the camat office for official data access. They have digital records of new constructions.');
  db.prepare('INSERT INTO task_notes (scheduled_task_id, user_id, note) VALUES (?, ?, ?)').run(oneOff1, sitiId, 'I have a contact at the BMKG office, will reach out to arrange a meeting this week.');

  const oneOff2 = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state)
    VALUES (?, 'one_off', ?, ?, ?, 'medium', ?, ?, 'pending')
  `).run(team1Id,
    'Basic First Aid Refresher Training',
    'Organize and conduct a basic first aid refresher training session for all active team members. Cover CPR techniques, wound care, fracture management, and basic earthquake rescue procedures. Aim for full team participation.',
    futureDate(14), dewiId, 6
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(oneOff2, dewiId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(oneOff2, fitriId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(oneOff2, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(oneOff2, firstAidId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(oneOff2, stretcherId);

  // Follow-up task from shelter inspection
  const followUp1 = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state, planning_notes)
    VALUES (?, 'follow_up', ?, ?, ?, 'high', ?, ?, 'pending', ?)
  `).run(team1Id,
    'Repair Community Shelter Roof and Windows',
    'Repair damaged and loose roof tiles on the south section of the community shelter as identified during the last inspection. Also replace cracked window seals on 3 windows to prevent water ingress during the upcoming rainy season.',
    futureDate(5), gunawanId, 4,
    'Materials needed: roof tiles approximately 20 units, silicone window sealant 3 tubes, safety ladder. Check with Pak Gunawan about material costs and sourcing.'
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(followUp1, gunawanId);
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(followUp1, ahmadId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(followUp1, helmetsId);
  db.prepare('INSERT OR IGNORE INTO task_equipment VALUES (?, ?)').run(followUp1, glovesId);

  // Overdue task
  const overdueTask = db.prepare(`
    INSERT INTO scheduled_tasks (team_id, type, short_description, overview, scheduled_date, priority, responsible_user_id, estimate_hours, state)
    VALUES (?, 'one_off', ?, ?, ?, 'urgent', ?, ?, 'pending')
  `).run(team1Id,
    'Replace Damaged Evacuation Sign - Route 2',
    "The evacuation direction sign at the Jalan Mawar intersection was damaged in last week's storm and has fallen. Replace immediately as this is on the primary evacuation route to the high ground assembly point.",
    pastDate(3), ahmadId, 1
  ).lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO task_crew VALUES (?, ?)').run(overdueTask, ahmadId);

  // Notifications
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(team1Id, daveId, 'task_overdue', 'URGENT: Task "Replace Damaged Evacuation Sign - Route 2" is now 3 days overdue.');
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(team1Id, ahmadId, 'task_overdue', 'Your task "Replace Damaged Evacuation Sign - Route 2" is overdue. Please action immediately.');
  db.prepare('INSERT INTO notifications (team_id, user_id, type, message) VALUES (?, ?, ?, ?)').run(team1Id, budiId, 'task_due_soon', 'Monthly Flood Evacuation Route Inspection is due soon. Please confirm team availability.');

  console.log('Database seeded successfully!');
  console.log(`Teams: Desa Suka Maju (id:${team1Id}), Desa Harapan Baru (id:${team2Id})`);
  console.log(`Users created: ${8} for team 1, 3 for team 2`);
  console.log(`Required tasks: ${requiredTasks.length}`);
  console.log(`Equipment items: 20`);
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}
