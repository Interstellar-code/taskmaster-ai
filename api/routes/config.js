/**
 * Configuration management routes for TaskHero API
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler, createSuccessResponse, APIError } from '../middleware/errorHandler.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validateProject.js';
import ConfigurationDAO from '../dao/ConfigurationDAO.js';

const router = express.Router();

// Validation schemas
const configCreateSchema = z.object({
  configType: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.any(),
  metadata: z.record(z.any()).default({})
});

const configUpdateSchema = z.object({
  value: z.any(),
  metadata: z.record(z.any()).optional()
});

const configQuerySchema = z.object({
  configType: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('50')
});

const configParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

const configTypeParamsSchema = z.object({
  type: z.string().min(1)
});

// AI model configuration schemas
const aiModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).default({})
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Configuration:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         configType:
 *           type: string
 *         key:
 *           type: string
 *         value:
 *           type: object
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
 * /api/config:
 *   get:
 *     summary: Get all configuration settings
 *     description: Get all configuration settings with optional filtering
 *     tags: [Configuration]
 *     parameters:
 *       - in: query
 *         name: configType
 *         schema:
 *           type: string
 *         description: Filter by configuration type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in keys and values
 *     responses:
 *       200:
 *         description: Configuration settings retrieved successfully
 */
router.get('/', 
  validateQuery(configQuerySchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const query = req.validatedQuery;

    // Filter out undefined values
    const filters = {};
    if (query.configType) filters.configType = query.configType;
    if (query.search) filters.search = query.search;

    const pagination = {
      page: parseInt(query.page),
      limit: parseInt(query.limit)
    };

    const result = await configDAO.findAll(filters, pagination);
    
    res.json(createSuccessResponse(result.configurations, 'Configuration settings retrieved successfully', {
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
 * /api/config/{type}:
 *   get:
 *     summary: Get configuration by type
 *     description: Get all configuration settings of a specific type
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration type
 *     responses:
 *       200:
 *         description: Configuration settings for type
 */
router.get('/:type',
  validateParams(configTypeParamsSchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { type } = req.validatedParams;
    
    const configurations = await configDAO.findByType(type);
    
    // Convert to key-value object for easier consumption
    const configObject = {};
    configurations.forEach(config => {
      configObject[config.key] = config.value;
    });
    
    res.json(createSuccessResponse({
      type: type,
      configurations: configObject,
      raw: configurations
    }, `Configuration for type '${type}' retrieved successfully`));
  })
);

/**
 * @swagger
 * /api/config/{type}:
 *   put:
 *     summary: Update configuration settings
 *     description: Update multiple configuration settings of a specific type
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Key-value pairs of configuration settings
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/:type',
  validateParams(configTypeParamsSchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { type } = req.validatedParams;
    const configData = req.body;
    
    if (!configData || typeof configData !== 'object') {
      throw new APIError('Invalid configuration data', 400, 'INVALID_CONFIG_DATA');
    }
    
    const updatedConfigurations = [];
    
    // Update each configuration key
    for (const [key, value] of Object.entries(configData)) {
      const updated = await configDAO.upsert(type, key, value);
      updatedConfigurations.push(updated);
    }
    
    res.json(createSuccessResponse(updatedConfigurations, `Configuration for type '${type}' updated successfully`));
  })
);

/**
 * @swagger
 * /api/config:
 *   post:
 *     summary: Create new configuration setting
 *     description: Create a new configuration setting
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configType
 *               - key
 *               - value
 *             properties:
 *               configType:
 *                 type: string
 *               key:
 *                 type: string
 *               value:
 *                 type: object
 *     responses:
 *       201:
 *         description: Configuration created successfully
 */
router.post('/',
  validateBody(configCreateSchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const configData = req.validatedBody;
    
    // Check if configuration already exists
    const existing = await configDAO.findByTypeAndKey(configData.configType, configData.key);
    if (existing) {
      throw new APIError(
        'Configuration already exists',
        409,
        'CONFIG_EXISTS',
        { configType: configData.configType, key: configData.key }
      );
    }
    
    const configuration = await configDAO.create(configData);
    
    res.status(201).json(createSuccessResponse(configuration, 'Configuration created successfully'));
  })
);

/**
 * @swagger
 * /api/config/{id}:
 *   put:
 *     summary: Update configuration by ID
 *     description: Update a specific configuration setting by ID
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/:id',
  validateParams(configParamsSchema),
  validateBody(configUpdateSchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { id } = req.validatedParams;
    const updateData = req.validatedBody;
    
    // Check if configuration exists
    const existing = await configDAO.findById(id);
    if (!existing) {
      throw new APIError('Configuration not found', 404, 'CONFIG_NOT_FOUND');
    }
    
    const updatedConfig = await configDAO.update(id, updateData);
    
    res.json(createSuccessResponse(updatedConfig, 'Configuration updated successfully'));
  })
);

/**
 * @swagger
 * /api/config/{id}:
 *   delete:
 *     summary: Delete configuration
 *     description: Delete a configuration setting
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Configuration ID
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 */
router.delete('/:id',
  validateParams(configParamsSchema),
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { id } = req.validatedParams;
    
    // Check if configuration exists
    const existing = await configDAO.findById(id);
    if (!existing) {
      throw new APIError('Configuration not found', 404, 'CONFIG_NOT_FOUND');
    }
    
    await configDAO.delete(id);
    
    res.json(createSuccessResponse(null, 'Configuration deleted successfully'));
  })
);

/**
 * @swagger
 * /api/config/models:
 *   get:
 *     summary: Get AI model configurations
 *     description: Get all AI model configurations
 *     tags: [AI Models]
 *     responses:
 *       200:
 *         description: AI model configurations retrieved successfully
 */
router.get('/models',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;

    const modelConfigs = await configDAO.findByType('ai_models');

    // Convert to structured format
    const models = {};
    modelConfigs.forEach(config => {
      models[config.key] = config.value;
    });

    res.json(createSuccessResponse(models, 'AI model configurations retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/config/models:
 *   put:
 *     summary: Update AI model configurations
 *     description: Update AI model configurations
 *     tags: [AI Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: AI model configurations
 *     responses:
 *       200:
 *         description: AI model configurations updated successfully
 */
router.put('/models',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const modelData = req.body;

    if (!modelData || typeof modelData !== 'object') {
      throw new APIError('Invalid model configuration data', 400, 'INVALID_MODEL_DATA');
    }

    const updatedModels = [];

    // Validate and update each model configuration
    for (const [modelKey, modelConfig] of Object.entries(modelData)) {
      try {
        // Validate model configuration
        const validatedConfig = aiModelSchema.parse(modelConfig);

        // Update configuration
        const updated = await configDAO.upsert('ai_models', modelKey, validatedConfig);
        updatedModels.push(updated);
      } catch (error) {
        throw new APIError(
          `Invalid configuration for model '${modelKey}': ${error.message}`,
          400,
          'INVALID_MODEL_CONFIG',
          { modelKey, error: error.message }
        );
      }
    }

    res.json(createSuccessResponse(updatedModels, 'AI model configurations updated successfully'));
  })
);

/**
 * @swagger
 * /api/config/models/{modelKey}:
 *   get:
 *     summary: Get specific AI model configuration
 *     description: Get configuration for a specific AI model
 *     tags: [AI Models]
 *     parameters:
 *       - in: path
 *         name: modelKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Model key
 *     responses:
 *       200:
 *         description: AI model configuration retrieved successfully
 *       404:
 *         description: Model configuration not found
 */
router.get('/models/:modelKey',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { modelKey } = req.params;

    const modelConfig = await configDAO.findByTypeAndKey('ai_models', modelKey);

    if (!modelConfig) {
      throw new APIError('Model configuration not found', 404, 'MODEL_CONFIG_NOT_FOUND');
    }

    res.json(createSuccessResponse(modelConfig.value, 'AI model configuration retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/config/models/{modelKey}:
 *   put:
 *     summary: Update specific AI model configuration
 *     description: Update configuration for a specific AI model
 *     tags: [AI Models]
 *     parameters:
 *       - in: path
 *         name: modelKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Model key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *               model:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: AI model configuration updated successfully
 */
router.put('/models/:modelKey',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { modelKey } = req.params;
    const modelConfig = req.body;

    try {
      // Validate model configuration
      const validatedConfig = aiModelSchema.parse(modelConfig);

      // Update configuration
      const updated = await configDAO.upsert('ai_models', modelKey, validatedConfig);

      res.json(createSuccessResponse(updated, 'AI model configuration updated successfully'));
    } catch (error) {
      throw new APIError(
        `Invalid model configuration: ${error.message}`,
        400,
        'INVALID_MODEL_CONFIG',
        { modelKey, error: error.message }
      );
    }
  })
);

/**
 * @swagger
 * /api/config/models/{modelKey}:
 *   delete:
 *     summary: Delete AI model configuration
 *     description: Delete configuration for a specific AI model
 *     tags: [AI Models]
 *     parameters:
 *       - in: path
 *         name: modelKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Model key
 *     responses:
 *       200:
 *         description: AI model configuration deleted successfully
 */
router.delete('/models/:modelKey',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const { modelKey } = req.params;

    const modelConfig = await configDAO.findByTypeAndKey('ai_models', modelKey);

    if (!modelConfig) {
      throw new APIError('Model configuration not found', 404, 'MODEL_CONFIG_NOT_FOUND');
    }

    await configDAO.delete(modelConfig.id);

    res.json(createSuccessResponse(null, 'AI model configuration deleted successfully'));
  })
);

/**
 * @swagger
 * /api/config/project:
 *   get:
 *     summary: Get project settings
 *     description: Get project-specific configuration settings
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Project settings retrieved successfully
 */
router.get('/project',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;

    const projectConfigs = await configDAO.findByType('project');

    // Convert to structured format
    const settings = {};
    projectConfigs.forEach(config => {
      settings[config.key] = config.value;
    });

    res.json(createSuccessResponse(settings, 'Project settings retrieved successfully'));
  })
);

/**
 * @swagger
 * /api/config/project:
 *   put:
 *     summary: Update project settings
 *     description: Update project-specific configuration settings
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Project configuration settings
 *     responses:
 *       200:
 *         description: Project settings updated successfully
 */
router.put('/project',
  asyncHandler(async (req, res) => {
    const configDAO = ConfigurationDAO;
    const projectData = req.body;

    if (!projectData || typeof projectData !== 'object') {
      throw new APIError('Invalid project configuration data', 400, 'INVALID_PROJECT_DATA');
    }

    const updatedSettings = [];

    // Update each project setting
    for (const [key, value] of Object.entries(projectData)) {
      const updated = await configDAO.upsert('project', key, value);
      updatedSettings.push(updated);
    }

    res.json(createSuccessResponse(updatedSettings, 'Project settings updated successfully'));
  })
);

export default router;
