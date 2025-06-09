/**
 * Configuration Migration Utility
 * Migrates configuration from .taskmaster/config.json to database
 */

import fs from 'fs';
import path from 'path';
import { ConfigurationDAO } from '../dao/ConfigurationDAO.js';
import databaseManager from './database.js';

/**
 * Migrate configuration from JSON file to database
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration result
 */
export async function migrateConfigToDatabase(projectRoot) {
  try {
    const configPath = path.resolve(projectRoot, '.taskmaster', 'config.json');

    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: 'Configuration file not found',
        path: configPath
      };
    }

    // Initialize database first
    await databaseManager.initialize(projectRoot);

    // Read existing config file
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    const configDAO = new ConfigurationDAO();
    const migratedConfigs = [];

    // Migrate AI models configuration
    if (config.models) {
      for (const [role, modelConfig] of Object.entries(config.models)) {
        const configData = {
          config_type: 'ai_models',
          key: role, // main, research, fallback
          value: JSON.stringify(modelConfig),
          description: `AI model configuration for ${role} role`,
          is_default: false
        };

        const migrated = await configDAO.upsert('ai_models', role, modelConfig);
        migratedConfigs.push({
          type: 'ai_models',
          key: role,
          migrated: migrated
        });
      }
    }

    // Migrate global settings
    if (config.global) {
      for (const [key, value] of Object.entries(config.global)) {
        const configData = {
          config_type: 'global_settings',
          key: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          description: `Global setting: ${key}`,
          is_default: false
        };

        const migrated = await configDAO.upsert('global_settings', key, value);
        migratedConfigs.push({
          type: 'global_settings',
          key: key,
          migrated: migrated
        });
      }
    }

    console.log(`Successfully migrated ${migratedConfigs.length} configurations to database`);

    return {
      success: true,
      migratedCount: migratedConfigs.length,
      configurations: migratedConfigs,
      sourceFile: configPath
    };

  } catch (error) {
    console.error('Configuration migration failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Check if configuration needs migration
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration status
 */
export async function checkMigrationStatus(projectRoot) {
  try {
    const configPath = path.resolve(projectRoot, '.taskmaster', 'config.json');
    const hasConfigFile = fs.existsSync(configPath);

    if (!hasConfigFile) {
      return {
        needsMigration: false,
        reason: 'No config file found'
      };
    }

    // Initialize database first
    await databaseManager.initialize(projectRoot);

    // Check if database has any configurations
    const configDAO = new ConfigurationDAO();
    const existingConfigs = await configDAO.findByType('ai_models');

    return {
      needsMigration: existingConfigs.length === 0,
      hasConfigFile,
      existingDbConfigs: existingConfigs.length,
      configPath
    };

  } catch (error) {
    return {
      needsMigration: true,
      error: error.message
    };
  }
}

/**
 * Initialize default configurations in database
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeDefaultConfigurations() {
  try {
    // Initialize database first (use current working directory)
    await databaseManager.initialize(process.cwd());

    const configDAO = new ConfigurationDAO();
    const defaultConfigs = [];

    // Default AI model configurations
    const defaultAIModels = {
      main: {
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet-20250219',
        maxTokens: 64000,
        temperature: 0.2,
        baseUrl: 'https://api.anthropic.com/v1'
      },
      research: {
        provider: 'perplexity',
        modelId: 'sonar-pro',
        maxTokens: 8700,
        temperature: 0.1,
        baseUrl: 'https://api.perplexity.ai/v1'
      },
      fallback: {
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet',
        maxTokens: 64000,
        temperature: 0.2,
        baseUrl: 'https://api.anthropic.com/v1'
      }
    };

    for (const [role, modelConfig] of Object.entries(defaultAIModels)) {
      const migrated = await configDAO.upsert('ai_models', role, modelConfig);
      defaultConfigs.push({
        type: 'ai_models',
        key: role,
        config: migrated
      });
    }

    // Default global settings
    const defaultGlobalSettings = {
      logLevel: 'info',
      debug: false,
      defaultSubtasks: 5,
      defaultPriority: 'medium',
      projectName: 'TaskHero',
      ollamaBaseUrl: 'http://localhost:11434/api'
    };

    for (const [key, value] of Object.entries(defaultGlobalSettings)) {
      const migrated = await configDAO.upsert('global_settings', key, value);
      defaultConfigs.push({
        type: 'global_settings',
        key: key,
        config: migrated
      });
    }

    return {
      success: true,
      initializedCount: defaultConfigs.length,
      configurations: defaultConfigs
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
 * Auto-migrate configuration if needed
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Migration result
 */
export async function autoMigrateConfig(projectRoot) {
  const status = await checkMigrationStatus(projectRoot);
  
  if (status.needsMigration && status.hasConfigFile) {
    console.log('Auto-migrating configuration from file to database...');
    return await migrateConfigToDatabase(projectRoot);
  } else if (status.needsMigration && !status.hasConfigFile) {
    console.log('Initializing default configurations in database...');
    return await initializeDefaultConfigurations();
  } else {
    return {
      success: true,
      message: 'Configuration already migrated',
      existingConfigs: status.existingDbConfigs
    };
  }
}
