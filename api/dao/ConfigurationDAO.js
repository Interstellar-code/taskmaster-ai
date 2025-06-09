/**
 * Configuration Data Access Object
 * Handles all database operations for configurations
 */

import { BaseDAO } from './BaseDAO.js';

export class ConfigurationDAO extends BaseDAO {
  constructor() {
    super('configurations');
  }

  /**
   * Create a new configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async create(configData) {
    const validation = this.validateData(configData, 'create');
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const preparedData = this.prepareData(configData);
    return await super.create(preparedData);
  }

  /**
   * Override findAll to handle search and return pagination format expected by routes
   * @param {Object} filters - Filter conditions
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;

    // Build base query
    let sql = `SELECT * FROM ${this.tableName}`;
    let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    // Handle regular filters (map API field names to DB field names)
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'search') {
        if (key === 'configType') {
          conditions.push(`config_type = ?`);
          params.push(value);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    // Handle search separately
    if (filters.search) {
      conditions.push(`(key LIKE ? OR value LIKE ?)`);
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
    const [configurations, countResult] = await Promise.all([
      this.db.getAllQuery(sql, params),
      this.db.getQuery(countSql, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      configurations: configurations.map(record => this.parseRecord(record)),
      page,
      limit,
      total,
      totalPages
    };
  }

  /**
   * Find configurations by type
   * @param {string} configType - Configuration type
   * @returns {Promise<Array>} Array of configurations
   */
  async findByType(configType) {
    const sql = `SELECT * FROM ${this.tableName} WHERE config_type = ? ORDER BY key`;
    const results = await this.db.getAllQuery(sql, [configType]);
    return results.map(record => this.parseRecord(record));
  }

  /**
   * Find configuration by type and key
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @returns {Promise<Object|null>} Configuration or null
   */
  async findByTypeAndKey(configType, key) {
    const sql = `SELECT * FROM ${this.tableName} WHERE config_type = ? AND key = ?`;
    const result = await this.db.getQuery(sql, [configType, key]);
    return this.parseRecord(result);
  }

  /**
   * Upsert configuration (insert or update)
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @returns {Promise<Object>} Configuration record
   */
  async upsert(configType, key, value) {
    const existing = await this.findByTypeAndKey(configType, key);

    const configData = {
      config_type: configType,
      key: key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    };

    if (existing) {
      return await this.update(existing.id, { value: configData.value });
    } else {
      return await this.create(configData);
    }
  }

  /**
   * Find configurations by project ID and type
   * @param {number} projectId - Project ID (null for global configs)
   * @param {string} configType - Configuration type
   * @returns {Promise<Array>} Array of configurations
   */
  async findByProjectAndType(projectId, configType) {
    const filters = { config_type: configType };
    if (projectId) {
      filters.project_id = projectId;
    } else {
      // For global configs, project_id should be null
      const sql = `SELECT * FROM ${this.tableName} WHERE config_type = ? AND project_id IS NULL`;
      const results = await this.db.getAllQuery(sql, [configType]);
      return results.map(record => this.parseRecord(record));
    }

    return await this.findAll(filters);
  }

  /**
   * Get configuration value by key
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @returns {Promise<any>} Configuration value or null
   */
  async getValue(configType, key) {
    const sql = `SELECT value FROM ${this.tableName} WHERE config_type = ? AND key = ?`;
    const params = [configType, key];

    const result = await this.db.getQuery(sql, params);
    if (result && result.value) {
      try {
        return JSON.parse(result.value);
      } catch (e) {
        return result.value;
      }
    }
    return null;
  }

  /**
   * Set configuration value
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @returns {Promise<Object>} Configuration record
   */
  async setValue(configType, key, value) {
    const existingConfig = await this.findByKey(configType, key);

    const configData = {
      config_type: configType,
      key: key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    };

    if (existingConfig) {
      return await this.update(existingConfig.id, { value: configData.value });
    } else {
      return await this.create(configData);
    }
  }

  /**
   * Upsert configuration value (insert or update)
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @param {string} description - Optional description
   * @returns {Promise<Object>} Configuration record
   */
  async upsert(configType, key, value, description = null) {
    const existingConfig = await this.findByKey(configType, key);

    const configData = {
      config_type: configType,
      key: key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      description: description || `Configuration for ${configType}.${key}`,
      is_default: false
    };

    if (existingConfig) {
      return await this.update(existingConfig.id, {
        value: configData.value,
        description: configData.description,
        updated_at: new Date().toISOString()
      });
    } else {
      return await this.create(configData);
    }
  }

  /**
   * Find configuration by key
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @returns {Promise<Object|null>} Configuration or null
   */
  async findByKey(configType, key) {
    const sql = `SELECT * FROM ${this.tableName} WHERE config_type = ? AND key = ?`;
    const params = [configType, key];

    const result = await this.db.getQuery(sql, params);
    return this.parseRecord(result);
  }

  /**
   * Get all configurations for a project
   * @param {number} projectId - Project ID
   * @returns {Promise<Object>} Configurations grouped by type
   */
  async getProjectConfigurations(projectId) {
    const configs = await this.findAll({ project_id: projectId });
    
    const grouped = {};
    configs.forEach(config => {
      if (!grouped[config.config_type]) {
        grouped[config.config_type] = {};
      }
      
      try {
        grouped[config.config_type][config.key] = JSON.parse(config.value);
      } catch (e) {
        grouped[config.config_type][config.key] = config.value;
      }
    });
    
    return grouped;
  }

  /**
   * Get global configurations
   * @returns {Promise<Object>} Global configurations grouped by type
   */
  async getGlobalConfigurations() {
    const sql = `SELECT * FROM ${this.tableName} WHERE project_id IS NULL`;
    const configs = await this.db.getAllQuery(sql);
    
    const grouped = {};
    configs.forEach(config => {
      const parsed = this.parseRecord(config);
      if (!grouped[parsed.config_type]) {
        grouped[parsed.config_type] = {};
      }
      
      try {
        grouped[parsed.config_type][parsed.key] = JSON.parse(parsed.value);
      } catch (e) {
        grouped[parsed.config_type][parsed.key] = parsed.value;
      }
    });
    
    return grouped;
  }

  /**
   * Delete configuration by key
   * @param {number} projectId - Project ID
   * @param {string} configType - Configuration type
   * @param {string} key - Configuration key
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteByKey(projectId, configType, key) {
    let sql, params;
    
    if (projectId) {
      sql = `DELETE FROM ${this.tableName} WHERE project_id = ? AND config_type = ? AND key = ?`;
      params = [projectId, configType, key];
    } else {
      sql = `DELETE FROM ${this.tableName} WHERE project_id IS NULL AND config_type = ? AND key = ?`;
      params = [configType, key];
    }
    
    const result = await this.db.runQuery(sql, params);
    return result.changes > 0;
  }

  /**
   * Bulk set configurations
   * @param {number} projectId - Project ID
   * @param {string} configType - Configuration type
   * @param {Object} configurations - Key-value pairs
   * @returns {Promise<Array>} Array of configuration records
   */
  async bulkSet(projectId, configType, configurations) {
    const results = [];
    
    for (const [key, value] of Object.entries(configurations)) {
      const result = await this.setValue(projectId, configType, key, value);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Parse database record with configuration-specific handling
   * @param {Object} record - Raw database record
   * @returns {Object} Parsed record
   */
  parseRecord(record) {
    if (!record) return null;
    
    const parsed = { ...record };
    
    // Don't auto-parse value field as it might be intentionally a string
    return parsed;
  }

  /**
   * Prepare configuration data for database insertion
   * @param {Object} data - Configuration data
   * @returns {Object} Prepared data
   */
  prepareData(data) {
    const prepared = { ...data };
    
    // Ensure value is a string
    if (prepared.value && typeof prepared.value === 'object') {
      prepared.value = JSON.stringify(prepared.value);
    }
    
    return prepared;
  }

  /**
   * Validate configuration data
   * @param {Object} data - Configuration data
   * @param {string} operation - Operation type
   * @returns {Object} Validation result
   */
  validateData(data, operation = 'create') {
    const errors = [];

    if (operation === 'create') {
      if (!data.config_type || data.config_type.trim().length === 0) {
        errors.push('config_type is required');
      }
      
      if (!data.key || data.key.trim().length === 0) {
        errors.push('key is required');
      }
      
      if (data.value === undefined || data.value === null) {
        errors.push('value is required');
      }
    }

    if (data.config_type) {
      const validTypes = ['ai_models', 'global_settings', 'user_preferences', 'test_config'];
      if (!validTypes.includes(data.config_type)) {
        errors.push(`Invalid config_type: ${data.config_type}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export default new ConfigurationDAO();
