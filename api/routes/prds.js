/**
 * PRD management routes for TaskHero API
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler, createSuccessResponse, APIError } from '../middleware/errorHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validateProject.js';
import PRDDAO from '../dao/PRDDAO.js';
import TaskDAO from '../dao/TaskDAO.js';
import ProjectDAO from '../dao/ProjectDAO.js';

const router = express.Router();

// Validation schemas
const prdCreateSchema = z.object({
  prd_identifier: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1),
  file_hash: z.string().optional(),
  file_size: z.number().optional(),
  status: z.enum(['pending', 'in-progress', 'done', 'archived']).default('pending'),
  complexity: z.enum(['low', 'medium', 'high', 'very-high']).default('medium'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

const prdUpdateSchema = prdCreateSchema.partial();

const prdQuerySchema = z.object({
  status: z.string().optional(),
  complexity: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
  sortBy: z.string().default('created_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const prdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

const prdUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileContent: z.string().min(1), // Base64 encoded content
  fileType: z.string().optional().default('text/markdown'),
  append: z.boolean().optional().default(false),
  numTasks: z.number().optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     PRD:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         prdIdentifier:
 *           type: string
 *         title:
 *           type: string
 *         fileName:
 *           type: string
 *         filePath:
 *           type: string
 *         fileHash:
 *           type: string
 *         fileSize:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [pending, in-progress, done, archived]
 *         complexity:
 *           type: string
 *           enum: [low, medium, high, very-high]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdDate:
 *           type: string
 *           format: date-time
 *         lastModified:
 *           type: string
 *           format: date-time
 *         taskStats:
 *           type: object
 *         metadata:
 *           type: object
 */

/**
 * @swagger
 * /api/prds:
 *   get:
 *     summary: List all PRDs
 *     description: Get a paginated list of PRDs with optional filtering
 *     tags: [PRDs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by PRD status
 *       - in: query
 *         name: complexity
 *         schema:
 *           type: string
 *         description: Filter by PRD complexity
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by PRD priority
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
 *         description: List of PRDs
 */
router.get('/', 
  validateQuery(prdQuerySchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const query = req.validatedQuery;
    
    // Convert string parameters to appropriate types and filter out undefined values
    const filters = {};
    if (query.status) filters.status = query.status;
    if (query.complexity) filters.complexity = query.complexity;
    if (query.priority) filters.priority = query.priority;
    if (query.search) filters.search = query.search;
    if (query.tags) filters.tags = query.tags.split(',');
    
    const pagination = {
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    };
    
    const result = await prdDAO.findAll(filters, pagination);
    
    res.json(createSuccessResponse(result.prds, 'PRDs retrieved successfully', {
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
 * /api/prds/{id}:
 *   get:
 *     summary: Get PRD by ID
 *     description: Get a specific PRD with its linked tasks
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
 *     responses:
 *       200:
 *         description: PRD details
 *       404:
 *         description: PRD not found
 */
router.get('/:id',
  validateParams(prdParamsSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    
    const prd = await prdDAO.findById(id);
    
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }
    
    // Get linked tasks
    const linkedTasks = await taskDAO.findByPrdId(id);
    
    // Calculate task statistics
    const taskStats = {
      total: linkedTasks.length,
      pending: linkedTasks.filter(t => t.status === 'pending').length,
      inProgress: linkedTasks.filter(t => t.status === 'in-progress').length,
      done: linkedTasks.filter(t => t.status === 'done').length,
      review: linkedTasks.filter(t => t.status === 'review').length,
      blocked: linkedTasks.filter(t => t.status === 'blocked').length,
      deferred: linkedTasks.filter(t => t.status === 'deferred').length,
      cancelled: linkedTasks.filter(t => t.status === 'cancelled').length
    };
    
    const prdWithTasks = {
      ...prd,
      linkedTasks,
      taskStats
    };
    
    res.json(createSuccessResponse(prdWithTasks, 'PRD retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/prds:
 *   post:
 *     summary: Create new PRD
 *     description: Create a new PRD entry
 *     tags: [PRDs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prdIdentifier
 *               - title
 *               - fileName
 *               - filePath
 *             properties:
 *               prdIdentifier:
 *                 type: string
 *               title:
 *                 type: string
 *               fileName:
 *                 type: string
 *               filePath:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, done, archived]
 *               complexity:
 *                 type: string
 *                 enum: [low, medium, high, very-high]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       201:
 *         description: PRD created successfully
 *       400:
 *         description: Validation error
 */
router.post('/',
  validateBody(prdCreateSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const prdData = req.validatedBody;

    // Check if PRD identifier already exists
    const existingPrd = await prdDAO.findByIdentifier(prdData.prdIdentifier);
    if (existingPrd) {
      throw new APIError(
        'PRD identifier already exists',
        409,
        'PRD_IDENTIFIER_EXISTS',
        { prdIdentifier: prdData.prdIdentifier }
      );
    }

    // Create PRD
    const prd = await prdDAO.create(prdData);

    res.status(201).json(createSuccessResponse(prd, 'PRD created successfully'));
  })
);

/**
 * @swagger
 * /api/prds/upload:
 *   post:
 *     summary: Upload PRD file
 *     description: Upload a PRD file with content and register it in the system
 *     tags: [PRDs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileContent
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the PRD file
 *               fileContent:
 *                 type: string
 *                 description: Base64 encoded file content
 *               fileType:
 *                 type: string
 *                 default: text/markdown
 *                 description: MIME type of the file
 *               append:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to append to existing tasks
 *               numTasks:
 *                 type: number
 *                 description: Expected number of tasks to generate
 *     responses:
 *       201:
 *         description: PRD uploaded and registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: File already exists
 */
router.post('/upload',
  validateBody(prdUploadSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { fileName, fileContent, fileType, append, numTasks } = req.validatedBody;

    // Import required modules
    const path = (await import('path')).default;
    const fs = (await import('fs/promises')).default;
    const crypto = (await import('crypto')).default;

    try {
      // Decode base64 content
      const decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');

      // Generate PRD identifier from filename
      const prdIdentifier = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');

      // Check if PRD identifier already exists
      const existingPrd = await prdDAO.findByIdentifier(prdIdentifier);
      if (existingPrd && !append) {
        throw new APIError(
          'PRD with this name already exists',
          409,
          'PRD_EXISTS',
          { prdIdentifier, fileName }
        );
      }

      // Determine file path in project - get from database
      const projectDAO = ProjectDAO;
      let projectRoot;
      try {
        projectRoot = await projectDAO.getCurrentProjectRoot();
      } catch (error) {
        // Fallback to environment variable or relative path
        projectRoot = process.env.PROJECT_ROOT || process.cwd();
        console.warn('Could not get project root from database, using fallback:', projectRoot);
      }
      const prdDir = path.join(projectRoot, '.taskmaster', 'prd');
      const filePath = path.join(prdDir, fileName);

      // Ensure PRD directory exists
      await fs.mkdir(prdDir, { recursive: true });

      // Write file to disk
      await fs.writeFile(filePath, decodedContent, 'utf-8');

      // Calculate file hash and size
      const fileHash = crypto.createHash('sha256').update(decodedContent).digest('hex');
      const fileSize = Buffer.byteLength(decodedContent, 'utf-8');

      // Create PRD entry in database
      const prdData = {
        prd_identifier: prdIdentifier,
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        file_name: fileName,
        file_path: path.relative(projectRoot, filePath),
        file_hash: fileHash,
        file_size: fileSize,
        status: 'pending',
        complexity: 'medium',
        priority: 'medium',
        description: `Uploaded PRD file: ${fileName}`,
        tags: ['uploaded'],
        metadata: {
          uploaded_at: new Date().toISOString(),
          file_type: fileType,
          append,
          num_tasks: numTasks
        }
      };

      let prd;
      if (existingPrd && append) {
        // Update existing PRD
        prd = await prdDAO.update(existingPrd.id, {
          ...prdData,
          last_modified: new Date().toISOString()
        });
      } else {
        // Create new PRD
        prd = await prdDAO.create(prdData);
      }

      res.status(201).json(createSuccessResponse(prd, 'PRD uploaded and registered successfully', {
        file_path: prd.file_path,
        fileSize,
        fileHash
      }));

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(
        'Failed to upload PRD file',
        500,
        'UPLOAD_FAILED',
        {
          fileName,
          error: error.message
        }
      );
    }
  })
);

/**
 * @swagger
 * /api/prds/{id}:
 *   put:
 *     summary: Update PRD
 *     description: Update an existing PRD
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: PRD updated successfully
 *       404:
 *         description: PRD not found
 */
router.put('/:id',
  validateParams(prdParamsSchema),
  validateBody(prdUpdateSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;
    const updateData = req.validatedBody;
    
    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }
    
    // Check if updating identifier and it conflicts
    if (updateData.prdIdentifier && updateData.prdIdentifier !== existingPrd.prdIdentifier) {
      const conflictingPrd = await prdDAO.findByIdentifier(updateData.prdIdentifier);
      if (conflictingPrd && conflictingPrd.id !== id) {
        throw new APIError(
          'PRD identifier already exists',
          409,
          'PRD_IDENTIFIER_EXISTS',
          { prdIdentifier: updateData.prdIdentifier }
        );
      }
    }
    
    // Update PRD
    const updatedPrd = await prdDAO.update(id, updateData);
    
    res.json(createSuccessResponse(updatedPrd, 'PRD updated successfully'));
  })
);

/**
 * @swagger
 * /api/prds/{id}:
 *   delete:
 *     summary: Archive PRD
 *     description: Archive a PRD and handle linked tasks
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
 *     responses:
 *       200:
 *         description: PRD archived successfully
 *       404:
 *         description: PRD not found
 */
router.delete('/:id',
  validateParams(prdParamsSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;

    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Archive PRD instead of deleting
    await prdDAO.update(id, { status: 'archived' });

    res.json(createSuccessResponse(null, 'PRD archived successfully'));
  })
);

/**
 * @swagger
 * /api/prds/{id}/status:
 *   put:
 *     summary: Update PRD status
 *     description: Update only the status of a PRD
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
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
 *                 enum: [pending, in-progress, done, archived]
 *     responses:
 *       200:
 *         description: PRD status updated successfully
 */
router.put('/:id/status',
  validateParams(prdParamsSchema),
  validateBody(z.object({ status: z.enum(['pending', 'in-progress', 'done', 'archived']) })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;
    const { status } = req.validatedBody;

    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Update status
    const updatedPrd = await prdDAO.update(id, { status });

    res.json(createSuccessResponse(updatedPrd, 'PRD status updated successfully'));
  })
);

/**
 * @swagger
 * /api/prds/{id}/tasks:
 *   get:
 *     summary: Get tasks linked to PRD
 *     description: Get all tasks that are linked to a specific PRD
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter tasks by status
 *     responses:
 *       200:
 *         description: Tasks linked to PRD
 *       404:
 *         description: PRD not found
 */
router.get('/:id/tasks',
  validateParams(prdParamsSchema),
  validateQuery(z.object({ status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { status } = req.validatedQuery;

    // Check if PRD exists
    const prd = await prdDAO.findById(id);
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Get linked tasks with optional status filter
    const filters = { prdId: id };
    if (status) {
      filters.status = status;
    }

    const result = await taskDAO.findAll(filters);

    res.json(createSuccessResponse(result.tasks, 'Tasks retrieved successfully', {
      prd: {
        id: prd.id,
        title: prd.title,
        prdIdentifier: prd.prdIdentifier
      },
      taskCount: result.tasks.length
    }));
  })
);

/**
 * @swagger
 * /api/prds/{id}/parse:
 *   post:
 *     summary: Parse PRD and generate tasks
 *     description: Parse a PRD file and generate tasks from it
 *     tags: [PRDs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: PRD ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               append:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to append to existing tasks or replace
 *               aiModel:
 *                 type: string
 *                 description: AI model to use for parsing
 *     responses:
 *       200:
 *         description: PRD parsed and tasks generated successfully
 *       404:
 *         description: PRD not found
 *       500:
 *         description: Parsing failed
 */
router.post('/:id/parse',
  validateParams(prdParamsSchema),
  validateBody(z.object({
    append: z.boolean().default(false),
    aiModel: z.string().optional()
  })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;
    const { append, aiModel } = req.validatedBody;

    // Check if PRD exists
    const prd = await prdDAO.findById(id);
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // This would integrate with the existing PRD parsing logic
    // For now, return a placeholder response
    throw new APIError(
      'PRD parsing not yet implemented in API',
      501,
      'NOT_IMPLEMENTED',
      {
        message: 'Use CLI command "task-hero parse-prd" for now',
        prdId: id,
        filePath: prd.filePath
      }
    );
  })
);

/**
 * @swagger
 * /api/prds/statistics:
 *   get:
 *     summary: Get PRD statistics
 *     description: Get overall statistics for all PRDs
 *     tags: [PRDs]
 *     responses:
 *       200:
 *         description: PRD statistics
 */
router.get('/statistics',
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;

    // Get all PRDs
    const allPrds = await prdDAO.findAll({});

    // Calculate statistics
    const stats = {
      total: allPrds.prds.length,
      byStatus: {
        pending: allPrds.prds.filter(p => p.status === 'pending').length,
        inProgress: allPrds.prds.filter(p => p.status === 'in-progress').length,
        done: allPrds.prds.filter(p => p.status === 'done').length,
        archived: allPrds.prds.filter(p => p.status === 'archived').length
      },
      byComplexity: {
        low: allPrds.prds.filter(p => p.complexity === 'low').length,
        medium: allPrds.prds.filter(p => p.complexity === 'medium').length,
        high: allPrds.prds.filter(p => p.complexity === 'high').length,
        veryHigh: allPrds.prds.filter(p => p.complexity === 'very-high').length
      },
      byPriority: {
        low: allPrds.prds.filter(p => p.priority === 'low').length,
        medium: allPrds.prds.filter(p => p.priority === 'medium').length,
        high: allPrds.prds.filter(p => p.priority === 'high').length,
        urgent: allPrds.prds.filter(p => p.priority === 'urgent').length
      }
    };

    // Get task statistics for PRDs
    const allTasks = await taskDAO.findAll({});
    const tasksWithPrd = allTasks.tasks.filter(t => t.prdId);

    stats.taskStats = {
      totalTasks: allTasks.tasks.length,
      tasksWithPrd: tasksWithPrd.length,
      tasksWithoutPrd: allTasks.tasks.length - tasksWithPrd.length
    };

    res.json(createSuccessResponse(stats, 'PRD statistics retrieved successfully'));
  })
);

export default router;
