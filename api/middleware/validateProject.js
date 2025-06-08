/**
 * Project validation middleware for TaskHero API
 */

import path from 'path';
import fs from 'fs/promises';
import { APIError } from './errorHandler.js';
import databaseManager from '../utils/database.js';

/**
 * Validate that the request is for a valid TaskHero project
 */
export async function validateProject(req, res, next) {
  try {
    // Get project root from header or query parameter
    const projectRoot = req.headers['x-project-root'] || 
                       req.query.projectRoot || 
                       process.cwd();
    
    if (!projectRoot) {
      throw new APIError(
        'Project root not specified',
        400,
        'PROJECT_ROOT_MISSING',
        { 
          message: 'Specify project root via X-Project-Root header or projectRoot query parameter' 
        }
      );
    }
    
    // Validate project root exists
    try {
      const stats = await fs.stat(projectRoot);
      if (!stats.isDirectory()) {
        throw new APIError(
          'Project root is not a directory',
          400,
          'INVALID_PROJECT_ROOT'
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new APIError(
          'Project root directory does not exist',
          404,
          'PROJECT_ROOT_NOT_FOUND',
          { projectRoot }
        );
      }
      throw error;
    }
    
    // Check if it's a TaskHero project
    const taskHeroDir = path.join(projectRoot, '.taskmaster');
    try {
      await fs.access(taskHeroDir);
    } catch (error) {
      throw new APIError(
        'Not a TaskHero project - .taskmaster directory not found',
        400,
        'NOT_TASKHERO_PROJECT',
        { 
          projectRoot,
          message: 'Initialize project with "task-hero init" first'
        }
      );
    }
    
    // Check database exists
    const dbPath = path.join(taskHeroDir, 'taskhero.db');
    try {
      await fs.access(dbPath);
    } catch (error) {
      throw new APIError(
        'TaskHero database not found',
        404,
        'DATABASE_NOT_FOUND',
        { 
          dbPath,
          message: 'Database not initialized. Run "task-hero init" to create database.'
        }
      );
    }
    
    // Initialize database connection if not already done
    if (!databaseManager.isInitialized || databaseManager.projectRoot !== projectRoot) {
      await databaseManager.initialize(projectRoot);
    }
    
    // Add project info to request
    req.projectRoot = projectRoot;
    req.taskHeroDir = taskHeroDir;
    req.dbPath = dbPath;
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate that the database is healthy
 */
export async function validateDatabase(req, res, next) {
  try {
    const isHealthy = await databaseManager.healthCheck();
    
    if (!isHealthy) {
      throw new APIError(
        'Database health check failed',
        503,
        'DATABASE_UNHEALTHY',
        { 
          message: 'Database is not responding properly'
        }
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate request has required permissions
 */
export function validatePermissions(requiredPermissions = []) {
  return (req, res, next) => {
    // For now, all operations are allowed
    // This can be extended for multi-user scenarios
    
    // Add user context to request
    req.user = {
      id: 'default',
      permissions: ['read', 'write', 'admin']
    };
    
    // Check if user has required permissions
    const hasPermissions = requiredPermissions.every(permission => 
      req.user.permissions.includes(permission)
    );
    
    if (!hasPermissions) {
      throw new APIError(
        'Insufficient permissions',
        403,
        'INSUFFICIENT_PERMISSIONS',
        { 
          required: requiredPermissions,
          available: req.user.permissions
        }
      );
    }
    
    next();
  };
}

/**
 * Validate request body against schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedBody = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate query parameters against schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.validatedQuery = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate URL parameters against schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.params);
      req.validatedParams = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limiting for specific operations
 */
export function operationRateLimit(maxRequests = 100, windowMs = 60000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}-${req.method}-${req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [requestKey, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(requestKey);
      } else {
        requests.set(requestKey, validTimestamps);
      }
    }
    
    // Check current requests
    const currentRequests = requests.get(key) || [];
    const validRequests = currentRequests.filter(ts => ts > windowStart);
    
    if (validRequests.length >= maxRequests) {
      throw new APIError(
        'Rate limit exceeded for this operation',
        429,
        'RATE_LIMIT_EXCEEDED',
        { 
          maxRequests,
          windowMs,
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        }
      );
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
}
