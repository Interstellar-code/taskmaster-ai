/**
 * Error handling middleware for TaskHero API
 */

import winston from 'winston';
import { ZodError } from 'zod';

// Configure error logger
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Database error handler
 */
function handleDatabaseError(error) {
  if (error.code === 'SQLITE_CONSTRAINT') {
    return new APIError(
      'Database constraint violation',
      400,
      'CONSTRAINT_VIOLATION',
      { constraint: error.message }
    );
  }
  
  if (error.code === 'SQLITE_BUSY') {
    return new APIError(
      'Database is busy, please try again',
      503,
      'DATABASE_BUSY'
    );
  }
  
  if (error.code === 'SQLITE_CORRUPT') {
    return new APIError(
      'Database corruption detected',
      500,
      'DATABASE_CORRUPT'
    );
  }
  
  return new APIError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    { originalError: error.message }
  );
}

/**
 * Validation error handler
 */
function handleValidationError(error) {
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return new APIError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      { errors: details }
    );
  }
  
  return new APIError(
    'Invalid input data',
    400,
    'INVALID_INPUT',
    { originalError: error.message }
  );
}

/**
 * Main error handling middleware
 */
export function errorHandler(error, req, res, next) {
  // Generate correlation ID for tracking
  const correlationId = req.headers['x-correlation-id'] || 
                       req.id || 
                       Math.random().toString(36).substring(7);

  let apiError;

  // Handle different types of errors
  if (error instanceof APIError) {
    apiError = error;
  } else if (error.name === 'ValidationError' || error instanceof ZodError) {
    apiError = handleValidationError(error);
  } else if (error.code && error.code.startsWith('SQLITE_')) {
    apiError = handleDatabaseError(error);
  } else if (error.name === 'UnauthorizedError') {
    apiError = new APIError('Unauthorized access', 401, 'UNAUTHORIZED');
  } else if (error.name === 'ForbiddenError') {
    apiError = new APIError('Forbidden access', 403, 'FORBIDDEN');
  } else if (error.name === 'NotFoundError') {
    apiError = new APIError('Resource not found', 404, 'NOT_FOUND');
  } else if (error.name === 'ConflictError') {
    apiError = new APIError('Resource conflict', 409, 'CONFLICT');
  } else {
    // Unknown error
    apiError = new APIError(
      'Internal server error',
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? { originalError: error.message, stack: error.stack } : null
    );
  }

  // Log error with correlation ID
  errorLogger.error('API Error', {
    correlationId,
    error: {
      message: apiError.message,
      statusCode: apiError.statusCode,
      code: apiError.code,
      details: apiError.details,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    }
  });

  // Send error response
  res.status(apiError.statusCode).json({
    success: false,
    error: {
      message: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      correlationId
    }
  });
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  const correlationId = req.headers['x-correlation-id'] || 
                       Math.random().toString(36).substring(7);
  
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'ENDPOINT_NOT_FOUND',
      timestamp: new Date().toISOString(),
      correlationId
    }
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data, message = 'Success', meta = {}) {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message, code = 'ERROR', details = null) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    }
  };
}
