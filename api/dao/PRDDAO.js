/**
 * PRD Data Access Object
 * Handles all database operations for Product Requirements Documents
 */

import { BaseDAO } from './BaseDAO.js';

export class PRDDAO extends BaseDAO {
  constructor() {
    super('prds');
  }

  /**
   * Create a new PRD
   * @param {Object} prdData - PRD data
   * @returns {Promise<Object>} Created PRD
   */
  async create(prdData) {
    const validation = this.validateData(prdData, 'create');
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const preparedData = this.prepareData(prdData);
    return await super.create(preparedData);
  }

  /**
   * Override findAll to handle search and return pagination format expected by routes
   * @param {Object} filters - Filter conditions
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50, sortBy = 'created_date', sortOrder = 'DESC' } = pagination;

    // Build base query
    let sql = `SELECT * FROM ${this.tableName}`;
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    // Handle regular filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'search') {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    // Handle search separately
    if (filters.search) {
      conditions.push(`(title LIKE ? OR description LIKE ?)`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }

    // Add ORDER BY
    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Add LIMIT and OFFSET
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute queries
    const [prds, countResult] = await Promise.all([
      this.db.getAllQuery(sql, params),
      this.db.getQuery(countSql, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      prds: prds.map(record => this.parseRecord(record)),
      page,
      limit,
      total,
      totalPages
    };
  }

  /**
   * Find PRDs by project ID
   * @param {number} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of PRDs
   */
  async findByProjectId(projectId, options = {}) {
    return await this.findAll({ project_id: projectId }, {
      orderBy: 'created_date',
      orderDirection: 'DESC',
      ...options
    });
  }

  /**
   * Find PRDs by status
   * @param {string} status - PRD status
   * @param {number} projectId - Optional project ID filter
   * @returns {Promise<Array>} Array of PRDs
   */
  async findByStatus(status, projectId = null) {
    const filters = { status };
    if (projectId) {
      filters.project_id = projectId;
    }
    return await this.findAll(filters, { orderBy: 'created_date', orderDirection: 'DESC' });
  }

  /**
   * Find PRD by identifier
   * @param {string} prdIdentifier - PRD identifier
   * @param {number} projectId - Optional project ID
   * @returns {Promise<Object|null>} PRD or null
   */
  async findByIdentifier(prdIdentifier, projectId = null) {
    let sql = `SELECT * FROM ${this.tableName} WHERE prd_identifier = ?`;
    const params = [prdIdentifier];

    if (projectId) {
      sql += ` AND project_id = ?`;
      params.push(projectId);
    }

    const result = await this.db.getQuery(sql, params);
    return this.parseRecord(result);
  }

  /**
   * Get PRD with linked tasks
   * @param {number} prdId - PRD ID
   * @returns {Promise<Object|null>} PRD with tasks
   */
  async findWithTasks(prdId) {
    const prd = await this.findById(prdId);
    if (!prd) return null;

    // Get linked tasks
    const tasksSQL = `
      SELECT * FROM tasks 
      WHERE prd_id = ? 
      ORDER BY task_identifier
    `;
    const tasks = await this.db.getAllQuery(tasksSQL, [prdId]);

    // Calculate task statistics
    const taskStats = this.calculateTaskStats(tasks);

    return {
      ...prd,
      tasks: tasks,
      task_stats: taskStats
    };
  }

  /**
   * Update PRD status
   * @param {number} prdId - PRD ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated PRD
   */
  async updateStatus(prdId, status) {
    const validStatuses = ['pending', 'in-progress', 'done', 'archived'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await this.update(prdId, { status });
  }

  /**
   * Update PRD task statistics
   * @param {number} prdId - PRD ID
   * @returns {Promise<Object|null>} Updated PRD
   */
  async updateTaskStats(prdId) {
    // Get all tasks for this PRD
    const tasksSQL = `SELECT status FROM tasks WHERE prd_id = ?`;
    const tasks = await this.db.getAllQuery(tasksSQL, [prdId]);
    
    const taskStats = this.calculateTaskStats(tasks);
    
    return await this.update(prdId, { 
      task_stats: JSON.stringify(taskStats),
      last_modified: new Date().toISOString()
    });
  }

  /**
   * Get next available PRD identifier for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<string>} Next PRD identifier
   */
  async getNextPrdIdentifier(projectId) {
    const sql = `
      SELECT prd_identifier 
      FROM ${this.tableName} 
      WHERE project_id = ? 
      ORDER BY prd_identifier DESC 
      LIMIT 1
    `;
    
    const lastPrd = await this.db.getQuery(sql, [projectId]);
    
    if (lastPrd) {
      // Extract number from identifier like "prd_001"
      const match = lastPrd.prd_identifier.match(/prd_(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
        return `prd_${nextNumber}`;
      }
    }
    
    return 'prd_001';
  }

  /**
   * Get PRD statistics for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} PRD statistics
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
      archived: 0
    };

    results.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });

    return stats;
  }

  /**
   * Calculate task statistics from task array
   * @param {Array} tasks - Array of tasks
   * @returns {Object} Task statistics
   */
  calculateTaskStats(tasks) {
    const stats = {
      total: tasks.length,
      pending: 0,
      'in-progress': 0,
      done: 0,
      review: 0,
      blocked: 0,
      deferred: 0,
      cancelled: 0,
      completion_percentage: 0
    };

    tasks.forEach(task => {
      if (stats.hasOwnProperty(task.status)) {
        stats[task.status]++;
      }
    });

    // Calculate completion percentage
    if (stats.total > 0) {
      stats.completion_percentage = Math.round((stats.done / stats.total) * 100);
    }

    return stats;
  }

  /**
   * Parse database record with PRD-specific JSON fields
   * @param {Object} record - Raw database record
   * @returns {Object} Parsed record
   */
  parseRecord(record) {
    if (!record) return null;
    
    const parsed = super.parseRecord(record);
    
    // Parse PRD-specific JSON fields
    if (parsed.tags && typeof parsed.tags === 'string') {
      try {
        parsed.tags = JSON.parse(parsed.tags);
      } catch (e) {
        parsed.tags = [];
      }
    }

    if (parsed.task_stats && typeof parsed.task_stats === 'string') {
      try {
        parsed.task_stats = JSON.parse(parsed.task_stats);
      } catch (e) {
        parsed.task_stats = {};
      }
    }

    return parsed;
  }

  /**
   * Prepare PRD data for database insertion
   * @param {Object} data - PRD data
   * @returns {Object} Prepared data
   */
  prepareData(data) {
    const prepared = super.prepareData(data);
    
    // Ensure required fields have defaults
    if (!prepared.status) {
      prepared.status = 'pending';
    }
    
    if (!prepared.complexity) {
      prepared.complexity = 'medium';
    }
    
    if (!prepared.priority) {
      prepared.priority = 'medium';
    }

    if (!prepared.tags) {
      prepared.tags = '[]';
    } else if (Array.isArray(prepared.tags)) {
      prepared.tags = JSON.stringify(prepared.tags);
    }

    if (!prepared.task_stats) {
      prepared.task_stats = '{}';
    } else if (typeof prepared.task_stats === 'object') {
      prepared.task_stats = JSON.stringify(prepared.task_stats);
    }

    return prepared;
  }

  /**
   * Validate PRD data
   * @param {Object} data - PRD data
   * @param {string} operation - Operation type
   * @returns {Object} Validation result
   */
  validateData(data, operation = 'create') {
    const errors = [];

    if (operation === 'create') {
      if (!data.project_id) {
        errors.push('project_id is required');
      }
      
      if (!data.title || data.title.trim().length === 0) {
        errors.push('title is required');
      }
      
      if (!data.file_name || data.file_name.trim().length === 0) {
        errors.push('file_name is required');
      }
      
      if (!data.file_path || data.file_path.trim().length === 0) {
        errors.push('file_path is required');
      }
    }

    if (data.status) {
      const validStatuses = ['pending', 'in-progress', 'done', 'archived'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    if (data.complexity) {
      const validComplexities = ['low', 'medium', 'high'];
      if (!validComplexities.includes(data.complexity)) {
        errors.push(`Invalid complexity: ${data.complexity}`);
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
export default new PRDDAO();
