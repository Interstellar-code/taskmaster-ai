/**
 * Simple script to remove task_identifier and prd_identifier columns
 * These are unnecessary since we use the database ID as the identifier
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

async function removeIdentifierColumns() {
  try {
    console.log('Starting identifier column removal...');
    
    // Import the CLI database module
    const { default: cliDatabase } = await import('./modules/database/cli-database.js');
    
    // Initialize the database
    await cliDatabase.initialize();
    
    console.log('Database initialized successfully');
    
    // Check if identifier columns exist
    const tasksSchema = await cliDatabase.db.allAsync(`PRAGMA table_info(tasks)`);
    const prdsSchema = await cliDatabase.db.allAsync(`PRAGMA table_info(prds)`);
    
    const hasTaskIdentifier = tasksSchema.some(col => col.name === 'task_identifier');
    const hasPrdIdentifier = prdsSchema.some(col => col.name === 'prd_identifier');
    
    console.log(`Tasks table has task_identifier: ${hasTaskIdentifier}`);
    console.log(`PRDs table has prd_identifier: ${hasPrdIdentifier}`);
    
    if (!hasTaskIdentifier && !hasPrdIdentifier) {
      console.log('No identifier columns found. Migration not needed.');
      return;
    }
    
    // Begin transaction
    await cliDatabase.db.runAsync('BEGIN TRANSACTION');
    
    try {
      if (hasTaskIdentifier) {
        console.log('Removing task_identifier from tasks table...');
        
        // Create new tasks table without task_identifier
        await cliDatabase.db.runAsync(`
          CREATE TABLE tasks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prd_id INTEGER,
            parent_task_id INTEGER,
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
        
        // Copy data excluding task_identifier
        await cliDatabase.db.runAsync(`
          INSERT INTO tasks_new (
            id, prd_id, parent_task_id, title, description, details,
            test_strategy, status, priority, complexity_score, created_at, updated_at, metadata
          )
          SELECT 
            id, prd_id, parent_task_id, title, description, details,
            test_strategy, status, priority, complexity_score, created_at, updated_at, metadata
          FROM tasks
        `);
        
        // Replace old table
        await cliDatabase.db.runAsync('DROP TABLE tasks');
        await cliDatabase.db.runAsync('ALTER TABLE tasks_new RENAME TO tasks');
        
        console.log('✅ Tasks table updated successfully');
      }
      
      if (hasPrdIdentifier) {
        console.log('Removing prd_identifier from prds table...');
        
        // Create new prds table without prd_identifier
        await cliDatabase.db.runAsync(`
          CREATE TABLE prds_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        // Copy data excluding prd_identifier
        await cliDatabase.db.runAsync(`
          INSERT INTO prds_new (
            id, title, file_name, file_path, file_hash, file_size,
            status, complexity, priority, description, tags, created_date,
            last_modified, task_stats, metadata
          )
          SELECT 
            id, title, file_name, file_path, file_hash, file_size,
            status, complexity, priority, description, tags, created_date,
            last_modified, task_stats, metadata
          FROM prds
        `);
        
        // Replace old table
        await cliDatabase.db.runAsync('DROP TABLE prds');
        await cliDatabase.db.runAsync('ALTER TABLE prds_new RENAME TO prds');
        
        console.log('✅ PRDs table updated successfully');
      }
      
      // Recreate indexes (excluding identifier indexes)
      console.log('Recreating indexes...');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_prd_id ON tasks(prd_id)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
      
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_priority ON prds(priority)');
      await cliDatabase.db.runAsync('CREATE INDEX IF NOT EXISTS idx_prds_created_date ON prds(created_date)');
      
      // Commit transaction
      await cliDatabase.db.runAsync('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      console.log('- Removed task_identifier column from tasks table');
      console.log('- Removed prd_identifier column from prds table');
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
removeIdentifierColumns()
  .then(() => {
    console.log('🎉 Identifier columns removed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
