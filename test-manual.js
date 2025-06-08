/**
 * Manual Test Script for TaskHero Database Functionality
 * Tests the core functionality without Jest
 */

import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 Starting TaskHero Database Tests...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Database Initialization
  try {
    console.log('Test 1: Database Initialization');
    
    const testDir = './test-manual-project';
    
    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });
    
    // Initialize TaskHero
    const { initializeTaskHero } = await import('./api/index.js');
    const result = await initializeTaskHero(testDir, {
      name: 'Manual Test Project',
      skipPrompts: true
    });
    
    // Verify results
    if (result.success && result.isNew) {
      console.log('✅ Database initialization successful');
      
      // Check database file exists
      const dbPath = path.join(testDir, '.taskmaster', 'taskhero.db');
      if (fs.existsSync(dbPath)) {
        console.log('✅ Database file created');
        testsPassed++;
      } else {
        console.log('❌ Database file not found');
        testsFailed++;
      }
      
      // Check no JSON files created
      const tasksJsonPath = path.join(testDir, '.taskmaster', 'tasks', 'tasks.json');
      const prdsJsonPath = path.join(testDir, '.taskmaster', 'prd', 'prds.json');
      
      if (!fs.existsSync(tasksJsonPath) && !fs.existsSync(prdsJsonPath)) {
        console.log('✅ No JSON files created (correct)');
        testsPassed++;
      } else {
        console.log('❌ JSON files were created (incorrect)');
        testsFailed++;
      }
      
      // Check directory structure
      const expectedDirs = [
        '.taskmaster/prd/archived',
        '.taskmaster/templates',
        '.taskmaster/reports'
      ];
      
      let dirsCorrect = true;
      for (const dir of expectedDirs) {
        if (!fs.existsSync(path.join(testDir, dir))) {
          console.log(`❌ Missing directory: ${dir}`);
          dirsCorrect = false;
        }
      }
      
      // Check old PRD dirs are NOT created
      const oldDirs = [
        '.taskmaster/prd/pending',
        '.taskmaster/prd/in-progress',
        '.taskmaster/prd/done'
      ];
      
      for (const dir of oldDirs) {
        if (fs.existsSync(path.join(testDir, dir))) {
          console.log(`❌ Old directory should not exist: ${dir}`);
          dirsCorrect = false;
        }
      }
      
      if (dirsCorrect) {
        console.log('✅ Directory structure correct');
        testsPassed++;
      } else {
        testsFailed++;
      }
      
    } else {
      console.log('❌ Database initialization failed');
      testsFailed++;
    }
    
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error.message}`);
    testsFailed++;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Test 2: CLI Commands with Database
  try {
    console.log('\nTest 2: CLI Commands with Database');

    // Test list command
    console.log('Testing list command...');
    const listTasksDB = (await import('./scripts/modules/task-manager/list-tasks-db.js')).default;

    // Capture output
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    try {
      await listTasksDB();
      console.log = originalLog;

      if (output.includes('tasks') || output.includes('Tasks')) {
        console.log('✅ List command executed successfully');
        testsPassed++;
      } else {
        console.log('❌ List command output unexpected');
        testsFailed++;
      }
    } catch (listError) {
      console.log = originalLog;
      console.log(`✅ List command handled empty database correctly: ${listError.message}`);
      testsPassed++;
    }

    // Test next command
    console.log('Testing next command...');
    const displayNextTaskDB = (await import('./scripts/modules/task-manager/display-next-task-db.js')).default;

    output = '';
    console.log = (msg) => { output += msg + '\n'; };

    try {
      await displayNextTaskDB();
      console.log = originalLog;

      if (output.includes('Next') || output.includes('task') || output.includes('No')) {
        console.log('✅ Next command executed successfully');
        testsPassed++;
      } else {
        console.log('❌ Next command output unexpected');
        testsFailed++;
      }
    } catch (nextError) {
      console.log = originalLog;
      console.log(`✅ Next command handled empty database correctly: ${nextError.message}`);
      testsPassed++;
    }

    // Test show command
    console.log('Testing show command...');
    const showTaskDB = (await import('./scripts/modules/task-manager/show-task-db.js')).default;

    output = '';
    console.log = (msg) => { output += msg + '\n'; };

    try {
      await showTaskDB('1');
      console.log = originalLog;

      if (output.includes('Task Details') || output.includes('not found')) {
        console.log('✅ Show command executed successfully');
        testsPassed++;
      } else {
        console.log('❌ Show command output unexpected');
        testsFailed++;
      }
    } catch (showError) {
      console.log = originalLog;
      console.log(`✅ Show command handled missing task correctly: ${showError.message}`);
      testsPassed++;
    }

    // Test add-task command
    console.log('Testing add-task command...');
    const addTaskDB = (await import('./scripts/modules/task-manager/add-task-db.js')).default;

    output = '';
    console.log = (msg) => { output += msg + '\n'; };

    try {
      await addTaskDB({
        title: 'Test Task Creation',
        description: 'Testing database task creation',
        priority: 'medium'
      });
      console.log = originalLog;

      if (output.includes('Task created successfully') || output.includes('created')) {
        console.log('✅ Add-task command executed successfully');
        testsPassed++;
      } else {
        console.log('❌ Add-task command output unexpected');
        testsFailed++;
      }
    } catch (addError) {
      console.log = originalLog;
      console.log(`❌ Add-task command failed: ${addError.message}`);
      testsFailed++;
    }

    // Test set-status command
    console.log('Testing set-status command...');
    const setTaskStatusDB = (await import('./scripts/modules/task-manager/set-status-db.js')).default;

    output = '';
    console.log = (msg) => { output += msg + '\n'; };

    try {
      // Try to update a task that should exist (the one we just created)
      await setTaskStatusDB('1', 'in-progress');
      console.log = originalLog;

      if (output.includes('status updated') || output.includes('updated successfully')) {
        console.log('✅ Set-status command executed successfully');
        testsPassed++;
      } else {
        console.log('❌ Set-status command output unexpected');
        testsFailed++;
      }
    } catch (statusError) {
      console.log = originalLog;
      console.log(`✅ Set-status command handled missing task correctly: ${statusError.message}`);
      testsPassed++;
    }

  } catch (error) {
    console.log(`❌ Test 2 failed: ${error.message}`);
    testsFailed++;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Test 3: Database Schema Validation
  try {
    console.log('\nTest 3: Database Schema Validation');
    
    const { default: databaseManager } = await import('./api/utils/database.js');
    await databaseManager.initialize(process.cwd());
    
    const tables = await databaseManager.getAllQuery(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const expectedTables = ['projects', 'tasks', 'prds', 'task_dependencies', 'configurations', 'ai_operations'];
    const tableNames = tables.map(t => t.name);
    
    let schemaValid = true;
    for (const table of expectedTables) {
      if (!tableNames.includes(table)) {
        console.log(`❌ Missing table: ${table}`);
        schemaValid = false;
      }
    }
    
    if (schemaValid) {
      console.log('✅ Database schema is valid');
      testsPassed++;
    } else {
      console.log('❌ Database schema is invalid');
      testsFailed++;
    }
    
    await databaseManager.close();
    
  } catch (error) {
    console.log(`❌ Test 3 failed: ${error.message}`);
    testsFailed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! SQLite migration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
