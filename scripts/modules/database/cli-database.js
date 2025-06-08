/**
 * CLI-Specific Database Access Layer for TaskHero
 * Provides direct SQLite access for CLI commands without API dependencies
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable verbose mode for debugging
sqlite3.verbose();

class CLIDatabase {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<void>}
   */
  async initialize(projectRoot = process.cwd()) {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      const dbPath = path.join(projectRoot, '.taskmaster', 'taskhero.db');
      
      // Ensure .taskmaster directory exists
      const taskMasterDir = path.dirname(dbPath);
      if (!fs.existsSync(taskMasterDir)) {
        fs.mkdirSync(taskMasterDir, { recursive: true });
      }

      // Create database connection
      this.db = new sqlite3.Database(dbPath);
      
      // Promisify database methods
      this.db.runAsync = promisify(this.db.run.bind(this.db));
      this.db.getAsync = promisify(this.db.get.bind(this.db));
      this.db.allAsync = promisify(this.db.all.bind(this.db));

      // Enable foreign keys
      await this.db.runAsync('PRAGMA foreign_keys = ON');

      // Initialize schema if needed
      await this.initializeSchema();

      this.isInitialized = true;
      console.log(`Database initialized: ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }



  /**
   * Initialize database schema
   * @returns {Promise<void>}
   */
  async initializeSchema() {
    try {
      // Check if tables exist
      const tables = await this.db.allAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      const tableNames = tables.map(t => t.name);

      // Create projects table if it doesn't exist
      if (!tableNames.includes('projects')) {
        await this.db.runAsync(`
          CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            root_path TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
            metadata TEXT DEFAULT '{}'
          )
        `);
        console.log('Created projects table');
      }

      // Create tasks table if it doesn't exist
      if (!tableNames.includes('tasks')) {
        await this.db.runAsync(`
          CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            prd_id INTEGER,
            parent_task_id INTEGER,
            task_identifier TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            details TEXT,
            test_strategy TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled')),
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            complexity_score REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT DEFAULT '{}',
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (prd_id) REFERENCES prds(id),
            FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
          )
        `);
        console.log('Created tasks table');
      }

      // Create prds table if it doesn't exist
      if (!tableNames.includes('prds')) {
        await this.db.runAsync(`
          CREATE TABLE prds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            prd_identifier TEXT NOT NULL,
            title TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_hash TEXT,
            file_size INTEGER,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'archived')),
            complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            description TEXT,
            tags TEXT DEFAULT '[]',
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
            task_stats TEXT DEFAULT '{}',
            metadata TEXT DEFAULT '{}',
            FOREIGN KEY (project_id) REFERENCES projects(id)
          )
        `);
        console.log('Created prds table');
      }

    } catch (error) {
      console.error('Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get current project ID (assumes single project for CLI)
   * @returns {Promise<number>}
   */
  async getCurrentProjectId() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const project = await this.db.getAsync(
        'SELECT id FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT 1',
        ['active']
      );
      
      if (!project) {
        // Create default project if none exists
        await this.db.runAsync(
          'INSERT INTO projects (name, description, root_path) VALUES (?, ?, ?)',
          ['Default Project', 'Default TaskHero project', process.cwd()]
        );

        // Get the inserted project ID
        const newProject = await this.db.getAsync(
          'SELECT id FROM projects WHERE root_path = ? ORDER BY created_at DESC LIMIT 1',
          [process.cwd()]
        );
        return newProject.id;
      }
      
      return project.id;
    } catch (error) {
      console.error('Failed to get current project ID:', error);
      throw error;
    }
  }

  /**
   * Get all tasks with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getTasks(filters = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      let query = `
        SELECT 
          t.*,
          p.prd_identifier,
          p.file_name as prd_file_name,
          p.file_path as prd_file_path
        FROM tasks t
        LEFT JOIN prds p ON t.prd_id = p.id
        WHERE t.project_id = ?
      `;
      const params = [projectId];

      // Apply filters
      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }

      if (filters.prdId) {
        query += ' AND t.prd_id = ?';
        params.push(filters.prdId);
      }

      if (filters.search) {
        query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Add ordering
      query += ' ORDER BY t.task_identifier';

      const tasks = await this.db.allAsync(query, params);
      
      // Transform database format to CLI format
      return tasks.map(task => this.transformTaskFromDB(task));
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw error;
    }
  }

  /**
   * Get a single task by ID
   * @param {string|number} taskId - Task ID
   * @returns {Promise<Object|null>}
   */
  async getTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      const task = await this.db.getAsync(
        `SELECT 
          t.*,
          p.prd_identifier,
          p.file_name as prd_file_name,
          p.file_path as prd_file_path
        FROM tasks t
        LEFT JOIN prds p ON t.prd_id = p.id
        WHERE t.project_id = ? AND t.task_identifier = ?`,
        [projectId, String(taskId)]
      );

      return task ? this.transformTaskFromDB(task) : null;
    } catch (error) {
      console.error('Failed to get task:', error);
      throw error;
    }
  }

  /**
   * Update task status
   * @param {string|number} taskId - Task ID
   * @param {string} status - New status
   * @returns {Promise<boolean>}
   */
  async updateTaskStatus(taskId, status) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();

      // Use a Promise wrapper to get the proper result
      const result = await new Promise((resolve, reject) => {
        this.db.run(
          'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND task_identifier = ?',
          [status, projectId, String(taskId)],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ changes: this.changes });
            }
          }
        );
      });

      return result.changes > 0;
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  }

  /**
   * Transform database task format to CLI format
   * @param {Object} dbTask - Task from database
   * @returns {Object} - CLI format task
   */
  transformTaskFromDB(dbTask) {
    const task = {
      id: dbTask.task_identifier,
      title: dbTask.title,
      description: dbTask.description,
      details: dbTask.details,
      status: dbTask.status,
      priority: dbTask.priority,
      dependencies: dbTask.metadata ? JSON.parse(dbTask.metadata).dependencies || [] : [],
      complexityScore: dbTask.complexity_score,
      created: dbTask.created_at,
      updated: dbTask.updated_at
    };

    // Add PRD source if available
    if (dbTask.prd_file_name) {
      task.prdSource = {
        fileName: dbTask.prd_file_name,
        filePath: dbTask.prd_file_path,
        prdId: dbTask.prd_id
      };
    }

    return task;
  }

  /**
   * Get tasks ready to work on (no dependencies or satisfied dependencies)
   * @returns {Promise<Array>}
   */
  async getNextTasks() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const allTasks = await this.getTasks();

      // Get completed task IDs
      const completedIds = new Set(
        allTasks
          .filter(t => t.status === 'done' || t.status === 'completed')
          .map(t => String(t.id))
      );

      // Find tasks with no dependencies or satisfied dependencies
      const eligibleTasks = allTasks.filter(task => {
        const status = (task.status || 'pending').toLowerCase();
        if (status !== 'pending') return false;

        const deps = task.dependencies || [];
        return deps.every(depId => completedIds.has(String(depId)));
      });

      return eligibleTasks;
    } catch (error) {
      console.error('Failed to get next tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>}
   */
  async createTask(taskData) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();

      // Generate next task identifier
      const lastTask = await this.db.getAsync(
        'SELECT task_identifier FROM tasks WHERE project_id = ? ORDER BY CAST(task_identifier AS INTEGER) DESC LIMIT 1',
        [projectId]
      );

      const nextId = lastTask ? parseInt(lastTask.task_identifier) + 1 : 1;

      const metadata = JSON.stringify({
        dependencies: taskData.dependencies || [],
        ...taskData.metadata
      });

      await this.db.runAsync(
        `INSERT INTO tasks (
          project_id, task_identifier, title, description, details,
          status, priority, complexity_score, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          String(nextId),
          taskData.title,
          taskData.description || '',
          taskData.details || '',
          taskData.status || 'pending',
          taskData.priority || 'medium',
          taskData.complexityScore || 0,
          metadata
        ]
      );

      return await this.getTask(nextId);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  /**
   * Get subtasks for a parent task
   * @param {string|number} parentTaskId - Parent task ID
   * @returns {Promise<Array>}
   */
  async getSubtasks(parentTaskId) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      const subtasks = await this.db.allAsync(
        `SELECT
          t.*,
          p.prd_identifier,
          p.file_name as prd_file_name,
          p.file_path as prd_file_path
        FROM tasks t
        LEFT JOIN prds p ON t.prd_id = p.id
        WHERE t.project_id = ? AND t.task_identifier LIKE ?
        ORDER BY t.task_identifier`,
        [projectId, `${parentTaskId}.%`]
      );

      return subtasks.map(task => this.transformTaskFromDB(task));
    } catch (error) {
      console.error('Failed to get subtasks:', error);
      throw error;
    }
  }

  /**
   * Get task dependencies (tasks this task depends on)
   * @param {string|number} taskId - Task ID
   * @returns {Promise<Array>}
   */
  async getTaskDependencies(taskId) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const task = await this.getTask(taskId);
      if (!task || !task.dependencies || task.dependencies.length === 0) {
        return [];
      }

      const projectId = await this.getCurrentProjectId();
      const placeholders = task.dependencies.map(() => '?').join(',');

      const dependencies = await this.db.allAsync(
        `SELECT
          task_identifier as depends_on_identifier,
          title as depends_on_title,
          status as depends_on_status
        FROM tasks
        WHERE project_id = ? AND task_identifier IN (${placeholders})`,
        [projectId, ...task.dependencies]
      );

      return dependencies;
    } catch (error) {
      console.error('Failed to get task dependencies:', error);
      throw error;
    }
  }

  /**
   * Get tasks that depend on this task
   * @param {string|number} taskId - Task ID
   * @returns {Promise<Array>}
   */
  async getTaskDependents(taskId) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      const allTasks = await this.db.allAsync(
        'SELECT task_identifier, title, status, metadata FROM tasks WHERE project_id = ?',
        [projectId]
      );

      const dependents = [];
      for (const task of allTasks) {
        try {
          const metadata = JSON.parse(task.metadata || '{}');
          const dependencies = metadata.dependencies || [];

          if (dependencies.includes(String(taskId))) {
            dependents.push({
              task_identifier: task.task_identifier,
              title: task.title,
              status: task.status
            });
          }
        } catch (e) {
          // Skip tasks with invalid metadata
          continue;
        }
      }

      return dependents;
    } catch (error) {
      console.error('Failed to get task dependents:', error);
      throw error;
    }
  }

  /**
   * Update a task
   * @param {string|number} taskId - Task ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>}
   */
  async updateTask(taskId, updates) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();

      // Build dynamic update query
      const fields = [];
      const values = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }

      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }

      if (updates.details !== undefined) {
        fields.push('details = ?');
        values.push(updates.details);
      }

      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }

      if (updates.priority !== undefined) {
        fields.push('priority = ?');
        values.push(updates.priority);
      }

      if (updates.complexityScore !== undefined) {
        fields.push('complexity_score = ?');
        values.push(updates.complexityScore);
      }

      if (updates.dependencies !== undefined || updates.metadata !== undefined) {
        // Get current metadata
        const currentTask = await this.getTask(taskId);
        const currentMetadata = currentTask ? JSON.parse(currentTask.metadata || '{}') : {};

        const newMetadata = {
          ...currentMetadata,
          ...(updates.metadata || {}),
          dependencies: updates.dependencies !== undefined ? updates.dependencies : currentMetadata.dependencies
        };

        fields.push('metadata = ?');
        values.push(JSON.stringify(newMetadata));
      }

      if (fields.length === 0) {
        return await this.getTask(taskId);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(projectId, String(taskId));

      const query = `UPDATE tasks SET ${fields.join(', ')} WHERE project_id = ? AND task_identifier = ?`;

      const result = await this.db.runAsync(query, values);

      if (result.changes > 0) {
        return await this.getTask(taskId);
      }

      return null;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   * @param {string|number} taskId - Task ID
   * @returns {Promise<boolean>}
   */
  async deleteTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      const result = await this.db.runAsync(
        'DELETE FROM tasks WHERE project_id = ? AND task_identifier = ?',
        [projectId, String(taskId)]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for the current project
   * @returns {Promise<Array>}
   */
  async getAllTasks() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();
      const tasks = await this.db.allAsync(
        `SELECT
          t.*,
          p.prd_identifier,
          p.file_name as prd_file_name,
          p.file_path as prd_file_path
        FROM tasks t
        LEFT JOIN prds p ON t.prd_id = p.id
        WHERE t.project_id = ?
        ORDER BY t.task_identifier`,
        [projectId]
      );

      return tasks.map(task => this.transformTaskFromDB(task));
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   * @returns {Promise<Object>}
   */
  async getTaskStats() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const projectId = await this.getCurrentProjectId();

      const stats = await this.db.getAsync(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' OR status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
          SUM(CASE WHEN status = 'deferred' THEN 1 ELSE 0 END) as deferred,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM tasks
        WHERE project_id = ?
      `, [projectId]);

      const completionPercentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

      return {
        ...stats,
        completionPercentage
      };
    } catch (error) {
      console.error('Failed to get task stats:', error);
      throw error;
    }
  }
}

// Singleton instance
const cliDatabase = new CLIDatabase();

export default cliDatabase;
