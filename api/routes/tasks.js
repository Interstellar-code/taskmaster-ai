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
  testStrategy: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  complexityScore: z.number().min(0).max(10).optional(),
  prdId: z.number().optional(),
  parentTaskId: z.number().optional(),
  dependencies: z.array(z.number()).default([]),
  metadata: z.record(z.any()).default({})
});

const taskUpdateSchema = taskCreateSchema.partial();

const taskQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  prdId: z.string().optional(),
  parentTaskId: z.string().optional(),
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
 *         testStrategy:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in-progress, done, review, blocked, deferred, cancelled]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         complexityScore:
 *           type: number
 *         prdId:
 *           type: integer
 *         parentTaskId:
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
 *         name: prdId
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
      prdId: query.prdId ? parseInt(query.prdId) : undefined,
      parentTaskId: query.parentTaskId ? parseInt(query.parentTaskId) : undefined,
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
 *                 enum: [low, medium, high, urgent]
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
      parentTaskId: parentId
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
 *               - dependsOnTaskId
 *             properties:
 *               dependsOnTaskId:
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
    dependsOnTaskId: z.number(),
    dependencyType: z.string().default('blocks')
  })),
  asyncHandler(async (req, res) => {
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { dependsOnTaskId, dependencyType } = req.validatedBody;

    // Check if both tasks exist
    const task = await taskDAO.findById(id);
    const dependsOnTask = await taskDAO.findById(dependsOnTaskId);

    if (!task) {
      throw new APIError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    if (!dependsOnTask) {
      throw new APIError('Dependency task not found', 404, 'DEPENDENCY_TASK_NOT_FOUND');
    }

    // Add dependency
    await taskDAO.addDependency(id, dependsOnTaskId, dependencyType);

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

export default router;
