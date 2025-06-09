/**
 * Debug script to test API components individually
 */

import databaseManager from './utils/database.js';
import TaskDAO from './dao/TaskDAO.js';
import projectDAO from './dao/ProjectDAO.js';
import path from 'path';

async function debugTest() {
  try {
    console.log('🔧 Starting debug test...');
    
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    // Use the parent directory (main project root) instead of current directory (api folder)
    const projectRoot = path.dirname(process.cwd());
    console.log(`Project root: ${projectRoot}`);
    await databaseManager.initialize(projectRoot);
    console.log('✅ Database connected');
    
    // Test 2: Project DAO
    console.log('2. Testing ProjectDAO...');
    const projects = await projectDAO.findAll();
    console.log(`✅ Found ${projects.length} projects`);
    
    // Test 3: Task DAO basic operations
    console.log('3. Testing TaskDAO...');
    const taskDAO = TaskDAO;
    
    try {
      const result = await taskDAO.findAll();
      console.log(`✅ TaskDAO.findAll() returned:`, result);
    } catch (error) {
      console.error('❌ TaskDAO.findAll() failed:', error.message);
      console.error('Stack:', error.stack);
    }
    
    // Test 4: Database schema validation
    console.log('4. Testing database schema...');
    const tableCheck = await databaseManager.getAllQuery('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('✅ Database tables:', tableCheck.map(t => t.name));
    
    console.log('🎉 Debug test completed');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugTest();