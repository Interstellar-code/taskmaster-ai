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

    const preparedData = await this.prepareData(prdData);
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
   * Find PRDs by status
   * @param {string} status - PRD status
   * @returns {Promise<Array>} Array of PRDs
   */
  async findByStatus(status) {
    const filters = { status };
    return await this.findAll(filters, { orderBy: 'created_date', orderDirection: 'DESC' });
  }

  /**
   * Find PRD by ID (since we removed prd_identifier)
   * @param {number} prdId - PRD ID
   * @returns {Promise<Object|null>} PRD or null
   */
  async findByIdentifier(prdId) {
    // Since we removed prd_identifier, use the ID instead
    return await this.findById(prdId);
  }

  /**
   * Find PRD by ID with task statistics
   * @param {number} id - PRD ID
   * @returns {Promise<Object|null>} PRD with task stats or null
   */
  async findByIdWithStats(id) {
    const sql = `
      SELECT
        p.*,
        COALESCE(pts.total_tasks, 0) as taskCount,
        COALESCE(pts.total_tasks, 0) as totalTasks,
        COALESCE(pts.completed_tasks, 0) as completedTasks,
        COALESCE(pts.completion_percentage, 0) as completionPercentage,
        COALESCE(pts.pending_tasks, 0) as pendingTasks,
        COALESCE(pts.in_progress_tasks, 0) as inProgressTasks,
        COALESCE(pts.blocked_tasks, 0) as blockedTasks
      FROM prds p
      LEFT JOIN prd_task_stats pts ON p.id = pts.prd_id
      WHERE p.id = ?
    `;

    const record = await this.db.getQuery(sql, [id]);
    return record ? this.parseRecord(record) : null;
  }

  /**
   * Find all PRDs with task statistics
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated PRDs with task stats
   */
  async findAllWithStats(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_date',
      sortOrder = 'DESC'
    } = pagination;

    // Build base query with task stats
    let sql = `
      SELECT
        p.*,
        COALESCE(pts.total_tasks, 0) as taskCount,
        COALESCE(pts.total_tasks, 0) as totalTasks,
        COALESCE(pts.completed_tasks, 0) as completedTasks,
        COALESCE(pts.completion_percentage, 0) as completionPercentage,
        COALESCE(pts.pending_tasks, 0) as pendingTasks,
        COALESCE(pts.in_progress_tasks, 0) as inProgressTasks,
        COALESCE(pts.blocked_tasks, 0) as blockedTasks
      FROM prds p
      LEFT JOIN prd_task_stats pts ON p.id = pts.prd_id
    `;

    let countSql = `SELECT COUNT(*) as total FROM prds p`;
    const conditions = [];
    const params = [];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'search' && key !== 'tags') {
        conditions.push(`p.${key} = ?`);
        params.push(value);
      }
    });

    // Handle search separately
    if (filters.search) {
      conditions.push(`(p.title LIKE ? OR p.description LIKE ?)`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }

    // Add ORDER BY
    sql += ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;

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
   * Get PRD statistics
   * @returns {Promise<Object>} PRD statistics
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

    // Transform database field names to frontend field names
    if (parsed.analysis_status) {
      parsed.analysisStatus = parsed.analysis_status;
    } else {
      parsed.analysisStatus = 'not-analyzed';
    }

    if (parsed.tasks_status) {
      parsed.tasksStatus = parsed.tasks_status;
    } else {
      // Determine tasks status based on task count
      parsed.tasksStatus = (parsed.taskCount && parsed.taskCount > 0) ? 'generated' : 'no-tasks';
    }

    // Add upload date mapping
    if (parsed.created_date) {
      parsed.uploadDate = parsed.created_date;
    }

    // Ensure file path is mapped correctly
    if (parsed.file_path) {
      parsed.filePath = parsed.file_path;
    }

    return parsed;
  }

  /**
   * Update PRD record by ID with proper data preparation
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    try {
      // Prepare data for database (convert arrays to JSON strings, etc.)
      const preparedData = await this.prepareData(data);

      // Call parent update method with prepared data
      return await super.update(id, preparedData);
    } catch (error) {
      console.error('Error updating PRD:', error);
      throw error;
    }
  }

  /**
   * Prepare PRD data for database insertion
   * @param {Object} data - PRD data
   * @returns {Object} Prepared data
   */
  async prepareData(data) {
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

    // Remove prd_identifier - we'll use the database ID instead
    delete prepared.prd_identifier;

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
