/**
 * Database Migration: Remove project_id columns from tasks and prds tables
 * 
 * This migration removes the project_id column from both tasks and prds tables
 * since TaskHero operates on single projects and doesn't need multi-project support.
 */

import databaseManager from '../utils/database.js';
import path from 'path';
import fs from 'fs';

/**
 * Run the migration to remove project_id columns
 * @param {string} projectRoot - Project root directory
 */
export async function removeProjectIdColumns(projectRoot) {
  const dbPath = path.join(projectRoot, '.taskmaster', 'taskhero.db');

  if (!fs.existsSync(dbPath)) {
    console.log('Database not found, skipping migration');
    return;
  }

  // Initialize database manager with the project root
  await databaseManager.initialize(projectRoot);
  const db = databaseManager.getDatabase();
  
  try {
    console.log('Starting migration: Remove project_id columns');
    
    // Begin transaction
    await db.runQuery('BEGIN TRANSACTION');
    
    // Step 1: Create new tasks table without project_id
    console.log('Creating new tasks table without project_id...');
    await db.runQuery(`
      CREATE TABLE tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prd_id INTEGER,
        parent_task_id INTEGER,
        task_identifier TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        details TEXT,
        test_strategy TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        complexity_score REAL DEFAULT 0.0,
        complexity_level TEXT,
        estimated_hours INTEGER,
        assignee TEXT,
        due_date DATETIME,
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (prd_id) REFERENCES prds(id),
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
      )
    `);
    
    // Step 2: Copy data from old tasks table (excluding project_id)
    console.log('Copying tasks data...');
    await db.runQuery(`
      INSERT INTO tasks_new (
        id, prd_id, parent_task_id, task_identifier, title, description, details, 
        test_strategy, status, priority, complexity_score, complexity_level,
        estimated_hours, assignee, due_date, tags, created_at, updated_at, metadata
      )
      SELECT 
        id, prd_id, parent_task_id, task_identifier, title, description, details,
        test_strategy, status, priority, complexity_score, complexity_level,
        estimated_hours, assignee, due_date, tags, created_at, updated_at, metadata
      FROM tasks
    `);

    // Step 3: Drop old tasks table and rename new one
    console.log('Replacing tasks table...');
    await db.runQuery('DROP TABLE tasks');
    await db.runQuery('ALTER TABLE tasks_new RENAME TO tasks');
    
    // Step 4: Create new prds table without project_id
    console.log('Creating new prds table without project_id...');
    db.exec(`
      CREATE TABLE prds_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prd_identifier TEXT NOT NULL,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'archived')),
        complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        description TEXT,
        tags TEXT DEFAULT '[]',
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        task_stats TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}'
      )
    `);
    
    // Step 5: Copy data from old prds table (excluding project_id)
    console.log('Copying prds data...');
    db.exec(`
      INSERT INTO prds_new (
        id, prd_identifier, title, file_name, file_path, file_hash, file_size,
        status, complexity, priority, description, tags, created_date, 
        last_modified, task_stats, metadata
      )
      SELECT 
        id, prd_identifier, title, file_name, file_path, file_hash, file_size,
        status, complexity, priority, description, tags, created_date,
        last_modified, task_stats, metadata
      FROM prds
    `);
    
    // Step 6: Drop old prds table and rename new one
    console.log('Replacing prds table...');
    db.exec('DROP TABLE prds');
    db.exec('ALTER TABLE prds_new RENAME TO prds');
    
    // Step 7: Recreate indexes
    console.log('Recreating indexes...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_prd_id ON tasks(prd_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_task_identifier ON tasks(task_identifier)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
    
    db.exec('CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_prds_priority ON prds(priority)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_prds_prd_identifier ON prds(prd_identifier)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_prds_created_date ON prds(created_date)');
    
    // Step 8: Drop projects table if it exists (no longer needed)
    console.log('Removing projects table...');
    const projectsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='projects'
    `).get();
    
    if (projectsTableExists) {
      db.exec('DROP TABLE projects');
    }
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('Migration completed successfully!');
    console.log('- Removed project_id column from tasks table');
    console.log('- Removed project_id column from prds table');
    console.log('- Removed projects table');
    console.log('- Recreated all necessary indexes');
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * CLI runner for the migration
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] || process.cwd();
  
  removeProjectIdColumns(projectRoot)
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
