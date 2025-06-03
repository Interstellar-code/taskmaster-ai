import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// TaskHero integration - path to tasks.json
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

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper function to read TaskHero tasks
async function readTaskHeroTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading TaskHero tasks:', error);
    return { tasks: [] };
  }
}

// Helper function to write TaskHero tasks
async function writeTaskHeroTasks(tasksData) {
  try {
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasksData, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing TaskHero tasks:', error);
    return false;
  }
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TaskHero Kanban API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    integration: 'TaskHero Core',
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      taskhero: '/api/taskhero'
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

// Get TaskHero project info
app.get('/api/taskhero/info', async (req, res) => {
  try {
    const tasksData = await readTaskHeroTasks();
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
        projectName: tasksData.projectName || 'TaskHero Project'
      },
      source: 'TaskHero Core',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TaskHero project info',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskHero Kanban API Server running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`🔗 TaskHero Integration: ${TASKS_FILE_PATH}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

export default app;
