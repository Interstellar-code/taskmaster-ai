import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import {
	directFunctions,
	listTasksDirect,
	showTaskDirect,
	nextTaskDirect,
	setTaskStatusDirect
} from '../../mcp-server/src/core/task-master-core.js';
import { findTasksJsonPath } from '../../mcp-server/src/core/utils/path-utils.js';
import { createLogger } from './src/logger.js';
import mcpApiRoutes from './routes/mcp-api-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Create logger instance
const logger = createLogger('TaskMaster-API');

// TaskMaster Core Integration
let isTaskMasterInitialized = false;
let projectRoot = null;
let tasksJsonPath = null;

// Helper function to get available functions from the directFunctions Map
function getAvailableFunctions() {
	return Array.from(directFunctions.keys());
}

// Helper function to resolve project root (adapted for kanban-app location)
function resolveProjectRoot() {
	// The kanban-app is located within the TaskMaster project
	// Go up one level from kanban-app to reach the project root
	return path.resolve(__dirname, '../..');
}

// Legacy path for backward compatibility
const TASKS_FILE_PATH = path.join(__dirname, '../../.taskmaster/tasks/tasks.json');

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
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
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

    // Fallback to direct file reading if core not initialized
    const data = await fs.readFile(TASKS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading TaskMaster tasks:', error);
    return { tasks: [] };
  }
}

// Helper function to write TaskMaster tasks (using core integration)
async function writeTaskMasterTasks(tasksData) {
  try {
    // For now, always use direct file writing since we don't have a write function in the core
    // This could be enhanced later to use MCP functions for writing
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasksData, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing TaskMaster tasks:', error);
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
    logger.info(`📊 Found ${testResult.data.summary.totalTasks} tasks in the system`);

    return {
      success: true,
      projectRoot,
      tasksJsonPath,
      tasksCount: testResult.data.summary.totalTasks
    };
  } catch (error) {
    logger.error('❌ TaskMaster Core Integration initialization failed:', error.message);
    logger.warn('⚠️  Falling back to legacy file operations');
    isTaskMasterInitialized = false;

    // Store fallback state in app.locals
    app.locals.taskMasterInitialized = false;
    app.locals.projectRoot = null;
    app.locals.tasksJsonPath = null;

    return null;
  }
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TaskMaster Kanban API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    integration: isTaskMasterInitialized ? 'TaskMaster Core (Active)' : 'Legacy File Operations',
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
      'GET /api/v1/reports/complexity - Generate complexity report'
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

// Simple fallback tasks endpoint
app.get('/api/v1/tasks', async (req, res) => {
  try {
    const tasksData = await readTaskMasterTasks();
    const tasks = tasksData.tasks || [];

    res.json({
      success: true,
      data: {
        tasks: tasks,
        summary: {
          totalTasks: tasks.length,
          statusCounts: tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {})
        }
      },
      source: isTaskMasterInitialized ? 'TaskMaster Core' : 'Fallback Mode',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple fallback task status update endpoint
app.patch('/api/v1/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'status is required',
        timestamp: new Date().toISOString()
      });
    }

    const tasksData = await readTaskMasterTasks();
    const tasks = tasksData.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Task with ID ${id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }

    // Update task status
    tasks[taskIndex].status = status;
    tasks[taskIndex].updatedAt = new Date().toISOString();

    // Write back to file
    const writeSuccess = await writeTaskMasterTasks({ ...tasksData, tasks });

    if (!writeSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update task',
        message: 'Could not write to tasks file',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: tasks[taskIndex],
      message: 'Task status updated successfully',
      source: isTaskMasterInitialized ? 'TaskMaster Core' : 'Fallback Mode',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update task status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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

// Start server with TaskMaster core initialization
app.listen(PORT, async () => {
  logger.info(`🚀 TaskMaster Kanban API Server running on port ${PORT}`);
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

export default app;
