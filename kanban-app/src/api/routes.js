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
 * Helper function to handle direct function calls with consistent error handling
 */
async function handleDirectFunction(directFunction, args, res, functionName) {
  try {
    const result = await directFunction(args, logger);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error.code,
        message: result.error.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error(`${functionName} failed:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
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
 * Add a new task
 */
router.post('/tasks', requireTaskMasterCore, async (req, res) => {
  const { prompt, dependencies = [], priority = 'medium', research = false, manualTaskData } = req.body;
  const tasksJsonPath = req.app.locals.tasksJsonPath;
  const projectRoot = req.app.locals.projectRoot;

  if (!prompt && !manualTaskData) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Either prompt or manualTaskData is required',
      timestamp: new Date().toISOString()
    });
  }

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
 * Update task by ID
 */
router.put('/tasks/:id', requireTaskMasterCore, async (req, res) => {
  const { id } = req.params;
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
    updateTaskByIdDirect,
    { tasksJsonPath, id, prompt, projectRoot },
    res,
    'updateTaskByIdDirect'
  );
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
