/**
 * Task Data Access Object
 * Handles all database operations for tasks
 */

import { BaseDAO } from './BaseDAO.js';

export class TaskDAO extends BaseDAO {
  constructor() {
    super('tasks');
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async create(taskData) {
    const validation = this.validateData(taskData, 'create');
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const preparedData = this.prepareData(taskData);
    return await super.create(preparedData);
  }

  /**
   * Find tasks by project ID
   * @param {number} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tasks
   */
  async findByProjectId(projectId, options = {}) {
    return await this.findAll({ project_id: projectId }, options);
  }

  /**
   * Find tasks by PRD ID
   * @param {number} prdId - PRD ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tasks
   */
  async findByPrdId(prdId, options = {}) {
    return await this.findAll({ prd_id: prdId }, options);
  }

  /**
   * Find tasks by status
   * @param {string} status - Task status
   * @param {number} projectId - Optional project ID filter
   * @returns {Promise<Array>} Array of tasks
   */
  async findByStatus(status, projectId = null) {
    const filters = { status };
    if (projectId) {
      filters.project_id = projectId;
    }
    return await this.findAll(filters, { orderBy: 'created_at', orderDirection: 'DESC' });
  }

  /**
   * Find subtasks of a parent task
   * @param {number} parentTaskId - Parent task ID
   * @returns {Promise<Array>} Array of subtasks
   */
  async findSubtasks(parentTaskId) {
    return await this.findAll({ parent_task_id: parentTaskId }, { orderBy: 'task_identifier' });
  }

  /**
   * Find root tasks (tasks without parent)
   * @param {number} projectId - Project ID
   * @returns {Promise<Array>} Array of root tasks
   */
  async findRootTasks(projectId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE project_id = ? AND parent_task_id IS NULL ORDER BY task_identifier`;
    const results = await this.db.getAllQuery(sql, [projectId]);
    return results.map(record => this.parseRecord(record));
  }

  /**
   * Get task with its dependencies
   * @param {number} taskId - Task ID
   * @returns {Promise<Object|null>} Task with dependencies
   */
  async findWithDependencies(taskId) {
    const task = await this.findById(taskId);
    if (!task) return null;

    // Get dependencies (tasks this task depends on)
    const dependenciesSQL = `
      SELECT t.*, td.dependency_type 
      FROM tasks t 
      JOIN task_dependencies td ON t.id = td.depends_on_task_id 
      WHERE td.task_id = ?
    `;
    const dependencies = await this.db.getAllQuery(dependenciesSQL, [taskId]);

    // Get dependents (tasks that depend on this task)
    const dependentsSQL = `
      SELECT t.*, td.dependency_type 
      FROM tasks t 
      JOIN task_dependencies td ON t.id = td.task_id 
      WHERE td.depends_on_task_id = ?
    `;
    const dependents = await this.db.getAllQuery(dependentsSQL, [taskId]);

    return {
      ...task,
      dependencies: dependencies.map(record => this.parseRecord(record)),
      dependents: dependents.map(record => this.parseRecord(record))
    };
  }

  /**
   * Update task status
   * @param {number} taskId - Task ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated task
   */
  async updateStatus(taskId, status) {
    const validStatuses = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await this.update(taskId, { status });
  }

  /**
   * Get next available task identifier for a project
   * @param {number} projectId - Project ID
   * @param {number} parentTaskId - Parent task ID (for subtasks)
   * @returns {Promise<string>} Next task identifier
   */
  async getNextTaskIdentifier(projectId, parentTaskId = null) {
    let sql, params;
    
    if (parentTaskId) {
      // Get parent task identifier
      const parentTask = await this.findById(parentTaskId);
      if (!parentTask) {
        throw new Error('Parent task not found');
      }

      // Find highest subtask number
      sql = `
        SELECT task_identifier 
        FROM ${this.tableName} 
        WHERE project_id = ? AND parent_task_id = ? 
        ORDER BY task_identifier DESC 
        LIMIT 1
      `;
      params = [projectId, parentTaskId];
      
      const lastSubtask = await this.db.getQuery(sql, params);
      
      if (lastSubtask) {
        const parts = lastSubtask.task_identifier.split('.');
        const lastNumber = parseInt(parts[parts.length - 1]);
        return `${parentTask.task_identifier}.${lastNumber + 1}`;
      } else {
        return `${parentTask.task_identifier}.1`;
      }
    } else {
      // Find highest root task number
      sql = `
        SELECT task_identifier 
        FROM ${this.tableName} 
        WHERE project_id = ? AND parent_task_id IS NULL 
        ORDER BY CAST(task_identifier AS INTEGER) DESC 
        LIMIT 1
      `;
      params = [projectId];
      
      const lastTask = await this.db.getQuery(sql, params);
      
      if (lastTask) {
        const lastNumber = parseInt(lastTask.task_identifier);
        return (lastNumber + 1).toString();
      } else {
        return '1';
      }
    }
  }

  /**
   * Get task statistics for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Task statistics
   */
  async getProjectStats(projectId) {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM ${this.tableName} 
      WHERE project_id = ? 
      GROUP BY status
    `;
    
    const results = await this.db.getAllQuery(sql, [projectId]);
    
    const stats = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      done: 0,
      review: 0,
      blocked: 0,
      deferred: 0,
      cancelled: 0
    };

    results.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });

    return stats;
  }

  /**
   * Parse database record with task-specific JSON fields
   * @param {Object} record - Raw database record
   * @returns {Object} Parsed record
   */
  parseRecord(record) {
    if (!record) return null;
    
    const parsed = super.parseRecord(record);
    
    // Parse task-specific JSON fields
    if (parsed.metadata && typeof parsed.metadata === 'string') {
      try {
        parsed.metadata = JSON.parse(parsed.metadata);
      } catch (e) {
        parsed.metadata = {};
      }
    }

    return parsed;
  }

  /**
   * Prepare task data for database insertion
   * @param {Object} data - Task data
   * @returns {Object} Prepared data
   */
  prepareData(data) {
    const prepared = super.prepareData(data);
    
    // Ensure required fields have defaults
    if (!prepared.status) {
      prepared.status = 'pending';
    }
    
    if (!prepared.priority) {
      prepared.priority = 'medium';
    }
    
    if (!prepared.complexity_score) {
      prepared.complexity_score = 0.0;
    }

    return prepared;
  }

  /**
   * Get task dependencies
   * @param {number} taskId - Task ID
   * @returns {Promise<Array>} Array of dependency tasks
   */
  async getDependencies(taskId) {
    const sql = `
      SELECT t.*, td.dependency_type
      FROM tasks t
      INNER JOIN task_dependencies td ON t.id = td.depends_on_task_id
      WHERE td.task_id = ?
      ORDER BY t.task_identifier
    `;

    const results = await this.db.getAllQuery(sql, [taskId]);
    return results.map(record => this.parseRecord(record));
  }

  /**
   * Add task dependencies
   * @param {number} taskId - Task ID
   * @param {Array} dependencyIds - Array of task IDs this task depends on
   * @returns {Promise<void>}
   */
  async addDependencies(taskId, dependencyIds) {
    const queries = dependencyIds.map(depId => ({
      sql: 'INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES (?, ?, ?)',
      params: [taskId, depId, 'blocks']
    }));

    return await this.db.transaction(queries);
  }

  /**
   * Add single task dependency
   * @param {number} taskId - Task ID
   * @param {number} dependsOnTaskId - Task ID this task depends on
   * @param {string} dependencyType - Type of dependency
   * @returns {Promise<void>}
   */
  async addDependency(taskId, dependsOnTaskId, dependencyType = 'blocks') {
    const sql = 'INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES (?, ?, ?)';
    return await this.db.runQuery(sql, [taskId, dependsOnTaskId, dependencyType]);
  }

  /**
   * Remove task dependency
   * @param {number} taskId - Task ID
   * @param {number} dependsOnTaskId - Task ID to remove dependency from
   * @returns {Promise<void>}
   */
  async removeDependency(taskId, dependsOnTaskId) {
    const sql = 'DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?';
    return await this.db.runQuery(sql, [taskId, dependsOnTaskId]);
  }

  /**
   * Update task dependencies
   * @param {number} taskId - Task ID
   * @param {Array} dependencyIds - New array of dependency IDs
   * @returns {Promise<void>}
   */
  async updateDependencies(taskId, dependencyIds) {
    // Remove existing dependencies
    await this.db.runQuery('DELETE FROM task_dependencies WHERE task_id = ?', [taskId]);

    // Add new dependencies
    if (dependencyIds && dependencyIds.length > 0) {
      await this.addDependencies(taskId, dependencyIds);
    }
  }

  /**
   * Override findAll to return pagination format expected by routes
   * @param {Object} filters - Filter conditions
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;

    // Clean filters - remove undefined values
    const cleanFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Map API field names to database field names
        if (key === 'prdId') {
          cleanFilters.prd_id = value;
        } else if (key === 'parentTaskId') {
          cleanFilters.parent_task_id = value;
        } else if (key !== 'search') {
          cleanFilters[key] = value;
        }
      }
    });

    // Handle search separately
    let searchCondition = '';
    let searchParams = [];
    if (filters.search) {
      searchCondition = ' AND (title LIKE ? OR description LIKE ?)';
      searchParams = [`%${filters.search}%`, `%${filters.search}%`];
    }

    // Build base query
    let sql = `SELECT * FROM ${this.tableName}`;
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params = [];

    // Add WHERE conditions
    if (Object.keys(cleanFilters).length > 0 || filters.search) {
      const conditions = Object.keys(cleanFilters).map(key => `${key} = ?`);
      const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}${searchCondition}` : ` WHERE 1=1${searchCondition}`;

      sql += whereClause;
      countSql += whereClause;

      params.push(...Object.values(cleanFilters), ...searchParams);
    }

    // Add ORDER BY
    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Add LIMIT and OFFSET
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute queries
    const [tasks, countResult] = await Promise.all([
      this.db.getAllQuery(sql, params),
      this.db.getQuery(countSql, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      tasks: tasks.map(record => this.parseRecord(record)),
      page,
      limit,
      total,
      totalPages
    };
  }

  /**
   * Find tasks by PRD ID (override to use correct field name)
   * @param {number} prdId - PRD ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tasks
   */
  async findByPrdId(prdId, options = {}) {
    return await super.findAll({ prd_id: prdId }, options);
  }

  /**
   * Validate task data
   * @param {Object} data - Task data
   * @param {string} operation - Operation type
   * @returns {Object} Validation result
   */
  validateData(data, operation = 'create') {
    const errors = [];

    if (operation === 'create') {
      if (!data.title || data.title.trim().length === 0) {
        errors.push('title is required');
      }
    }

    if (data.status) {
      const validStatuses = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    if (data.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(data.priority)) {
        errors.push(`Invalid priority: ${data.priority}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export default new TaskDAO();
