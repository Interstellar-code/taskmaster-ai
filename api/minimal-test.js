/**
 * Minimal test to reproduce the exact error
 */

import databaseManager from './utils/database.js';
import TaskDAO from './dao/TaskDAO.js';
import { createSuccessResponse } from './middleware/errorHandler.js';
import path from 'path';

async function minimalTest() {
  try {
    console.log('🔧 Minimal test starting...');
    
    // Simulate exact server initialization
    const projectRoot = path.dirname(process.cwd());
    await databaseManager.initialize(projectRoot);
    console.log('✅ Database initialized');
    
    // Simulate exact route handler logic
    console.log('📡 Simulating route handler...');
    
    const taskDAO = TaskDAO;
    
    // Exact same query object from the failing request
    const query = {
      page: '1',
      limit: '50',
      sortBy: 'created_at',
      sortOrder: 'desc'
    };
    
    console.log('Query object:', query);
    
    // Exact same filters object
    const filters = {
      status: query.status,
      priority: query.priority,
      prd_id: query.prd_id ? parseInt(query.prd_id) : undefined,
      parent_task_id: query.parent_task_id ? parseInt(query.parent_task_id) : undefined,
      search: query.search
    };
    
    console.log('Filters object:', filters);
    
    // Exact same pagination object
    const pagination = {
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    };
    
    console.log('Pagination object:', pagination);
    
    // Call TaskDAO.findAll
    console.log('🔍 Calling TaskDAO.findAll...');
    const result = await taskDAO.findAll(filters, pagination);
    console.log('✅ TaskDAO.findAll result:', {
      taskCount: result.tasks.length,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
    
    // Test createSuccessResponse
    console.log('📝 Testing createSuccessResponse...');
    const response = createSuccessResponse(result.tasks, 'Tasks retrieved successfully', {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
    
    console.log('✅ createSuccessResponse result:', {
      success: response.success,
      message: response.message,
      dataLength: response.data.length,
      hasMeta: !!response.meta,
      hasPagination: !!(response.meta && response.meta.pagination)
    });
    
    console.log('🎉 Minimal test completed successfully');
    
  } catch (error) {
    console.error('❌ Minimal test failed:', error.message);
    console.error('Error name:', error.name);
    console.error('Stack trace:', error.stack);
    
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
  } finally {
    process.exit(0);
  }
}

minimalTest();