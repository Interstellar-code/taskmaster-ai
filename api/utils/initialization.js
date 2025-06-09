/**
 * Database Initialization Utilities for TaskHero
 * Handles project setup, schema versioning, and data migration
 */

import fs from 'fs';
import path from 'path';
import databaseManager from './database.js';
import ProjectDAO from '../dao/ProjectDAO.js';
import ConfigurationDAO from '../dao/ConfigurationDAO.js';
import { runDatabaseMigrations } from './database-migration.js';
import { autoMigrateConfig } from './config-migration.js';

export class DatabaseInitializer {
  constructor() {
    this.currentSchemaVersion = '1.0.0';
  }

  /**
   * Initialize database for a new project
   * @param {string} projectRoot - Project root directory
   * @param {Object} projectData - Project information
   * @returns {Promise<Object>} Initialization result
   */
  async initializeProject(projectRoot, projectData = {}) {
    try {
      console.log('Initializing TaskHero database...');

      // Initialize database connection and schema
      await databaseManager.initialize(projectRoot);

      // Run database migrations first
      console.log('Running database migrations...');
      await runDatabaseMigrations(projectRoot);

      // Check if project already exists
      const existingProject = await ProjectDAO.findByRootPath(projectRoot);
      if (existingProject) {
        console.log('Project already exists in database');

        // Auto-migrate configuration from file to database
        await autoMigrateConfig(projectRoot);

        return {
          success: true,
          project: existingProject,
          isNew: false
        };
      }

      // Create new project record
      const project = await this.createProject(projectRoot, projectData);

      // Initialize default configurations (now without project_id)
      await this.initializeDefaultConfigurations();

      // Auto-migrate configuration from file to database
      await autoMigrateConfig(projectRoot);

      // Create directory structure
      await this.createDirectoryStructure(projectRoot);

      console.log('Database initialization completed successfully');

      return {
        success: true,
        project: project,
        isNew: true
      };

    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create project record
   * @param {string} projectRoot - Project root directory
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectRoot, projectData) {
    const projectName = projectData.name || path.basename(projectRoot);
    const description = projectData.description || `TaskHero project at ${projectRoot}`;
    
    const project = await ProjectDAO.create({
      name: projectName,
      description: description,
      root_path: projectRoot,
      status: 'active',
      metadata: {
        schema_version: this.currentSchemaVersion,
        created_by: 'taskhero-init',
        initialization_date: new Date().toISOString()
      }
    });

    console.log(`Created project: ${project.name} (ID: ${project.id})`);
    return project;
  }

  /**
   * Initialize default configurations (global, no project_id)
   * @returns {Promise<void>}
   */
  async initializeDefaultConfigurations() {
    console.log('Setting up default configurations...');

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

    // Store each AI model configuration
    for (const [role, config] of Object.entries(defaultAIModels)) {
      await ConfigurationDAO.setValue('ai_models', role, config);
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

    // Store each global setting
    for (const [key, value] of Object.entries(defaultGlobalSettings)) {
      await ConfigurationDAO.setValue('global_settings', key, value);
    }

    console.log('Default configurations initialized');
  }

  /**
   * Create TaskHero directory structure
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<void>}
   */
  async createDirectoryStructure(projectRoot) {
    console.log('Creating directory structure...');
    
    const directories = [
      '.taskmaster',
      '.taskmaster/tasks',
      '.taskmaster/prd',
      '.taskmaster/prd/archived',  // Only archived folder needed
      '.taskmaster/reports',
      '.taskmaster/templates',
      '.taskmaster/backups'
    ];

    for (const dir of directories) {
      const fullPath = path.join(projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }

    // Create sample template files
    await this.createSampleTemplates(projectRoot);
  }

  /**
   * Create sample template files
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<void>}
   */
  async createSampleTemplates(projectRoot) {
    const templatesDir = path.join(projectRoot, '.taskmaster', 'templates');
    
    // Sample PRD template
    const prdTemplate = `# Product Requirements Document Template

## Metadata
- **PRD ID**: {prd_id}
- **Title**: {title}
- **Status**: pending
- **Priority**: medium
- **Complexity**: medium
- **Created Date**: {date}
- **Estimated Effort**: {effort}

## Executive Summary
Brief overview of the feature or project.

## Problem Statement
What problem are we solving?

## Goals
### Primary Goals
1. Goal 1
2. Goal 2

### Secondary Goals
1. Secondary goal 1
2. Secondary goal 2

## Requirements
### Functional Requirements
- Requirement 1
- Requirement 2

### Non-Functional Requirements
- Performance requirements
- Security requirements

## Implementation Plan
### Phase 1: Foundation
- Task 1.1: Description
- Task 1.2: Description

### Phase 2: Core Features
- Task 2.1: Description
- Task 2.2: Description

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Risks and Mitigation
- Risk 1: Mitigation strategy
- Risk 2: Mitigation strategy
`;

    const prdTemplatePath = path.join(templatesDir, 'prd_template.md');
    if (!fs.existsSync(prdTemplatePath)) {
      fs.writeFileSync(prdTemplatePath, prdTemplate);
      console.log('Created PRD template');
    }

    // Sample task template
    const taskTemplate = `# Task: {title}

## Description
{description}

## Details
{details}

## Test Strategy
{test_strategy}

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
{dependencies}

## Notes
Additional notes and considerations.
`;

    const taskTemplatePath = path.join(templatesDir, 'task_template.md');
    if (!fs.existsSync(taskTemplatePath)) {
      fs.writeFileSync(taskTemplatePath, taskTemplate);
      console.log('Created task template');
    }
  }

  /**
   * Check database schema version and migrate if needed
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<Object>} Migration result
   */
  async checkAndMigrateSchema(projectRoot) {
    try {
      await databaseManager.initialize(projectRoot);
      
      const project = await ProjectDAO.findByRootPath(projectRoot);
      if (!project) {
        throw new Error('Project not found in database');
      }

      const currentVersion = project.metadata?.schema_version || '0.0.0';
      
      if (currentVersion === this.currentSchemaVersion) {
        return {
          migrationNeeded: false,
          currentVersion: currentVersion,
          targetVersion: this.currentSchemaVersion
        };
      }

      console.log(`Schema migration needed: ${currentVersion} -> ${this.currentSchemaVersion}`);
      
      // Perform migration (placeholder for future migrations)
      await this.performSchemaMigration(project.id, currentVersion, this.currentSchemaVersion);
      
      return {
        migrationNeeded: true,
        currentVersion: currentVersion,
        targetVersion: this.currentSchemaVersion,
        migrationCompleted: true
      };
      
    } catch (error) {
      console.error('Schema migration failed:', error);
      throw error;
    }
  }

  /**
   * Perform schema migration
   * @param {number} projectId - Project ID
   * @param {string} fromVersion - Current version
   * @param {string} toVersion - Target version
   * @returns {Promise<void>}
   */
  async performSchemaMigration(projectId, fromVersion, toVersion) {
    console.log(`Migrating schema from ${fromVersion} to ${toVersion}...`);
    
    // Update project metadata with new schema version
    await ProjectDAO.update(projectId, {
      metadata: {
        schema_version: toVersion,
        last_migration: new Date().toISOString(),
        migration_from: fromVersion
      }
    });
    
    console.log('Schema migration completed');
  }

  /**
   * Validate database integrity
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<Object>} Validation result
   */
  async validateDatabaseIntegrity(projectRoot) {
    try {
      await databaseManager.initialize(projectRoot);
      
      const issues = [];
      
      // Check foreign key constraints
      const fkCheckSQL = 'PRAGMA foreign_key_check';
      const fkIssues = await databaseManager.getAllQuery(fkCheckSQL);
      if (fkIssues.length > 0) {
        issues.push({
          type: 'foreign_key_violation',
          count: fkIssues.length,
          details: fkIssues
        });
      }

      // Check for orphaned records
      const orphanedTasksSQL = `
        SELECT COUNT(*) as count 
        FROM tasks t 
        LEFT JOIN projects p ON t.project_id = p.id 
        WHERE p.id IS NULL
      `;
      const orphanedTasks = await databaseManager.getQuery(orphanedTasksSQL);
      if (orphanedTasks.count > 0) {
        issues.push({
          type: 'orphaned_tasks',
          count: orphanedTasks.count
        });
      }

      // Get database statistics
      const stats = await databaseManager.getStats();
      
      return {
        isValid: issues.length === 0,
        issues: issues,
        statistics: stats
      };
      
    } catch (error) {
      console.error('Database validation failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (for development/testing)
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<void>}
   */
  async resetDatabase(projectRoot) {
    console.log('Resetting database...');
    
    const dbPath = databaseManager.getDatabasePath(projectRoot);
    
    // Close existing connection
    await databaseManager.close();
    
    // Delete database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database file deleted');
    }
    
    // Reinitialize
    await databaseManager.initialize(projectRoot);
    console.log('Database reset completed');
  }
}

// Export singleton instance
export default new DatabaseInitializer();
