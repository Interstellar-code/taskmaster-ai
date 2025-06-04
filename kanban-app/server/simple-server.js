import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Helper function to resolve project root
function resolveProjectRoot() {
  return path.resolve(__dirname, '../..');
}

// Legacy path for tasks file
const TASKS_FILE_PATH = path.join(__dirname, '../../.taskmaster/tasks/tasks.json');

// Helper function to read tasks
async function readTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return { tasks: [] };
  }
}

// Helper function to write tasks
async function writeTasks(tasksData) {
  try {
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasksData, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing tasks:', error);
    return false;
  }
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TaskMaster Kanban API Server (Simple)',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      taskhero: '/api/taskhero'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksData = await readTasks();
    const tasks = tasksData.tasks || [];
    
    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
      source: 'Simple Server',
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

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tasksData = await readTasks();
    const tasks = tasksData.tasks || [];
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Task with ID ${id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: task,
      source: 'Simple Server',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Update task status
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
    
    const tasksData = await readTasks();
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
    const writeSuccess = await writeTasks({ ...tasksData, tasks });
    
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
      source: 'Simple Server',
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

// Get project info
app.get('/api/taskhero/info', async (req, res) => {
  try {
    const tasksData = await readTasks();
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
        coreIntegration: false
      },
      source: 'Simple Server',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project info',
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskMaster Simple API Server running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Tasks API: http://localhost:${PORT}/api/tasks`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

export default app;
