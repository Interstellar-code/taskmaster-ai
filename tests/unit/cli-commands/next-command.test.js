/**
 * Unit Tests for task-hero next command
 * Tests next task identification logic with SQLite database
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestDatabase, seedTestData, cleanupTestFiles } from '../test-helpers/database-helper.js';

describe('task-hero next command', () => {
  let testDb;
  let testData;
  
  beforeEach(async () => {
    testDb = await createTestDatabase('next-test');
    testData = await seedTestData(testDb.db);
  });
  
  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
    await cleanupTestFiles();
  });

  test('should identify next available task correctly', async () => {
    // Import the next task function
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    // Capture console output
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should identify Task 1 as next (no dependencies, pending status, high priority)
      expect(consoleOutput).toContain('Next Task to Work On:');
      expect(consoleOutput).toContain('ID: 1');
      expect(consoleOutput).toContain('Setup and Planning');
      expect(consoleOutput).toContain('pending');
      expect(consoleOutput).toContain('high');
      expect(consoleOutput).toContain('Dependencies: None');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should show quick action commands', async () => {
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Verify quick action commands are shown
      expect(consoleOutput).toContain('Quick Actions');
      expect(consoleOutput).toContain('Start working: task-hero set-status --id=1 --status=in-progress');
      expect(consoleOutput).toContain('Show details: task-hero show 1');
      expect(consoleOutput).toContain('Update task: task-hero update-task --id=1');
      expect(consoleOutput).toContain('Break into subtasks: task-hero expand --id=1');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should show project progress summary', async () => {
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Verify progress summary
      expect(consoleOutput).toContain('Progress');
      expect(consoleOutput).toContain('Total tasks: 5');
      expect(consoleOutput).toContain('Completed: 1');  // Task 5 is done
      expect(consoleOutput).toContain('In progress: 1');  // Task 4 is in-progress
      expect(consoleOutput).toContain('Pending: 3');  // Tasks 1, 2, 3 are pending
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should prioritize high priority tasks', async () => {
    // Update Task 2 to have no dependencies and high priority
    const TaskDAO = (await import('../../../api/dao/TaskDAO.js')).default;
    await TaskDAO.update(testData.tasks[1].id, {
      priority: 'high',
      metadata: { test: true }  // Remove dependencies
    });
    
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should still prioritize Task 1 or Task 2 (both high priority, no dependencies)
      expect(consoleOutput).toContain('Priority: high');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle no available tasks', async () => {
    // Mark all pending tasks as blocked or completed
    const TaskDAO = (await import('../../../api/dao/TaskDAO.js')).default;
    
    // Mark Task 1 as blocked
    await TaskDAO.update(testData.tasks[0].id, { status: 'blocked' });
    
    // Mark Tasks 2 and 3 as done
    await TaskDAO.update(testData.tasks[1].id, { status: 'done' });
    await TaskDAO.update(testData.tasks[2].id, { status: 'done' });
    
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should handle no available tasks gracefully
      expect(consoleOutput).toContain('No available tasks') || 
      expect(consoleOutput).toContain('All tasks completed') ||
      expect(consoleOutput).toContain('No pending tasks');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should respect task dependencies', async () => {
    // Verify that Task 2 is not suggested as next (depends on Task 1)
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should suggest Task 1, not Task 2 (which depends on Task 1)
      expect(consoleOutput).toContain('ID: 1');
      expect(consoleOutput).not.toContain('Implementation Phase 1');  // Task 2 title
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle database connection errors', async () => {
    // Close the database connection to simulate error
    await testDb.db.close();
    
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    // Should handle database errors gracefully
    await expect(displayNextTaskDB()).rejects.toThrow();
  });

  test('should show task complexity if available', async () => {
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should show complexity information
      expect(consoleOutput).toContain('Complexity') || 
      expect(consoleOutput).toContain('complexity');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should update next task when current task is completed', async () => {
    // Complete Task 1
    const TaskDAO = (await import('../../../api/dao/TaskDAO.js')).default;
    await TaskDAO.update(testData.tasks[0].id, { status: 'done' });
    
    const displayNextTaskDB = (await import('../../../scripts/modules/task-manager/display-next-task-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await displayNextTaskDB();
      
      // Should now suggest Task 2 (dependency on Task 1 is satisfied)
      expect(consoleOutput).toContain('ID: 2') || 
      expect(consoleOutput).toContain('Implementation Phase 1');
      
    } finally {
      console.log = originalLog;
    }
  });
});
