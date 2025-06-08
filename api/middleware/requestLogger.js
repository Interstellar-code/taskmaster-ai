/**
 * Request logging middleware for TaskHero API
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Configure request logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/requests.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  // Generate correlation ID if not present
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Start timer
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
      'x-forwarded-for': req.headers['x-forwarded-for']
    },
    query: req.query,
    params: req.params
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(body).length,
      success: res.statusCode < 400
    });
    
    // Call original json method
    return originalJson.call(this, body);
  };
  
  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response if not already logged by res.json
    if (!res.headersSent) {
      logger.info('Outgoing response', {
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: typeof body === 'string' ? body.length : JSON.stringify(body).length,
        success: res.statusCode < 400
      });
    }
    
    // Call original send method
    return originalSend.call(this, body);
  };
  
  // Handle response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log if response wasn't logged by json/send overrides
    if (!res.headersSent) {
      logger.info('Request completed', {
        correlationId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: res.statusCode < 400
      });
    }
  });
  
  // Handle errors
  res.on('error', (error) => {
    const duration = Date.now() - startTime;

    logger.error('Response error', {
      correlationId,
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
  });
  
  next();
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }
    
    // Add performance header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
}

/**
 * Request size monitoring middleware
 */
export function requestSizeMonitor(req, res, next) {
  const contentLength = req.headers['content-length'];
  
  if (contentLength) {
    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
    
    // Log large requests (> 5MB)
    if (sizeInMB > 5) {
      logger.warn('Large request detected', {
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        size: `${sizeInMB.toFixed(2)}MB`
      });
    }
  }
  
  next();
}

export { logger };
