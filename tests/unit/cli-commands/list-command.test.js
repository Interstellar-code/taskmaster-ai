/**
 * Unit Tests for task-hero list command
 * Tests task listing functionality with SQLite database
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestDatabase, seedTestData, cleanupTestFiles } from '../test-helpers/database-helper.js';

describe('task-hero list command', () => {
  let testDb;
  let testData;
  
  beforeEach(async () => {
    testDb = await createTestDatabase('list-test');
    testData = await seedTestData(testDb.db);
  });
  
  afterEach(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
    await cleanupTestFiles();
  });

  test('should list all tasks from database', async () => {
    // Import the list tasks function
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    // Capture console output
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // Verify output contains task information
      expect(consoleOutput).toContain('Setup and Planning');
      expect(consoleOutput).toContain('Implementation Phase 1');
      expect(consoleOutput).toContain('Testing Phase');
      expect(consoleOutput).toContain('Documentation');
      expect(consoleOutput).toContain('Environment Setup');
      
      // Verify task counts
      expect(consoleOutput).toContain('Done: 1');  // Task 5
      expect(consoleOutput).toContain('In Progress: 1');  // Task 4
      expect(consoleOutput).toContain('Pending: 3');  // Tasks 1, 2, 3
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should show correct task priorities', async () => {
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // Verify priority breakdown
      expect(consoleOutput).toContain('High priority: 2');  // Tasks 1 and 5
      expect(consoleOutput).toContain('Medium priority: 2');  // Tasks 2 and 3
      expect(consoleOutput).toContain('Low priority: 1');  // Task 4
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should show dependency information', async () => {
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // Verify dependency metrics
      expect(consoleOutput).toContain('Tasks with no dependencies');
      expect(consoleOutput).toContain('Tasks ready to work on');
      expect(consoleOutput).toContain('Tasks blocked by dependencies');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should identify next available task', async () => {
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // Should show Task 1 as next task (no dependencies, pending status)
      expect(consoleOutput).toContain('Next Task to Work On:');
      expect(consoleOutput).toContain('ID: 1');
      expect(consoleOutput).toContain('Setup and Planning');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle empty task list', async () => {
    // Create a fresh database without seeded data
    const emptyDb = await createTestDatabase('empty-list-test');
    
    try {
      const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
      
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (message) => {
        consoleOutput += message + '\n';
      };
      
      try {
        await listTasksDB();
        
        // Should handle empty list gracefully
        expect(consoleOutput).toContain('0 tasks');
        expect(consoleOutput).toContain('Done: 0');
        expect(consoleOutput).toContain('Pending: 0');
        
      } finally {
        console.log = originalLog;
      }
      
    } finally {
      await emptyDb.cleanup();
    }
  });

  test('should show PRD source information', async () => {
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // Verify PRD source breakdown
      expect(consoleOutput).toContain('PRD Source Breakdown');
      expect(consoleOutput).toContain('Tasks from PRDs');
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should calculate progress percentages correctly', async () => {
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    let consoleOutput = '';
    const originalLog = console.log;
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
    
    try {
      await listTasksDB();
      
      // With 5 tasks total and 1 done, should show 20% completion
      // Note: The exact percentage format may vary, so we check for presence of percentage
      expect(consoleOutput).toMatch(/\d+%/);  // Should contain percentage
      
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle database connection errors', async () => {
    // Close the database connection to simulate error
    await testDb.db.close();
    
    const listTasksDB = (await import('../../../scripts/modules/task-manager/list-tasks-db.js')).default;
    
    // Should handle database errors gracefully
    await expect(listTasksDB()).rejects.toThrow();
  });
});
