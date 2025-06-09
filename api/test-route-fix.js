/**
 * Test the specific route that's failing
 */

import request from 'supertest';
import express from 'express';
import databaseManager from './utils/database.js';
import taskRoutes from './routes/tasks.js';
import { errorHandler } from './middleware/errorHandler.js';
import path from 'path';

async function testRoute() {
  try {
    console.log('🔧 Testing route fix...');
    
    // Initialize database
    const projectRoot = path.dirname(process.cwd());
    await databaseManager.initialize(projectRoot);
    console.log('✅ Database initialized');
    
    // Create Express app with route
    const app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRoutes);
    app.use(errorHandler);
    
    console.log('📡 Testing GET /api/tasks...');
    
    // Test the failing endpoint
    const response = await request(app)
      .get('/api/tasks?page=1&limit=50')
      .expect(200);
    
    console.log('✅ Route test successful!');
    console.log('Response data:', {
      success: response.body.success,
      taskCount: response.body.data ? response.body.data.length : 0,
      message: response.body.message
    });
    
    if (response.body.meta && response.body.meta.pagination) {
      console.log('Pagination:', response.body.meta.pagination);
    }
    
  } catch (error) {
    console.error('❌ Route test failed:', error.message);
    if (error.response && error.response.body) {
      console.error('Response body:', error.response.body);
    }
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testRoute();