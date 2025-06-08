/**
 * Database Test Helper Utilities
 * Provides utilities for creating and managing test databases
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a temporary test database
 * @param {string} testName - Name of the test (for unique DB path)
 * @returns {Promise<Object>} Database connection and cleanup function
 */
export async function createTestDatabase(testName = 'test') {
  const testDbDir = path.join(__dirname, '..', '..', 'temp');
  const testDbPath = path.join(testDbDir, `${testName}_${Date.now()}.db`);
  
  // Ensure temp directory exists
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  
  // Import database manager
  const { default: databaseManager } = await import('../../../api/utils/database.js');
  
  // Initialize database with test path
  await databaseManager.initialize(path.dirname(testDbPath), path.basename(testDbPath));
  
  return {
    db: databaseManager,
    dbPath: testDbPath,
    cleanup: async () => {
      await databaseManager.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    }
  };
}

/**
 * Seed test database with sample data
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} Created test data
 */
export async function seedTestData(db) {
  // Import DAOs
  const ProjectDAO = (await import('../../../api/dao/ProjectDAO.js')).default;
  const TaskDAO = (await import('../../../api/dao/TaskDAO.js')).default;
  const PRDDAO = (await import('../../../api/dao/PRDDAO.js')).default;
  
  // Create test project
  const project = await ProjectDAO.create({
    name: 'Test Project',
    description: 'A test project for unit testing',
    root_path: '/test/project',
    status: 'active',
    metadata: { test: true }
  });
  
  // Create test PRD
  const prd = await PRDDAO.create({
    project_id: project.id,
    title: 'Test PRD',
    file_path: '/test/prd.md',
    status: 'pending',
    priority: 'high',
    complexity: 'medium',
    metadata: { test: true }
  });
  
  // Create test tasks
  const tasks = [];
  
  // Task 1: No dependencies
  const task1 = await TaskDAO.create({
    project_id: project.id,
    task_identifier: '1',
    title: 'Setup and Planning',
    description: 'Initial setup and planning phase',
    status: 'pending',
    priority: 'high',
    complexity_score: 3,
    prd_id: prd.id,
    metadata: { test: true }
  });
  tasks.push(task1);
  
  // Task 2: Depends on Task 1
  const task2 = await TaskDAO.create({
    project_id: project.id,
    task_identifier: '2',
    title: 'Implementation Phase 1',
    description: 'First implementation phase',
    status: 'pending',
    priority: 'medium',
    complexity_score: 5,
    prd_id: prd.id,
    metadata: { test: true, dependencies: ['1'] }
  });
  tasks.push(task2);
  
  // Task 3: Depends on Task 2
  const task3 = await TaskDAO.create({
    project_id: project.id,
    task_identifier: '3',
    title: 'Testing Phase',
    description: 'Testing and validation',
    status: 'pending',
    priority: 'medium',
    complexity_score: 4,
    prd_id: prd.id,
    metadata: { test: true, dependencies: ['2'] }
  });
  tasks.push(task3);
  
  // Task 4: In progress
  const task4 = await TaskDAO.create({
    project_id: project.id,
    task_identifier: '4',
    title: 'Documentation',
    description: 'Create documentation',
    status: 'in-progress',
    priority: 'low',
    complexity_score: 2,
    prd_id: prd.id,
    metadata: { test: true }
  });
  tasks.push(task4);
  
  // Task 5: Completed
  const task5 = await TaskDAO.create({
    project_id: project.id,
    task_identifier: '5',
    title: 'Environment Setup',
    description: 'Setup development environment',
    status: 'done',
    priority: 'high',
    complexity_score: 3,
    prd_id: prd.id,
    metadata: { test: true }
  });
  tasks.push(task5);
  
  return {
    project,
    prd,
    tasks
  };
}

/**
 * Execute CLI command for testing
 * @param {string} command - Command to execute (without 'task-hero')
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Command result
 */
export async function execCLICommand(command, projectRoot = process.cwd()) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const fullCommand = `node bin/task-hero.js ${command}`;
  
  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: projectRoot,
      timeout: 30000 // 30 second timeout
    });
    
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      exitCode: error.code || 1,
      error: error.message
    };
  }
}

/**
 * Create temporary project directory for testing
 * @param {string} testName - Name of the test
 * @returns {Promise<Object>} Project directory info and cleanup function
 */
export async function createTestProject(testName = 'test') {
  const testProjectDir = path.join(__dirname, '..', '..', 'temp', `project_${testName}_${Date.now()}`);
  
  // Create project directory
  fs.mkdirSync(testProjectDir, { recursive: true });
  
  return {
    projectRoot: testProjectDir,
    cleanup: () => {
      if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true });
      }
    }
  };
}

/**
 * Verify database schema exists
 * @param {Object} db - Database connection
 * @returns {Promise<boolean>} True if schema is valid
 */
export async function verifyDatabaseSchema(db) {
  try {
    const tables = await db.getAllQuery(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const expectedTables = ['projects', 'tasks', 'prds', 'task_dependencies', 'configurations', 'ai_operations'];
    const tableNames = tables.map(t => t.name);
    
    return expectedTables.every(table => tableNames.includes(table));
  } catch (error) {
    return false;
  }
}

/**
 * Clean up all test files and directories
 * @returns {Promise<void>}
 */
export async function cleanupTestFiles() {
  const tempDir = path.join(__dirname, '..', '..', 'temp');
  
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
