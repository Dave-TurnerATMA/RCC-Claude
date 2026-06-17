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
  DELETE FROM task_equipment;
  DELETE FROM task_crew;
  DELETE FROM scheduled_tasks;
  DELETE FROM required_task_logs;
  DELETE FROM required_task_crew;
  DELETE FROM required_task_equipment;
  DELETE FROM required_tasks;
  DELETE FROM equipment;
  DELETE FROM users;
  DELETE FROM teams;
`);

console.log('All app tables cleared.');

seedDatabase();
