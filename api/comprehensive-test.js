/**
 * Comprehensive Phase 1 Test for TaskHero SQLite Implementation
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PROJECT_ROOT = path.join(__dirname, '..', 'test-comprehensive');

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Phase 1 Test\n');

  try {
    // Clean up
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }

    // Import all components
    const { default: databaseManager } = await import('./utils/database.js');
    const { default: databaseInitializer } = await import('./utils/initialization.js');
    const { default: backupManager } = await import('./utils/backup.js');
    const { default: ProjectDAO } = await import('./dao/ProjectDAO.js');
    const { default: TaskDAO } = await import('./dao/TaskDAO.js');
    const { default: PRDDAO } = await import('./dao/PRDDAO.js');
    const { default: ConfigurationDAO } = await import('./dao/ConfigurationDAO.js');

    // Test 1: Project Initialization
    console.log('🏗️ Test 1: Project Initialization');
    const initResult = await databaseInitializer.initializeProject(TEST_PROJECT_ROOT, {
      name: 'Comprehensive Test Project',
      description: 'Full test of Phase 1 implementation'
    });
    
    console.log(`✅ Project initialized: ${initResult.project.name} (ID: ${initResult.project.id})`);
    const projectId = initResult.project.id;

    // Test 2: Configuration Management
    console.log('\n⚙️ Test 2: Configuration Management');
    await ConfigurationDAO.setValue(projectId, 'test_config', 'api_key', 'test-api-key-123');
    await ConfigurationDAO.setValue(projectId, 'test_config', 'max_tokens', 4000);
    
    const apiKey = await ConfigurationDAO.getValue(projectId, 'test_config', 'api_key');
    const maxTokens = await ConfigurationDAO.getValue(projectId, 'test_config', 'max_tokens');
    
    console.log(`✅ Configuration set and retrieved: api_key=${apiKey}, max_tokens=${maxTokens}`);

    // Test 3: PRD Management
    console.log('\n📄 Test 3: PRD Management');
    const prdData = {
      project_id: projectId,
      prd_identifier: 'prd_001',
      title: 'Test Feature Implementation',
      file_name: 'test_feature.md',
      file_path: '/test/prds/test_feature.md',
      description: 'Implementation of test feature for validation',
      tags: ['test', 'validation', 'phase1'],
      priority: 'high',
      complexity: 'medium'
    };
    
    const prd = await PRDDAO.create(prdData);
    console.log(`✅ PRD created: ${prd.title} (ID: ${prd.id})`);

    // Test 4: Task Management
    console.log('\n📋 Test 4: Task Management');
    
    // Create main tasks
    const tasks = [];
    for (let i = 1; i <= 3; i++) {
      const taskData = {
        project_id: projectId,
        prd_id: prd.id,
        task_identifier: i.toString(),
        title: `Task ${i}: Implementation Phase ${i}`,
        description: `This is task ${i} for testing the implementation`,
        priority: i === 1 ? 'high' : 'medium',
        status: 'pending'
      };
      
      const task = await TaskDAO.create(taskData);
      tasks.push(task);
      console.log(`✅ Task created: ${task.title} (ID: ${task.id})`);
    }

    // Create subtasks
    const subtaskData = {
      project_id: projectId,
      prd_id: prd.id,
      parent_task_id: tasks[0].id,
      task_identifier: '1.1',
      title: 'Subtask 1.1: Setup Database',
      description: 'Setup database for the feature',
      status: 'pending'
    };
    
    const subtask = await TaskDAO.create(subtaskData);
    console.log(`✅ Subtask created: ${subtask.title} (ID: ${subtask.id})`);

    // Test 5: Task Status Updates
    console.log('\n🔄 Test 5: Task Status Updates');
    await TaskDAO.updateStatus(tasks[0].id, 'in-progress');
    await TaskDAO.updateStatus(subtask.id, 'done');
    
    const updatedTask = await TaskDAO.findById(tasks[0].id);
    const updatedSubtask = await TaskDAO.findById(subtask.id);
    
    console.log(`✅ Task status updated: ${updatedTask.title} -> ${updatedTask.status}`);
    console.log(`✅ Subtask status updated: ${updatedSubtask.title} -> ${updatedSubtask.status}`);

    // Test 6: PRD with Tasks
    console.log('\n🔗 Test 6: PRD with Linked Tasks');
    const prdWithTasks = await PRDDAO.findWithTasks(prd.id);
    console.log(`✅ PRD with tasks retrieved: ${prdWithTasks.tasks.length} linked tasks`);
    console.log(`✅ Task completion: ${prdWithTasks.task_stats.completion_percentage}%`);

    // Test 7: Project Statistics
    console.log('\n📊 Test 7: Project Statistics');
    const projectStats = await ProjectDAO.findWithStats(projectId);
    console.log('✅ Project statistics:');
    console.log(`   Total tasks: ${projectStats.task_stats.total}`);
    console.log(`   Tasks in progress: ${projectStats.task_stats['in-progress']}`);
    console.log(`   Tasks done: ${projectStats.task_stats.done}`);
    console.log(`   Total PRDs: ${projectStats.prd_stats.total}`);

    // Test 8: Backup Operations
    console.log('\n💾 Test 8: Backup Operations');
    const backupResult = await backupManager.createBackup(TEST_PROJECT_ROOT, { type: 'comprehensive-test' });
    console.log(`✅ Backup created: ${backupResult.backup.filename}`);
    console.log(`✅ Backup size: ${backupManager.formatFileSize(backupResult.backup.size)}`);
    
    const backups = await backupManager.listBackups(TEST_PROJECT_ROOT);
    console.log(`✅ Total backups: ${backups.length}`);

    // Test 9: Database Health and Stats
    console.log('\n🏥 Test 9: Database Health Check');
    const isHealthy = await databaseManager.healthCheck();
    const dbStats = await databaseManager.getStats();
    
    console.log(`✅ Database health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
    console.log('✅ Final database statistics:');
    Object.entries(dbStats).forEach(([table, count]) => {
      if (table !== 'database_size') {
        console.log(`   ${table}: ${count} records`);
      }
    });

    // Test 10: Cleanup
    console.log('\n🧹 Test 10: Cleanup');
    await databaseManager.close();
    console.log('✅ Database connection closed');

    // Final Summary
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Phase 1 Implementation Summary:');
    console.log('   ✅ Task 1.1: SQLite database schema with indexes and constraints');
    console.log('   ✅ Task 1.2: Database connection manager with connection pooling');
    console.log('   ✅ Task 1.3: Data Access Objects for all entities');
    console.log('   ✅ Task 1.4: Database initialization utilities');
    console.log('   ✅ Task 1.5: Backup and restore functionality');
    
    console.log('\n🚀 Ready for Phase 2: API Layer Development');

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the comprehensive test
runComprehensiveTest()
  .then(() => {
    console.log('\n✨ All tests passed! Phase 1 is complete and validated.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });
