/**
 * Test single API endpoint to debug 500 error
 */

import express from 'express';
import databaseManager from './utils/database.js';
import TaskDAO from './dao/TaskDAO.js';
import path from 'path';

async function testEndpoint() {
  try {
    console.log('🔧 Testing single endpoint...');
    
    // Initialize database like the server does
    const projectRoot = path.dirname(process.cwd());
    console.log(`Project root: ${projectRoot}`);
    await databaseManager.initialize(projectRoot);
    console.log('✅ Database initialized');
    
    // Test TaskDAO directly
    console.log('📝 Testing TaskDAO.findAll() with pagination...');
    const taskDAO = TaskDAO;
    
    // Test with same parameters as the failing request
    const filters = {};
    const pagination = {
      page: 1,
      limit: 50,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };
    
    const result = await taskDAO.findAll(filters, pagination);
    console.log('✅ TaskDAO.findAll() successful:', {
      taskCount: result.tasks.length,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
    
    // Test individual task retrieval
    if (result.tasks.length > 0) {
      const firstTask = result.tasks[0];
      console.log('📋 First task sample:', {
        id: firstTask.id,
        title: firstTask.title,
        status: firstTask.status,
        priority: firstTask.priority
      });
      
      // Test getting dependencies
      const dependencies = await taskDAO.getDependencies(firstTask.id);
      console.log(`✅ Dependencies for task ${firstTask.id}:`, dependencies.length);
      
      // Test getting subtasks
      const subtasks = await taskDAO.findSubtasks(firstTask.id);
      console.log(`✅ Subtasks for task ${firstTask.id}:`, subtasks.length);
    }
    
    console.log('🎉 Endpoint test completed successfully');
    
  } catch (error) {
    console.error('❌ Endpoint test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testEndpoint();