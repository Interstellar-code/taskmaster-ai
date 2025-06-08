#!/usr/bin/env node

/**
 * TaskHero API Server Startup Script
 * Starts the API server with proper configuration and error handling
 */

import { startServer, logger } from './server.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createServer } from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_PORT = 3001;
const DEFAULT_PROJECT_ROOT = process.cwd();

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: DEFAULT_PORT,
    projectRoot: DEFAULT_PROJECT_ROOT,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--port':
      case '-p':
        config.port = parseInt(args[++i]) || DEFAULT_PORT;
        break;
        
      case '--project-root':
      case '--project':
      case '-r':
        config.projectRoot = args[++i] || DEFAULT_PROJECT_ROOT;
        break;
        
      case '--help':
      case '-h':
        config.help = true;
        break;
        
      default:
        if (arg.startsWith('--port=')) {
          config.port = parseInt(arg.split('=')[1]) || DEFAULT_PORT;
        } else if (arg.startsWith('--project-root=')) {
          config.projectRoot = arg.split('=')[1] || DEFAULT_PROJECT_ROOT;
        } else if (!arg.startsWith('-')) {
          // Assume it's a project root path
          config.projectRoot = arg;
        }
    }
  }
  
  return config;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
TaskHero API Server

Usage: node start.js [options] [project-root]

Options:
  --port, -p <port>           Port to run the server on (default: 3001)
  --project-root, -r <path>   TaskHero project root directory (default: current directory)
  --help, -h                  Show this help message

Examples:
  node start.js                                    # Start with defaults
  node start.js --port 3002                       # Start on port 3002
  node start.js --project-root /path/to/project   # Start with specific project
  node start.js /path/to/project --port 3002      # Both project and port
  
Environment Variables:
  PORT                        Port to run the server on
  PROJECT_ROOT               TaskHero project root directory
  NODE_ENV                   Environment (development, production)
  LOG_LEVEL                  Logging level (error, warn, info, debug)
`);
}

/**
 * Validate project root
 */
async function validateProjectRoot(projectRoot) {
  try {
    // Check if directory exists
    const stats = await fs.stat(projectRoot);
    if (!stats.isDirectory()) {
      throw new Error('Project root is not a directory');
    }
    
    // Check if it's a TaskHero project
    const taskHeroDir = path.join(projectRoot, '.taskmaster');
    try {
      await fs.access(taskHeroDir);
    } catch (error) {
      logger.warn('Project root is not a TaskHero project', {
        projectRoot,
        message: 'No .taskmaster directory found. Server will start but some features may not work.'
      });
      return false;
    }
    
    return true;
  } catch (error) {
    throw new Error(`Invalid project root: ${error.message}`);
  }
}

/**
 * Check if port is available
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Find available port
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  
  while (port < startPort + 100) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Setup logging directory
 */
async function setupLogging() {
  const logsDir = path.join(__dirname, 'logs');
  
  try {
    await fs.access(logsDir);
  } catch (error) {
    await fs.mkdir(logsDir, { recursive: true });
    logger.info('Created logs directory', { logsDir });
  }
}

/**
 * Main startup function
 */
async function main() {
  try {
    // Parse command line arguments
    const config = parseArgs();
    
    // Show help if requested
    if (config.help) {
      showHelp();
      process.exit(0);
    }
    
    // Override with environment variables
    config.port = parseInt(process.env.PORT) || config.port;
    config.projectRoot = process.env.PROJECT_ROOT || config.projectRoot;
    
    logger.info('Starting TaskHero API Server', {
      port: config.port,
      projectRoot: config.projectRoot,
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
    
    // Setup logging directory
    await setupLogging();
    
    // Validate project root
    try {
      const isValidProject = await validateProjectRoot(config.projectRoot);
      if (!isValidProject) {
        logger.warn('Starting server without valid TaskHero project');
      }
    } catch (error) {
      logger.error('Project validation failed', { error: error.message });
      process.exit(1);
    }
    
    // Check if port is available
    const isPortAvailable = await checkPort(config.port);
    if (!isPortAvailable) {
      logger.warn('Requested port is not available', { port: config.port });
      
      try {
        const availablePort = await findAvailablePort(config.port);
        logger.info('Found available port', { port: availablePort });
        config.port = availablePort;
      } catch (error) {
        logger.error('Could not find available port', { error: error.message });
        process.exit(1);
      }
    }
    
    // Start the server
    const server = await startServer(config.port, config.projectRoot);
    
    logger.info('TaskHero API Server started successfully', {
      port: config.port,
      projectRoot: config.projectRoot,
      pid: process.pid
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error during startup:', error);
  process.exit(1);
});
