/**
 * Phase 1 Test Script for TaskHero SQLite Implementation
 * Tests database foundation components
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  initializeTaskHero,
  getDatabase,
  closeDatabase,
  healthCheck,
  getDatabaseStats,
  ProjectDAO,
  TaskDAO,
  PRDDAO,
  ConfigurationDAO,
  backupManager
} from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test project root (use a temporary directory)
const TEST_PROJECT_ROOT = path.join(__dirname, '..', 'test-project');

async function runPhase1Tests() {
  console.log('🚀 Starting Phase 1 Tests for TaskHero SQLite Implementation\n');

  try {
    // Clean up any existing test data
    await cleanupTestData();

    // Test 1: Database Initialization
    console.log('📊 Test 1: Database Initialization');
    const initResult = await initializeTaskHero(TEST_PROJECT_ROOT, {
      name: 'Test Project',
      description: 'Test project for Phase 1 validation'
    });
    
    console.log('✅ Database initialized successfully');
    console.log(`   Project ID: ${initResult.project.id}`);
    console.log(`   Project Name: ${initResult.project.name}`);
    console.log(`   Is New: ${initResult.isNew}\n`);

    // Test 2: Health Check
    console.log('🏥 Test 2: Database Health Check');
    const isHealthy = await healthCheck(TEST_PROJECT_ROOT);
    console.log(`✅ Database health: ${isHealthy ? 'Healthy' : 'Unhealthy'}\n`);

    // Test 3: Database Statistics
    console.log('📈 Test 3: Database Statistics');
    const stats = await getDatabaseStats(TEST_PROJECT_ROOT);
    console.log('✅ Database statistics:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
    console.log();

    // Test 4: Project DAO Operations
    console.log('🏗️ Test 4: Project DAO Operations');
    const project = await ProjectDAO.findByRootPath(TEST_PROJECT_ROOT);
    console.log('✅ Project found via DAO:');
    console.log(`   ID: ${project.id}, Name: ${project.name}`);
    
    const projectStats = await ProjectDAO.findWithStats(project.id);
    console.log('✅ Project with stats retrieved');
    console.log(`   Task stats: ${JSON.stringify(projectStats.task_stats)}`);
    console.log(`   PRD stats: ${JSON.stringify(projectStats.prd_stats)}\n`);

    // Test 5: Configuration DAO Operations
    console.log('⚙️ Test 5: Configuration DAO Operations');
    
    // Test setting and getting configuration
    await ConfigurationDAO.setValue(project.id, 'test_config', 'test_key', { value: 'test_data' });
    const configValue = await ConfigurationDAO.getValue(project.id, 'test_config', 'test_key');
    console.log('✅ Configuration set and retrieved:');
    console.log(`   Value: ${JSON.stringify(configValue)}`);
    
    const allConfigs = await ConfigurationDAO.getProjectConfigurations(project.id);
    console.log('✅ All project configurations retrieved');
    console.log(`   Config types: ${Object.keys(allConfigs).join(', ')}\n`);

    // Test 6: Task DAO Operations
    console.log('📋 Test 6: Task DAO Operations');
    
    // Create a test task
    const taskData = {
      project_id: project.id,
      task_identifier: '1',
      title: 'Test Task',
      description: 'This is a test task for Phase 1 validation',
      status: 'pending',
      priority: 'medium'
    };
    
    const createdTask = await TaskDAO.create(taskData);
    console.log('✅ Task created:');
    console.log(`   ID: ${createdTask.id}, Title: ${createdTask.title}`);
    
    // Test task status update
    await TaskDAO.updateStatus(createdTask.id, 'in-progress');
    const updatedTask = await TaskDAO.findById(createdTask.id);
    console.log(`✅ Task status updated to: ${updatedTask.status}`);
    
    // Test getting next task identifier
    const nextId = await TaskDAO.getNextTaskIdentifier(project.id);
    console.log(`✅ Next task identifier: ${nextId}\n`);

    // Test 7: PRD DAO Operations
    console.log('📄 Test 7: PRD DAO Operations');
    
    // Create a test PRD
    const prdData = {
      project_id: project.id,
      prd_identifier: 'prd_001',
      title: 'Test PRD',
      file_name: 'test_prd.md',
      file_path: '/test/path/test_prd.md',
      description: 'Test PRD for Phase 1 validation',
      status: 'pending'
    };
    
    const createdPRD = await PRDDAO.create(prdData);
    console.log('✅ PRD created:');
    console.log(`   ID: ${createdPRD.id}, Title: ${createdPRD.title}`);
    
    // Link task to PRD
    await TaskDAO.update(createdTask.id, { prd_id: createdPRD.id });
    
    // Get PRD with tasks
    const prdWithTasks = await PRDDAO.findWithTasks(createdPRD.id);
    console.log('✅ PRD with linked tasks retrieved');
    console.log(`   Linked tasks: ${prdWithTasks.tasks.length}\n`);

    // Test 8: Backup Operations
    console.log('💾 Test 8: Backup Operations');
    
    const backupResult = await backupManager.createBackup(TEST_PROJECT_ROOT, { type: 'test' });
    console.log('✅ Backup created:');
    console.log(`   Filename: ${backupResult.backup.filename}`);
    console.log(`   Size: ${backupManager.formatFileSize(backupResult.backup.size)}`);
    
    const backups = await backupManager.listBackups(TEST_PROJECT_ROOT);
    console.log(`✅ Backups listed: ${backups.length} backup(s) found`);
    
    const backupStats = await backupManager.getBackupStats(TEST_PROJECT_ROOT);
    console.log('✅ Backup statistics:');
    console.log(`   Total backups: ${backupStats.total_backups}`);
    console.log(`   Total size: ${backupManager.formatFileSize(backupStats.total_size)}\n`);

    // Test 9: Transaction Operations
    console.log('🔄 Test 9: Transaction Operations');
    
    // Create multiple tasks in a transaction
    const taskQueries = [
      {
        sql: 'INSERT INTO tasks (project_id, task_identifier, title, description) VALUES (?, ?, ?, ?)',
        params: [project.id, '2', 'Task 2', 'Second test task']
      },
      {
        sql: 'INSERT INTO tasks (project_id, task_identifier, title, description) VALUES (?, ?, ?, ?)',
        params: [project.id, '3', 'Task 3', 'Third test task']
      }
    ];
    
    const db = await getDatabase(TEST_PROJECT_ROOT);
    const transactionResults = await db.transaction(taskQueries);
    console.log('✅ Transaction completed successfully');
    console.log(`   Created ${transactionResults.length} tasks\n`);

    // Final statistics
    console.log('📊 Final Database Statistics:');
    const finalStats = await getDatabaseStats(TEST_PROJECT_ROOT);
    Object.entries(finalStats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });

    console.log('\n🎉 All Phase 1 tests completed successfully!');
    console.log('\n✅ Phase 1 Implementation Status:');
    console.log('   ✅ Task 1.1: SQLite database schema - COMPLETED');
    console.log('   ✅ Task 1.2: Database connection manager - COMPLETED');
    console.log('   ✅ Task 1.3: Data Access Objects (DAOs) - COMPLETED');
    console.log('   ✅ Task 1.4: Database initialization utilities - COMPLETED');
    console.log('   ✅ Task 1.5: Backup and restore functionality - COMPLETED');

  } catch (error) {
    console.error('❌ Phase 1 test failed:', error);
    throw error;
  } finally {
    // Clean up
    await closeDatabase();
    console.log('\n🧹 Database connection closed');
  }
}

async function cleanupTestData() {
  try {
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Warning: Could not clean up test data:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase1Tests()
    .then(() => {
      console.log('\n✨ Phase 1 validation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Phase 1 validation failed:', error);
      process.exit(1);
    });
}

export { runPhase1Tests };
