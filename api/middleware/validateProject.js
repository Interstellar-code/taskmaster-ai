/**
 * Project validation middleware for TaskHero API
 */

import path from 'path';
import fs from 'fs/promises';
import { APIError } from './errorHandler.js';
import databaseManager from '../utils/database.js';
import projectDAO from '../dao/ProjectDAO.js';

/**
 * Validate that the request is for a valid TaskHero project
 */
export async function validateProject(req, res, next) {
  try {
    // Determine project root from various sources
    const projectRoot = req.headers['x-project-root'] ||
                       req.query.projectRoot ||
                       process.env.PROJECT_ROOT ||
                       process.cwd();

    // Set project root in request context for all routes
    req.projectRoot = projectRoot;

    // Check if we have any active projects in the database first
    // Use the singleton instance instead of creating a new one

    try {
      const activeProjects = await projectDAO.findActive();
      if (activeProjects.length > 0) {
        // We have an active project in the database, use its data
        req.projectId = activeProjects[0].id;
        // Override project root with database value if it exists
        if (activeProjects[0].root_path) {
          req.projectRoot = activeProjects[0].root_path;
        }
        return next();
      }
    } catch (dbError) {
      console.warn('Database not available for project validation, using filesystem-based validation', {
        error: dbError.message,
        projectRoot
      });
    }
    
    // No database project found - check filesystem as fallback
    try {
      const taskHeroDir = path.join(projectRoot, '.taskmaster');
      await fs.access(taskHeroDir);
      console.info('TaskHero project directory found', { projectRoot, taskHeroDir });
      return next();
    } catch (fsError) {
      console.warn('No .taskmaster directory found, but allowing request to proceed', {
        projectRoot,
        message: 'The DAO layers will handle project creation automatically'
      });
      return next();
    }
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
