/**
 * Database migration for PRD analysis features
 * Adds analysis fields and creates task counting view
 */

import chalk from 'chalk';
import cliDatabase from './cli-database.js';

/**
 * Add analysis fields to PRD table and create task counting view
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<void>}
 */
async function migratePrdAnalysis(projectRoot = process.cwd()) {
  try {
    console.log(chalk.blue('🔄 Starting PRD analysis migration...'));
    
    // Initialize database
    await cliDatabase.initialize(projectRoot);
    
    // Check if analysis fields already exist
    const tableInfo = await cliDatabase.db.allAsync(
      "PRAGMA table_info(prds)"
    );
    
    const existingColumns = tableInfo.map(col => col.name);
    
    // Add analysis_status field if it doesn't exist
    if (!existingColumns.includes('analysis_status')) {
      await cliDatabase.db.runAsync(`
        ALTER TABLE prds ADD COLUMN analysis_status TEXT DEFAULT 'not-analyzed' 
        CHECK (analysis_status IN ('not-analyzed', 'analyzing', 'analyzed'))
      `);
      console.log(chalk.green('✅ Added analysis_status column'));
    }
    
    // Add tasks_status field if it doesn't exist
    if (!existingColumns.includes('tasks_status')) {
      await cliDatabase.db.runAsync(`
        ALTER TABLE prds ADD COLUMN tasks_status TEXT DEFAULT 'no-tasks' 
        CHECK (tasks_status IN ('no-tasks', 'generating', 'generated'))
      `);
      console.log(chalk.green('✅ Added tasks_status column'));
    }
    
    // Add analysis_data field if it doesn't exist
    if (!existingColumns.includes('analysis_data')) {
      await cliDatabase.db.runAsync(`
        ALTER TABLE prds ADD COLUMN analysis_data TEXT DEFAULT NULL
      `);
      console.log(chalk.green('✅ Added analysis_data column'));
    }
    
    // Add analyzed_at field if it doesn't exist
    if (!existingColumns.includes('analyzed_at')) {
      await cliDatabase.db.runAsync(`
        ALTER TABLE prds ADD COLUMN analyzed_at DATETIME DEFAULT NULL
      `);
      console.log(chalk.green('✅ Added analyzed_at column'));
    }
    
    // Add estimated_effort field if it doesn't exist (may already exist)
    if (!existingColumns.includes('estimated_effort')) {
      await cliDatabase.db.runAsync(`
        ALTER TABLE prds ADD COLUMN estimated_effort TEXT DEFAULT NULL
      `);
      console.log(chalk.green('✅ Added estimated_effort column'));
    }
    
    // Create or replace the task counting view
    await cliDatabase.db.runAsync(`
      DROP VIEW IF EXISTS prd_task_stats
    `);
    
    await cliDatabase.db.runAsync(`
      CREATE VIEW prd_task_stats AS
      SELECT 
        prd_id,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
        ROUND(COUNT(CASE WHEN status = 'done' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_percentage,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_tasks
      FROM tasks 
      WHERE prd_id IS NOT NULL 
      GROUP BY prd_id
    `);
    console.log(chalk.green('✅ Created prd_task_stats view'));
    
    // Update existing PRDs to have default status values
    await cliDatabase.db.runAsync(`
      UPDATE prds 
      SET analysis_status = 'not-analyzed', 
          tasks_status = CASE 
            WHEN EXISTS (SELECT 1 FROM tasks WHERE tasks.prd_id = prds.id) 
            THEN 'generated' 
            ELSE 'no-tasks' 
          END
      WHERE analysis_status IS NULL OR tasks_status IS NULL
    `);
    console.log(chalk.green('✅ Updated existing PRDs with default status values'));
    
    console.log(chalk.green('\n🎉 PRD analysis migration completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ PRD analysis migration failed:'), error.message);
    throw error;
  }
}

/**
 * Check if PRD analysis migration is needed
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>}
 */
async function isPrdAnalysisMigrationNeeded(projectRoot = process.cwd()) {
  try {
    await cliDatabase.initialize(projectRoot);
    
    const tableInfo = await cliDatabase.db.allAsync(
      "PRAGMA table_info(prds)"
    );
    
    const existingColumns = tableInfo.map(col => col.name);
    
    // Check if any of the required columns are missing
    const requiredColumns = ['analysis_status', 'tasks_status', 'analysis_data', 'analyzed_at'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    return missingColumns.length > 0;
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not check PRD analysis migration status'));
    return false;
  }
}

/**
 * Auto-migrate PRD analysis if needed
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<void>}
 */
async function autoMigratePrdAnalysisIfNeeded(projectRoot = process.cwd()) {
  try {
    const needsMigration = await isPrdAnalysisMigrationNeeded(projectRoot);
    
    if (needsMigration) {
      console.log(chalk.yellow('🔄 PRD analysis fields missing. Auto-migrating database...'));
      await migratePrdAnalysis(projectRoot);
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  PRD analysis auto-migration failed, continuing...'));
    console.warn(chalk.gray(error.message));
  }
}

export { migratePrdAnalysis, isPrdAnalysisMigrationNeeded, autoMigratePrdAnalysisIfNeeded };
export default migratePrdAnalysis;
