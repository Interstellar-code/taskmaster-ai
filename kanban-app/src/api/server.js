// ============================================================================
// LEGACY API SERVER - DISABLED
// ============================================================================
// This file contains the legacy API server that used MCP function calls.
// It has been disabled as part of Phase 3 API migration.
// The kanban app now uses the unified API server at /api/* endpoints.
//
// DO NOT USE THIS FILE - Use the unified API server instead:
// - Location: /api/server.js
// - Start command: cd ../api && node start.js
// ============================================================================

console.error('❌ LEGACY API SERVER DISABLED');
console.error('This legacy server with MCP calls has been disabled.');
console.error('Please use the unified API server instead:');
console.error('  cd ../api && node start.js');
console.error('Or run: npm run dev:server');
process.exit(1);

// Legacy imports (disabled)
/*
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';
import {
	directFunctions,
	listTasksDirect,
	showTaskDirect,
	nextTaskDirect,
	setTaskStatusDirect
} from '../../../mcp-server/src/core/task-master-core.js';
import { findTasksJsonPath } from '../../../mcp-server/src/core/utils/path-utils.js';
import { createLogger } from './logger.js';
import mcpApiRoutes from './routes.js';
import { findAvailablePort } from '../../../src/utils/port-utils.js';
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = process.env.PORT ? parseInt(process.env.PORT) : (process.env.API_PORT ? parseInt(process.env.API_PORT) : null);

// Create logger instance
const logger = createLogger('TaskHero-API');

// TaskMaster Core Integration
let isTaskMasterInitialized = false;
let projectRoot = null;
let tasksJsonPath = null;

// Helper function to get available functions from the directFunctions Map
function getAvailableFunctions() {
	return Array.from(directFunctions.keys());
}

// Helper function to resolve project root (use current working directory)
function resolveProjectRoot() {
	// When running as a global npm package, we need to use the current working directory
	// where the user executed the command, not the package installation directory
	const cwd = process.cwd();
	logger.info(`Resolving project root from current working directory: ${cwd}`);

	// Check if current directory has TaskMaster project markers
	const projectMarkers = ['.taskmaster', 'tasks', '.taskmaster/tasks', '.taskmaster/config.json'];
	const hasMarkers = projectMarkers.some(marker => {
		const markerPath = path.join(cwd, marker);
		const exists = fsSync.existsSync(markerPath);
		if (exists) {
			logger.info(`Found project marker: ${markerPath}`);
		}
		return exists;
	});

	if (hasMarkers) {
		logger.info(`Using current working directory as project root: ${cwd}`);
		return cwd;
	}

	// If no markers found in cwd, search parent directories
	let currentDir = cwd;
	const rootDir = path.parse(currentDir).root;

	while (currentDir !== rootDir) {
		const hasMarkersInParent = projectMarkers.some(marker => {
			return fsSync.existsSync(path.join(currentDir, marker));
		});

		if (hasMarkersInParent) {
			logger.info(`Found TaskMaster project in parent directory: ${currentDir}`);
			return currentDir;
		}

		currentDir = path.dirname(currentDir);
	}

	// Fallback to current working directory if no project markers found
	logger.warn(`No TaskMaster project markers found, using current directory: ${cwd}`);
	return cwd;
}

// Legacy path for backward compatibility - will be dynamically resolved
let TASKS_FILE_PATH = null;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration - Updated for kanban-app port
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Helper function to read TaskMaster tasks (using core integration)
async function readTaskMasterTasks() {
  try {
    if (isTaskMasterInitialized && tasksJsonPath) {
      // Use the direct function to read tasks
      const result = await listTasksDirect({ tasksJsonPath }, logger);
      if (result.success) {
        return {
          tasks: result.data.tasks || [],
          summary: result.data.summary,
          lastUpdated: new Date().toISOString()
        };
      }
    }

    // Ensure legacy path is set if not already
    if (!TASKS_FILE_PATH) {
      const fallbackProjectRoot = resolveProjectRoot();
      TASKS_FILE_PATH = path.join(fallbackProjectRoot, '.taskmaster/tasks/tasks.json');
      logger.info(`Setting fallback tasks file path: ${TASKS_FILE_PATH}`);
    }

    // Fallback to direct file reading if core not initialized
    const data = await fs.readFile(TASKS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading TaskMaster tasks:', error);
    return { tasks: [] };
  }
}

// Helper function to write TaskMaster tasks (using core integration)
async function writeTaskMasterTasks(tasksData) {
  try {
    // Ensure legacy path is set if not already
    if (!TASKS_FILE_PATH) {
      const fallbackProjectRoot = resolveProjectRoot();
      TASKS_FILE_PATH = path.join(fallbackProjectRoot, '.taskmaster/tasks/tasks.json');
      logger.info(`Setting fallback tasks file path for writing: ${TASKS_FILE_PATH}`);
    }

    // For now, always use direct file writing since we don't have a write function in the core
    // This could be enhanced later to use MCP functions for writing
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasksData, null, 2));
    return true;
  } catch (error) {
    logger.error('Error writing TaskMaster tasks:', error);
    return false;
  }
}

// Legacy helper functions for backward compatibility
const readTaskHeroTasks = readTaskMasterTasks;
const writeTaskHeroTasks = writeTaskMasterTasks;

// Initialize TaskMaster Core Integration
async function initializeTaskMasterCore() {
  try {
    logger.info('🔧 Initializing TaskMaster Core Integration...');

    // Resolve project root
    projectRoot = resolveProjectRoot();
    logger.info(`Project root resolved to: ${projectRoot}`);

    // Set legacy path for backward compatibility
    TASKS_FILE_PATH = path.join(projectRoot, '.taskmaster/tasks/tasks.json');
    logger.info(`Legacy tasks file path set to: ${TASKS_FILE_PATH}`);

    // Find tasks.json path
    tasksJsonPath = findTasksJsonPath({ projectRoot }, logger);
    logger.info(`Tasks file found at: ${tasksJsonPath}`);

    // Test core functionality by listing tasks
    const testResult = await listTasksDirect({ tasksJsonPath }, logger);
    if (!testResult.success) {
      throw new Error(`Core function test failed: ${testResult.error.message}`);
    }

    isTaskMasterInitialized = true;

    // Store state in app.locals
    app.locals.taskMasterInitialized = true;
    app.locals.projectRoot = projectRoot;
    app.locals.tasksJsonPath = tasksJsonPath;

    logger.info('✅ TaskMaster Core Integration initialized successfully');
    const taskCount = testResult.data?.summary?.totalTasks || testResult.data?.tasks?.length || 0;
    logger.info(`📊 Found ${taskCount} tasks in the system`);

    return {
      success: true,
      projectRoot,
      tasksJsonPath,
      tasksCount: taskCount
    };
  } catch (error) {
    logger.error('❌ TaskMaster Core Integration initialization failed:', error.message);
    logger.warn('⚠️  Falling back to legacy file operations');
    isTaskMasterInitialized = false;

    // Still try to resolve project root for legacy operations
    try {
      projectRoot = resolveProjectRoot();
      TASKS_FILE_PATH = path.join(projectRoot, '.taskmaster/tasks/tasks.json');
      logger.info(`Fallback: Using legacy path: ${TASKS_FILE_PATH}`);
    } catch (fallbackError) {
      logger.error('❌ Even fallback project root resolution failed:', fallbackError.message);
    }

    // Store fallback state in app.locals
    app.locals.taskMasterInitialized = false;
    app.locals.projectRoot = projectRoot;
    app.locals.tasksJsonPath = TASKS_FILE_PATH;

    return null;
  }
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TaskHero Kanban API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    integration: isTaskMasterInitialized ? 'TaskHero Core (Active)' : 'Legacy File Operations',
    coreInitialized: isTaskMasterInitialized,
    availableFunctions: isTaskMasterInitialized ? getAvailableFunctions() : [],
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      taskhero: '/api/taskhero',
      core: '/api/core'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version,
    taskhero_integration: 'active'
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'TaskHero Kanban API',
    version: '1.0.0',
    integration: 'TaskHero Core Tasks',
    availableRoutes: [
      'GET /api/tasks - Get all TaskHero tasks',
      'GET /api/tasks/:id - Get TaskHero task by ID',
      'PUT /api/tasks/:id/status - Update task status',
      'GET /api/taskhero/info - Get TaskHero project info'
    ],
    mcpApiRoutes: [
      'GET /api/v1/tasks - List all tasks',
      'POST /api/v1/tasks - Add new task',
      'GET /api/v1/tasks/next - Get next available task',
      'GET /api/v1/tasks/:id - Show task details',
      'PATCH /api/v1/tasks/:id/status - Update task status',
      'PUT /api/v1/tasks/:id - Update task',
      'DELETE /api/v1/tasks/:id - Remove task',
      'POST /api/v1/tasks/:id/dependencies - Add dependency',
      'DELETE /api/v1/tasks/:id/dependencies/:depId - Remove dependency',
      'POST /api/v1/tasks/:id/subtasks - Add subtask',
      'PUT /api/v1/tasks/:parentId/subtasks/:subtaskId - Update subtask',
      'DELETE /api/v1/tasks/:parentId/subtasks/:subtaskId - Remove subtask',
      'POST /api/v1/tasks/:id/expand - Expand task into subtasks',
      'GET /api/v1/tasks/validate-dependencies - Validate dependencies',
      'POST /api/v1/tasks/fix-dependencies - Fix dependencies',
      'GET /api/v1/reports/complexity - Generate complexity report',
      'GET /api/v1/prds - List all PRDs',
      'GET /api/v1/prds/:id - Get PRD details',
      'PATCH /api/v1/prds/:id/status - Update PRD status',
      'PUT /api/v1/prds/:id - Update PRD metadata'
    ]
  });
});

// Get all TaskHero tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksData = await readTaskHeroTasks();
    const tasks = tasksData.tasks || [];

    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
      source: 'TaskHero Core',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TaskHero tasks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get TaskHero task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tasksData = await readTaskHeroTasks();
    const tasks = tasksData.tasks || [];
    const task = tasks.find(t => t.id === id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `TaskHero task with ID ${id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: task,
      source: 'TaskHero Core',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TaskHero task',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Update TaskHero task status
app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Status is required',
        timestamp: new Date().toISOString()
      });
    }

    const tasksData = await readTaskHeroTasks();
    const tasks = tasksData.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `TaskHero task with ID ${id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }

    // Update task status
    tasks[taskIndex].status = status;
    tasks[taskIndex].updatedAt = new Date().toISOString();

    // Write back to TaskHero
    const writeSuccess = await writeTaskHeroTasks({ ...tasksData, tasks });

    if (!writeSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update TaskHero task',
        message: 'Could not write to TaskHero tasks file',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: tasks[taskIndex],
      message: 'TaskHero task status updated successfully',
      source: 'TaskHero Core',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update TaskHero task status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get TaskMaster project info (enhanced with core integration)
app.get('/api/taskhero/info', async (req, res) => {
  try {
    const tasksData = await readTaskMasterTasks();
    const tasks = tasksData.tasks || [];

    // Calculate statistics
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const priorityCounts = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        statusBreakdown: statusCounts,
        priorityBreakdown: priorityCounts,
        lastUpdated: tasksData.lastUpdated || null,
        projectName: tasksData.projectName || 'TaskMaster Project',
        coreIntegration: isTaskMasterInitialized
      },
      source: isTaskMasterInitialized ? 'TaskMaster Core' : 'Legacy File Operations',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TaskMaster project info',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// TaskMaster Core Status Endpoint
app.get('/api/core/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        initialized: isTaskMasterInitialized,
        projectRoot: projectRoot,
        tasksJsonPath: tasksJsonPath,
        availableFunctions: getAvailableFunctions(),
        coreStructure: {
          directFunctions: getAvailableFunctions().length,
          pathUtils: true,
          logger: true
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get core status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get TaskMaster core status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Note: Tasks listing endpoint is now handled by MCP routes at /api/v1/tasks

// Note: Task status update endpoint is now handled by MCP routes at /api/v1/tasks/:id/status

// ============================================================================
// MCP API ROUTES - All TaskMaster MCP Direct Functions as REST Endpoints
// ============================================================================
app.use('/api/v1', mcpApiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server with TaskMaster core initialization and dynamic port discovery
async function startServer() {
  try {
    // Find available port if not specified via environment
    if (!PORT) {
      PORT = await findAvailablePort(3003);
      logger.info(`🔍 Found available API port: ${PORT}`);
    }
    
    const server = app.listen(PORT, async () => {
      logger.info(`🚀 TaskHero Kanban API Server running on port ${PORT}`);
      logger.info(`📍 Server URL: http://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/api`);
      logger.info(`⏰ Started at: ${new Date().toISOString()}`);

      // Initialize TaskMaster Core Integration (with timeout)
      try {
        const initPromise = initializeTaskMasterCore();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );

        const initResult = await Promise.race([initPromise, timeoutPromise]);

        logger.info(`🎯 TaskMaster Core Status: ${isTaskMasterInitialized ? 'Active' : 'Fallback Mode'}`);
        if (isTaskMasterInitialized) {
          logger.info(`📁 Project Root: ${projectRoot}`);
          logger.info(`📄 Tasks File: ${tasksJsonPath}`);
          logger.info(`🔧 Available Functions: ${getAvailableFunctions().length}`);
        }
      } catch (error) {
        logger.error(`❌ TaskMaster Core initialization failed: ${error.message}`);
        logger.info(`⚠️  Running in fallback mode`);
        isTaskMasterInitialized = false;
        app.locals.taskMasterInitialized = false;
      }

      logger.info(`🧪 Test endpoints: http://localhost:${PORT}/api/core/status`);
      logger.info(`📋 List tasks: http://localhost:${PORT}/api/v1/tasks`);
      logger.info(`➡️  Next task: http://localhost:${PORT}/api/core/tasks/next`);
    });
    
    // Store the actual port used for export
    app.locals.actualPort = PORT;
    
    return server;
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Only start the server if not being imported for integration
// By default, we use integrated mode through the web server
// But allow standalone startup for development mode
if (!process.env.SKIP_API_STARTUP) {
  // Start the server
  const server = await startServer();
}

export default app;
