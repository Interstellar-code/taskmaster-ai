/**
 * Database Migration Utility
 * Handles database schema migrations and updates
 */

import databaseManager from './database.js';

/**
 * Migrate configurations table to remove project_id
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration result
 */
export async function migrateConfigurationsTable(projectRoot) {
  try {
    await databaseManager.initialize(projectRoot);

    // Check if migration is needed
    const tableInfo = await databaseManager.getAllQuery("PRAGMA table_info(configurations)");
    const hasProjectId = tableInfo.some(col => col.name === 'project_id');

    if (!hasProjectId) {
      return {
        success: true,
        message: 'Configurations table already migrated',
        alreadyMigrated: true
      };
    }

    console.log('Migrating configurations table to remove project_id...');

    // Step 1: Create new table with updated schema
    await databaseManager.runQuery(`
      CREATE TABLE IF NOT EXISTS configurations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(config_type, key)
      )
    `);

    // Step 2: Copy data from old table (only global configs where project_id IS NULL)
    await databaseManager.runQuery(`
      INSERT INTO configurations_new (config_type, key, value, created_at, updated_at)
      SELECT config_type, key, value, created_at, updated_at
      FROM configurations
      WHERE project_id IS NULL
    `);

    // Step 3: Drop old table
    await databaseManager.runQuery('DROP TABLE configurations');

    // Step 4: Rename new table
    await databaseManager.runQuery('ALTER TABLE configurations_new RENAME TO configurations');

    // Step 5: Create index
    await databaseManager.runQuery('CREATE INDEX IF NOT EXISTS idx_config_type_key ON configurations(config_type, key)');

    // Step 6: Create trigger for timestamp updates
    await databaseManager.runQuery(`
      CREATE TRIGGER IF NOT EXISTS update_configurations_timestamp 
      AFTER UPDATE ON configurations
      BEGIN
        UPDATE configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    console.log('Configurations table migration completed successfully');

    return {
      success: true,
      message: 'Configurations table migrated successfully',
      migratedRecords: await databaseManager.getQuery('SELECT COUNT(*) as count FROM configurations')
    };

  } catch (error) {
    console.error('Configurations table migration failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Run all necessary database migrations
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration result
 */
export async function runDatabaseMigrations(projectRoot) {
  try {
    const results = [];

    // Migrate configurations table
    const configMigration = await migrateConfigurationsTable(projectRoot);
    results.push({
      migration: 'configurations_table',
      ...configMigration
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      success: successCount === totalCount,
      message: `Database migrations completed: ${successCount}/${totalCount} successful`,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Check if database needs migration
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration status
 */
export async function checkDatabaseMigrationStatus(projectRoot) {
  try {
    await databaseManager.initialize(projectRoot);

    // Check configurations table structure
    const tableInfo = await databaseManager.getAllQuery("PRAGMA table_info(configurations)");
    const hasProjectId = tableInfo.some(col => col.name === 'project_id');
    const hasDescription = tableInfo.some(col => col.name === 'description');
    const hasIsDefault = tableInfo.some(col => col.name === 'is_default');

    return {
      needsMigration: hasProjectId || !hasDescription || !hasIsDefault,
      currentSchema: {
        hasProjectId,
        hasDescription,
        hasIsDefault,
        columns: tableInfo.map(col => col.name)
      },
      recommendedActions: hasProjectId ? ['Remove project_id column', 'Add description column', 'Add is_default column'] : []
    };

  } catch (error) {
    return {
      needsMigration: true,
      error: error.message
    };
  }
}
