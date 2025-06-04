/**
 * routes.js
 * REST API endpoints for all TaskMaster MCP direct functions
 */

import express from 'express';
import path from 'path';
import {
  addDependencyDirect,
  addSubtaskDirect,
  addTaskDirect,
  analyzeTaskComplexityDirect,
  clearSubtasksDirect,
  complexityReportDirect,
  expandAllTasksDirect,
  expandTaskDirect,
  fixDependenciesDirect,
  generateTaskFilesDirect,
  listTasksDirect,
  moveTaskDirect,
  nextTaskDirect,
  removeDependencyDirect,
  removeSubtaskDirect,
  removeTaskDirect,
  setTaskStatusDirect,
  showTaskDirect,
  updateSubtaskByIdDirect,
  updateTaskByIdDirect,
  updateTasksDirect,
  validateDependenciesDirect
} from '../../../mcp-server/src/core/task-master-core.js';
import { createLogger } from './logger.js';
import {
  validateCreateTask,
  validateUpdateTask,
  validateBulkOperation,
  validateCreateTaskData,
  validateUpdateTaskData,
  validateBulkOperationData,
  VALID_STATUSES,
  VALID_PRIORITIES
} from './validation.js';

const router = express.Router();
const logger = createLogger('MCP-API');

/**
 * Middleware to check if TaskMaster core is initialized
 */
function requireTaskMasterCore(req, res, next) {
  if (!req.app.locals.taskMasterInitialized) {
    return res.status(503).json({
      success: false,
      error: 'TaskMaster core not initialized',
      message: 'Core integration is not available',
      timestamp: new Date().toISOString()
    });
  }
  next();
}

/**
 * Helper function to handle direct function calls with enhanced error handling and logging
 */
async function handleDirectFunction(directFunction, args, res, functionName) {
  const startTime = Date.now();

  try {
    logger.info(`Executing ${functionName} with args:`, {
      ...args,
      tasksJsonPath: args.tasksJsonPath ? '[REDACTED]' : undefined
    });

    const result = await directFunction(args, logger);
    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info(`${functionName} completed successfully in ${duration}ms`);
      res.json({
        success: true,
        data: result.data,
        metadata: {
          function: functionName,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn(`${functionName} failed:`, result.error);
      res.status(400).json({
        success: false,
        error: result.error.code || 'OPERATION_FAILED',
        message: result.error.message,
        metadata: {
          function: functionName,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`${functionName} threw exception:`, {
      message: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      metadata: {
        function: functionName,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================================
// DEPENDENCY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/tasks/:id/dependencies
 * Add a dependency to a task
 */
router.post('/tasks/:id/dependencies', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { dependsOn } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  if (!dependsOn) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'dependsOn is required',
      timestamp: new Date().toISOString()
    });
  }

  await handleDirectFunction(
    addDependencyDirect,
    { tasksJsonPath, id, dependsOn },
    res,
    'addDependencyDirect'
  );
});

/**
 * DELETE /api/v1/tasks/:id/dependencies/:dependencyId
 * Remove a dependency from a task
 */
router.delete('/tasks/:id/dependencies/:dependencyId', requireTaskMasterCore, async (req, res) => {
  const { id, dependencyId } = req.params;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    removeDependencyDirect,
    { tasksJsonPath, id, dependsOn: dependencyId },
    res,
    'removeDependencyDirect'
  );
});

// ============================================================================
// TASK MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/tasks
 * Add a new task with enhanced validation
 */
router.post('/tasks', requireTaskMasterCore, async (req, res) => {
  const {
    prompt,
    dependencies = [],
    priority = 'medium',
    research = false,
    manualTaskData,
    // Enhanced TaskFormData fields
    title,
    description,
    status = 'pending',
    tags = [],
    estimatedHours,
    assignee,
    dueDate,
    details,
    testStrategy
  } = req.body;

  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  // Support both legacy prompt-based creation and new structured data creation
  if (!prompt && !manualTaskData && !title) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Either prompt, manualTaskData, or title is required',
      timestamp: new Date().toISOString()
    });
  }

  // If structured data is provided, validate it
  if (title || description) {
    const taskData = {
      title,
      description,
      priority,
      status,
      dependencies,
      tags,
      estimatedHours,
      assignee,
      dueDate,
      details,
      testStrategy
    };

    const validationErrors = validateCreateTaskData(taskData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid task data provided',
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Convert structured data to the format expected by addTaskDirect
    await handleDirectFunction(
      addTaskDirect,
      {
        tasksJsonPath,
        title,
        description,
        priority,
        dependencies,
        projectRoot,
        // Pass additional fields as manualTaskData for metadata
        manualTaskData: {
          status,
          details: details || description,
          testStrategy: testStrategy || '',
          metadata: {
            tags,
            estimatedHours,
            assignee,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
          }
        }
      },
      res,
      'addTaskDirect'
    );
  } else {
    // Legacy prompt-based creation
    await handleDirectFunction(
      addTaskDirect,
      {
        tasksJsonPath,
        prompt,
        dependencies,
        priority,
        research,
        manualTaskData,
        projectRoot
      },
      res,
      'addTaskDirect'
    );
  }
});

/**
 * GET /api/v1/tasks
 * List all tasks
 */
router.get('/tasks', requireTaskMasterCore, async (req, res) => {
  const { status, withSubtasks } = req.query;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    listTasksDirect,
    {
      tasksJsonPath,
      status,
      withSubtasks: withSubtasks === 'true'
    },
    res,
    'listTasksDirect'
  );
});

/**
 * GET /api/v1/tasks/next
 * Get the next available task
 */
router.get('/tasks/next', requireTaskMasterCore, async (req, res) => {
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    nextTaskDirect,
    { tasksJsonPath },
    res,
    'nextTaskDirect'
  );
});

/**
 * GET /api/v1/tasks/validate-dependencies
 * Validate task dependencies
 */
router.get('/tasks/validate-dependencies', requireTaskMasterCore, async (req, res) => {
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    validateDependenciesDirect,
    { tasksJsonPath },
    res,
    'validateDependenciesDirect'
  );
});

/**
 * POST /api/v1/tasks/fix-dependencies
 * Fix broken dependencies
 */
router.post('/tasks/fix-dependencies', requireTaskMasterCore, async (req, res) => {
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    fixDependenciesDirect,
    { tasksJsonPath },
    res,
    'fixDependenciesDirect'
  );
});

/**
 * POST /api/v1/tasks/generate-files
 * Generate task files from tasks.json
 */
router.post('/tasks/generate-files', requireTaskMasterCore, async (req, res) => {
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    generateTaskFilesDirect,
    { tasksJsonPath },
    res,
    'generateTaskFilesDirect'
  );
});

/**
 * POST /api/v1/tasks/expand-all
 * Expand all tasks that need expansion
 */
router.post('/tasks/expand-all', requireTaskMasterCore, async (req, res) => {
  const { prompt } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  await handleDirectFunction(
    expandAllTasksDirect,
    { tasksJsonPath, prompt, projectRoot },
    res,
    'expandAllTasksDirect'
  );
});

/**
 * PUT /api/v1/tasks/update-all
 * Update all tasks with AI assistance
 */
router.put('/tasks/update-all', requireTaskMasterCore, async (req, res) => {
  const { prompt } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'prompt is required',
      timestamp: new Date().toISOString()
    });
  }

  await handleDirectFunction(
    updateTasksDirect,
    { tasksJsonPath, prompt, projectRoot },
    res,
    'updateTasksDirect'
  );
});

/**
 * GET /api/v1/tasks/:id
 * Show task details
 */
router.get('/tasks/:id', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  await handleDirectFunction(
    showTaskDirect,
    {
      tasksJsonPath,
      id,
      status,
      projectRoot
    },
    res,
    'showTaskDirect'
  );
});

/**
 * PATCH /api/v1/tasks/:id/status
 * Update task status
 */
router.patch('/tasks/:id/status', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'status is required',
      timestamp: new Date().toISOString()
    });
  }

  await handleDirectFunction(
    setTaskStatusDirect,
    { tasksJsonPath, id, status },
    res,
    'setTaskStatusDirect'
  );
});

/**
 * PUT /api/v1/tasks/:id
 * Update task by ID with enhanced validation
 */
router.put('/tasks/:id', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const {
    prompt,
    // Enhanced TaskFormData fields for direct updates
    title,
    description,
    priority,
    status,
    dependencies,
    tags,
    estimatedHours,
    assignee,
    dueDate,
    details,
    testStrategy
  } = req.body;

  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  // Support both legacy prompt-based updates and new structured data updates
  if (!prompt && !title && !description && !priority && !status && !dependencies && !tags && !estimatedHours && !assignee && !dueDate && !details && !testStrategy) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Either prompt or at least one field to update is required',
      timestamp: new Date().toISOString()
    });
  }

  // If structured data is provided, validate it
  if (title || description || priority || status || dependencies || tags || estimatedHours || assignee || dueDate || details || testStrategy) {
    const updateData = {};

    // Only include fields that are actually provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dependencies !== undefined) updateData.dependencies = dependencies;
    if (tags !== undefined) updateData.tags = tags;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (details !== undefined) updateData.details = details;
    if (testStrategy !== undefined) updateData.testStrategy = testStrategy;

    const validationErrors = validateUpdateTaskData(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid task update data provided',
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // For structured updates, we need to implement a direct task update function
    // For now, we'll use the existing prompt-based approach with a generated prompt
    const updatePrompt = `Update task with the following changes: ${JSON.stringify(updateData)}`;

    await handleDirectFunction(
      updateTaskByIdDirect,
      { tasksJsonPath, id, prompt: updatePrompt, projectRoot },
      res,
      'updateTaskByIdDirect'
    );
  } else {
    // Legacy prompt-based update
    await handleDirectFunction(
      updateTaskByIdDirect,
      { tasksJsonPath, id, prompt, projectRoot },
      res,
      'updateTaskByIdDirect'
    );
  }
});

/**
 * DELETE /api/v1/tasks/:id
 * Remove a task
 */
router.delete('/tasks/:id', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    removeTaskDirect,
    { tasksJsonPath, id },
    res,
    'removeTaskDirect'
  );
});

/**
 * POST /api/v1/tasks/:id/move
 * Move a task to a new position
 */
router.post('/tasks/:id/move', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { after } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    moveTaskDirect,
    { tasksJsonPath, id, after },
    res,
    'moveTaskDirect'
  );
});

// ============================================================================
// BULK OPERATIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/tasks/bulk-operations
 * Perform bulk operations on multiple tasks
 */
router.post('/tasks/bulk-operations', requireTaskMasterCore, async (req, res) => {
  const { taskIds, operation, payload } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  // Validate bulk operation data
  const validationErrors = validateBulkOperationData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid bulk operation data provided',
      details: validationErrors,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const results = [];
    const errors = [];

    // Process each task ID
    for (const taskId of taskIds) {
      try {
        let result;

        switch (operation) {
          case 'delete':
            result = await removeTaskDirect({ tasksJsonPath, id: taskId }, logger);
            break;

          case 'updateStatus':
            result = await setTaskStatusDirect({
              tasksJsonPath,
              id: taskId,
              status: payload.status
            }, logger);
            break;

          case 'updatePriority':
            // For priority updates, we need to use the update function with a prompt
            const priorityPrompt = `Update task priority to ${payload.priority}`;
            result = await updateTaskByIdDirect({
              tasksJsonPath,
              id: taskId,
              prompt: priorityPrompt,
              projectRoot: req.app.locals.projectRoot
            }, logger);
            break;

          case 'addDependency':
            result = await addDependencyDirect({
              tasksJsonPath,
              id: taskId,
              dependsOn: payload.dependsOn
            }, logger);
            break;

          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }

        if (result.success) {
          results.push({ taskId, success: true, data: result.data });
        } else {
          errors.push({ taskId, error: result.error.message });
        }
      } catch (error) {
        errors.push({ taskId, error: error.message });
      }
    }

    // Return results
    const response = {
      success: errors.length === 0,
      data: {
        operation,
        totalTasks: taskIds.length,
        successfulTasks: results.length,
        failedTasks: errors.length,
        results,
        errors
      },
      timestamp: new Date().toISOString()
    };

    if (errors.length > 0 && results.length === 0) {
      // All operations failed
      res.status(400).json(response);
    } else if (errors.length > 0) {
      // Partial success
      res.status(207).json(response); // 207 Multi-Status
    } else {
      // All operations succeeded
      res.json(response);
    }
  } catch (error) {
    logger.error('Bulk operation failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Bulk operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// FILE UPLOAD ENDPOINTS (for task attachments)
// ============================================================================

/**
 * POST /api/v1/tasks/:id/attachments
 * Upload file attachments for a task
 * Note: This is a placeholder implementation. In a real application,
 * you would use multer or similar middleware for file uploads.
 */
router.post('/tasks/:id/attachments', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;

  try {
    // For now, return a placeholder response
    // In a real implementation, you would:
    // 1. Use multer middleware to handle file uploads
    // 2. Store files in a secure location (local storage, S3, etc.)
    // 3. Update the task with attachment metadata
    // 4. Implement file size and type validation

    logger.info(`File upload requested for task ${id}`);

    res.json({
      success: true,
      data: {
        message: 'File upload endpoint is ready for implementation',
        taskId: id,
        supportedFormats: ['pdf', 'doc', 'docx', 'txt', 'md', 'jpg', 'png', 'gif'],
        maxFileSize: '10MB',
        implementation: 'pending'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('File upload failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'File upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/tasks/:id/attachments
 * Get list of attachments for a task
 */
router.get('/tasks/:id/attachments', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;

  try {
    // Placeholder implementation
    // In a real implementation, you would query the database/storage
    // for attachments associated with this task

    res.json({
      success: true,
      data: {
        taskId: id,
        attachments: [],
        message: 'Attachment listing endpoint is ready for implementation'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to list attachments:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list attachments',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/tasks/:id/attachments/:attachmentId
 * Delete a specific attachment
 */
router.delete('/tasks/:id/attachments/:attachmentId', requireTaskMasterCore, async (req, res) => {
  const { id, attachmentId } = req.params;

  try {
    // Placeholder implementation
    res.json({
      success: true,
      data: {
        taskId: id,
        attachmentId,
        message: 'Attachment deletion endpoint is ready for implementation'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to delete attachment:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attachment',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// SUBTASK MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/tasks/:id/subtasks
 * Add a subtask to a task
 */
router.post('/tasks/:id/subtasks', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { prompt, dependencies = [], priority = 'medium', manualSubtaskData } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  if (!prompt && !manualSubtaskData) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Either prompt or manualSubtaskData is required',
      timestamp: new Date().toISOString()
    });
  }

  await handleDirectFunction(
    addSubtaskDirect,
    {
      tasksJsonPath,
      parentId: id,
      prompt,
      dependencies,
      priority,
      manualSubtaskData,
      projectRoot
    },
    res,
    'addSubtaskDirect'
  );
});

/**
 * PUT /api/v1/tasks/:parentId/subtasks/:subtaskId
 * Update subtask by ID
 */
router.put('/tasks/:parentId/subtasks/:subtaskId', requireTaskMasterCore, async (req, res) => {
  const { parentId, subtaskId } = req.params;
  const { prompt } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;
  const id = `${parentId}.${subtaskId}`;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'prompt is required',
      timestamp: new Date().toISOString()
    });
  }

  await handleDirectFunction(
    updateSubtaskByIdDirect,
    { tasksJsonPath, id, prompt, projectRoot },
    res,
    'updateSubtaskByIdDirect'
  );
});

/**
 * DELETE /api/v1/tasks/:parentId/subtasks/:subtaskId
 * Remove a subtask
 */
router.delete('/tasks/:parentId/subtasks/:subtaskId', requireTaskMasterCore, async (req, res) => {
  const { parentId, subtaskId } = req.params;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const id = `${parentId}.${subtaskId}`;

  await handleDirectFunction(
    removeSubtaskDirect,
    { tasksJsonPath, id },
    res,
    'removeSubtaskDirect'
  );
});

/**
 * DELETE /api/v1/tasks/:id/subtasks
 * Clear all subtasks from a task
 */
router.delete('/tasks/:id/subtasks', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    clearSubtasksDirect,
    { tasksJsonPath, id },
    res,
    'clearSubtasksDirect'
  );
});

/**
 * POST /api/v1/tasks/:id/expand
 * Expand task into subtasks
 */
router.post('/tasks/:id/expand', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const { prompt, num } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  await handleDirectFunction(
    expandTaskDirect,
    { tasksJsonPath, id, prompt, num, projectRoot },
    res,
    'expandTaskDirect'
  );
});

// ============================================================================
// ANALYSIS AND REPORTING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/reports/complexity
 * Generate complexity analysis report
 */
router.get('/reports/complexity', requireTaskMasterCore, async (req, res) => {
  const tasksJsonPath = req.app.locals.tasksJsonPath;

  await handleDirectFunction(
    complexityReportDirect,
    { tasksJsonPath },
    res,
    'complexityReportDirect'
  );
});

/**
 * POST /api/v1/tasks/:id/analyze-complexity
 * Analyze complexity of a specific task
 */
router.post('/tasks/:id/analyze-complexity', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  await handleDirectFunction(
    analyzeTaskComplexityDirect,
    { tasksJsonPath, id, projectRoot },
    res,
    'analyzeTaskComplexityDirect'
  );
});

export default router;
