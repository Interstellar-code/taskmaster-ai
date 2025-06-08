/**
 * Migration utility to migrate tasks from JSON files to SQLite database
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cliDatabase from './cli-database.js';
import { readJSON } from '../utils.js';

/**
 * Migrate tasks from JSON file to database
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<void>}
 */
async function migrateJsonToDatabase(projectRoot = process.cwd()) {
  try {
    console.log(chalk.blue('🔄 Starting migration from JSON to database...'));
    
    // Initialize database
    await cliDatabase.initialize(projectRoot);
    
    // Check if tasks.json exists
    const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    
    if (!fs.existsSync(tasksJsonPath)) {
      console.log(chalk.yellow('📄 No tasks.json file found. Nothing to migrate.'));
      return;
    }
    
    // Read existing tasks from JSON
    console.log(chalk.blue('📖 Reading tasks from JSON file...'));
    const jsonData = readJSON(tasksJsonPath);
    
    if (!jsonData || !jsonData.tasks || jsonData.tasks.length === 0) {
      console.log(chalk.yellow('📄 No tasks found in JSON file. Nothing to migrate.'));
      return;
    }
    
    console.log(chalk.blue(`📊 Found ${jsonData.tasks.length} tasks to migrate`));
    
    // Get current project ID
    const projectId = await cliDatabase.getCurrentProjectId();
    
    // Check if tasks already exist in database
    const existingTasks = await cliDatabase.getTasks();
    if (existingTasks.length > 0) {
      console.log(chalk.yellow(`⚠️  Database already contains ${existingTasks.length} tasks.`));
      console.log(chalk.yellow('Migration will skip existing tasks and only add new ones.'));
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Migrate each task
    for (const task of jsonData.tasks) {
      try {
        // Check if task already exists in database
        const existingTask = await cliDatabase.getTask(task.id);
        if (existingTask) {
          console.log(chalk.gray(`⏭️  Skipping task ${task.id} (already exists)`));
          skippedCount++;
          continue;
        }
        
        // Prepare task data for database
        const taskData = {
          title: task.title || `Task ${task.id}`,
          description: task.description || '',
          details: task.details || '',
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          complexityScore: task.complexityScore || 0,
          dependencies: task.dependencies || [],
          metadata: {
            dependencies: task.dependencies || [],
            originalId: task.id,
            migratedAt: new Date().toISOString(),
            ...(task.prdSource && { prdSource: task.prdSource }),
            ...(task.subtasks && { subtasks: task.subtasks })
          }
        };
        
        // Insert task into database with original ID
        await insertTaskWithId(projectId, task.id, taskData);
        
        console.log(chalk.green(`✅ Migrated task ${task.id}: ${task.title}`));
        migratedCount++;
        
      } catch (error) {
        console.error(chalk.red(`❌ Error migrating task ${task.id}: ${error.message}`));
        errorCount++;
      }
    }
    
    // Migration summary
    console.log(chalk.blue('\n📊 Migration Summary:'));
    console.log(chalk.green(`✅ Successfully migrated: ${migratedCount} tasks`));
    if (skippedCount > 0) {
      console.log(chalk.yellow(`⏭️  Skipped (already exist): ${skippedCount} tasks`));
    }
    if (errorCount > 0) {
      console.log(chalk.red(`❌ Failed to migrate: ${errorCount} tasks`));
    }
    
    if (migratedCount > 0) {
      console.log(chalk.green('\n🎉 Migration completed successfully!'));
      console.log(chalk.blue('💡 You can now use database-powered CLI commands.'));
      
      // Optionally backup the JSON file
      const backupPath = tasksJsonPath + '.backup.' + Date.now();
      fs.copyFileSync(tasksJsonPath, backupPath);
      console.log(chalk.gray(`📦 JSON file backed up to: ${backupPath}`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Migration failed:'), error.message);
    throw error;
  }
}

/**
 * Insert task with specific ID (preserving original task IDs)
 * @param {number} projectId - Project ID
 * @param {string|number} taskId - Original task ID
 * @param {Object} taskData - Task data
 * @returns {Promise<void>}
 */
async function insertTaskWithId(projectId, taskId, taskData) {
  const metadata = JSON.stringify(taskData.metadata || {});
  
  await cliDatabase.db.runAsync(
    `INSERT INTO tasks (
      project_id, task_identifier, title, description, details, 
      status, priority, complexity_score, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      projectId,
      String(taskId),
      taskData.title,
      taskData.description || '',
      taskData.details || '',
      taskData.status || 'pending',
      taskData.priority || 'medium',
      taskData.complexityScore || 0,
      metadata
    ]
  );
}

/**
 * Check if migration is needed
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>}
 */
async function isMigrationNeeded(projectRoot = process.cwd()) {
  try {
    // Check if tasks.json exists
    const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    if (!fs.existsSync(tasksJsonPath)) {
      return false;
    }
    
    // Check if database has tasks
    await cliDatabase.initialize(projectRoot);
    const existingTasks = await cliDatabase.getTasks();
    
    // Read JSON tasks
    const jsonData = readJSON(tasksJsonPath);
    const jsonTaskCount = jsonData && jsonData.tasks ? jsonData.tasks.length : 0;
    
    // Migration needed if JSON has tasks but database is empty or has fewer tasks
    return jsonTaskCount > 0 && existingTasks.length < jsonTaskCount;
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Auto-migrate if needed (called by CLI commands)
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<void>}
 */
async function autoMigrateIfNeeded(projectRoot = process.cwd()) {
  try {
    const needsMigration = await isMigrationNeeded(projectRoot);
    
    if (needsMigration) {
      console.log(chalk.yellow('🔄 Detected tasks in JSON format. Auto-migrating to database...'));
      await migrateJsonToDatabase(projectRoot);
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Auto-migration failed, continuing with database operations...'));
    console.warn(chalk.gray(error.message));
  }
}

export { migrateJsonToDatabase, isMigrationNeeded, autoMigrateIfNeeded };
export default migrateJsonToDatabase;
