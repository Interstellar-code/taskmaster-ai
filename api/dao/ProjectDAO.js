/**
 * Project Data Access Object
 * Handles all database operations for projects
 */

import { BaseDAO } from './BaseDAO.js';
import path from 'path';

export class ProjectDAO extends BaseDAO {
  constructor() {
    super('projects');
  }

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async create(projectData) {
    const validation = this.validateData(projectData, 'create');
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const preparedData = this.prepareData(projectData);
    return await super.create(preparedData);
  }

  /**
   * Find project by root path
   * @param {string} rootPath - Project root path
   * @returns {Promise<Object|null>} Project or null
   */
  async findByRootPath(rootPath) {
    const sql = `SELECT * FROM ${this.tableName} WHERE root_path = ?`;
    const result = await this.db.getQuery(sql, [rootPath]);
    return this.parseRecord(result);
  }

  /**
   * Find active projects
   * @returns {Promise<Array>} Array of active projects
   */
  async findActive() {
    return await this.findAll({ status: 'active' }, { 
      orderBy: 'updated_at', 
      orderDirection: 'DESC' 
    });
  }

  /**
   * Get the current/primary project's root path
   * @returns {Promise<string>} Project root path
   */
  async getCurrentProjectRoot() {
    // Try to find an active project first
    const activeProjects = await this.findActive();
    if (activeProjects.length > 0) {
      return activeProjects[0].root_path;
    }
    
    // Fallback to any project
    const allProjects = await this.findAll();
    if (allProjects.length > 0) {
      return allProjects[0].root_path;
    }
    
    // If no projects exist, return parent of API directory
    // This assumes API is in a subdirectory of the project
    const apiDir = process.cwd();
    return path.dirname(apiDir);
  }

  /**
   * Get project with full statistics
   * @param {number} projectId - Project ID
   * @returns {Promise<Object|null>} Project with statistics
   */
  async findWithStats(projectId) {
    const project = await this.findById(projectId);
    if (!project) return null;

    // Get task statistics
    const taskStatsSQL = `
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks 
      WHERE project_id = ? 
      GROUP BY status
    `;
    const taskResults = await this.db.getAllQuery(taskStatsSQL, [projectId]);
    
    const taskStats = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      done: 0,
      review: 0,
      blocked: 0,
      deferred: 0,
      cancelled: 0
    };

    taskResults.forEach(row => {
      taskStats[row.status] = row.count;
      taskStats.total += row.count;
    });

    // Get PRD statistics
    const prdStatsSQL = `
      SELECT 
        status,
        COUNT(*) as count
      FROM prds 
      WHERE project_id = ? 
      GROUP BY status
    `;
    const prdResults = await this.db.getAllQuery(prdStatsSQL, [projectId]);
    
    const prdStats = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      done: 0,
      archived: 0
    };

    prdResults.forEach(row => {
      prdStats[row.status] = row.count;
      prdStats.total += row.count;
    });

    // Get recent activity
    const recentActivitySQL = `
      SELECT 
        'task' as type,
        title,
        status,
        updated_at
      FROM tasks 
      WHERE project_id = ? 
      UNION ALL
      SELECT 
        'prd' as type,
        title,
        status,
        last_modified as updated_at
      FROM prds 
      WHERE project_id = ?
      ORDER BY updated_at DESC 
      LIMIT 10
    `;
    const recentActivity = await this.db.getAllQuery(recentActivitySQL, [projectId, projectId]);

    return {
      ...project,
      task_stats: taskStats,
      prd_stats: prdStats,
      recent_activity: recentActivity
    };
  }

  /**
   * Update project status
   * @param {number} projectId - Project ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated project
   */
  async updateStatus(projectId, status) {
    const validStatuses = ['active', 'archived', 'deleted'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await this.update(projectId, { status });
  }

  /**
   * Archive project and all related data
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Archive result
   */
  async archiveProject(projectId) {
    const queries = [
      {
        sql: `UPDATE ${this.tableName} SET status = 'archived' WHERE id = ?`,
        params: [projectId]
      },
      {
        sql: `UPDATE tasks SET status = 'cancelled' WHERE project_id = ? AND status NOT IN ('done', 'cancelled')`,
        params: [projectId]
      },
      {
        sql: `UPDATE prds SET status = 'archived' WHERE project_id = ? AND status != 'archived'`,
        params: [projectId]
      }
    ];

    const results = await this.db.transaction(queries);
    
    return {
      project_updated: results[0].changes > 0,
      tasks_cancelled: results[1].changes,
      prds_archived: results[2].changes
    };
  }

  /**
   * Get project summary for dashboard
   * @returns {Promise<Array>} Array of project summaries
   */
  async getDashboardSummary() {
    const sql = `
      SELECT 
        p.*,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT pr.id) as total_prds,
        COUNT(DISTINCT CASE WHEN pr.status = 'done' THEN pr.id END) as completed_prds
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN prds pr ON p.id = pr.project_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
    
    const results = await this.db.getAllQuery(sql);
    
    return results.map(row => {
      const parsed = this.parseRecord(row);
      
      // Calculate completion percentages
      parsed.task_completion = parsed.total_tasks > 0 
        ? Math.round((parsed.completed_tasks / parsed.total_tasks) * 100) 
        : 0;
        
      parsed.prd_completion = parsed.total_prds > 0 
        ? Math.round((parsed.completed_prds / parsed.total_prds) * 100) 
        : 0;
      
      return parsed;
    });
  }

  /**
   * Search projects by name or description
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching projects
   */
  async search(searchTerm) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE (name LIKE ? OR description LIKE ?) 
      AND status = 'active'
      ORDER BY name
    `;
    const searchPattern = `%${searchTerm}%`;
    const results = await this.db.getAllQuery(sql, [searchPattern, searchPattern]);
    return results.map(record => this.parseRecord(record));
  }

  /**
   * Get project disk usage and file counts
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(projectId) {
    const project = await this.findById(projectId);
    if (!project) return null;

    // Get file counts from PRDs
    const fileStatsSQL = `
      SELECT 
        COUNT(*) as prd_files,
        SUM(file_size) as total_size
      FROM prds 
      WHERE project_id = ?
    `;
    const fileStats = await this.db.getQuery(fileStatsSQL, [projectId]);

    // Get AI operation costs
    const aiStatsSQL = `
      SELECT 
        COUNT(*) as total_operations,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost) as total_cost
      FROM ai_operations 
      WHERE project_id = ?
    `;
    const aiStats = await this.db.getQuery(aiStatsSQL, [projectId]);

    return {
      project_id: projectId,
      prd_files: fileStats?.prd_files || 0,
      total_file_size: fileStats?.total_size || 0,
      ai_operations: aiStats?.total_operations || 0,
      total_input_tokens: aiStats?.total_input_tokens || 0,
      total_output_tokens: aiStats?.total_output_tokens || 0,
      total_ai_cost: aiStats?.total_cost || 0
    };
  }

  /**
   * Validate project data
   * @param {Object} data - Project data
   * @param {string} operation - Operation type
   * @returns {Object} Validation result
   */
  validateData(data, operation = 'create') {
    const errors = [];

    if (operation === 'create') {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('name is required');
      }
      
      if (!data.root_path || data.root_path.trim().length === 0) {
        errors.push('root_path is required');
      }
    }

    if (data.status) {
      const validStatuses = ['active', 'archived', 'deleted'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Prepare project data for database insertion
   * @param {Object} data - Project data
   * @returns {Object} Prepared data
   */
  prepareData(data) {
    const prepared = super.prepareData(data);
    
    // Ensure required fields have defaults
    if (!prepared.status) {
      prepared.status = 'active';
    }
    
    return prepared;
  }
}

// Export singleton instance
export default new ProjectDAO();
