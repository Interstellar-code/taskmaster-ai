/**
 * validation.js
 * Validation middleware and utilities for TaskMaster API
 */

import { createLogger } from './logger.js';

const logger = createLogger('API-Validation');

// Valid task statuses
const VALID_STATUSES = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'];

// Valid priorities
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// Valid bulk operations
const VALID_BULK_OPERATIONS = ['delete', 'updateStatus', 'updatePriority', 'addDependency'];

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate task creation data according to TaskFormData interface
 */
export function validateCreateTaskData(data) {
  const errors = [];

  // Required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  } else if (data.title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters long' });
  } else if (data.title.length > 200) {
    errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required and must be a non-empty string' });
  } else if (data.description.length < 10) {
    errors.push({ field: 'description', message: 'Description must be at least 10 characters long' });
  } else if (data.description.length > 5000) {
    errors.push({ field: 'description', message: 'Description must be less than 5000 characters' });
  }

  // Optional fields with validation
  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (data.dependencies && !Array.isArray(data.dependencies)) {
    errors.push({ field: 'dependencies', message: 'Dependencies must be an array' });
  } else if (data.dependencies) {
    data.dependencies.forEach((dep, index) => {
      if (typeof dep !== 'string' && typeof dep !== 'number') {
        errors.push({ field: `dependencies[${index}]`, message: 'Each dependency must be a string or number' });
      }
    });
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push({ field: 'tags', message: 'Tags must be an array' });
  } else if (data.tags) {
    data.tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        errors.push({ field: `tags[${index}]`, message: 'Each tag must be a string' });
      }
    });
  }

  if (data.estimatedHours !== undefined) {
    if (typeof data.estimatedHours !== 'number' || data.estimatedHours < 0) {
      errors.push({ field: 'estimatedHours', message: 'Estimated hours must be a positive number' });
    } else if (data.estimatedHours > 1000) {
      errors.push({ field: 'estimatedHours', message: 'Estimated hours must be less than 1000' });
    }
  }

  if (data.assignee !== undefined && (typeof data.assignee !== 'string' || data.assignee.trim().length === 0)) {
    errors.push({ field: 'assignee', message: 'Assignee must be a non-empty string' });
  }

  if (data.dueDate !== undefined) {
    const date = new Date(data.dueDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid ISO date string' });
    }
  }

  if (data.details !== undefined && typeof data.details !== 'string') {
    errors.push({ field: 'details', message: 'Details must be a string' });
  }

  if (data.testStrategy !== undefined && typeof data.testStrategy !== 'string') {
    errors.push({ field: 'testStrategy', message: 'Test strategy must be a string' });
  }

  return errors;
}

/**
 * Validate task update data
 */
export function validateUpdateTaskData(data) {
  const errors = [];

  // All fields are optional for updates, but if provided, must be valid
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title must be a non-empty string' });
    } else if (data.title.length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters long' });
    } else if (data.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description must be a non-empty string' });
    } else if (data.description.length < 10) {
      errors.push({ field: 'description', message: 'Description must be at least 10 characters long' });
    } else if (data.description.length > 5000) {
      errors.push({ field: 'description', message: 'Description must be less than 5000 characters' });
    }
  }

  if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (data.dependencies !== undefined) {
    if (!Array.isArray(data.dependencies)) {
      errors.push({ field: 'dependencies', message: 'Dependencies must be an array' });
    } else {
      data.dependencies.forEach((dep, index) => {
        if (typeof dep !== 'string' && typeof dep !== 'number') {
          errors.push({ field: `dependencies[${index}]`, message: 'Each dependency must be a string or number' });
        }
      });
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push({ field: 'tags', message: 'Tags must be an array' });
    } else {
      data.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push({ field: `tags[${index}]`, message: 'Each tag must be a string' });
        }
      });
    }
  }

  if (data.estimatedHours !== undefined) {
    if (typeof data.estimatedHours !== 'number' || data.estimatedHours < 0) {
      errors.push({ field: 'estimatedHours', message: 'Estimated hours must be a positive number' });
    } else if (data.estimatedHours > 1000) {
      errors.push({ field: 'estimatedHours', message: 'Estimated hours must be less than 1000' });
    }
  }

  if (data.assignee !== undefined && (typeof data.assignee !== 'string' || data.assignee.trim().length === 0)) {
    errors.push({ field: 'assignee', message: 'Assignee must be a non-empty string' });
  }

  if (data.dueDate !== undefined) {
    const date = new Date(data.dueDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid ISO date string' });
    }
  }

  if (data.details !== undefined && typeof data.details !== 'string') {
    errors.push({ field: 'details', message: 'Details must be a string' });
  }

  if (data.testStrategy !== undefined && typeof data.testStrategy !== 'string') {
    errors.push({ field: 'testStrategy', message: 'Test strategy must be a string' });
  }

  return errors;
}

/**
 * Validate bulk operation data
 */
export function validateBulkOperationData(data) {
  const errors = [];

  if (!data.taskIds || !Array.isArray(data.taskIds) || data.taskIds.length === 0) {
    errors.push({ field: 'taskIds', message: 'taskIds is required and must be a non-empty array' });
  } else {
    data.taskIds.forEach((id, index) => {
      if (typeof id !== 'string' && typeof id !== 'number') {
        errors.push({ field: `taskIds[${index}]`, message: 'Each task ID must be a string or number' });
      }
    });
  }

  if (!data.operation || !VALID_BULK_OPERATIONS.includes(data.operation)) {
    errors.push({ field: 'operation', message: `Operation must be one of: ${VALID_BULK_OPERATIONS.join(', ')}` });
  }

  // Validate payload based on operation
  if (data.operation === 'updateStatus') {
    if (!data.payload || !data.payload.status || !VALID_STATUSES.includes(data.payload.status)) {
      errors.push({ field: 'payload.status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
  } else if (data.operation === 'updatePriority') {
    if (!data.payload || !data.payload.priority || !VALID_PRIORITIES.includes(data.payload.priority)) {
      errors.push({ field: 'payload.priority', message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }
  } else if (data.operation === 'addDependency') {
    if (!data.payload || !data.payload.dependsOn) {
      errors.push({ field: 'payload.dependsOn', message: 'dependsOn is required for addDependency operation' });
    }
  }

  return errors;
}

/**
 * Express middleware for validating task creation
 */
export function validateCreateTask(req, res, next) {
  try {
    const errors = validateCreateTaskData(req.body);
    
    if (errors.length > 0) {
      logger.warn('Task creation validation failed:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid task data provided',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Validation middleware error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express middleware for validating task updates
 */
export function validateUpdateTask(req, res, next) {
  try {
    const errors = validateUpdateTaskData(req.body);
    
    if (errors.length > 0) {
      logger.warn('Task update validation failed:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid task update data provided',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Validation middleware error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express middleware for validating bulk operations
 */
export function validateBulkOperation(req, res, next) {
  try {
    const errors = validateBulkOperationData(req.body);
    
    if (errors.length > 0) {
      logger.warn('Bulk operation validation failed:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid bulk operation data provided',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Validation middleware error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export { VALID_STATUSES, VALID_PRIORITIES, VALID_BULK_OPERATIONS };
