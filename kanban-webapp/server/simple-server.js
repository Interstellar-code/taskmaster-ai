import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Path to tasks file
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
    message: 'TaskMaster Kanban API Server (Simple Mode)',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      tasks: '/api/v1/tasks',
      updateStatus: '/api/v1/tasks/:id/status'
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
    version: process.version
  });
});

// Get all tasks
app.get('/api/v1/tasks', async (req, res) => {
  try {
    const tasksData = await readTasks();
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
      source: 'Simple File Mode',
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

// Update task status
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
    
    const tasksData = await readTasks();
    const tasks = tasksData.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id.toString() === id.toString());
    
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
      source: 'Simple File Mode',
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
  console.log(`🚀 TaskMaster Kanban API Server (Simple Mode) running on port ${PORT}`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Tasks API: http://localhost:${PORT}/api/v1/tasks`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

export default app;
