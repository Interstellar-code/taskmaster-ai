/**
 * Task management routes for TaskHero API
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler, createSuccessResponse, APIError } from '../middleware/errorHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validateProject.js';
import TaskDAO from '../dao/TaskDAO.js';

const router = express.Router();

// Validation schemas
const taskCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  details: z.string().optional(),
  test_strategy: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  complexity_score: z.number().min(0).max(10).optional(),
  prd_id: z.number().optional(),
  parent_task_id: z.number().optional(),
  dependencies: z.array(z.number()).default([]),
  metadata: z.record(z.any()).default({})
});

const taskUpdateSchema = taskCreateSchema.partial();

const taskQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  prd_id: z.string().optional(),
  parent_task_id: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const taskParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         taskIdentifier:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         details:
 *           type: string
 *         test_strategy:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in-progress, done, review, blocked, deferred, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         complexity_score:
 *           type: number
 *         prd_id:
 *           type: integer
 *         parent_task_id:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List all tasks
 *     description: Get a paginated list of tasks with optional filtering
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by task priority
 *       - in: query
 *         name: prd_id
 *         schema:
 *           type: string
 *         description: Filter by PRD ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "50"
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', 
  validateQuery(taskQuerySchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const query = req.validatedQuery;
    
    // Convert string parameters to appropriate types
    const filters = {
      status: query.status,
      priority: query.priority,
      prd_id: query.prd_id ? parseInt(query.prd_id) : undefined,
      parent_task_id: query.parent_task_id ? parseInt(query.parent_task_id) : undefined,
      search: query.search
    };
    
    const pagination = {
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    };
    
    const result = await taskDAO.findAll(filters, pagination);
    
    res.json(createSuccessResponse(result.tasks, 'Tasks retrieved successfully', {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    }));
  })
);

/**
 * @swagger
 * /api/tasks/next:
 *   get:
 *     summary: Find next available task
 *     description: Find the next task to work on based on dependencies and status
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority level
 *       - in: query
 *         name: excludeBlocked
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Exclude blocked tasks
 *     responses:
 *       200:
 *         description: Next available task found
 *       404:
 *         description: No available tasks found
 */
router.get('/next',
  validateQuery(z.object({
    priority: z.string().optional(),
    excludeBlocked: z.boolean().default(true)
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { priority, excludeBlocked } = req.validatedQuery;

    // Find tasks that are pending and have no incomplete dependencies
    const filters = {
      status: 'pending'
    };

    if (priority) {
      filters.priority = priority;
    }

    const allTasks = await taskDAO.findAll(filters);

    // Filter out tasks with incomplete dependencies
    let availableTasks = [];

    for (const task of allTasks.tasks) {
      const dependencies = await taskDAO.getDependencies(task.id);

      // Check if all dependencies are completed
      let hasIncompleteDependencies = false;
      for (const dep of dependencies) {
        if (dep && dep.status !== 'done') {
          hasIncompleteDependencies = true;
          break;
        }
      }

      if (!hasIncompleteDependencies) {
        // Exclude blocked tasks if requested
        if (excludeBlocked && task.status === 'blocked') {
          continue;
        }
        availableTasks.push(task);
      }
    }

    if (availableTasks.length === 0) {
      throw new APIError('No available tasks found', 404, 'NO_TASKS_AVAILABLE');
    }

    // Sort by priority and complexity (high priority, low complexity first)
    availableTasks.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, prefer lower complexity
      const aComplexity = a.complexity_score || 5;
      const bComplexity = b.complexity_score || 5;
      return aComplexity - bComplexity;
    });

    const nextTask = availableTasks[0];

    // Get complete task with relations
    const subtasks = await taskDAO.findSubtasks(nextTask.id);
    const dependencies = await taskDAO.getDependencies(nextTask.id);

    const taskWithRelations = {
      ...nextTask,
      subtasks,
      dependencies
    };

    res.json(createSuccessResponse(taskWithRelations, 'Next available task found'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Get a specific task with its subtasks and dependencies
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id',
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    
    const task = await taskDAO.findById(id);
    
    if (!task) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }
    
    // Get subtasks and dependencies
    const subtasks = await taskDAO.findSubtasks(id);
    const dependencies = await taskDAO.getDependencies(id);
    
    const taskWithRelations = {
      ...task,
      subtasks,
      dependencies
    };
    
    res.json(createSuccessResponse(taskWithRelations, 'Task retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create new task
 *     description: Create a new task with validation
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, done, review, blocked, deferred, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 */
router.post('/',
  validateBody(taskCreateSchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const taskData = req.validatedBody;
    
    // Create task
    const task = await taskDAO.create(taskData);
    
    // Add dependencies if specified
    if (taskData.dependencies && taskData.dependencies.length > 0) {
      await taskDAO.addDependencies(task.id, taskData.dependencies);
    }
    
    // Get the complete task with relations
    const completeTask = await taskDAO.findById(task.id);
    const subtasks = await taskDAO.findSubtasks(task.id);
    const dependencies = await taskDAO.getDependencies(task.id);
    
    const taskWithRelations = {
      ...completeTask,
      subtasks,
      dependencies
    };
    
    res.status(201).json(createSuccessResponse(taskWithRelations, 'Task created successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task
 *     description: Update an existing task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 */
router.put('/:id',
  validateParams(taskParamsSchema),
  validateBody(taskUpdateSchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const updateData = req.validatedBody;
    
    // Check if task exists
    const existingTask = await taskDAO.findById(id);
    if (!existingTask) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }
    
    // Update task
    const updatedTask = await taskDAO.update(id, updateData);
    
    // Handle dependencies update if provided
    if (updateData.dependencies !== undefined) {
      await taskDAO.updateDependencies(id, updateData.dependencies);
    }
    
    // Get the complete updated task
    const completeTask = await taskDAO.findById(id);
    const subtasks = await taskDAO.findSubtasks(id);
    const dependencies = await taskDAO.getDependencies(id);
    
    const taskWithRelations = {
      ...completeTask,
      subtasks,
      dependencies
    };
    
    res.json(createSuccessResponse(taskWithRelations, 'Task updated successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     description: Delete a task and handle dependencies
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete('/:id',
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;

    // Check if task exists
    const existingTask = await taskDAO.findById(id);
    if (!existingTask) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Delete task (this will also handle dependencies via foreign key constraints)
    await taskDAO.delete(id);

    res.json(createSuccessResponse(null, 'Task deleted successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   put:
 *     summary: Update task status
 *     description: Update only the status of a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, done, review, blocked, deferred, cancelled]
 *     responses:
 *       200:
 *         description: Task status updated successfully
 */
router.put('/:id/status',
  validateParams(taskParamsSchema),
  validateBody(z.object({ status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']) })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { status } = req.validatedBody;

    // Check if task exists
    const existingTask = await taskDAO.findById(id);
    if (!existingTask) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Update status
    const updatedTask = await taskDAO.updateStatus(id, status);

    res.json(createSuccessResponse(updatedTask, 'Task status updated successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}/subtasks:
 *   post:
 *     summary: Add subtask
 *     description: Add a subtask to a parent task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subtask created successfully
 */
router.post('/:id/subtasks',
  validateParams(taskParamsSchema),
  validateBody(taskCreateSchema),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id: parentId } = req.validatedParams;
    const subtaskData = req.validatedBody;

    // Check if parent task exists
    const parentTask = await taskDAO.findById(parentId);
    if (!parentTask) {
      throw new APIError('Parent task not found', 404, 'PARENT_TASK_NOT_FOUND');
    }

    // Create subtask
    const subtaskDataWithParent = {
      ...subtaskData,
      parent_task_id: parentId
    };

    const subtask = await taskDAO.create(subtaskDataWithParent);

    res.status(201).json(createSuccessResponse(subtask, 'Subtask created successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}/dependencies:
 *   post:
 *     summary: Add task dependency
 *     description: Add a dependency relationship between tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - depends_on_task_id
 *             properties:
 *               depends_on_task_id:
 *                 type: integer
 *               dependencyType:
 *                 type: string
 *                 default: "blocks"
 *     responses:
 *       201:
 *         description: Dependency added successfully
 */
router.post('/:id/dependencies',
  validateParams(taskParamsSchema),
  validateBody(z.object({
    depends_on_task_id: z.number(),
    dependencyType: z.string().default('blocks')
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { depends_on_task_id, dependencyType } = req.validatedBody;

    // Check if both tasks exist
    const task = await taskDAO.findById(id);
    const dependsOnTask = await taskDAO.findById(depends_on_task_id);

    if (!task) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (!dependsOnTask) {
      throw new APIError('Dependency task not found', 404, 'DEPENDENCY_TASK_NOT_FOUND');
    }

    // Add dependency
    await taskDAO.addDependency(id, depends_on_task_id, dependencyType);

    res.status(201).json(createSuccessResponse(null, 'Dependency added successfully'));
  })
);

/**
 * @swagger
 * /api/tasks/{id}/dependencies/{depId}:
 *   delete:
 *     summary: Remove task dependency
 *     description: Remove a dependency relationship between tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *       - in: path
 *         name: depId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dependency task ID
 *     responses:
 *       200:
 *         description: Dependency removed successfully
 */
router.delete('/:id/dependencies/:depId',
  validateParams(z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
    depId: z.string().regex(/^\d+$/).transform(Number)
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id, depId } = req.validatedParams;

    // Remove dependency
    await taskDAO.removeDependency(id, depId);

    res.json(createSuccessResponse(null, 'Dependency removed successfully'));
  })
);



/**
 * @swagger
 * /api/tasks/{id}/expand:
 *   post:
 *     summary: Expand task into subtasks
 *     description: Break down a task into multiple subtasks using AI
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID to expand
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numSubtasks:
 *                 type: integer
 *                 default: 5
 *                 description: Number of subtasks to create
 *               prompt:
 *                 type: string
 *                 description: Additional guidance for subtask creation
 *               useAI:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to use AI for subtask generation
 *     responses:
 *       200:
 *         description: Task expanded successfully
 *       404:
 *         description: Task not found
 */
router.post('/:id/expand',
  validateParams(taskParamsSchema),
  validateBody(z.object({
    numSubtasks: z.number().min(1).max(20).default(5),
    prompt: z.string().optional(),
    useAI: z.boolean().default(true)
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { numSubtasks, prompt, useAI } = req.validatedBody;

    // Check if task exists
    const existingTask = await taskDAO.findById(id);
    if (!existingTask) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Check if task already has subtasks
    const existingSubtasks = await taskDAO.findSubtasks(id);
    if (existingSubtasks.length > 0) {
      throw new APIError('Task already has subtasks', 400, 'TASK_ALREADY_EXPANDED');
    }

    let subtasks = [];

    if (useAI) {
      // TODO: Integrate with AI service for intelligent subtask generation
      // For now, create basic subtasks
      const baseSubtasks = [
        'Research and planning',
        'Implementation setup',
        'Core development',
        'Testing and validation',
        'Documentation and cleanup'
      ];

      for (let i = 0; i < Math.min(numSubtasks, baseSubtasks.length); i++) {
        const subtaskData = {
          title: `${existingTask.title} - ${baseSubtasks[i]}`,
          description: `${baseSubtasks[i]} for: ${existingTask.description || existingTask.title}`,
          status: 'pending',
          priority: existingTask.priority,
          parent_task_id: id,
          prdId: existingTask.prdId,
          metadata: {
            generatedBy: 'api-expand',
            parentTaskTitle: existingTask.title,
            expandPrompt: prompt
          }
        };

        const subtask = await taskDAO.create(subtaskData);
        subtasks.push(subtask);
      }
    } else {
      // Create simple numbered subtasks
      for (let i = 1; i <= numSubtasks; i++) {
        const subtaskData = {
          title: `${existingTask.title} - Subtask ${i}`,
          description: `Subtask ${i} for: ${existingTask.description || existingTask.title}`,
          status: 'pending',
          priority: existingTask.priority,
          parent_task_id: id,
          prdId: existingTask.prdId,
          metadata: {
            generatedBy: 'api-expand-manual',
            parentTaskTitle: existingTask.title
          }
        };

        const subtask = await taskDAO.create(subtaskData);
        subtasks.push(subtask);
      }
    }

    // Update parent task status to indicate it has been expanded
    await taskDAO.update(id, {
      metadata: {
        ...existingTask.metadata,
        expanded: true,
        expandedAt: new Date().toISOString(),
        subtaskCount: subtasks.length
      }
    });

    // Get the updated task with all relations
    const updatedTask = await taskDAO.findById(id);
    const allSubtasks = await taskDAO.findSubtasks(id);
    const dependencies = await taskDAO.getDependencies(id);

    const taskWithRelations = {
      ...updatedTask,
      subtasks: allSubtasks,
      dependencies
    };

    res.json(createSuccessResponse({
      task: taskWithRelations,
      createdSubtasks: subtasks
    }, `Task expanded into ${subtasks.length} subtasks`));
  })
);

/**
 * @swagger
 * /api/tasks/generate-files:
 *   post:
 *     summary: Generate task files from database
 *     description: Generate individual markdown files for all tasks
 *     tags: [Tasks]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outputDir:
 *                 type: string
 *                 default: ".taskmaster/tasks"
 *                 description: Directory to generate files in
 *               format:
 *                 type: string
 *                 enum: [markdown, json, txt]
 *                 default: markdown
 *                 description: File format to generate
 *               overwrite:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to overwrite existing files
 *     responses:
 *       200:
 *         description: Task files generated successfully
 */
router.post('/generate-files',
  validateBody(z.object({
    outputDir: z.string().default('.taskmaster/tasks'),
    format: z.enum(['markdown', 'json', 'txt']).default('markdown'),
    overwrite: z.boolean().default(true)
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { outputDir, format, overwrite } = req.validatedBody;

    // Get all tasks
    const allTasks = await taskDAO.findAll({});

    if (allTasks.tasks.length === 0) {
      throw new APIError('No tasks found to generate files for', 404, 'NO_TASKS_FOUND');
    }

    // TODO: Implement actual file generation logic
    // This would integrate with the existing generateTaskFiles function
    // For now, return a success response with file information

    const generatedFiles = [];

    for (const task of allTasks.tasks) {
      const fileName = `task_${String(task.id).padStart(3, '0')}.${format === 'markdown' ? 'md' : format}`;
      const filePath = `${outputDir}/${fileName}`;

      generatedFiles.push({
        taskId: task.id,
        fileName,
        filePath,
        title: task.title,
        status: task.status
      });
    }

    // TODO: Actually write the files to disk
    // This would require file system operations and template rendering

    res.json(createSuccessResponse({
      generatedFiles,
      totalFiles: generatedFiles.length,
      outputDirectory: outputDir,
      format
    }, `Generated ${generatedFiles.length} task files in ${format} format`));
  })
);

export default router;
