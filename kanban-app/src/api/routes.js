// ============================================================================
// LEGACY API ROUTES - DISABLED
// ============================================================================
// This file contains legacy API routes that used MCP function calls.
// It has been disabled as part of Phase 3 API migration.
// The kanban app now uses the unified API server at /api/* endpoints.
//
// DO NOT USE THIS FILE - Use the unified API server instead:
// - Location: /api/routes/
// - Endpoints: /api/tasks, /api/prds, /api/analytics
// ============================================================================

console.error('❌ LEGACY API ROUTES DISABLED');
console.error('These legacy routes with MCP calls have been disabled.');
console.error('Please use the unified API endpoints instead:');
console.error('  GET /api/tasks - List tasks');
console.error('  POST /api/tasks - Create task');
console.error('  PUT /api/tasks/:id - Update task');
console.error('  GET /api/prds - List PRDs');
console.error('  GET /api/analytics/dashboard - Project info');

// Disabled - return empty router
import express from 'express';
const router = express.Router();

// All routes disabled - return 410 Gone
router.use('*', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'LEGACY_API_DISABLED',
    message: 'This legacy API with MCP calls has been disabled. Please use the unified API server instead.',
    unifiedApiEndpoints: {
      tasks: '/api/tasks',
      prds: '/api/prds',
      analytics: '/api/analytics'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;

// Legacy imports (disabled)
/*
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import process from 'process';
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
import {
  readPrdsMetadata,
  findPrdById,
  getAllPrds,
  getPRDsJsonPath,
  getPRDStatusDirectory
} from '../../../scripts/modules/prd-manager/prd-utils.js';
import { updatePrd, updatePrdStatus, createPrdFromFile } from '../../../scripts/modules/prd-manager/prd-write-operations.js';
import { updatePrdTaskStatistics } from '../../../scripts/modules/prd-manager/prd-integrity.js';
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
*/

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
 * Add a new task with enhanced validation and subtask support
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
    testStrategy,
    subtasks = [] // Extract subtasks from request
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

  try {
    let taskResult;

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

      // Create the main task first
      taskResult = await addTaskDirect(
        {
          tasksJsonPath,
          title,
          description,
          priority,
          dependencies,
          projectRoot,
          details: details || description,
          testStrategy: testStrategy || ''
        },
        logger
      );
    } else {
      // Legacy prompt-based creation
      taskResult = await addTaskDirect(
        {
          tasksJsonPath,
          prompt,
          dependencies,
          priority,
          research,
          manualTaskData,
          projectRoot
        },
        logger
      );
    }

    // Check if main task creation was successful
    if (!taskResult.success) {
      return res.status(400).json({
        success: false,
        error: taskResult.error.code || 'TASK_CREATION_FAILED',
        message: taskResult.error.message,
        timestamp: new Date().toISOString()
      });
    }

    const newTaskId = taskResult.data.taskId;
    const createdSubtasks = [];

    // Create subtasks if provided
    if (subtasks && subtasks.length > 0) {
      logger.info(`Creating ${subtasks.length} subtasks for task ${newTaskId}`);

      for (const subtask of subtasks) {
        try {
          // Convert TaskMaster subtask format to addSubtaskDirect format
          const subtaskResult = await addSubtaskDirect(
            {
              tasksJsonPath,
              id: newTaskId.toString(),
              title: subtask.title,
              description: subtask.description || subtask.title, // Use description or fallback to title
              details: subtask.details || '',
              status: subtask.status || 'pending',
              dependencies: Array.isArray(subtask.dependencies) ? subtask.dependencies.join(',') : '', // Convert array to comma-separated string
              skipGenerate: true // Skip file generation for individual subtasks
            },
            logger
          );

          if (subtaskResult.success) {
            createdSubtasks.push(subtaskResult.data.subtask);
            logger.info(`Created subtask ${subtaskResult.data.message}`);
          } else {
            logger.warn(`Failed to create subtask "${subtask.title}": ${subtaskResult.error.message}`);
          }
        } catch (error) {
          logger.error(`Error creating subtask "${subtask.title}": ${error.message}`);
        }
      }
    }

    // Return success response with task and subtask information
    res.json({
      success: true,
      data: {
        taskId: newTaskId,
        message: `Successfully created task #${newTaskId}${createdSubtasks.length > 0 ? ` with ${createdSubtasks.length} subtasks` : ''}`,
        subtasksCreated: createdSubtasks.length,
        telemetryData: taskResult.data.telemetryData
      },
      metadata: {
        function: 'addTaskDirect',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error in task creation: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
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
    testStrategy,
    subtasks
  } = req.body;

  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  // Support both legacy prompt-based updates and new structured data updates
  if (!prompt && !title && !description && !priority && !status && !dependencies && !tags && !estimatedHours && !assignee && !dueDate && !details && !testStrategy && !subtasks) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Either prompt or at least one field to update is required',
      timestamp: new Date().toISOString()
    });
  }

  // If structured data is provided, use direct update
  if (title || description || priority || status || dependencies || tags || estimatedHours || assignee || dueDate || details || testStrategy || subtasks) {
    try {
      // Read current tasks
      const tasksData = JSON.parse(await fs.readFile(tasksJsonPath, 'utf8'));
      const taskIndex = tasksData.tasks.findIndex(t => t.id.toString() === id.toString());

      if (taskIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
          message: `Task with ID ${id} does not exist`,
          timestamp: new Date().toISOString()
        });
      }

      // Update task fields directly
      const task = tasksData.tasks[taskIndex];
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (status !== undefined) task.status = status;
      if (dependencies !== undefined) task.dependencies = dependencies;
      if (tags !== undefined) task.tags = tags;
      if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
      if (assignee !== undefined) task.assignee = assignee;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (details !== undefined) task.details = details;
      if (testStrategy !== undefined) task.testStrategy = testStrategy;
      if (subtasks !== undefined) task.subtasks = subtasks;

      // Update timestamp
      task.updatedAt = new Date().toISOString();

      // Write back to file
      await fs.writeFile(tasksJsonPath, JSON.stringify(tasksData, null, 2));

      logger.info(`Direct task update completed for task ${id}`);

      res.json({
        success: true,
        data: task,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Direct task update failed:', error.message);
      res.status(500).json({
        success: false,
        error: 'Direct update failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
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
 * PATCH /api/v1/tasks/:parentId/subtasks/:subtaskId/status
 * Update subtask status directly
 */
router.patch('/tasks/:parentId/subtasks/:subtaskId/status', requireTaskMasterCore, async (req, res) => {
  const { parentId, subtaskId } = req.params;
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

  try {
    // Read current tasks data
    const tasksData = JSON.parse(await fs.readFile(tasksJsonPath, 'utf8'));
    const taskIndex = tasksData.tasks.findIndex(t => t.id.toString() === parentId.toString());

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Task with ID ${parentId} does not exist`,
        timestamp: new Date().toISOString()
      });
    }

    const task = tasksData.tasks[taskIndex];
    if (!task.subtasks || !Array.isArray(task.subtasks)) {
      return res.status(404).json({
        success: false,
        error: 'No subtasks found',
        message: `Task ${parentId} has no subtasks`,
        timestamp: new Date().toISOString()
      });
    }

    // Find the subtask
    const subtaskIndex = task.subtasks.findIndex(st => st.id.toString() === subtaskId.toString());
    if (subtaskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Subtask not found',
        message: `Subtask ${subtaskId} not found in task ${parentId}`,
        timestamp: new Date().toISOString()
      });
    }

    const subtask = task.subtasks[subtaskIndex];

    // Update subtask status - handle both formats
    if ('status' in subtask) {
      // TaskMaster format - update status directly
      subtask.status = status;
    } else if ('completed' in subtask) {
      // Simplified format - convert status to completed boolean
      subtask.completed = (status === 'done' || status === 'completed');
    } else {
      // Add status field if neither exists
      subtask.status = status;
    }

    // Update task timestamp
    task.updatedAt = new Date().toISOString();

    // Write back to file
    await fs.writeFile(tasksJsonPath, JSON.stringify(tasksData, null, 2));

    logger.info(`Updated subtask ${parentId}.${subtaskId} status to: ${status}`);

    res.json({
      success: true,
      data: task,
      message: `Subtask ${subtaskId} status updated to ${status}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update subtask status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update subtask status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

  // Ensure reports directory exists
  const reportsDir = path.join(projectRoot, '.taskmaster', 'reports');
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }

  // Generate output path for the complexity report
  const outputPath = path.join(reportsDir, `task-${id}-complexity-${Date.now()}.json`);

  await handleDirectFunction(
    analyzeTaskComplexityDirect,
    { tasksJsonPath, id, projectRoot, outputPath, ids: id },
    res,
    'analyzeTaskComplexityDirect'
  );
});

/**
 * GET /api/v1/tasks/:id/complexity-report
 * Get the latest complexity analysis report for a task
 */
router.get('/tasks/:id/complexity-report', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
  const projectRoot = req.app.locals.projectRoot;
  const reportsDir = path.join(projectRoot, '.taskmaster', 'reports');

  try {
    // Find the latest complexity report for this task
    const files = await fs.readdir(reportsDir);
    const taskReports = files
      .filter(file => file.startsWith(`task-${id}-complexity-`) && file.endsWith('.json'))
      .sort((a, b) => {
        // Extract timestamp from filename and sort by newest first
        const timestampA = parseInt(a.match(/complexity-(\d+)\.json$/)?.[1] || '0');
        const timestampB = parseInt(b.match(/complexity-(\d+)\.json$/)?.[1] || '0');
        return timestampB - timestampA;
      });

    if (taskReports.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No complexity report found',
        message: `No complexity analysis report found for task ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    // Read the latest report
    const latestReport = taskReports[0];
    const reportPath = path.join(reportsDir, latestReport);
    const reportContent = await fs.readFile(reportPath, 'utf8');
    const reportData = JSON.parse(reportContent);

    // Extract the analysis for this specific task
    const taskAnalysis = reportData.complexityAnalysis?.find(analysis => analysis.taskId.toString() === id.toString());

    if (!taskAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Task analysis not found',
        message: `Task ${id} not found in complexity report`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        taskId: taskAnalysis.taskId,
        taskTitle: taskAnalysis.taskTitle,
        complexityScore: taskAnalysis.complexityScore,
        recommendedSubtasks: taskAnalysis.recommendedSubtasks,
        expansionPrompt: taskAnalysis.expansionPrompt,
        reasoning: taskAnalysis.reasoning,
        reportFile: latestReport,
        generatedAt: reportData.meta?.generatedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to read complexity report:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to read complexity report',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// PRD MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/prds
 * List all PRDs with optional filtering
 */
router.get('/prds', async (req, res) => {
  try {
    const { status, priority, complexity } = req.query;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (complexity) filters.complexity = complexity;

    logger.info(`Using PRDs path: ${prdsPath}`);
    logger.info(`PRDs path exists: ${fsSync.existsSync(prdsPath)}`);
    if (fsSync.existsSync(prdsPath)) {
      const fileContent = fsSync.readFileSync(prdsPath, 'utf-8');
      logger.info(`PRDs file content length: ${fileContent.length}`);
      logger.info(`PRDs file first 200 chars: ${fileContent.substring(0, 200)}`);
    }

    const prds = getAllPrds(filters, prdsPath);
    logger.info(`Retrieved ${prds.length} PRDs from getAllPrds`);
    if (prds.length > 0) {
      logger.info('Sample PRD structure:', JSON.stringify(prds[0], null, 2));
    }

    // Transform PRD data to match frontend interface
    const transformedPrds = prds.map(prd => ({
      id: prd.id,
      title: prd.title || 'Untitled PRD',
      status: prd.status || 'pending',
      uploadDate: prd.createdDate || prd.lastModified || new Date().toISOString(),
      analysisStatus: prd.analysisStatus || 'not-analyzed',
      tasksStatus: prd.tasksStatus || 'no-tasks',
      priority: prd.priority || 'medium',
      complexity: prd.complexity || 'medium',
      filePath: prd.filePath,
      taskCount: prd.taskStats?.completedTasks || 0,
      totalTasks: prd.taskStats?.totalTasks || 0,
      fileSize: prd.fileSize,
      estimatedEffort: prd.estimatedEffort,
      tags: prd.tags || []
    }));

    res.json(transformedPrds);
  } catch (error) {
    logger.error('Failed to list PRDs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list PRDs',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/prds/:id
 * Get PRD details by ID
 */
router.get('/prds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prdsPath = getPRDsJsonPath();

    const prd = findPrdById(id, prdsPath);

    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Transform PRD data to match frontend interface (same as in /prds list endpoint)
    const transformedPrd = {
      id: prd.id,
      title: prd.title || 'Untitled PRD',
      status: prd.status || 'pending',
      uploadDate: prd.createdDate || prd.lastModified || new Date().toISOString(),
      analysisStatus: prd.analysisStatus || 'not-analyzed',
      tasksStatus: prd.tasksStatus || 'no-tasks',
      priority: prd.priority || 'medium',
      complexity: prd.complexity || 'medium',
      filePath: prd.filePath,
      taskCount: prd.taskStats?.completedTasks || 0,
      totalTasks: prd.taskStats?.totalTasks || 0,
      fileSize: prd.fileSize,
      estimatedEffort: prd.estimatedEffort,
      tags: prd.tags || []
    };

    res.json({
      success: true,
      data: transformedPrd,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/prds/:id/status
 * Update PRD status
 */
router.patch('/prds/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'status is required',
        timestamp: new Date().toISOString()
      });
    }

    const validStatuses = ['pending', 'in-progress', 'done', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const prdsPath = getPRDsJsonPath();
    const result = updatePrdStatus(id, status, prdsPath);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update PRD status',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        prdId: id,
        newStatus: status,
        message: `PRD ${id} status updated to ${status}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to update PRD ${req.params.id} status:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update PRD status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/prds/:id
 * Update PRD metadata
 */
router.put('/prds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Update data is required',
        timestamp: new Date().toISOString()
      });
    }

    const prdsPath = getPRDsJsonPath();
    const result = updatePrd(id, updateData, prdsPath);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update PRD',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        prdId: id,
        updatedFields: Object.keys(updateData),
        message: `PRD ${id} updated successfully`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to update PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/upload
 * Upload a new PRD file
 */
router.post('/prds/upload', async (req, res) => {
  try {
    const { fileName, fileContent, fileType } = req.body;

    // Validate required fields
    if (!fileName || !fileContent || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'fileName, fileContent, and fileType are required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate file type - be more flexible with MIME types
    const allowedExtensions = ['.md', '.txt'];
    const fileExtension = path.extname(fileName).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: 'Only .md and .txt files are supported',
        timestamp: new Date().toISOString()
      });
    }

    // Validate MIME type if provided (be flexible as browsers may report different types)
    if (fileType && !fileType.startsWith('text/') && fileType !== 'application/octet-stream' && fileType !== '') {
      logger.warn(`Unexpected MIME type for ${fileName}: ${fileType}`);
      // Don't reject, just log for debugging
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const fileSize = Buffer.byteLength(fileContent, 'base64');

    if (fileSize > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size must be less than 10MB',
        timestamp: new Date().toISOString()
      });
    }

    // Decode base64 content
    let decodedContent;
    try {
      decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_CONTENT',
        message: 'Invalid base64 file content',
        timestamp: new Date().toISOString()
      });
    }

    // Get PRD directory path - use the correct project root
    const projectRoot = path.resolve(process.cwd(), '..');
    const prdDirectory = getPRDStatusDirectory('pending', projectRoot);

    // Ensure PRD directory exists
    if (!fsSync.existsSync(prdDirectory)) {
      fsSync.mkdirSync(prdDirectory, { recursive: true });
    }

    // Create unique filename if file already exists
    let finalFileName = fileName;
    let counter = 1;
    const baseName = path.basename(fileName, path.extname(fileName));
    const extension = path.extname(fileName);

    while (fsSync.existsSync(path.join(prdDirectory, finalFileName))) {
      finalFileName = `${baseName}_${counter}${extension}`;
      counter++;
    }

    // Write file to PRD directory
    const filePath = path.join(prdDirectory, finalFileName);
    fsSync.writeFileSync(filePath, decodedContent, 'utf-8');

    // Register PRD in the tracking system
    const prdData = {
      title: baseName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `PRD uploaded via web interface on ${new Date().toLocaleDateString()}`,
      priority: 'medium',
      complexity: 'medium',
      tags: ['web-upload', 'pending-review'],
      estimatedEffort: '2-4 hours'
    };

    // Use the correct project root for PRD registration
    const prdsJsonPath = path.join(projectRoot, '.taskmaster', 'prd', 'prds.json');
    const registrationResult = createPrdFromFile(filePath, prdData, prdsJsonPath);

    if (!registrationResult.success) {
      // If registration fails, clean up the file
      try {
        fsSync.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup file after registration failure: ${cleanupError.message}`);
      }

      return res.status(500).json({
        success: false,
        error: 'PRD_REGISTRATION_FAILED',
        message: registrationResult.error || 'Failed to register PRD in tracking system',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Successfully uploaded and registered PRD: ${finalFileName}`);

    res.json({
      success: true,
      data: {
        prdId: registrationResult.data?.prdId,
        fileName: finalFileName,
        filePath: filePath,
        fileSize: fileSize,
        message: `PRD "${finalFileName}" uploaded and registered successfully`
      },
      metadata: {
        function: 'uploadPrd',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to upload PRD:`, error.message);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/:id/analyze
 * Analyze PRD complexity and generate insights
 */
router.post('/prds/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Update PRD status to indicate analysis is in progress
    const updateResult = updatePrd(id, { analysisStatus: 'analyzing' }, prdsPath);
    if (!updateResult.success) {
      logger.warn(`Failed to update PRD ${id} analysis status:`, updateResult.error);
    }

    // Respond immediately that analysis has started
    res.json({
      success: true,
      data: {
        prdId: id,
        status: 'analyzing',
        message: `Analysis started for PRD ${id}`
      },
      timestamp: new Date().toISOString()
    });

    // Run analysis in background
    setTimeout(async () => {
      try {
        // Read PRD file content for analysis
        const prdDir = path.dirname(prdsPath);
        const prdFilePath = path.join(prdDir, prd.fileName);

        if (!fsSync.existsSync(prdFilePath)) {
          throw new Error(`PRD file ${prd.fileName} not found`);
        }

        const prdContent = fsSync.readFileSync(prdFilePath, 'utf-8');

        // Analyze PRD content
        const wordCount = prdContent.split(/\s+/).length;
        const lineCount = prdContent.split('\n').length;
        const hasCodeBlocks = prdContent.includes('```');
        const hasTables = prdContent.includes('|');
        const hasImages = prdContent.includes('![');

        // Determine complexity based on content analysis
        let complexity = 'low';
        let estimatedEffort = '1-2 days';

        if (wordCount > 2000 || hasCodeBlocks || hasTables) {
          complexity = 'medium';
          estimatedEffort = '3-5 days';
        }

        if (wordCount > 5000 || (hasCodeBlocks && hasTables && hasImages)) {
          complexity = 'high';
          estimatedEffort = '1-2 weeks';
        }

        // Extract key components from content
        const keyComponents = [];
        if (prdContent.toLowerCase().includes('ui') || prdContent.toLowerCase().includes('interface')) {
          keyComponents.push('UI Components');
        }
        if (prdContent.toLowerCase().includes('api') || prdContent.toLowerCase().includes('endpoint')) {
          keyComponents.push('API Endpoints');
        }
        if (prdContent.toLowerCase().includes('database') || prdContent.toLowerCase().includes('data')) {
          keyComponents.push('Data Models');
        }
        if (prdContent.toLowerCase().includes('auth') || prdContent.toLowerCase().includes('login')) {
          keyComponents.push('Authentication');
        }

        // Update PRD with analysis results
        const analysisResult = {
          complexity,
          estimatedEffort,
          keyComponents: keyComponents.length > 0 ? keyComponents : ['General Implementation'],
          dependencies: ['System Integration'],
          analysisStatus: 'analyzed',
          lastModified: new Date().toISOString()
        };

        updatePrd(id, analysisResult, prdsPath);

        // Update task statistics if there are linked tasks
        try {
          const tasksPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
          if (fsSync.existsSync(tasksPath)) {
            const statsResult = updatePrdTaskStatistics(id, tasksPath, prdsPath);
            if (statsResult.success) {
              logger.info(`Updated task statistics for PRD ${id}: ${statsResult.data.completionPercentage}% complete`);
            }
          }
        } catch (statsError) {
          logger.warn(`Error updating task statistics for PRD ${id}:`, statsError.message);
        }

        logger.info(`Completed analysis for PRD ${id}: ${complexity} complexity, ${estimatedEffort} effort`);
      } catch (error) {
        logger.error(`Failed to complete analysis for PRD ${id}:`, error.message);
        // Update status to indicate failure
        updatePrd(id, {
          analysisStatus: 'not-analyzed',
          lastModified: new Date().toISOString()
        }, prdsPath);
      }
    }, 2000);

  } catch (error) {
    logger.error(`Failed to analyze PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/:id/generate-tasks
 * Generate tasks from PRD content
 */
router.post('/prds/:id/generate-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'append', expandSubtasks = true } = req.body;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Update PRD status to indicate task generation is in progress
    const updateResult = updatePrd(id, { tasksStatus: 'generating' }, prdsPath);
    if (!updateResult.success) {
      logger.warn(`Failed to update PRD ${id} task status:`, updateResult.error);
    }

    // Respond immediately that task generation has started
    res.json({
      success: true,
      data: {
        prdId: id,
        mode,
        expandSubtasks,
        status: 'generating',
        message: `Task generation started for PRD ${id}`
      },
      timestamp: new Date().toISOString()
    });

    // Run task generation in background
    setTimeout(async () => {
      try {
        // Read PRD file content
        const prdDir = path.dirname(prdsPath);
        const prdFilePath = path.join(prdDir, prd.fileName);

        if (!fsSync.existsSync(prdFilePath)) {
          throw new Error(`PRD file ${prd.fileName} not found`);
        }

        const prdContent = fsSync.readFileSync(prdFilePath, 'utf-8');

        // Generate tasks based on PRD content
        const tasks = generateTasksFromPRD(prdContent, prd.id, prd.title);

        // Read existing tasks
        const tasksPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
        let existingTasks = { tasks: [] };

        if (fsSync.existsSync(tasksPath)) {
          try {
            existingTasks = JSON.parse(fsSync.readFileSync(tasksPath, 'utf-8'));
          } catch (error) {
            logger.warn(`Failed to read existing tasks: ${error.message}`);
          }
        }

        // Add new tasks (append mode)
        if (mode === 'append') {
          existingTasks.tasks = existingTasks.tasks || [];
          existingTasks.tasks.push(...tasks);
        } else {
          // Replace mode - filter out existing tasks from this PRD and add new ones
          existingTasks.tasks = existingTasks.tasks.filter(task =>
            !task.prdSource || task.prdSource !== prd.id
          );
          existingTasks.tasks.push(...tasks);
        }

        // Ensure tasks directory exists
        const tasksDir = path.dirname(tasksPath);
        if (!fsSync.existsSync(tasksDir)) {
          fsSync.mkdirSync(tasksDir, { recursive: true });
        }

        // Write tasks back to file
        fsSync.writeFileSync(tasksPath, JSON.stringify(existingTasks, null, 2));

        // Update PRD with task generation results
        const taskGenerationResult = {
          tasksStatus: 'generated',
          taskCount: tasks.length,
          totalTasks: tasks.length,
          linkedTaskIds: tasks.map(task => task.id),
          lastModified: new Date().toISOString()
        };

        updatePrd(id, taskGenerationResult, prdsPath);

        // Update task statistics for the PRD
        try {
          const statsResult = updatePrdTaskStatistics(id, tasksPath, prdsPath);
          if (statsResult.success) {
            logger.info(`Updated task statistics for PRD ${id}: ${statsResult.data.completionPercentage}% complete`);
          } else {
            logger.warn(`Failed to update task statistics for PRD ${id}:`, statsResult.error);
          }
        } catch (statsError) {
          logger.warn(`Error updating task statistics for PRD ${id}:`, statsError.message);
        }

        logger.info(`Completed task generation for PRD ${id}: Generated ${tasks.length} tasks`);
      } catch (error) {
        logger.error(`Failed to complete task generation for PRD ${id}:`, error.message);
        // Update status to indicate failure
        updatePrd(id, {
          tasksStatus: 'no-tasks',
          lastModified: new Date().toISOString()
        }, prdsPath);
      }
    }, 2000);

  } catch (error) {
    logger.error(`Failed to generate tasks for PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tasks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/prds/:id/download
 * Download PRD file
 */
router.get('/prds/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const prdsPath = getPRDsJsonPath();

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Construct file path from PRD directory and fileName
    const prdDir = path.dirname(prdsPath);
    const filePath = path.join(prdDir, prd.fileName);

    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PRD file not found',
        message: `PRD file ${prd.fileName} not found on disk`,
        timestamp: new Date().toISOString()
      });
    }

    const fileContent = fsSync.readFileSync(filePath, 'utf-8');
    const fileName = prd.fileName;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileContent);

  } catch (error) {
    logger.error(`Failed to download PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to download PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/prds/:id
 * Delete PRD (only if no tasks generated and not analyzed)
 */
router.delete('/prds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if PRD can be deleted (no tasks generated and not analyzed)
    if (prd.tasksStatus === 'generated' || prd.analysisStatus === 'analyzed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete PRD',
        message: 'Cannot delete PRD that has been analyzed or has generated tasks',
        timestamp: new Date().toISOString()
      });
    }

    // Read current PRDs
    const prdsData = JSON.parse(fsSync.readFileSync(prdsPath, 'utf-8'));

    // Remove PRD from array
    prdsData.prds = prdsData.prds.filter(p => p.id !== id);

    // Write back to file
    fsSync.writeFileSync(prdsPath, JSON.stringify(prdsData, null, 2));

    // Also delete the PRD file if it exists
    const prdFilePath = path.join(path.dirname(prdsPath), prd.fileName);
    if (fsSync.existsSync(prdFilePath)) {
      fsSync.unlinkSync(prdFilePath);
    }

    logger.info(`PRD ${id} deleted successfully`);
    res.json({
      success: true,
      message: 'PRD deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to delete PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/:id/archive
 * Archive PRD (move to archived status)
 */
router.post('/prds/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Import the proper archive function
    const { archivePrd } = await import('../../../scripts/modules/prd-manager/prd-archiving.js');

    // Call the proper archive function
    const archiveResult = await archivePrd(id, {
      prdsPath: prdsPath,
      force: force
    });

    if (archiveResult.success) {
      logger.info(`PRD ${id} archived successfully`);
      res.json({
        success: true,
        message: 'PRD archived successfully',
        data: archiveResult.data,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.warn(`Failed to archive PRD ${id}: ${archiveResult.error}`);
      res.status(400).json({
        success: false,
        error: 'Archive failed',
        message: archiveResult.error,
        data: archiveResult.data,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error(`Failed to archive PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to archive PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to generate tasks from PRD content
function generateTasksFromPRD(prdContent, prdId, prdTitle) {
  const tasks = [];
  
  // Read existing tasks to determine next sequential ID
  const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
  const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
  
  logger.info(`generateTasksFromPRD: projectRoot=${projectRoot}, tasksJsonPath=${tasksJsonPath}`);
  
  let nextId = 1;
  try {
    logger.info(`Checking if tasks file exists: ${tasksJsonPath}`);
    if (fsSync.existsSync(tasksJsonPath)) {
      logger.info('Tasks file exists, reading...');
      const tasksData = JSON.parse(fsSync.readFileSync(tasksJsonPath, 'utf8'));
      if (tasksData.tasks && Array.isArray(tasksData.tasks) && tasksData.tasks.length > 0) {
        logger.info(`Found ${tasksData.tasks.length} existing tasks`);
        // Find the highest existing ID (handle both string and number IDs)
        const existingIds = tasksData.tasks.map(task => {
          const id = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
          return isNaN(id) ? 0 : id;
        });
        const highestId = Math.max(...existingIds);
        nextId = highestId + 1;
        logger.info(`Highest existing ID: ${highestId}, next ID will be: ${nextId}`);
      } else {
        logger.info('No tasks found in file, starting with ID 1');
      }
    } else {
      logger.warn(`Tasks file does not exist: ${tasksJsonPath}`);
    }
  } catch (error) {
    logger.warn('Failed to read existing tasks for ID generation, using default starting ID:', error.message);
  }

  // Generate tasks based on common PRD patterns
  const taskTemplates = [
    {
      title: `Setup and Planning for ${prdTitle}`,
      description: `Initial setup and planning phase for implementing ${prdTitle}. Review requirements, create technical specifications, and establish development timeline.`,
      priority: 'high',
      status: 'pending'
    },
    {
      title: `Design and Architecture for ${prdTitle}`,
      description: `Design system architecture and create technical design documents for ${prdTitle}. Define data models, API specifications, and component structure.`,
      priority: 'high',
      status: 'pending'
    }
  ];

  // Insert API and Database tasks in logical order (after design, before core implementation)
  if (prdContent.toLowerCase().includes('database') || prdContent.toLowerCase().includes('data')) {
    taskTemplates.push({
      title: `Database Implementation for ${prdTitle}`,
      description: `Design and implement database schema and data access layer for ${prdTitle}. Include migrations and data validation.`,
      priority: 'high',
      status: 'pending'
    });
  }

  if (prdContent.toLowerCase().includes('api') || prdContent.toLowerCase().includes('endpoint')) {
    taskTemplates.push({
      title: `API Development for ${prdTitle}`,
      description: `Develop and implement API endpoints as specified in ${prdTitle}. Include proper error handling, validation, and documentation.`,
      priority: 'high',
      status: 'pending'
    });
  }

  // Continue with core implementation tasks
  taskTemplates.push(
    {
      title: `Core Implementation of ${prdTitle}`,
      description: `Implement the core functionality as specified in ${prdTitle}. This includes main features and business logic implementation.`,
      priority: 'medium',
      status: 'pending'
    },
    {
      title: `User Interface Development for ${prdTitle}`,
      description: `Develop user interface components and screens as specified in ${prdTitle}. Ensure responsive design and accessibility compliance.`,
      priority: 'medium',
      status: 'pending'
    },
    {
      title: `Testing and Quality Assurance for ${prdTitle}`,
      description: `Comprehensive testing of all features implemented for ${prdTitle}. Include unit tests, integration tests, and user acceptance testing.`,
      priority: 'medium',
      status: 'pending'
    },
    {
      title: `Documentation and Deployment for ${prdTitle}`,
      description: `Create user documentation, deployment guides, and finalize the implementation of ${prdTitle}. Prepare for production deployment.`,
      priority: 'low',
      status: 'pending'
    }
  );

  // Get PRD details for proper format (removed hybrid approach as requested)
  // Note: Using simple string format as per CLI behavior

  // Create task objects with sequential IDs (same as CLI behavior)
  taskTemplates.forEach((template, index) => {
    const taskId = nextId + index;
    tasks.push({
      id: taskId,
      title: template.title,
      description: template.description,
      status: template.status,
      priority: template.priority,
      dependencies: index > 0 ? [taskId - 1] : [],
      subtasks: [],
      prdSource: prdId, // Simple string format like CLI
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });
  });

  return tasks;
}

// ============================================================================
// PRD MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/prds
 * List all PRDs with enhanced status fields for web interface
 */
router.get('/prds', async (req, res) => {
  try {
    const { status, priority, complexity } = req.query;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    // Build filters object
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (complexity) filters.complexity = complexity;

    const prds = getAllPrds(filters, prdsPath);

    // Debug: Log the raw PRD data to see what we're working with
    logger.info('Raw PRD data before transformation:', JSON.stringify(prds[0], null, 2));

    // Transform PRDs to match web interface expectations
    const transformedPrds = prds.map(prd => {
      // Use existing analysisStatus if present, otherwise determine from data
      let analysisStatus = prd.analysisStatus || 'not-analyzed';
      if (!prd.analysisStatus) {
        if (prd.status === 'done' || prd.status === 'in-progress') {
          analysisStatus = 'analyzed';
        } else if (prd.status === 'analyzing') {
          analysisStatus = 'analyzing';
        }
      }

      // Use existing tasksStatus if present, otherwise determine from linked tasks
      let tasksStatus = prd.tasksStatus || 'no-tasks';
      if (!prd.tasksStatus) {
        if (prd.linkedTaskIds && Array.isArray(prd.linkedTaskIds) && prd.linkedTaskIds.length > 0) {
          tasksStatus = 'generated';
        } else if (prd.taskStats && prd.taskStats.totalTasks && prd.taskStats.totalTasks > 0) {
          tasksStatus = 'generated';
        } else if (prd.totalTasks && prd.totalTasks > 0) {
          tasksStatus = 'generated';
        } else if (prd.status === 'generating-tasks') {
          tasksStatus = 'generating';
        }
      }

      // Debug logging for this specific PRD (commented out for production)
      // logger.info(`PRD ${prd.id} transformation:`, {
      //   hasLinkedTaskIds: !!(prd.linkedTaskIds && prd.linkedTaskIds.length > 0),
      //   linkedTaskIdsLength: prd.linkedTaskIds ? prd.linkedTaskIds.length : 0,
      //   hasTotalTasks: !!(prd.totalTasks && prd.totalTasks > 0),
      //   totalTasks: prd.totalTasks,
      //   hasTaskStats: !!(prd.taskStats && prd.taskStats.totalTasks > 0),
      //   taskStatsTotal: prd.taskStats ? prd.taskStats.totalTasks : 0,
      //   finalTasksStatus: tasksStatus
      // });

      return {
        id: prd.id,
        title: prd.title,
        status: prd.status,
        uploadDate: prd.createdDate || prd.uploadDate || new Date().toISOString(),
        analysisStatus: analysisStatus,
        tasksStatus: tasksStatus,
        priority: prd.priority || 'medium',
        complexity: prd.complexity || 'medium',
        description: prd.description || '',
        tags: prd.tags || [],
        linkedTaskIds: prd.linkedTaskIds || [],
        taskStats: prd.taskStats || {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          deferredTasks: 0,
          cancelledTasks: 0,
          completionPercentage: 0
        },
        estimatedEffort: prd.estimatedEffort || 'Unknown',
        fileSize: prd.fileSize || 0,
        fileName: prd.fileName || '',
        filePath: prd.filePath || ''
      };
    });

    logger.info(`Retrieved ${transformedPrds.length} PRDs with filters:`, filters);
    // Return flat array for web interface compatibility
    res.json(transformedPrds);

  } catch (error) {
    logger.error('Failed to retrieve PRDs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve PRDs',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/prds/:id
 * Get specific PRD by ID
 */
router.get('/prds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Transform PRD to match web interface expectations
    const transformedPrd = {
      ...prd,
      analysisStatus: prd.analysisStatus || (prd.status === 'pending' ? 'not-analyzed' : 'analyzed'),
      tasksStatus: prd.tasksStatus || (
        (prd.linkedTaskIds && prd.linkedTaskIds.length > 0) || 
        (prd.linkedTasks && prd.linkedTasks.length > 0) || 
        (prd.taskStats && prd.taskStats.totalTasks > 0)
          ? 'generated' 
          : 'no-tasks'
      ),
      uploadDate: prd.createdDate
    };

    logger.info(`Retrieved PRD ${id}`);
    res.json({
      success: true,
      data: transformedPrd,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to retrieve PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds
 * Create a new PRD
 */
router.post('/prds', async (req, res) => {
  try {
    const { title, description, priority = 'medium', complexity = 'medium', tags = [], filePath } = req.body;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required',
        timestamp: new Date().toISOString()
      });
    }

    let result;
    if (filePath) {
      // Create PRD from existing file
      result = createPrdFromFile(filePath, {
        title,
        description,
        priority,
        complexity,
        tags
      });
    } else {
      // Create new PRD file
      const prdDir = path.join(projectRoot, '.taskmaster', 'prd');
      if (!fsSync.existsSync(prdDir)) {
        await fs.mkdir(prdDir, { recursive: true });
      }

      const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
      const newFilePath = path.join(prdDir, fileName);
      
      const prdContent = `# ${title}\n\n${description || 'No description provided.'}\n\n## Requirements\n\n- Add your requirements here\n\n## Acceptance Criteria\n\n- Add acceptance criteria here\n`;
      
      await fs.writeFile(newFilePath, prdContent, 'utf8');

      result = createPrdFromFile(newFilePath, {
        title,
        description,
        priority,
        complexity,
        tags
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Created new PRD: ${result.data.id}`);
    res.status(201).json({
      success: true,
      data: {
        ...result.data,
        analysisStatus: 'not-analyzed',
        tasksStatus: 'no-tasks',
        uploadDate: result.data.createdDate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create PRD:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/prds/:id
 * Update PRD
 */
router.put('/prds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const result = updatePrd(id, updateData, prdsPath);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Updated PRD ${id}`);
    res.json({
      success: true,
      data: {
        ...result.data,
        analysisStatus: result.data.analysisStatus || (result.data.status === 'pending' ? 'not-analyzed' : 'analyzed'),
        tasksStatus: result.data.tasksStatus || (
          (result.data.linkedTaskIds && result.data.linkedTaskIds.length > 0) || 
          (result.data.linkedTasks && result.data.linkedTasks.length > 0) || 
          (result.data.taskStats && result.data.taskStats.totalTasks > 0)
            ? 'generated' 
            : 'no-tasks'
        ),
        uploadDate: result.data.createdDate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to update PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/:id/analyze
 * Analyze PRD (set analysis status to analyzing/analyzed)
 */
router.post('/prds/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Update analysis status to analyzing first
    let result = updatePrd(id, { analysisStatus: 'analyzing' }, prdsPath);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    // Simulate analysis process (in real implementation, this would call AI analysis)
    setTimeout(async () => {
      try {
        updatePrd(id, { 
          analysisStatus: 'analyzed',
          lastModified: new Date().toISOString()
        }, prdsPath);
        logger.info(`PRD ${id} analysis completed`);
      } catch (error) {
        logger.error(`Failed to complete analysis for PRD ${id}:`, error.message);
      }
    }, 2000);

    logger.info(`Started analysis for PRD ${id}`);
    res.json({
      success: true,
      message: 'PRD analysis started',
      data: {
        ...result.data,
        analysisStatus: 'analyzing'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to analyze PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze PRD',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/prds/:id/generate-tasks
 * Generate tasks from PRD
 */
router.post('/prds/:id/generate-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const projectRoot = process.env.TASK_MASTER_PROJECT_ROOT || path.resolve(process.cwd(), '..');
    const prdsPath = getPRDsJsonPath(projectRoot);

    const prd = findPrdById(id, prdsPath);
    if (!prd) {
      return res.status(404).json({
        success: false,
        error: 'PRD not found',
        message: `PRD with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Update tasks status to generating first
    let result = updatePrd(id, { tasksStatus: 'generating' }, prdsPath);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    // Read PRD content for task generation
    let prdContent = '';
    try {
      prdContent = fsSync.readFileSync(prd.filePath, 'utf8');
    } catch (error) {
      logger.warn(`Could not read PRD file ${prd.filePath}, using title for task generation`);
      prdContent = prd.title;
    }

    // Generate tasks from PRD content
    const generatedTasks = generateTasksFromPRD(prdContent, id, prd.title);
    
    // Simulate task generation process (in real implementation, this would call AI task generation)
    setTimeout(async () => {
      try {
        const taskIds = generatedTasks.map(task => task.id);
        updatePrd(id, { 
          tasksStatus: 'generated',
          linkedTaskIds: taskIds,
          taskStats: {
            totalTasks: generatedTasks.length,
            completedTasks: 0,
            pendingTasks: generatedTasks.length,
            inProgressTasks: 0,
            blockedTasks: 0,
            deferredTasks: 0,
            cancelledTasks: 0,
            completionPercentage: 0
          },
          lastModified: new Date().toISOString()
        }, prdsPath);
        logger.info(`Generated ${generatedTasks.length} tasks for PRD ${id}`);
      } catch (error) {
        logger.error(`Failed to complete task generation for PRD ${id}:`, error.message);
      }
    }, 3000);

    logger.info(`Started task generation for PRD ${id}`);
    res.json({
      success: true,
      message: 'Task generation started',
      data: {
        ...result.data,
        tasksStatus: 'generating',
        estimatedTasks: generatedTasks.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to generate tasks for PRD ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tasks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
