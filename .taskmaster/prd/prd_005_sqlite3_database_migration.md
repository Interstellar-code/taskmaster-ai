---
id: prd_005
title: TaskHero SQLite3 Database Migration
status: pending
priority: high
complexity: high
created_date: 2025-01-15
author: TaskHero Development Team
linked_tasks: []
file_path: .taskmaster/prd/prd_005_sqlite3_database_migration.md
parsed_date: null
file_hash: null
estimated_effort: 4-6 weeks
tags: [database, migration, sqlite3, architecture, performance]
---

# TaskHero SQLite3 Database Migration

## Context

### Overview
Migrate TaskHero AI from JSON file-based storage to SQLite3 database storage while maintaining 100% compatibility with existing CLI, MCP server, and web application interfaces. This migration will provide improved performance, data integrity, concurrent access support, and advanced querying capabilities without changing the user experience.

### Current State Analysis
- **Data Storage**: JSON files in `.taskmaster/` directory structure
- **File Structure**: `tasks.json`, `prds.json`, `config.json`, individual task files
- **Limitations**: No concurrent access, limited querying, no data integrity constraints, performance issues with large datasets
- **Interfaces**: CLI commands, MCP server tools, React web application, interactive menu system

### Migration Goals
- **Zero Downtime**: Seamless migration with automatic data conversion
- **Interface Compatibility**: All existing CLI commands, MCP tools, and web APIs remain unchanged
- **Performance Improvement**: Faster queries, better concurrent access, optimized operations
- **Data Integrity**: ACID compliance, foreign key constraints, validation at database level
- **Scalability**: Support for larger projects with thousands of tasks and PRDs

## PRD

### Technical Architecture

#### Database Design
```sql
-- Core Tables
CREATE TABLE projects (
    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    description TEXT,
    project_root_path TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    metadata JSON
);

CREATE TABLE configurations (
    config_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(project_id),
    config_type TEXT NOT NULL CHECK (config_type IN ('global', 'models', 'project')),
    config_data JSON NOT NULL,
    version TEXT DEFAULT '1.0.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE prds (
    prd_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    prd_identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'archived')),
    complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    description TEXT,
    tags JSON,
    estimated_effort TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    parsed_date DATETIME,
    metadata JSON,
    UNIQUE(project_id, prd_identifier)
);

CREATE TABLE tasks (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    prd_id INTEGER REFERENCES prds(prd_id),
    parent_task_id INTEGER REFERENCES tasks(task_id),
    task_identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    details TEXT,
    test_strategy TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    complexity_score REAL CHECK (complexity_score >= 1 AND complexity_score <= 10),
    complexity_level TEXT CHECK (complexity_level IN ('low', 'medium', 'high')),
    estimated_hours INTEGER,
    actual_hours REAL,
    assignee TEXT,
    due_date DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    UNIQUE(project_id, task_identifier)
);

CREATE TABLE task_dependencies (
    dependency_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'requires', 'related')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, depends_on_task_id)
);

CREATE TABLE prd_source_metadata (
    metadata_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    parsed_date DATETIME NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL
);
```

#### Data Access Layer (DAL)
```javascript
// Database abstraction layer
class TaskHeroDatabase {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    // Project operations
    async createProject(projectData) { /* ... */ }
    async getProject(projectId) { /* ... */ }
    async updateProject(projectId, updates) { /* ... */ }

    // Task operations
    async createTask(taskData) { /* ... */ }
    async getTasks(projectId, filters = {}) { /* ... */ }
    async updateTask(taskId, updates) { /* ... */ }
    async deleteTask(taskId) { /* ... */ }

    // PRD operations
    async createPRD(prdData) { /* ... */ }
    async getPRDs(projectId, filters = {}) { /* ... */ }
    async updatePRD(prdId, updates) { /* ... */ }

    // Migration utilities
    async migrateFromJSON(jsonData) { /* ... */ }
    async exportToJSON() { /* ... */ }
}
```

### Migration Strategy

#### Phase 1: Database Infrastructure (Week 1-2)
1. **SQLite3 Integration**
   - Add `better-sqlite3` dependency for Node.js
   - Create database schema with all tables and indexes
   - Implement connection pooling and transaction management
   - Add database initialization and migration scripts

2. **Data Access Layer**
   - Create abstraction layer for database operations
   - Implement CRUD operations for all entities
   - Add transaction support for complex operations
   - Create query builders for dynamic filtering

3. **Migration Tools**
   - JSON to SQLite migration utility
   - Data validation and integrity checking
   - Backup and rollback mechanisms
   - Schema versioning system

#### Phase 2: Core Integration (Week 3-4)
1. **CLI Command Integration**
   - Update all CLI commands to use database layer
   - Maintain exact same command interfaces and outputs
   - Add database connection management
   - Implement error handling and recovery

2. **MCP Server Integration**
   - Update MCP tools to use database operations
   - Maintain session state and project context
   - Add concurrent access handling
   - Implement real-time data synchronization

3. **Configuration Management**
   - Migrate configuration storage to database
   - Maintain backward compatibility with config files
   - Add configuration versioning and history
   - Implement configuration validation

#### Phase 3: Web Application Integration (Week 5)
1. **API Layer Updates**
   - Update REST API endpoints to use database
   - Add advanced querying capabilities
   - Implement pagination and filtering
   - Add real-time WebSocket updates

2. **Kanban Board Integration**
   - Update task retrieval and updates
   - Add optimistic UI updates
   - Implement conflict resolution
   - Add bulk operation support

#### Phase 4: Testing & Optimization (Week 6)
1. **Performance Optimization**
   - Add database indexes for common queries
   - Optimize query performance
   - Implement connection pooling
   - Add query caching where appropriate

2. **Testing & Validation**
   - Comprehensive migration testing
   - Performance benchmarking
   - Data integrity validation
   - User acceptance testing

### Implementation Details

#### Database Location & Management
```javascript
// Database file location - configurable via .env
const dbPath = process.env.TASKHERO_DB_PATH || 
    path.join(projectRoot, '.taskmaster', 'taskmaster.db');

// Database configuration from .env
const dbConfig = {
    path: process.env.TASKHERO_DB_PATH || path.join(projectRoot, '.taskmaster', 'taskmaster.db'),
    timeout: parseInt(process.env.TASKHERO_DB_TIMEOUT) || 5000,
    verbose: process.env.TASKHERO_DB_VERBOSE === 'true',
    pragma: {
        journal_mode: process.env.TASKHERO_DB_JOURNAL_MODE || 'WAL',
        synchronous: process.env.TASKHERO_DB_SYNCHRONOUS || 'NORMAL',
        cache_size: parseInt(process.env.TASKHERO_DB_CACHE_SIZE) || 2000
    }
};

// Connection management
class DatabaseManager {
    static getInstance(projectRoot) {
        if (!this.instances.has(projectRoot)) {
            this.instances.set(projectRoot, new TaskHeroDatabase(dbConfig));
        }
        return this.instances.get(projectRoot);
    }
}
```

**Environment Variables for Database Configuration:**
- `TASKHERO_DB_PATH`: Custom database file path
- `TASKHERO_DB_TIMEOUT`: Connection timeout in milliseconds (default: 5000)
- `TASKHERO_DB_VERBOSE`: Enable SQL logging (default: false)
- `TASKHERO_DB_JOURNAL_MODE`: SQLite journal mode (default: WAL)
- `TASKHERO_DB_SYNCHRONOUS`: SQLite synchronous mode (default: NORMAL)
- `TASKHERO_DB_CACHE_SIZE`: SQLite cache size (default: 2000)

#### Migration Process
```javascript
// Automatic migration on first database access
async function ensureDatabaseMigration(projectRoot) {
    const dbPath = path.join(projectRoot, '.taskmaster', 'taskmaster.db');
    const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    
    if (!fs.existsSync(dbPath) && fs.existsSync(tasksJsonPath)) {
        console.log('Migrating from JSON to SQLite...');
        await migrateFromJSON(projectRoot);
        console.log('Migration completed successfully!');
    }
}
```

#### Backward Compatibility
- Maintain JSON export functionality for backup purposes
- Support reading legacy JSON files during transition period
- Provide rollback mechanism to JSON storage if needed
- Keep existing file structure for non-database files

### Performance Benefits

#### Query Performance
- **Task Filtering**: 10x faster with indexed queries
- **Dependency Resolution**: Efficient JOIN operations
- **PRD Queries**: Complex filtering with SQL WHERE clauses
- **Reporting**: Aggregation queries for analytics

#### Concurrent Access
- **Multi-user Support**: ACID transactions for data consistency
- **CLI + Web Simultaneous Use**: Proper locking mechanisms
- **Real-time Updates**: WebSocket integration with database triggers

#### Scalability Improvements
- **Large Projects**: Support for 10,000+ tasks without performance degradation
- **Complex Dependencies**: Efficient graph traversal with recursive queries
- **Historical Data**: Audit trails and change tracking
- **Advanced Analytics**: SQL-based reporting and insights

### Risk Mitigation

#### Data Safety
- **Automatic Backups**: JSON export before migration
- **Rollback Capability**: Revert to JSON if issues occur
- **Data Validation**: Comprehensive integrity checks
- **Transaction Safety**: ACID compliance for all operations

#### Compatibility Risks
- **Interface Preservation**: All existing APIs remain unchanged
- **Command Compatibility**: CLI commands work identically
- **File Format Support**: Continue supporting JSON exports
- **Configuration Migration**: Seamless config file transition

#### Performance Risks
- **Database Locking**: Implement proper connection pooling
- **Query Optimization**: Add appropriate indexes
- **Memory Usage**: Efficient query patterns
- **Startup Time**: Fast database initialization

### Success Metrics

#### Performance Targets
- Task list loading: < 100ms for 1000 tasks
- Task creation: < 50ms response time
- Complex queries: < 200ms for dependency resolution
- Migration time: < 30 seconds for typical projects

#### Compatibility Goals
- 100% CLI command compatibility
- 100% MCP tool functionality
- 100% web application features
- Zero data loss during migration

#### User Experience
- Transparent migration process
- No learning curve for existing users
- Improved responsiveness
- Enhanced reliability

This migration will transform TaskHero into a more robust, scalable, and performant task management system while preserving the excellent user experience that users already know and love.

## Proposed TaskHero Tasks

### 1. SQLite3 Database Infrastructure Setup
**Priority**: high | **Estimated Hours**: 24
**Description**: Set up complete SQLite3 database infrastructure with schema, connections, and basic operations
**Subtasks**:
- 1.1 Add better-sqlite3 dependency and environment variable configuration
- 1.2 Create complete database schema with all tables and constraints  
- 1.3 Implement DatabaseManager class with connection pooling
- 1.4 Create database migration utilities and versioning system
- 1.5 Add transaction support and error handling

### 2. Data Access Layer Implementation
**Priority**: high | **Estimated Hours**: 32
**Description**: Build comprehensive data access layer with all CRUD operations
**Dependencies**: [1]
**Subtasks**:
- 2.1 Implement TaskHeroDatabase class with core methods
- 2.2 Create project operations (create, get, update)
- 2.3 Implement task operations with time tracking fields
- 2.4 Build PRD operations and metadata management
- 2.5 Add task dependency operations with validation
- 2.6 Create configuration storage with backward compatibility

### 3. JSON to Database Migration System
**Priority**: high | **Estimated Hours**: 20
**Description**: Create robust migration system from JSON files to SQLite database
**Dependencies**: [2]
**Subtasks**:
- 3.1 Build JSON to SQLite migration utility
- 3.2 Implement data validation and integrity checking
- 3.3 Create automatic backup system with rollback capability
- 3.4 Add migration performance optimization
- 3.5 Create database initialization and setup scripts

### 4. CLI Commands Integration
**Priority**: high | **Estimated Hours**: 30
**Description**: Update all CLI commands to use database layer while maintaining compatibility
**Dependencies**: [2, 3]
**Subtasks**:
- 4.1 Update core task-manager module to use database
- 4.2 Modify task listing and display commands
- 4.3 Update task creation and modification commands
- 4.4 Integrate dependency management commands
- 4.5 Update PRD parsing and management commands
- 4.6 Add error handling and backward compatibility

### 5. MCP Server Database Integration
**Priority**: high | **Estimated Hours**: 26
**Description**: Integrate database operations into MCP server tools and direct functions
**Dependencies**: [4]
**Subtasks**:
- 5.1 Update all MCP direct functions for database operations
- 5.2 Modify MCP tools to work with database layer
- 5.3 Implement session state management for database connections
- 5.4 Add concurrent access handling and locking
- 5.5 Ensure silent mode compatibility with database operations

### 6. Web Application Database Integration  
**Priority**: high | **Estimated Hours**: 44
**Description**: Update web application and APIs to use database backend
**Dependencies**: [4]
**Subtasks**:
- 6.1 Modify REST API endpoints for database operations
- 6.2 Add advanced querying, filtering, and pagination
- 6.3 Implement WebSocket integration for real-time updates
- 6.4 Update React Kanban board for database integration
- 6.5 Update terminal Kanban interface
- 6.6 Add optimistic UI updates and conflict resolution
- 6.7 Implement bulk operations support

### 7. Performance Optimization
**Priority**: medium | **Estimated Hours**: 18
**Description**: Optimize database performance, indexing, and query efficiency
**Dependencies**: [5, 6]
**Subtasks**:
- 7.1 Add and optimize database indexes for common queries
- 7.2 Optimize SQL queries and add caching where appropriate
- 7.3 Fine-tune connection pooling configuration
- 7.4 Benchmark database performance vs JSON system

### 8. Comprehensive Testing
**Priority**: high | **Estimated Hours**: 26
**Description**: Thorough testing of all components and migration process
**Dependencies**: [5, 6, 7]
**Subtasks**:
- 8.1 Test CLI and MCP integration with database
- 8.2 Test web application features with database backend
- 8.3 Validate migration performance with various project sizes
- 8.4 Conduct data integrity validation after migration
- 8.5 Perform user acceptance testing across all interfaces

### 9. Documentation and Migration Guide
**Priority**: medium | **Estimated Hours**: 14
**Description**: Update documentation and create migration guide for users
**Dependencies**: [8]
**Subtasks**:
- 9.1 Update all technical documentation for database changes
- 9.2 Create comprehensive migration guide for users
- 9.3 Update API documentation and examples
- 9.4 Create troubleshooting guide for migration issues

### 10. Final Integration and Deployment
**Priority**: high | **Estimated Hours**: 16
**Description**: Final integration testing and preparation for deployment
**Dependencies**: [8, 9]
**Subtasks**:
- 10.1 Conduct final end-to-end testing across all interfaces
- 10.2 Validate automatic migration process in various scenarios
- 10.3 Test rollback and recovery procedures
- 10.4 Prepare deployment scripts and release notes

### Summary
- **Total Tasks**: 10 main tasks
- **Total Subtasks**: 46 subtasks  
- **Total Estimated Hours**: 250 hours
- **High Priority Tasks**: 7
- **Medium Priority Tasks**: 3
