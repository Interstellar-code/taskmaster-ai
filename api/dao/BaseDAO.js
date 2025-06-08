/**
 * Base Data Access Object for TaskHero
 * Provides common database operations for all entities
 */

import databaseManager from '../utils/database.js';

export class BaseDAO {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = databaseManager;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record with ID
   */
  async create(data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');
      
      const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await this.db.runQuery(sql, values);
      
      // Return the created record
      return await this.findById(result.lastID);
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.getQuery(sql, [id]);
      return this.parseRecord(result);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Array of records
   */
  async findAll(filters = {}, options = {}) {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params = [];

      // Add WHERE clause if filters provided
      if (Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map(key => `${key} = ?`);
        sql += ` WHERE ${conditions.join(' AND ')}`;
        params.push(...Object.values(filters));
      }

      // Add ORDER BY clause
      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          sql += ` ${options.orderDirection}`;
        }
      }

      // Add LIMIT and OFFSET
      if (options.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        
        if (options.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const results = await this.db.getAllQuery(sql, params);
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = await this.db.runQuery(sql, [...values, id]);
      
      if (result.changes > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by ID
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.runQuery(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records with optional filtering
   * @param {Object} filters - Filter conditions
   * @returns {Promise<number>} Record count
   */
  async count(filters = {}) {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map(key => `${key} = ?`);
        sql += ` WHERE ${conditions.join(' AND ')}`;
        params.push(...Object.values(filters));
      }

      const result = await this.db.getQuery(sql, params);
      return result ? result.count : 0;
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await this.db.getQuery(sql, [id]);
      return !!result;
    } catch (error) {
      console.error(`Error checking existence in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute custom query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async customQuery(sql, params = []) {
    try {
      const results = await this.db.getAllQuery(sql, params);
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`Error executing custom query on ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Parse database record (override in subclasses for JSON fields)
   * @param {Object} record - Raw database record
   * @returns {Object} Parsed record
   */
  parseRecord(record) {
    if (!record) return null;
    
    // Parse JSON fields if they exist
    const parsed = { ...record };
    
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
   * Prepare data for database insertion (override in subclasses)
   * @param {Object} data - Data to prepare
   * @returns {Object} Prepared data
   */
  prepareData(data) {
    const prepared = { ...data };
    
    // Convert JSON fields to strings
    if (prepared.metadata && typeof prepared.metadata === 'object') {
      prepared.metadata = JSON.stringify(prepared.metadata);
    }

    return prepared;
  }

  /**
   * Validate data before operations (override in subclasses)
   * @param {Object} data - Data to validate
   * @param {string} operation - Operation type ('create', 'update')
   * @returns {Object} Validation result
   */
  validateData(data, operation = 'create') {
    // Basic validation - override in subclasses
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Execute multiple operations in a transaction
   * @param {Array} operations - Array of operation functions
   * @returns {Promise<Array>} Results of all operations
   */
  async transaction(operations) {
    try {
      const queries = [];
      
      for (const operation of operations) {
        const query = await operation();
        queries.push(query);
      }
      
      return await this.db.transaction(queries);
    } catch (error) {
      console.error(`Transaction failed on ${this.tableName}:`, error);
      throw error;
    }
  }
}
