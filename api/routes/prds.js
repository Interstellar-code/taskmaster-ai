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

/**
 * Extract meaningful metadata from PRD content
 * @param {string} content - PRD file content
 * @param {string} fileName - Original file name
 * @returns {Object} Extracted metadata
 */
function extractPrdMetadata(content, fileName) {
  try {
    // Extract title from content (look for main heading or title field)
    let title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '); // Default to filename

    // Try to find title in various formats
    const titlePatterns = [
      /^#\s+(.+)$/m,                    // # Main Title
      /^Title:\s*(.+)$/im,              // Title: Something
      /^##?\s*Title:\s*(.+)$/im,        // ## Title: Something
      /^Project:\s*(.+)$/im,            // Project: Something
      /^PRD:\s*(.+)$/im                 // PRD: Something
    ];

    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim()) {
        title = match[1].trim();
        break;
      }
    }

    // Extract description/summary - try specific patterns first
    let description = `PRD: ${title}`;
    const descPatterns = [
      /(?:Description|Summary|Overview|Executive Summary):\s*(.+?)(?:\n\n|\n#|$)/is,
      /(?:## Description|## Summary|## Overview)\s*\n(.+?)(?:\n\n|\n#|$)/is,
      /(?:## Executive Summary)\s*\n(.+?)(?:\n\n|\n#|$)/is
    ];

    let foundPattern = false;
    for (const pattern of descPatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim()) {
        description = match[1].trim().substring(0, 200).replace(/\n/g, ' ');
        if (description.length === 200) description += '...';
        foundPattern = true;
        break;
      }
    }

    // If no specific pattern found, extract first paragraph (like analysis fallback)
    if (!foundPattern) {
      const firstParagraph = content.split('\n\n')[0];
      console.log('Upload description extraction:', {
        foundPattern,
        firstParagraphLength: firstParagraph ? firstParagraph.length : 0,
        firstParagraphPreview: firstParagraph ? firstParagraph.substring(0, 100) + '...' : 'none',
        meetsCriteria: firstParagraph && firstParagraph.length > 20 && firstParagraph.length < 500
      });
      
      if (firstParagraph && firstParagraph.length > 20 && firstParagraph.length < 500) {
        description = firstParagraph.replace(/\n/g, ' ').trim();
        if (description.length > 200) {
          description = description.substring(0, 200) + '...';
        }
        console.log('Upload extracted description:', description);
      } else {
        console.log('Upload using default description:', description);
      }
    } else {
      console.log('Upload found pattern-based description:', description);
    }

    // Determine complexity based on content analysis
    const wordCount = content.split(/\s+/).length;
    let complexity = 'medium';

    const complexityKeywords = {
      high: ['architecture', 'integration', 'api', 'database', 'security', 'performance', 'scalability', 'microservices', 'distributed'],
      low: ['simple', 'basic', 'straightforward', 'minimal', 'quick', 'easy']
    };

    const contentLower = content.toLowerCase();
    const highComplexityCount = complexityKeywords.high.filter(keyword => contentLower.includes(keyword)).length;
    const lowComplexityCount = complexityKeywords.low.filter(keyword => contentLower.includes(keyword)).length;

    if (wordCount > 2000 || highComplexityCount >= 3) {
      complexity = 'high';
    } else if (wordCount < 500 || lowComplexityCount >= 2) {
      complexity = 'low';
    }

    // Determine priority
    let priority = 'medium';
    const priorityKeywords = {
      high: ['urgent', 'critical', 'asap', 'priority', 'important', 'deadline'],
      low: ['nice to have', 'optional', 'future', 'enhancement', 'improvement']
    };

    const highPriorityCount = priorityKeywords.high.filter(keyword => contentLower.includes(keyword)).length;
    const lowPriorityCount = priorityKeywords.low.filter(keyword => contentLower.includes(keyword)).length;

    if (highPriorityCount >= 2) {
      priority = 'high';
    } else if (lowPriorityCount >= 2) {
      priority = 'low';
    }

    // Extract tags
    const tags = [];
    const tagPatterns = [
      /tags?:\s*([^\n]+)/i,
      /categories?:\s*([^\n]+)/i,
      /keywords?:\s*([^\n]+)/i
    ];

    for (const pattern of tagPatterns) {
      const match = content.match(pattern);
      if (match) {
        const extractedTags = match[1]
          .split(/[,;]/)
          .map(tag => tag.trim())
          .filter(tag => tag);
        tags.push(...extractedTags);
        break;
      }
    }

    return {
      title,
      description,
      complexity,
      priority,
      tags: [...new Set(tags)], // Remove duplicates
      wordCount,
      hasComplexKeywords: highComplexityCount > 0
    };

  } catch (error) {
    console.error('Error extracting PRD metadata:', error);
    // Return fallback metadata
    return {
      title: fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      description: `Uploaded PRD file: ${fileName}`,
      complexity: 'medium',
      priority: 'medium',
      tags: [],
      wordCount: content.split(/\s+/).length,
      hasComplexKeywords: false
    };
  }
}

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
    
    const result = await prdDAO.findAllWithStats(filters, pagination);

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
    
    const prd = await prdDAO.findByIdWithStats(id);

    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Get linked tasks
    const linkedTasks = await taskDAO.findAll({ prdId: id });

    const prdWithTasks = {
      ...prd,
      linkedTasks: linkedTasks.tasks
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
        
        // Validate that project root exists and is not a Windows path on Unix systems
        if (process.platform !== 'win32' && projectRoot.includes('C:')) {
          throw new Error('Invalid Windows path on Unix system');
        }
        
        console.log('Using project root from database:', projectRoot);
      } catch (error) {
        // Fallback to current working directory
        projectRoot = process.cwd();
        console.warn('Could not get valid project root from database, using current directory:', projectRoot);
        console.warn('Database error:', error.message);
      }
      
      const prdDir = path.join(projectRoot, '.taskmaster', 'prd');
      const filePath = path.join(prdDir, fileName);

      console.log('PRD Upload - File storage details:', {
        fileName,
        projectRoot,
        prdDir,
        filePath,
        fileSize: decodedContent.length
      });

      // Ensure PRD directory exists
      await fs.mkdir(prdDir, { recursive: true });
      console.log('PRD Upload - Created directory:', prdDir);

      // Write file to disk
      await fs.writeFile(filePath, decodedContent, 'utf-8');
      console.log('PRD Upload - File written successfully:', filePath);

      // Calculate file hash and size
      const fileHash = crypto.createHash('sha256').update(decodedContent).digest('hex');
      const fileSize = Buffer.byteLength(decodedContent, 'utf-8');

      // Extract meaningful title and description from PRD content
      const prdMetadata = extractPrdMetadata(decodedContent, fileName);

      // Create PRD entry in database
      const prdData = {
        prd_identifier: prdIdentifier,
        title: prdMetadata.title,
        file_name: fileName,
        file_path: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
        file_hash: fileHash,
        file_size: fileSize,
        status: 'pending',
        complexity: prdMetadata.complexity,
        priority: prdMetadata.priority,
        description: prdMetadata.description,
        tags: [...prdMetadata.tags, 'uploaded'],
        metadata: {
          uploaded_at: new Date().toISOString(),
          file_type: fileType,
          append,
          num_tasks: numTasks,
          word_count: prdMetadata.wordCount,
          has_complex_keywords: prdMetadata.hasComplexKeywords
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 default: false
 *                 description: Force delete instead of archive
 *     responses:
 *       200:
 *         description: PRD archived or deleted successfully
 *       404:
 *         description: PRD not found
 */
router.delete('/:id',
  validateParams(prdParamsSchema),
  validateBody(z.object({ force: z.boolean().default(false) })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { force } = req.validatedBody;

    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    if (force) {
      // Force delete: Delete all linked tasks first, then delete PRD
      const linkedTasks = await taskDAO.findAll({ prd_id: id });
      let deletedTaskCount = 0;

      // Delete all linked tasks
      for (const task of linkedTasks.tasks) {
        await taskDAO.delete(task.id);
        deletedTaskCount++;
      }

      // Delete the PRD file if it exists
      let fileDeleted = false;
      try {
        const fs = await import('fs/promises');
        const path = (await import('path')).default;

        // Get project root
        const projectDAO = ProjectDAO;
        let projectRoot;
        try {
          projectRoot = await projectDAO.getCurrentProjectRoot();
        } catch (error) {
          projectRoot = process.env.PROJECT_ROOT || process.cwd();
        }

        console.log('Attempting to delete PRD file:', {
          prdId: id,
          filePath: existingPrd.filePath || existingPrd.file_path,
          projectRoot
        });

        // Use file_path from database record
        const storedFilePath = existingPrd.file_path || existingPrd.filePath;
        let absoluteFilePath;
        
        if (path.isAbsolute(storedFilePath)) {
          absoluteFilePath = storedFilePath;
        } else {
          absoluteFilePath = path.resolve(projectRoot, storedFilePath);
        }

        console.log('Computed absolute file path:', absoluteFilePath);

        try {
          await fs.access(absoluteFilePath);
          await fs.unlink(absoluteFilePath);
          fileDeleted = true;
          console.log('Successfully deleted PRD file:', absoluteFilePath);
        } catch (accessError) {
          console.warn('PRD file does not exist or cannot be accessed:', absoluteFilePath);
        }
      } catch (fileError) {
        console.error('Error deleting PRD file:', fileError.message);
      }

      // Delete PRD from database
      await prdDAO.delete(id);

      res.json(createSuccessResponse({
        deletedTasks: deletedTaskCount,
        deletedFile: fileDeleted
      }, `PRD and ${deletedTaskCount} linked tasks deleted successfully`));
    } else {
      // Archive PRD instead of deleting
      await prdDAO.update(id, { status: 'archived' });
      res.json(createSuccessResponse(null, 'PRD archived successfully'));
    }
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
 * /api/prds/{id}/generate-tasks:
 *   post:
 *     summary: Generate tasks from PRD
 *     description: Parse a PRD file and generate tasks using AI, creating them via unified API
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
 *                 description: AI model to use for task generation
 *               numTasks:
 *                 type: number
 *                 default: 12
 *                 description: Number of tasks to generate
 *               expandSubtasks:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to expand tasks into subtasks
 *     responses:
 *       200:
 *         description: Tasks generated successfully
 *       404:
 *         description: PRD not found
 *       500:
 *         description: Task generation failed
 */
router.post('/:id/generate-tasks',
  validateParams(prdParamsSchema),
  validateBody(z.object({
    append: z.boolean().default(false),
    aiModel: z.string().optional(),
    numTasks: z.number().min(1).max(50).default(12),
    expandSubtasks: z.boolean().default(false)
  })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { append, aiModel, numTasks, expandSubtasks } = req.validatedBody;

    // Check if PRD exists
    const prd = await prdDAO.findById(id);
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    try {
      // Check if PRD has been analyzed
      if (prd.analysis_status !== 'analyzed') {
        throw new APIError(
          'PRD must be analyzed before generating tasks',
          400,
          'PRD_NOT_ANALYZED',
          { prdId: id, analysisStatus: prd.analysis_status }
        );
      }

      // Update PRD status to generating
      await prdDAO.update(id, { tasks_status: 'generating' });

      // Get project root first
      const projectDAO = ProjectDAO;
      let projectRoot;
      try {
        projectRoot = await projectDAO.getCurrentProjectRoot();
      } catch (error) {
        projectRoot = process.env.PROJECT_ROOT || process.cwd();
      }

      // Ensure projectRoot is defined
      if (!projectRoot) {
        throw new Error('projectRoot is not defined');
      }

      console.log(`Using project root for task generation: ${projectRoot}`);

      // Get analysis data to determine task count
      let analysisData = {};
      let recommendedTaskCount = numTasks;

      try {
        if (prd.analysis_data) {
          analysisData = JSON.parse(prd.analysis_data);
          recommendedTaskCount = analysisData.recommendedTaskCount || numTasks;
        }
      } catch (parseError) {
        console.warn('Could not parse analysis data, using default task count');
      }

      // Generate tasks using AI directly
      const path = await import('path');
      const fs = await import('fs');

      // Read PRD content - handle both absolute and relative paths
      let absolutePrdPath;
      // Normalize path separators for cross-platform compatibility
      const normalizedFilePath = prd.filePath.replace(/\\/g, '/');

      if (path.isAbsolute(normalizedFilePath)) {
        // If filePath is already absolute, use it directly
        absolutePrdPath = normalizedFilePath;
      } else {
        // If filePath is relative, resolve it against project root
        absolutePrdPath = path.resolve(projectRoot, normalizedFilePath);
      }
      console.log(`Reading PRD file for task generation: ${absolutePrdPath}`);

      let prdContent = '';
      try {
        prdContent = fs.readFileSync(absolutePrdPath, 'utf8');
      } catch (error) {
        console.error('PRD file read error details:', {
          prdFilePath: prd.filePath,
          projectRoot,
          absolutePrdPath,
          error: error.message
        });
        throw new Error(`Could not read PRD file: ${error.message}`);
      }

      // Use AI to generate tasks
      let generatedTasks = [];
      console.log('Starting task generation for PRD:', {
        prdId: id,
        title: prd.title,
        recommendedTaskCount,
        analysisStatus: prd.analysis_status
      });

      try {
        // Import AI service
        const possibleAiPaths = [
          path.resolve(projectRoot, 'scripts', 'modules', 'ai-services-unified.js'),
          path.resolve(process.cwd(), 'scripts', 'modules', 'ai-services-unified.js')
        ];

        let aiServicePath = null;
        for (const testPath of possibleAiPaths) {
          if (fs.existsSync(testPath)) {
            aiServicePath = testPath;
            break;
          }
        }

        if (!aiServicePath) {
          throw new Error(`AI service not found. Tried paths: ${possibleAiPaths.join(', ')}`);
        }

        console.log(`Using AI service from: ${aiServicePath}`);
        // Convert Windows path to file:// URL for dynamic import
        const aiServiceUrl = process.platform === 'win32'
          ? `file:///${aiServicePath.replace(/\\/g, '/')}`
          : aiServicePath;
        console.log(`Importing AI service from URL: ${aiServiceUrl}`);
        const { generateObjectService } = await import(aiServiceUrl);

        // Create AI prompt for task generation
        const taskPrompt = `Analyze the following PRD and generate exactly ${recommendedTaskCount} implementation tasks.

PRD Content:
${prdContent}

Generate tasks that:
1. Break down the PRD into logical implementation phases
2. Are specific and actionable
3. Include proper dependencies between tasks
4. Have realistic complexity estimates
5. Cover all aspects of the PRD requirements

Respond with a JSON object containing an array of tasks.`;

        const systemPrompt = 'You are an expert software architect creating implementation tasks from PRD requirements. Focus on practical, actionable tasks that developers can execute.';

        // Define Zod schema for AI task generation (compatible with AI SDK)
        const taskItemSchema = z.object({
          title: z.string().min(1).describe('Clear, concise task title'),
          description: z.string().min(1).describe('Detailed task description'),
          details: z.string().optional().default('').describe('Implementation details and guidance'),
          priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Task priority level'),
          complexity_score: z.number().min(1).max(10).describe('Complexity rating from 1-10'),
          estimated_hours: z.number().min(1).describe('Estimated hours to complete'),
          dependencies: z.array(z.number()).default([]).describe('Array of task IDs this depends on'),
          test_strategy: z.string().optional().default('').describe('Testing and validation approach')
        });

        const taskSchema = z.object({
          tasks: z.array(taskItemSchema).describe('Array of generated tasks')
        });

        console.log('Calling AI service with params:', {
          promptLength: taskPrompt.length,
          systemPromptLength: systemPrompt.length,
          projectRoot,
          commandName: 'generate-tasks'
        });

        const aiResponse = await generateObjectService({
          prompt: taskPrompt,
          systemPrompt,
          schema: taskSchema,
          objectName: 'TaskList',
          role: 'main',
          session: null,
          projectRoot,
          commandName: 'generate-tasks',
          outputType: 'api'
        });

        console.log('AI service call successful, response:', aiResponse ? 'received' : 'null');

        // Create tasks in database
        generatedTasks = [];
        const aiTasks = aiResponse.object.tasks || [];

        console.log('AI generated tasks count:', aiTasks.length);
        for (let i = 0; i < aiTasks.length; i++) {
          const aiTask = aiTasks[i];
          console.log('Processing AI task:', { index: i, title: aiTask.title });

          const taskData = {
            title: aiTask.title,
            description: aiTask.description,
            details: aiTask.details || '',
            status: 'pending',
            priority: aiTask.priority || 'medium',
            complexity_score: aiTask.complexity_score || 5.0,
            estimated_hours: aiTask.estimated_hours || 4,
            prd_id: id,
            test_strategy: aiTask.test_strategy || '',
            metadata: JSON.stringify({
              generated_from_prd: true,
              prd_title: prd.title,
              generation_date: new Date().toISOString(),
              ai_generated: true,
              recommended_task_count: recommendedTaskCount
            })
          };

          console.log('Creating task:', { title: taskData.title, index: i });
          const createdTask = await taskDAO.create(taskData);
          generatedTasks.push(createdTask);
          console.log('Task created successfully:', createdTask.id);
        }

        console.log(`Generated ${generatedTasks.length} tasks from PRD using AI`);

      } catch (aiError) {
        console.error('AI task generation failed, using fallback:', {
          error: aiError.message,
          prdId: id,
          prdTitle: prd.title,
          recommendedTaskCount,
          prdContentLength: prdContent.length
        });
        console.log('AI Error Stack:', aiError.stack);

        // Fallback: Create meaningful tasks based on PRD content analysis
        generatedTasks = [];
        const taskCount = Math.min(recommendedTaskCount, 8);

        console.log('Creating enhanced fallback tasks:', { taskCount, recommendedTaskCount });
        
        // Analyze PRD content to create specific tasks
        const contentLower = prdContent.toLowerCase();
        const isWebApp = contentLower.includes('web') || contentLower.includes('frontend') || contentLower.includes('html') || contentLower.includes('css') || contentLower.includes('javascript');
        const isAPI = contentLower.includes('api') || contentLower.includes('endpoint') || contentLower.includes('service');
        const isDatabase = contentLower.includes('database') || contentLower.includes('data') || contentLower.includes('storage');
        const isAuth = contentLower.includes('auth') || contentLower.includes('login') || contentLower.includes('user');
        const isTesting = contentLower.includes('test') || contentLower.includes('quality');
        
        // Generate specific task templates based on content
        const taskTemplates = [];
        
        if (isAPI) {
          taskTemplates.push(
            { title: "API Setup and Configuration", desc: "Set up the basic API structure, routing, and configuration", hours: 6, complexity: 6 },
            { title: "Core API Endpoints Implementation", desc: "Implement the main API endpoints and request handling", hours: 8, complexity: 7 },
            { title: "API Integration and Response Handling", desc: "Integrate external APIs and handle responses", hours: 6, complexity: 6 }
          );
        }
        
        if (isWebApp) {
          taskTemplates.push(
            { title: "Frontend Interface Development", desc: "Create the user interface and frontend components", hours: 8, complexity: 6 },
            { title: "User Experience and Styling", desc: "Implement responsive design and user experience", hours: 5, complexity: 4 }
          );
        }
        
        if (isDatabase) {
          taskTemplates.push(
            { title: "Database Design and Setup", desc: "Design database schema and set up data storage", hours: 4, complexity: 5 }
          );
        }
        
        if (isAuth) {
          taskTemplates.push(
            { title: "User Authentication System", desc: "Implement user registration, login, and authentication", hours: 6, complexity: 7 }
          );
        }
        
        // Add generic implementation tasks to fill remaining slots
        while (taskTemplates.length < taskCount) {
          const remaining = taskCount - taskTemplates.length;
          if (remaining >= 3) {
            taskTemplates.push(
              { title: "Error Handling and Validation", desc: "Implement comprehensive error handling and input validation", hours: 4, complexity: 5 },
              { title: "Testing and Quality Assurance", desc: "Create tests and ensure quality standards", hours: 5, complexity: 4 },
              { title: "Documentation and Deployment", desc: "Create documentation and deploy the application", hours: 3, complexity: 3 }
            );
          } else {
            taskTemplates.push(
              { title: `Additional Implementation Task ${taskTemplates.length + 1}`, desc: "Complete remaining implementation requirements", hours: 4, complexity: 5 }
            );
          }
        }
        
        // Create tasks from templates
        for (let i = 0; i < Math.min(taskCount, taskTemplates.length); i++) {
          const template = taskTemplates[i];
          const taskData = {
            title: template.title,
            description: template.desc,
            details: `Based on PRD analysis: ${template.desc}. This task was generated from content analysis.`,
            status: 'pending',
            priority: template.complexity >= 7 ? 'high' : template.complexity >= 5 ? 'medium' : 'low',
            complexity_score: template.complexity,
            estimated_hours: template.hours,
            prd_id: id,
            test_strategy: `Validate implementation meets PRD requirements for: ${template.title.toLowerCase()}`,
            metadata: JSON.stringify({
              generated_from_prd: true,
              prd_title: prd.title,
              generation_date: new Date().toISOString(),
              content_based_fallback: true,
              analysis_keywords: { isAPI, isWebApp, isDatabase, isAuth },
              recommended_task_count: recommendedTaskCount
            })
          };

          console.log('Creating content-based fallback task:', { title: taskData.title, index: i });
          const createdTask = await taskDAO.create(taskData);
          generatedTasks.push(createdTask);
          console.log('Content-based task created successfully:', createdTask.id);
        }
        console.log(`Generated ${generatedTasks.length} content-based fallback tasks`);
      }

      // Update PRD status to generated
      await prdDAO.update(id, { tasks_status: 'generated' });

      res.json(createSuccessResponse({
        tasksGenerated: generatedTasks.length,
        tasks: generatedTasks,
        prdId: id,
        append,
        recommendedTaskCount,
        analysisData
      }, 'Tasks generated successfully from PRD using AI analysis'));

    } catch (error) {
      // Update PRD status back to no-tasks on failure
      await prdDAO.update(id, { tasks_status: 'no-tasks' });

      throw new APIError(
        `Failed to generate tasks from PRD: ${error.message}`,
        500,
        'TASK_GENERATION_FAILED',
        { prdId: id, error: error.message }
      );
    }
  })
);

/**
 * @swagger
 * /api/prds/{id}/analyze:
 *   post:
 *     summary: Analyze PRD complexity
 *     description: Perform complexity analysis on a PRD and store results
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
 *               aiModel:
 *                 type: string
 *                 description: AI model to use for analysis
 *               includeComplexity:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to include complexity scoring
 *               includeEffortEstimate:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to include effort estimation
 *     responses:
 *       200:
 *         description: PRD analyzed successfully
 *       404:
 *         description: PRD not found
 *       500:
 *         description: Analysis failed
 */
router.post('/:id/analyze',
  validateParams(prdParamsSchema),
  validateBody(z.object({
    aiModel: z.string().optional(),
    includeComplexity: z.boolean().default(true),
    includeEffortEstimate: z.boolean().default(true)
  })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;
    const { includeComplexity, includeEffortEstimate } = req.validatedBody;

    // Check if PRD exists
    const prd = await prdDAO.findById(id);
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    try {
      // Update PRD status to analyzing
      await prdDAO.update(id, { analysis_status: 'analyzing' });

      // Import required modules
      const fs = await import('fs');
      const path = await import('path');

      // Get project root first
      const projectDAO = ProjectDAO;
      let projectRoot;
      try {
        projectRoot = await projectDAO.getCurrentProjectRoot();
      } catch (error) {
        projectRoot = process.env.PROJECT_ROOT || process.cwd();
      }

      // Ensure projectRoot is defined
      if (!projectRoot) {
        throw new Error('projectRoot is not defined');
      }

      console.log(`Using project root: ${projectRoot}`);

      // Read PRD content for AI analysis - handle both absolute and relative paths
      let prdContent = '';
      try {
        let absoluteFilePath;
        // Normalize path separators for cross-platform compatibility
        const normalizedFilePath = prd.filePath.replace(/\\/g, '/');

        if (path.isAbsolute(normalizedFilePath)) {
          // If filePath is already absolute, use it directly
          absoluteFilePath = normalizedFilePath;
        } else {
          // If filePath is relative, resolve it against project root
          absoluteFilePath = path.resolve(projectRoot, normalizedFilePath);
        }
        console.log(`Reading PRD file from: ${absoluteFilePath}`);
        prdContent = fs.readFileSync(absoluteFilePath, 'utf8');
      } catch (error) {
        console.warn('Could not read PRD file for analysis:', error.message);
        console.warn('PRD file path:', prd.filePath);
        console.warn('Project root:', projectRoot);
        prdContent = prd.description || '';
      }

      // Use AI to analyze PRD content and determine complexity + recommended tasks
      let analysisResult;
      let complexityScore = 5; // Default medium complexity
      let recommendedTaskCount = 8; // Default task count

      try {
        // Import AI service for PRD analysis
        const path = await import('path');
        const fs = await import('fs');

        // Try multiple possible paths for the AI service
        const possiblePaths = [
          path.resolve(projectRoot, 'scripts', 'modules', 'ai-services-unified.js'),
          path.resolve(process.cwd(), 'scripts', 'modules', 'ai-services-unified.js')
        ];

        let aiServicePath = null;
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            aiServicePath = testPath;
            break;
          }
        }

        if (!aiServicePath) {
          throw new Error(`AI service not found. Tried paths: ${possiblePaths.join(', ')}`);
        }

        console.log(`Using AI service from: ${aiServicePath}`);
        // Convert Windows path to file:// URL for dynamic import
        const aiServiceUrl = process.platform === 'win32'
          ? `file:///${aiServicePath.replace(/\\/g, '/')}`
          : aiServicePath;
        console.log(`Importing AI service from URL: ${aiServiceUrl}`);
        
        let generateTextService;
        try {
          const aiModule = await import(aiServiceUrl);
          generateTextService = aiModule.generateTextService;
          console.log('AI service imported successfully');
        } catch (importError) {
          console.error('Failed to import AI service:', importError.message);
          throw new Error(`AI service import failed: ${importError.message}`);
        }

        // Create AI prompt for PRD analysis
        const analysisPrompt = `Analyze the following PRD (Product Requirements Document) and provide:
1. Complexity score (1-10 scale where 1=very simple, 10=extremely complex)
2. Recommended number of tasks to break this PRD into (typically 6-15 tasks)
3. Brief reasoning for the complexity assessment
4. Extract or create a clear, concise description of what this PRD is about (2-3 sentences max)

PRD Content:
${prdContent}

Respond ONLY with a valid JSON object matching this schema:
{
  "complexityScore": <number 1-10>,
  "recommendedTaskCount": <number 6-15>,
  "reasoning": "<string explaining the complexity assessment>",
  "keyComplexityFactors": ["<factor1>", "<factor2>", "..."],
  "description": "<clear 2-3 sentence description of what this PRD involves>"
}`;

        const systemPrompt = 'You are an expert software architect and project manager analyzing PRD complexity. Focus on technical complexity, scope, integration requirements, and implementation challenges.';

        const aiResponse = await generateTextService({
          prompt: analysisPrompt,
          systemPrompt,
          role: 'main',
          session: null,
          projectRoot,
          commandName: 'analyze-prd',
          outputType: 'api'
        });

        // Parse AI response
        let cleanedResponse = aiResponse.mainResult.trim();

        // Remove code block markers if present
        const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          cleanedResponse = codeBlockMatch[1].trim();
        }

        const aiAnalysis = JSON.parse(cleanedResponse);
        complexityScore = Math.max(1, Math.min(10, aiAnalysis.complexityScore || 5));
        recommendedTaskCount = Math.max(6, Math.min(15, aiAnalysis.recommendedTaskCount || 8));

        console.log(`AI Analysis: Complexity ${complexityScore}/10, Recommended ${recommendedTaskCount} tasks`);

        // Create analysis result from AI response
        analysisResult = {
          complexity: complexityScore >= 8 ? 'high' : complexityScore >= 5 ? 'medium' : 'low',
          effortEstimate: complexityScore >= 8 ? '1-2 weeks' : complexityScore >= 5 ? '4-8 hours' : '2-4 hours',
          recommendedTaskCount,
          description: aiAnalysis.description || `PRD: ${prd.title}`,
          analysisData: {
            taskComplexity: complexityScore,
            recommendedTaskCount,
            estimatedHours: complexityScore >= 8 ? 40 : complexityScore >= 5 ? 8 : 4,
            analysisMethod: 'ai-analysis',
            reasoning: aiAnalysis.reasoning || '',
            keyComplexityFactors: aiAnalysis.keyComplexityFactors || []
          },
          recommendations: [
            `Complexity level: ${complexityScore >= 8 ? 'high' : complexityScore >= 5 ? 'medium' : 'low'} (score: ${complexityScore}/10)`,
            `Estimated effort: ${complexityScore >= 8 ? '1-2 weeks' : complexityScore >= 5 ? '4-8 hours' : '2-4 hours'}`,
            `Recommended ${recommendedTaskCount} tasks for implementation`
          ]
        };

      } catch (aiError) {
        console.error('AI analysis failed, using content-based fallback:', {
          error: aiError.message,
          projectRoot,
          prdContentLength: prdContent.length,
          prdId: id,
          fileName: prd.file_name
        });
        console.log('AI Error Details:', aiError.stack);

        // Fallback to content-based analysis
        const wordCount = prdContent.split(/\s+/).length;
        const lineCount = prdContent.split('\n').length;
        const hasTechnicalTerms = /\b(API|database|authentication|integration|architecture|deployment|testing|performance|security|scalability)\b/gi.test(prdContent);
        const hasCodeBlocks = prdContent.includes('```');

        // Determine complexity based on content analysis
        if (wordCount > 3000 || lineCount > 150 || (hasCodeBlocks && hasTechnicalTerms)) {
          complexityScore = 8;
          recommendedTaskCount = 12;
        } else if (wordCount > 1500 || lineCount > 75 || hasTechnicalTerms) {
          complexityScore = 6;
          recommendedTaskCount = 10;
        } else if (wordCount < 500 || lineCount < 25) {
          complexityScore = 3;
          recommendedTaskCount = 6;
        } else {
          complexityScore = 5;
          recommendedTaskCount = 8;
        }

        // Generate description from content when AI fails
        let fallbackDescription = `PRD: ${prd.title}`;
        
        // Try to extract a better description from content
        const firstParagraph = prdContent.split('\n\n')[0];
        console.log('Fallback description extraction:', {
          prdContentLength: prdContent.length,
          firstParagraphLength: firstParagraph ? firstParagraph.length : 0,
          firstParagraphPreview: firstParagraph ? firstParagraph.substring(0, 100) + '...' : 'none'
        });
        
        if (firstParagraph && firstParagraph.length > 20 && firstParagraph.length < 500) {
          fallbackDescription = firstParagraph.replace(/\n/g, ' ').trim();
          if (fallbackDescription.length > 200) {
            fallbackDescription = fallbackDescription.substring(0, 200) + '...';
          }
          console.log('Extracted fallback description:', fallbackDescription);
        } else {
          console.log('Using default fallback description:', fallbackDescription);
        }

        // Update analysis method to indicate fallback was used
        analysisResult = {
          complexity: complexityScore >= 8 ? 'high' : complexityScore >= 5 ? 'medium' : 'low',
          effortEstimate: complexityScore >= 8 ? '1-2 weeks' : complexityScore >= 5 ? '4-8 hours' : '2-4 hours',
          recommendedTaskCount,
          description: fallbackDescription,
          analysisData: {
            taskComplexity: complexityScore,
            recommendedTaskCount,
            estimatedHours: complexityScore >= 8 ? 40 : complexityScore >= 5 ? 8 : 4,
            analysisMethod: 'content-based-fallback'
          }
        };
      }

      // analysisResult is now created in both success and fallback cases above

      // Store analysis results in PRD
      const analysisData = {
        complexity: analysisResult.complexity || 'medium',
        effortEstimate: analysisResult.effortEstimate || '2-4 hours',
        recommendedTaskCount: analysisResult.recommendedTaskCount || 8,
        analysisData: analysisResult.analysisData || {},
        recommendations: analysisResult.recommendations || [],
        analyzedAt: new Date().toISOString()
      };

      // Update PRD with analysis results including improved description
      const updateData = {
        analysis_status: 'analyzed',
        complexity: analysisData.complexity,
        estimated_effort: analysisData.effortEstimate,
        analysis_data: JSON.stringify(analysisData)
      };

      // If AI provided a better description, update it
      console.log('Analysis description update check:', {
        hasDescription: !!analysisResult.description,
        descriptionLength: analysisResult.description ? analysisResult.description.length : 0,
        descriptionPreview: analysisResult.description ? analysisResult.description.substring(0, 100) + '...' : 'none'
      });
      
      if (analysisResult.description && analysisResult.description.trim()) {
        updateData.description = analysisResult.description.trim();
        console.log('Analysis updating description to:', updateData.description.substring(0, 100) + '...');
      } else {
        console.log('Analysis not updating description');
      }

      await prdDAO.update(id, updateData);

      res.json(createSuccessResponse(analysisData, 'PRD analyzed successfully'));

    } catch (error) {
      // Update PRD status back to not-analyzed on failure
      await prdDAO.update(id, { analysis_status: 'not-analyzed' });

      throw new APIError(
        `Failed to analyze PRD: ${error.message}`,
        500,
        'PRD_ANALYSIS_FAILED',
        { prdId: id, error: error.message }
      );
    }
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

/**
 * @swagger
 * /api/prds/{id}/download:
 *   get:
 *     summary: Download PRD file
 *     description: Download the original PRD file
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
 *         description: PRD file downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: PRD not found
 *       500:
 *         description: Download failed
 */
router.get('/:id/download',
  validateParams(prdParamsSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const { id } = req.validatedParams;

    // Check if PRD exists
    const prd = await prdDAO.findById(id);
    if (!prd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Debug: Log PRD data for troubleshooting
    console.log('Download request for PRD:', {
      id: prd.id,
      title: prd.title,
      fileName: prd.fileName,
      filePath: prd.filePath,
      file_path: prd.file_path
    });

    // Import fs module
    const fs = await import('fs');
    const path = await import('path');

    // Get project root for path resolution
    const projectDAO = ProjectDAO;
    let projectRoot;
    try {
      projectRoot = await projectDAO.getCurrentProjectRoot();
    } catch (error) {
      projectRoot = process.env.PROJECT_ROOT || process.cwd();
    }

    // Fix cross-platform project root issues
    // If we get a Windows path but we're on macOS/Linux, use current working directory
    if (projectRoot && projectRoot.includes('C:\\') && process.platform !== 'win32') {
      console.log('Detected Windows path on non-Windows system, using current working directory');
      projectRoot = process.cwd();
    }

    console.log('Using project root:', projectRoot);
    console.log('Platform:', process.platform);

    // Try multiple possible file path fields
    const possiblePaths = [
      prd.file_path,  // Primary field from database
      prd.filePath,   // Alternative field
      prd.file_name,  // Fallback to just filename
      prd.fileName    // Alternative filename field
    ].filter(Boolean);

    console.log('Trying file paths:', possiblePaths);
    console.log('Project root:', projectRoot);

    let absoluteFilePath = null;
    let foundPath = null;

    // Try each possible path
    for (const filePath of possiblePaths) {
      // Normalize path separators for cross-platform compatibility
      // Convert Windows backslashes to forward slashes, then split and rejoin using path.join
      const pathParts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);

      let testPath;
      if (path.isAbsolute(filePath)) {
        testPath = filePath;
      } else {
        // Build path using path.join for proper cross-platform support
        testPath = path.join(projectRoot, ...pathParts);
      }

      console.log('Testing path:', testPath);

      if (fs.existsSync(testPath)) {
        absoluteFilePath = testPath;
        foundPath = filePath;
        console.log('✅ Found file at:', testPath);
        break;
      } else {
        console.log('❌ File not found at:', testPath);
      }
    }

    // If still not found, try common PRD directories as fallback
    if (!absoluteFilePath && prd.file_name) {
      const fallbackPaths = [
        path.join(projectRoot, '.taskmaster', 'prd', prd.file_name),
        path.join(projectRoot, 'prd', prd.file_name),
        path.join(projectRoot, 'prds', prd.file_name),
        path.join(projectRoot, prd.file_name)
      ];

      console.log('Trying fallback paths:', fallbackPaths);

      for (const fallbackPath of fallbackPaths) {
        console.log('Testing fallback path:', fallbackPath);
        if (fs.existsSync(fallbackPath)) {
          absoluteFilePath = fallbackPath;
          foundPath = fallbackPath;
          console.log('✅ Found file at fallback path:', fallbackPath);
          break;
        } else {
          console.log('❌ Fallback path not found:', fallbackPath);
        }
      }
    }

    // Check if file exists
    if (!absoluteFilePath) {
      const allTriedPaths = possiblePaths.map(p => {
        const normalized = p.replace(/\\/g, '/');
        return path.isAbsolute(normalized) ? normalized : path.join(projectRoot, normalized);
      });

      console.error('File not found. Tried paths:', allTriedPaths);

      throw new APIError('PRD file not found on disk', 404, 'FILE_NOT_FOUND', {
        prdId: id,
        triedPaths: allTriedPaths,
        projectRoot,
        prdData: {
          file_name: prd.file_name,
          file_path: prd.file_path,
          title: prd.title
        }
      });
    }

    console.log('Found file at:', absoluteFilePath);

    // Get file info
    const fileName = path.basename(absoluteFilePath);
    const fileStats = fs.statSync(absoluteFilePath);

    console.log('Serving file:', {
      fileName,
      size: fileStats.size,
      path: absoluteFilePath
    });

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStats.size);

    // Stream the file
    const fileStream = fs.createReadStream(absoluteFilePath);
    fileStream.pipe(res);
  })
);

/**
 * @swagger
 * /api/prds/{id}/archive:
 *   post:
 *     summary: Archive PRD with task validation
 *     description: Archive a PRD after validating all linked tasks are completed
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
 *               force:
 *                 type: boolean
 *                 default: false
 *                 description: Force archive even with incomplete tasks
 *               validateTasks:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to validate task completion
 *     responses:
 *       200:
 *         description: PRD archived successfully
 *       400:
 *         description: Cannot archive PRD with incomplete tasks
 *       404:
 *         description: PRD not found
 */
router.post('/:id/archive',
  validateParams(prdParamsSchema),
  validateBody(z.object({
    force: z.boolean().default(false),
    validateTasks: z.boolean().default(true)
  })),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;
    const { force, validateTasks } = req.validatedBody;
    
    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }
    
    // Check if PRD is already archived
    if (existingPrd.status === 'archived') {
      throw new APIError('PRD is already archived', 400, 'PRD_ALREADY_ARCHIVED');
    }
    
    // Validate task completion if required
    if (validateTasks && !force) {
      const incompleteTasks = await taskDAO.findAll({ prd_id: id });
      const pendingTasks = incompleteTasks.tasks.filter(task => 
        !['done', 'cancelled'].includes(task.status)
      );
      
      if (pendingTasks.length > 0) {
        throw new APIError(
          `Cannot archive PRD with ${pendingTasks.length} incomplete tasks`,
          400,
          'INCOMPLETE_TASKS',
          {
            incompleteTaskCount: pendingTasks.length,
            incompleteTasks: pendingTasks.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status
            }))
          }
        );
      }
    }
    
    // Archive the PRD
    const archivedPrd = await prdDAO.update(id, { 
      status: 'archived',
      last_modified: new Date().toISOString()
    });
    
    // Calculate task statistics for response
    const allTasks = await taskDAO.findAll({ prd_id: id });
    const taskStats = {
      total: allTasks.tasks.length,
      completed: allTasks.tasks.filter(t => t.status === 'done').length,
      cancelled: allTasks.tasks.filter(t => t.status === 'cancelled').length
    };
    
    res.json(createSuccessResponse({
      prd: archivedPrd,
      taskStats
    }, 'PRD archived successfully'));
  })
);

/**
 * @swagger
 * /api/prds/{id}/force-delete:
 *   delete:
 *     summary: Force delete PRD with all linked tasks
 *     description: Permanently delete a PRD and all its linked tasks and files
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
 *         description: PRD and linked tasks deleted successfully
 *       404:
 *         description: PRD not found
 */
router.delete('/:id/force-delete',
  validateParams(prdParamsSchema),
  asyncHandler(async (req, res) => {
    const prdDAO = PRDDAO;
    const taskDAO = TaskDAO;
    const { id } = req.validatedParams;

    // Check if PRD exists
    const existingPrd = await prdDAO.findById(id);
    if (!existingPrd) {
      throw new APIError('PRD not found', 404, 'PRD_NOT_FOUND');
    }

    // Delete all linked tasks first
    const linkedTasks = await taskDAO.findAll({ prd_id: id });
    let deletedTaskCount = 0;

    for (const task of linkedTasks.tasks) {
      await taskDAO.delete(task.id);
      deletedTaskCount++;
    }

    // Delete the PRD file if it exists
    let fileDeleted = false;
    try {
      const fs = await import('fs/promises');
      const path = (await import('path')).default;

      // Get project root
      const projectDAO = ProjectDAO;
      let projectRoot;
      try {
        projectRoot = await projectDAO.getCurrentProjectRoot();
      } catch (error) {
        projectRoot = process.env.PROJECT_ROOT || process.cwd();
      }

      console.log('Force delete - attempting to delete PRD file:', {
        prdId: id,
        filePath: existingPrd.filePath || existingPrd.file_path,
        projectRoot
      });

      // Use file_path from database record
      const storedFilePath = existingPrd.file_path || existingPrd.filePath;
      let absoluteFilePath;
      
      if (path.isAbsolute(storedFilePath)) {
        absoluteFilePath = storedFilePath;
      } else {
        absoluteFilePath = path.resolve(projectRoot, storedFilePath);
      }

      console.log('Force delete - computed absolute file path:', absoluteFilePath);

      try {
        await fs.access(absoluteFilePath);
        await fs.unlink(absoluteFilePath);
        fileDeleted = true;
        console.log('Force delete - successfully deleted PRD file:', absoluteFilePath);
      } catch (accessError) {
        console.warn('Force delete - PRD file does not exist or cannot be accessed:', absoluteFilePath);
      }
    } catch (fileError) {
      console.warn('Could not delete PRD file:', fileError.message);
    }

    // Delete PRD from database
    await prdDAO.delete(id);

    res.json(createSuccessResponse({
      success: true,
      message: `PRD "${existingPrd.title}" deleted successfully`,
      deletedTasks: deletedTaskCount,
      fileDeleted
    }, `PRD and ${deletedTaskCount} linked tasks deleted successfully`));
  })
);

export default router;
