/**
 * SQLite Database Schema for TaskHero
 * Defines all tables, indexes, and constraints for the TaskHero database
 */

export const DATABASE_SCHEMA = {
  // Database version for migration tracking
  version: '1.0.0',
  
  // Table creation SQL statements
  tables: {
    // Projects table - stores project metadata
    projects: `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        root_path TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
        metadata TEXT DEFAULT '{}' -- JSON metadata
      )
    `,

    // Tasks table - stores all task information
    tasks: `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prd_id INTEGER,
        parent_task_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        details TEXT,
        test_strategy TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        complexity_score REAL DEFAULT 0.0,
        complexity_level TEXT,
        estimated_hours INTEGER,
        assignee TEXT,
        due_date DATETIME,
        tags TEXT DEFAULT '[]', -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}', -- JSON metadata
        FOREIGN KEY (prd_id) REFERENCES prds(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `,

    // PRDs table - stores Product Requirements Documents
    prds: `
      CREATE TABLE IF NOT EXISTS prds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'archived')),
        complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        description TEXT,
        tags TEXT DEFAULT '[]', -- JSON array
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        task_stats TEXT DEFAULT '{}', -- JSON object with task statistics
        metadata TEXT DEFAULT '{}' -- JSON metadata
      )
    `,

    // Task dependencies table - manages task relationships
    task_dependencies: `
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        depends_on_task_id INTEGER NOT NULL,
        dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to', 'subtask_of')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id),
        CHECK (task_id != depends_on_task_id)
      )
    `,

    // Configurations table - stores project and global settings
    configurations: `
      CREATE TABLE IF NOT EXISTS configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        config_type TEXT NOT NULL, -- 'ai_models', 'project_settings', 'global'
        key TEXT NOT NULL,
        value TEXT NOT NULL, -- JSON value
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, config_type, key)
      )
    `,

    // AI operations table - tracks AI usage and costs
    ai_operations: `
      CREATE TABLE IF NOT EXISTS ai_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        command_name TEXT NOT NULL,
        model_used TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'failed')),
        error_message TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `
  },

  // Index creation SQL statements for performance optimization
  indexes: {
    // Task indexes
    idx_tasks_status: 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    idx_tasks_priority: 'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
    idx_tasks_prd_id: 'CREATE INDEX IF NOT EXISTS idx_tasks_prd_id ON tasks(prd_id)',
    idx_tasks_parent_id: 'CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id)',
    idx_tasks_created_at: 'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)',
    idx_tasks_updated_at: 'CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)',

    // PRD indexes
    idx_prds_status: 'CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status)',
    idx_prds_priority: 'CREATE INDEX IF NOT EXISTS idx_prds_priority ON prds(priority)',
    idx_prds_created_date: 'CREATE INDEX IF NOT EXISTS idx_prds_created_date ON prds(created_date)',
    
    // Dependency indexes
    idx_deps_task_id: 'CREATE INDEX IF NOT EXISTS idx_deps_task_id ON task_dependencies(task_id)',
    idx_deps_depends_on: 'CREATE INDEX IF NOT EXISTS idx_deps_depends_on ON task_dependencies(depends_on_task_id)',
    
    // Configuration indexes
    idx_config_project_type: 'CREATE INDEX IF NOT EXISTS idx_config_project_type ON configurations(project_id, config_type)',
    
    // AI operations indexes
    idx_ai_ops_project_id: 'CREATE INDEX IF NOT EXISTS idx_ai_ops_project_id ON ai_operations(project_id)',
    idx_ai_ops_timestamp: 'CREATE INDEX IF NOT EXISTS idx_ai_ops_timestamp ON ai_operations(timestamp)'
  },

  // Triggers for automatic timestamp updates
  triggers: {
    update_projects_timestamp: `
      CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
      AFTER UPDATE ON projects
      BEGIN
        UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `,
    
    update_tasks_timestamp: `
      CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp 
      AFTER UPDATE ON tasks
      BEGIN
        UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `,
    
    update_configurations_timestamp: `
      CREATE TRIGGER IF NOT EXISTS update_configurations_timestamp 
      AFTER UPDATE ON configurations
      BEGIN
        UPDATE configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `
  }
};

// Schema validation queries
export const SCHEMA_VALIDATION = {
  checkTables: `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('projects', 'tasks', 'prds', 'task_dependencies', 'configurations', 'ai_operations')
  `,
  
  checkIndexes: `
    SELECT name FROM sqlite_master 
    WHERE type='index' AND name LIKE 'idx_%'
  `,
  
  checkTriggers: `
    SELECT name FROM sqlite_master 
    WHERE type='trigger'
  `
};

// Database initialization order (important for foreign key constraints)
export const INITIALIZATION_ORDER = [
  'projects',
  'prds', 
  'tasks',
  'task_dependencies',
  'configurations',
  'ai_operations'
];
