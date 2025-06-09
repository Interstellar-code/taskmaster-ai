/**
 * Simple script to remove project_id columns from tasks and prds tables
 * Uses the existing CLI database utilities
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function removeProjectIdColumns() {
  try {
    console.log('Starting project_id column removal...');
    
    // Import the CLI database module
    const { default: cliDatabase } = await import('./modules/database/cli-database.js');
    
    // Initialize the database
    await cliDatabase.initialize();
    
    console.log('Database initialized successfully');
    
    // Check if project_id columns exist
    const tasksSchema = await cliDatabase.db.allAsync(`PRAGMA table_info(tasks)`);
    const prdsSchema = await cliDatabase.db.allAsync(`PRAGMA table_info(prds)`);
    
    const hasTasksProjectId = tasksSchema.some(col => col.name === 'project_id');
    const hasPrdsProjectId = prdsSchema.some(col => col.name === 'project_id');
    
    console.log(`Tasks table has project_id: ${hasTasksProjectId}`);
    console.log(`PRDs table has project_id: ${hasPrdsProjectId}`);
    
    if (!hasTasksProjectId && !hasPrdsProjectId) {
      console.log('No project_id columns found. Migration not needed.');
      return;
    }
    
    // Begin transaction
    await cliDatabase.db.runAsync('BEGIN TRANSACTION');
    
    try {
      if (hasTasksProjectId) {
        console.log('Removing project_id from tasks table...');
        
        // Create new tasks table without project_id
        await cliDatabase.db.runAsync(`
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
            metadata TEXT DEFAULT '{}'
          )
        `);
        
        // Copy data excluding project_id (only copy columns that exist)
        await cliDatabase.db.runAsync(`
          INSERT INTO tasks_new (
            id, prd_id, parent_task_id, task_identifier, title, description, details,
            test_strategy, status, priority, complexity_score, created_at, updated_at, metadata
          )
          SELECT
            id, prd_id, parent_task_id, task_identifier, title, description, details,
            test_strategy, status, priority, complexity_score, created_at, updated_at, metadata
          FROM tasks
        `);
        
        // Replace old table
        await cliDatabase.db.runAsync('DROP TABLE tasks');
        await cliDatabase.db.runAsync('ALTER TABLE tasks_new RENAME TO tasks');
        
        console.log('✅ Tasks table updated successfully');
      }
      
      if (hasPrdsProjectId) {
        console.log('Removing project_id from prds table...');
        
        // Create new prds table without project_id
        await cliDatabase.db.runAsync(`
          CREATE TABLE prds_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prd_identifier TEXT NOT NULL UNIQUE,
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
        
        // Copy data excluding project_id
        await cliDatabase.db.runAsync(`
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
        
        // Replace old table
        await cliDatabase.db.runAsync('DROP TABLE prds');
        await cliDatabase.db.runAsync('ALTER TABLE prds_new RENAME TO prds');
        
        console.log('✅ PRDs table updated successfully');
      }
      
      // Recreate indexes
      console.log('Recreating indexes...');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_prd_id ON tasks(prd_id)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_task_identifier ON tasks(task_identifier)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
      
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_priority ON prds(priority)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_prd_identifier ON prds(prd_identifier)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_created_date ON prds(created_date)');
      
      // Commit transaction
      await cliDatabase.db.runAsync('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      console.log('- Removed project_id column from tasks table');
      console.log('- Removed project_id column from prds table');
      console.log('- Recreated all necessary indexes');
      
    } catch (error) {
      // Rollback on error
      await cliDatabase.db.runAsync('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
removeProjectIdColumns()
  .then(() => {
    console.log('🎉 Project ID columns removed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
