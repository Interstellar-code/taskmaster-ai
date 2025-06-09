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

    const preparedData = await this.prepareData(taskData);
    return await super.create(preparedData);
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
   * @returns {Promise<Array>} Array of tasks
   */
  async findByStatus(status) {
    const filters = { status };
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
   * @returns {Promise<Array>} Array of root tasks
   */
  async findRootTasks() {
    const sql = `SELECT * FROM ${this.tableName} WHERE parent_task_id IS NULL ORDER BY task_identifier`;
    const results = await this.db.getAllQuery(sql);
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
   * Get task statistics
   * @returns {Promise<Object>} Task statistics
   */
  async getStats() {
    const sql = `
      SELECT
        status,
        COUNT(*) as count
      FROM ${this.tableName}
      GROUP BY status
    `;

    const results = await this.db.getAllQuery(sql);

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

    // Create prd_source object if PRD information is available
    if (parsed.prd_file_name) {
      parsed.prd_source = {
        fileName: parsed.prd_file_name,
        filePath: parsed.prd_file_path,
        parsedDate: new Date().toISOString(), // Use current timestamp as default
        fileHash: parsed.prd_file_hash || '',
        fileSize: parsed.prd_file_size || 0
      };
      
      // Clean up the individual PRD fields from the parsed object
      delete parsed.prd_file_name;
      delete parsed.prd_file_path;
      delete parsed.prd_file_hash;
      delete parsed.prd_file_size;
      delete parsed.prd_title;
    }

    return parsed;
  }

  /**
   * Override findById to include PRD information
   * @param {number} id - Task ID
   * @returns {Promise<Object|null>} Task with PRD information or null
   */
  async findById(id) {
    try {
      const sql = `
        SELECT t.*, 
               p.file_name as prd_file_name,
               p.file_path as prd_file_path,
               p.title as prd_title,
               p.file_hash as prd_file_hash,
               p.file_size as prd_file_size
        FROM ${this.tableName} t
        LEFT JOIN prds p ON t.prd_id = p.id
        WHERE t.id = ?
      `;
      const result = await this.db.getQuery(sql, [id]);
      return this.parseRecord(result);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID with PRD info:`, error);
      throw error;
    }
  }

  /**
   * Prepare task data for database insertion
   * @param {Object} data - Task data
   * @returns {Object} Prepared data
   */
  async prepareData(data) {
    const prepared = super.prepareData(data);

    // Remove dependencies field - it's handled separately
    delete prepared.dependencies;

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

    // Remove task_identifier - we'll use the database ID instead
    delete prepared.task_identifier;

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
      ORDER BY t.id
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
          cleanFilters['t.prd_id'] = value;
        } else if (key === 'parentTaskId') {
          cleanFilters['t.parent_task_id'] = value;
        } else if (key !== 'search') {
          cleanFilters[`t.${key}`] = value;
        }
      }
    });

    // Handle search separately
    let searchCondition = '';
    let searchParams = [];
    if (filters.search) {
      searchCondition = ' AND (t.title LIKE ? OR t.description LIKE ?)';
      searchParams = [`%${filters.search}%`, `%${filters.search}%`];
    }

    // Build base query with LEFT JOIN to include PRD information
    let sql = `
      SELECT t.*, 
             p.file_name as prd_file_name,
             p.file_path as prd_file_path,
             p.title as prd_title,
             p.file_hash as prd_file_hash,
             p.file_size as prd_file_size
      FROM ${this.tableName} t
      LEFT JOIN prds p ON t.prd_id = p.id
    `;
    
    let countSql = `
      SELECT COUNT(*) as total 
      FROM ${this.tableName} t
      LEFT JOIN prds p ON t.prd_id = p.id
    `;
    
    const params = [];

    // Add WHERE conditions
    if (Object.keys(cleanFilters).length > 0 || filters.search) {
      const conditions = Object.keys(cleanFilters).map(key => `${key} = ?`);
      const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}${searchCondition}` : ` WHERE 1=1${searchCondition}`;

      sql += whereClause;
      countSql += whereClause;

      params.push(...Object.values(cleanFilters), ...searchParams);
    }

    // Add ORDER BY (handle table alias)
    const orderByField = sortBy === 'created_at' || sortBy === 'updated_at' ? `t.${sortBy}` : `t.${sortBy}`;
    sql += ` ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;

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
      const validPriorities = ['low', 'medium', 'high', 'critical'];
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
