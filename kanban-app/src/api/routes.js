/**
 * routes.js
 * REST API endpoints for all TaskMaster MCP direct functions
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
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

export default router;
