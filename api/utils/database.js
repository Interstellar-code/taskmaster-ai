/**
 * Database Connection Manager for TaskHero SQLite
 * Handles database connections, initialization, and connection pooling
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { DATABASE_SCHEMA, SCHEMA_VALIDATION, INITIALIZATION_ORDER } from '../models/schema.js';

// Enable verbose mode for debugging
sqlite3.verbose();

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.connectionPool = new Map();
    this.maxConnections = 10;
    this.currentConnections = 0;
  }

  /**
   * Initialize database connection
   * @param {string} projectRoot - Root path of the project
   * @returns {Promise<void>}
   */
  async initialize(projectRoot) {
    try {
      const dbPath = this.getDatabasePath(projectRoot);
      
      // Ensure .taskmaster directory exists
      const taskmasterDir = path.dirname(dbPath);
      if (!fs.existsSync(taskmasterDir)) {
        fs.mkdirSync(taskmasterDir, { recursive: true });
      }

      // Create database connection
      this.db = await this.createConnection(dbPath);
      
      // Enable foreign key constraints
      await this.runQuery('PRAGMA foreign_keys = ON');
      
      // Use DELETE mode instead of WAL for WSL compatibility
      await this.runQuery('PRAGMA journal_mode = DELETE');
      
      // Set reasonable timeout
      await this.runQuery('PRAGMA busy_timeout = 30000');
      
      // Initialize schema if needed
      await this.initializeSchema();
      
      this.isInitialized = true;
      console.log(`Database initialized at: ${dbPath}`);
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get database file path
   * @param {string} projectRoot - Root path of the project
   * @returns {string} Database file path
   */
  getDatabasePath(projectRoot) {
    // Use project's .taskmaster directory for the database
    const dbPath = path.join(projectRoot, '.taskmaster', 'taskhero.db');
    console.log(`Using project database path: ${dbPath}`);
    return dbPath;
  }

  /**
   * Create a new database connection
   * @param {string} dbPath - Path to database file
   * @returns {Promise<sqlite3.Database>}
   */
  createConnection(dbPath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }

  /**
   * Initialize database schema
   * @returns {Promise<void>}
   */
  async initializeSchema() {
    try {
      // Check if schema already exists
      const existingTables = await this.getAllQuery(SCHEMA_VALIDATION.checkTables);
      
      if (existingTables.length === 6) {
        console.log('Database schema already exists');
        return;
      }

      console.log('Creating database schema...');
      
      // Create tables in correct order
      for (const tableName of INITIALIZATION_ORDER) {
        const createTableSQL = DATABASE_SCHEMA.tables[tableName];
        await this.runQuery(createTableSQL);
        console.log(`Created table: ${tableName}`);
      }

      // Create indexes
      for (const [indexName, indexSQL] of Object.entries(DATABASE_SCHEMA.indexes)) {
        await this.runQuery(indexSQL);
        console.log(`Created index: ${indexName}`);
      }

      // Create triggers
      for (const [triggerName, triggerSQL] of Object.entries(DATABASE_SCHEMA.triggers)) {
        await this.runQuery(triggerSQL);
        console.log(`Created trigger: ${triggerName}`);
      }

      console.log('Database schema created successfully');
      
    } catch (error) {
      console.error('Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run a query that doesn't return data
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<void>}
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row from query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>}
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Get all rows from query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  getAllQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Array} queries - Array of {sql, params} objects
   * @returns {Promise<Array>}
   */
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const results = [];
        let completed = 0;
        let hasError = false;

        for (const query of queries) {
          this.db.run(query.sql, query.params || [], function(err) {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            results.push({ lastID: this.lastID, changes: this.changes });
            completed++;
            
            if (completed === queries.length && !hasError) {
              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(results);
                }
              });
            }
          });
        }
      });
    });
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          this.isInitialized = false;
          resolve();
        }
      });
    });
  }

  /**
   * Check if database is healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const result = await this.getQuery('SELECT 1 as test');
      return result && result.test === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const stats = {};
      
      // Get table counts
      for (const tableName of INITIALIZATION_ORDER) {
        const result = await this.getQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
        stats[tableName] = result ? result.count : 0;
      }
      
      // Get database size
      const sizeResult = await this.getQuery("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
      stats.database_size = sizeResult ? sizeResult.size : 0;
      
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {};
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager;
