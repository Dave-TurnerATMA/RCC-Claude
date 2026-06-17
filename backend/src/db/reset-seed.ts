/**
 * One-off script: wipe all community-prep app data and re-seed with current dates.
 * EVCA tables are left untouched.
 * Run with: npx ts-node src/db/reset-seed.ts
 */
import db, { initializeDatabase } from './database';
import { seedDatabase } from './seed';

initializeDatabase();

console.log('Clearing community-prep app data (EVCA tables untouched)...');

db.exec(`
  DELETE FROM notifications;
  DELETE FROM task_notes;
  DELETE FROM task_uploads;
  DELETE FROM task_equipment;
  DELETE FROM scheduled_task_step_checks;
  DELETE FROM crew_participation;
  DELETE FROM scheduled_tasks;
  DELETE FROM required_task_logs;
  DELETE FROM required_task_crew_defaults;
  DELETE FROM required_task_steps;
  DELETE FROM required_tasks;
  DELETE FROM main_tasks;
  DELETE FROM equipment;
  DELETE FROM users;
  DELETE FROM teams;
  DELETE FROM sqlite_sequence WHERE name IN (
    'notifications','task_notes','task_uploads','scheduled_tasks',
    'required_task_logs','required_tasks','main_tasks','equipment','users','teams'
  );
`);

console.log('All app tables cleared.');

seedDatabase();
