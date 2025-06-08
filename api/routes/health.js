/**
 * Health check routes for TaskHero API
 */

import express from 'express';
import { asyncHandler, createSuccessResponse } from '../middleware/errorHandler.js';
import databaseManager from '../utils/database.js';
import { performance } from 'perf_hooks';

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     version:
 *                       type: string
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(createSuccessResponse(healthData, 'Server is healthy'));
}));

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health status including database and system metrics
 *     tags: [Health]
 *     parameters:
 *       - in: header
 *         name: X-Project-Root
 *         schema:
 *           type: string
 *         description: Project root directory path
 *     responses:
 *       200:
 *         description: Detailed health information
 *       503:
 *         description: Service unavailable
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = performance.now();
  
  // Basic system info
  const systemInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  // Memory usage
  const memoryUsage = process.memoryUsage();
  systemInfo.memory = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
  };
  
  // CPU usage (basic)
  const cpuUsage = process.cpuUsage();
  systemInfo.cpu = {
    user: cpuUsage.user,
    system: cpuUsage.system
  };
  
  // Database health check
  let databaseHealth = {
    status: 'unknown',
    connected: false,
    responseTime: null,
    error: null
  };
  
  const projectRoot = req.headers['x-project-root'];
  if (projectRoot) {
    try {
      const dbStartTime = performance.now();
      
      // Initialize database if needed
      if (!databaseManager.isInitialized || databaseManager.projectRoot !== projectRoot) {
        await databaseManager.initialize(projectRoot);
      }
      
      // Perform health check
      const isHealthy = await databaseManager.healthCheck();
      const dbEndTime = performance.now();
      
      databaseHealth = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: true,
        responseTime: `${(dbEndTime - dbStartTime).toFixed(2)}ms`,
        projectRoot: projectRoot
      };
      
      // Get database stats if healthy
      if (isHealthy) {
        try {
          const stats = await databaseManager.getStats();
          databaseHealth.stats = stats;
        } catch (error) {
          databaseHealth.statsError = error.message;
        }
      }
    } catch (error) {
      databaseHealth = {
        status: 'error',
        connected: false,
        responseTime: null,
        error: error.message
      };
    }
  }
  
  const endTime = performance.now();
  const totalResponseTime = endTime - startTime;
  
  const healthData = {
    ...systemInfo,
    database: databaseHealth,
    responseTime: `${totalResponseTime.toFixed(2)}ms`
  };
  
  // Determine overall status
  let overallStatus = 'healthy';
  if (databaseHealth.status === 'error' || databaseHealth.status === 'unhealthy') {
    overallStatus = 'degraded';
  }
  
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(createSuccessResponse(
    healthData, 
    `Service is ${overallStatus}`,
    { responseTime: `${totalResponseTime.toFixed(2)}ms` }
  ));
}));

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Database health check
 *     description: Returns database-specific health information
 *     tags: [Health]
 *     parameters:
 *       - in: header
 *         name: X-Project-Root
 *         required: true
 *         schema:
 *           type: string
 *         description: Project root directory path
 *     responses:
 *       200:
 *         description: Database is healthy
 *       503:
 *         description: Database is unhealthy
 */
router.get('/database', asyncHandler(async (req, res) => {
  const projectRoot = req.headers['x-project-root'];
  
  if (!projectRoot) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Project root required for database health check',
        code: 'PROJECT_ROOT_REQUIRED'
      }
    });
  }
  
  const startTime = performance.now();
  
  try {
    // Initialize database if needed
    if (!databaseManager.isInitialized || databaseManager.projectRoot !== projectRoot) {
      await databaseManager.initialize(projectRoot);
    }
    
    // Perform health check
    const isHealthy = await databaseManager.healthCheck();
    const endTime = performance.now();
    
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database health check failed',
          code: 'DATABASE_UNHEALTHY'
        }
      });
    }
    
    // Get database statistics
    const stats = await databaseManager.getStats();
    
    const healthData = {
      status: 'healthy',
      connected: true,
      responseTime: `${(endTime - startTime).toFixed(2)}ms`,
      projectRoot: projectRoot,
      stats: stats
    };
    
    res.json(createSuccessResponse(healthData, 'Database is healthy'));
  } catch (error) {
    const endTime = performance.now();
    
    res.status(503).json({
      success: false,
      error: {
        message: 'Database health check failed',
        code: 'DATABASE_ERROR',
        details: {
          error: error.message,
          responseTime: `${(endTime - startTime).toFixed(2)}ms`
        }
      }
    });
  }
}));

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes-style readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/readiness', asyncHandler(async (req, res) => {
  // Check if server is ready to accept requests
  const isReady = true; // Add actual readiness checks here
  
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
}));

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes-style liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/liveness', asyncHandler(async (req, res) => {
  // Simple liveness check
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
}));

export default router;
