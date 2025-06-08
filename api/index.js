/**
 * TaskHero API - Main Entry Point
 * Exports all database components and utilities
 */

// Database utilities
export { default as databaseManager } from './utils/database.js';
export { default as databaseInitializer } from './utils/initialization.js';
export { default as backupManager } from './utils/backup.js';

// Data Access Objects
export { BaseDAO } from './dao/BaseDAO.js';
export { default as ProjectDAO } from './dao/ProjectDAO.js';
export { default as TaskDAO } from './dao/TaskDAO.js';
export { default as PRDDAO } from './dao/PRDDAO.js';
export { default as ConfigurationDAO } from './dao/ConfigurationDAO.js';

// Database schema
export { DATABASE_SCHEMA, SCHEMA_VALIDATION, INITIALIZATION_ORDER } from './models/schema.js';

/**
 * Initialize TaskHero database for a project
 * @param {string} projectRoot - Project root directory
 * @param {Object} projectData - Optional project data
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeTaskHero(projectRoot, projectData = {}) {
  const { databaseInitializer } = await import('./utils/initialization.js');
  return await databaseInitializer.initializeProject(projectRoot, projectData);
}

/**
 * Get database connection for a project
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Database manager instance
 */
export async function getDatabase(projectRoot) {
  const { default: databaseManager } = await import('./utils/database.js');
  
  if (!databaseManager.isInitialized) {
    await databaseManager.initialize(projectRoot);
  }
  
  return databaseManager;
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  const { default: databaseManager } = await import('./utils/database.js');
  await databaseManager.close();
}

/**
 * Health check for database
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>} True if healthy
 */
export async function healthCheck(projectRoot) {
  try {
    const db = await getDatabase(projectRoot);
    return await db.healthCheck();
  } catch (error) {
    return false;
  }
}

/**
 * Get database statistics
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Database statistics
 */
export async function getDatabaseStats(projectRoot) {
  const db = await getDatabase(projectRoot);
  return await db.getStats();
}
