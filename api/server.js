/**
 * TaskHero API Server
 * Main Express.js server with REST API endpoints and WebSocket support
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { validateProject } from './middleware/validateProject.js';
import { corsConfig } from './middleware/corsConfig.js';

// Import routes
import taskRoutes from './routes/tasks.js';
import prdRoutes from './routes/prds.js';
import configRoutes from './routes/config.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';

// Import WebSocket handlers
import { setupWebSocket } from './websocket/index.js';

// Import database utilities
import databaseManager from './utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'taskhero-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskHero API',
      version: '1.0.0',
      description: 'TaskHero AI Task Management API',
      contact: {
        name: 'TaskHero Support',
        url: 'https://github.com/Interstellar-code/taskmaster-ai'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './models/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Create and configure Express application
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }));

  // CORS configuration
  app.use(cors(corsConfig));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Project validation middleware for API routes
  app.use('/api', validateProject);

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check endpoint (no project validation needed)
  app.use('/health', healthRoutes);

  // API routes
  app.use('/api/tasks', taskRoutes);
  app.use('/api/prds', prdRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'TaskHero API Server',
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/health'
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the API server
 */
async function startServer(port = 3001, projectRoot = null) {
  try {
    // Initialize database if project root is provided
    if (projectRoot) {
      // Set PROJECT_ROOT environment variable for runtime use
      process.env.PROJECT_ROOT = projectRoot;
      await databaseManager.initialize(projectRoot);
      logger.info(`Database initialized for project: ${projectRoot}`);
    }

    const app = createApp();
    const server = createServer(app);

    // Setup WebSocket server
    const wss = new WebSocketServer({ server });
    setupWebSocket(wss, logger);

    // Start server
    server.listen(port, () => {
      logger.info(`TaskHero API Server running on port ${port}`);
      logger.info(`API Documentation: http://localhost:${port}/api-docs`);
      logger.info(`Health Check: http://localhost:${port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        databaseManager.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('HTTP server closed');
        databaseManager.close();
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { createApp, startServer, logger };
