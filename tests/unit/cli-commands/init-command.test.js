/**
 * Unit Tests for task-hero init command
 * Tests SQLite database initialization and project setup
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { createTestProject, cleanupTestFiles } from '../test-helpers/database-helper.js';

describe('task-hero init command', () => {
  let testProject;
  
  beforeEach(async () => {
    testProject = await createTestProject('init-test');
  });
  
  afterEach(async () => {
    if (testProject) {
      testProject.cleanup();
    }
    await cleanupTestFiles();
  });

  test('should create SQLite database on fresh initialization', async () => {
    // Import the initialization function directly
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    const projectData = {
      name: 'Test SQLite Project',
      description: 'Test project for SQLite initialization',
      skipPrompts: true
    };
    
    const result = await initializeTaskHero(testProject.projectRoot, projectData);
    
    // Verify initialization success
    expect(result.success).toBe(true);
    expect(result.isNew).toBe(true);
    expect(result.project).toBeDefined();
    expect(result.project.name).toBe('Test SQLite Project');
    
    // Verify SQLite database file exists
    const dbPath = path.join(testProject.projectRoot, '.taskmaster', 'taskhero.db');
    expect(fs.existsSync(dbPath)).toBe(true);
    
    // Verify NO JSON files are created
    const tasksJsonPath = path.join(testProject.projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    const prdsJsonPath = path.join(testProject.projectRoot, '.taskmaster', 'prd', 'prds.json');
    expect(fs.existsSync(tasksJsonPath)).toBe(false);
    expect(fs.existsSync(prdsJsonPath)).toBe(false);
  });

  test('should create correct directory structure', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    const result = await initializeTaskHero(testProject.projectRoot, { skipPrompts: true });
    expect(result.success).toBe(true);
    
    // Verify directory structure
    const expectedDirs = [
      '.taskmaster',
      '.taskmaster/tasks',
      '.taskmaster/prd',
      '.taskmaster/prd/archived',  // Only archived folder should exist
      '.taskmaster/reports',
      '.taskmaster/templates',
      '.taskmaster/backups'
    ];
    
    for (const dir of expectedDirs) {
      const dirPath = path.join(testProject.projectRoot, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    }
    
    // Verify old PRD subdirectories are NOT created
    const oldPrdDirs = ['pending', 'in-progress', 'done'];
    for (const dir of oldPrdDirs) {
      const dirPath = path.join(testProject.projectRoot, '.taskmaster', 'prd', dir);
      expect(fs.existsSync(dirPath)).toBe(false);
    }
  });

  test('should create template files', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    const result = await initializeTaskHero(testProject.projectRoot, { skipPrompts: true });
    expect(result.success).toBe(true);
    
    // Verify template files exist
    const prdTemplatePath = path.join(testProject.projectRoot, '.taskmaster', 'templates', 'prd_template.md');
    const taskTemplatePath = path.join(testProject.projectRoot, '.taskmaster', 'templates', 'task_template.md');
    
    expect(fs.existsSync(prdTemplatePath)).toBe(true);
    expect(fs.existsSync(taskTemplatePath)).toBe(true);
    
    // Verify template content
    const prdTemplate = fs.readFileSync(prdTemplatePath, 'utf8');
    const taskTemplate = fs.readFileSync(taskTemplatePath, 'utf8');
    
    expect(prdTemplate).toContain('# Product Requirements Document Template');
    expect(taskTemplate).toContain('# Task: {title}');
  });

  test('should handle existing project gracefully', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    // First initialization
    const result1 = await initializeTaskHero(testProject.projectRoot, { 
      name: 'First Init',
      skipPrompts: true 
    });
    expect(result1.success).toBe(true);
    expect(result1.isNew).toBe(true);
    
    // Second initialization (should detect existing project)
    const result2 = await initializeTaskHero(testProject.projectRoot, { 
      name: 'Second Init',
      skipPrompts: true 
    });
    expect(result2.success).toBe(true);
    expect(result2.isNew).toBe(false);
    expect(result2.project.name).toBe('First Init'); // Should keep original name
  });

  test('should initialize database schema correctly', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    const result = await initializeTaskHero(testProject.projectRoot, { skipPrompts: true });
    expect(result.success).toBe(true);
    
    // Verify database schema
    const { default: databaseManager } = await import('../../../api/utils/database.js');
    await databaseManager.initialize(testProject.projectRoot);
    
    const tables = await databaseManager.getAllQuery(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const expectedTables = ['projects', 'tasks', 'prds', 'task_dependencies', 'configurations', 'ai_operations'];
    const tableNames = tables.map(t => t.name);
    
    for (const table of expectedTables) {
      expect(tableNames).toContain(table);
    }
    
    await databaseManager.close();
  });

  test('should set up default configurations', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    const result = await initializeTaskHero(testProject.projectRoot, { skipPrompts: true });
    expect(result.success).toBe(true);
    
    // Verify default configurations exist
    const { default: databaseManager } = await import('../../../api/utils/database.js');
    await databaseManager.initialize(testProject.projectRoot);
    
    const ConfigurationDAO = (await import('../../../api/dao/ConfigurationDAO.js')).default;
    
    const aiModelsConfig = await ConfigurationDAO.get(result.project.id, 'ai_models', 'default_model');
    const projectSettingsConfig = await ConfigurationDAO.get(result.project.id, 'project_settings', 'auto_backup');
    
    expect(aiModelsConfig).toBeDefined();
    expect(projectSettingsConfig).toBeDefined();
    expect(projectSettingsConfig.value).toBe(true);
    
    await databaseManager.close();
  });

  test('should handle initialization errors gracefully', async () => {
    const { initializeTaskHero } = await import('../../../api/index.js');
    
    // Try to initialize in a non-existent directory
    const invalidPath = '/invalid/path/that/does/not/exist';
    
    await expect(initializeTaskHero(invalidPath, { skipPrompts: true }))
      .rejects
      .toThrow();
  });
});
