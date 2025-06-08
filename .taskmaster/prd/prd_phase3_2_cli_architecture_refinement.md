# PRD: Phase 3.2 - CLI Command Architecture Refinement and Testing Strategy

**PRD ID:** prd_phase3_2_cli_architecture_refinement  
**Status:** pending  
**Priority:** high  
**Complexity:** high  
**Created:** 2025-01-08  
**Updated:** 2025-01-08  

---

## 1. Executive Summary

Refine TaskHero CLI architecture to establish clear separation between CLI operations (direct file/database access) and API layer (web/MCP only). Remove API dependencies from CLI commands, implement comprehensive testing strategy, and establish architectural boundaries for maintainable, independent components.

## 2. Problem Statement

### Current State
- CLI commands recently integrated with API layer creating unnecessary complexity
- Mixed access patterns: some commands use files, others use API fallbacks
- `dev.js` wrapper adds complexity without clear benefits
- Inconsistent testing coverage across CLI commands
- Unclear architectural boundaries between CLI and API layers

### Target State
- CLI commands operate independently with direct file/database access only
- API layer reserved exclusively for Kanban web interface and MCP server
- Clear architectural separation with documented boundaries
- Comprehensive test coverage for all CLI operations
- Simplified command execution without unnecessary abstractions

## 3. Core Architecture Decision

### 3.1 CLI Commands Independence
**All CLI commands (`task-hero next`, `task-hero list`, etc.) must operate independently without API dependencies.**

#### Rationale:
- **Simplicity**: Direct operations are faster and more reliable
- **Independence**: CLI works without API server running
- **Maintenance**: Fewer moving parts, easier debugging
- **Performance**: No network overhead for local operations
- **Reliability**: No API server dependency for core functionality

#### Implementation:
- Direct SQLite database access for data operations
- Direct file system access for configuration and reports
- No HTTP client dependencies in CLI commands
- No fallback mechanisms to API layer

### 3.2 API Layer Separation
**API layer reserved exclusively for Kanban web interface and MCP server integrations.**

#### Rationale:
- **Clear Boundaries**: Each layer has distinct responsibilities
- **Scalability**: API optimized for concurrent web/MCP access
- **Security**: API can implement authentication/authorization
- **Real-time**: WebSocket integration for live updates
- **Caching**: API-level caching for performance

## 4. Current State Analysis

### 4.1 Files to Revert/Remove
| File | Current State | Action Required |
|------|---------------|-----------------|
| `scripts/modules/cli-api-commands.js` | API integration functions | **REMOVE** |
| `scripts/modules/api-service.js` | API service layer | **REMOVE** |
| `scripts/modules/api-client.js` | HTTP client | **REMOVE** |
| `scripts/modules/commands.js` | Mixed API/file operations | **REVERT** to file-only |
| `tests/unit/api-client.test.js` | API client tests | **REMOVE** |
| `tests/unit/cli-api-integration.test.js` | CLI API tests | **REMOVE** |

### 4.2 CLI Command Current Status
| Command | Current Implementation | Target Implementation |
|---------|----------------------|----------------------|
| `task-hero next` | API-first with fallback | Direct database query |
| `task-hero list` | API-first with fallback | Direct database query |
| `task-hero show` | File operations | Direct database query |
| `task-hero add-task` | File operations | Direct database write |
| `task-hero set-status` | File operations | Direct database write |
| `task-hero expand` | File operations | Direct database write |
| `task-hero menu` | Mixed operations | Direct database operations |

### 4.3 dev.js Analysis
**Current Purpose:**
- Acts as wrapper between `bin/task-hero.js` and command implementations
- Provides argument processing and command routing
- Adds complexity without significant benefits

**Recommendation:**
- **REMOVE** `dev.js` wrapper
- **DIRECT** command execution from `bin/task-hero.js`
- **SIMPLIFY** argument processing

## 5. Implementation Requirements

### 5.1 CLI Command Refactoring

#### A. Revert API Integration Changes
- Remove all API client imports from CLI commands
- Remove fallback mechanisms and API-first logic
- Restore original file-based operations
- Remove API-related command options (`--api`, `--no-api`)

#### B. Database Integration
- Implement direct SQLite access for all commands
- Create database query functions for each operation
- Ensure transaction safety for write operations
- Add connection pooling for performance

#### C. Command Structure Standardization
```javascript
// Standard CLI command pattern
export async function commandName(options) {
  try {
    // 1. Validate input parameters
    // 2. Connect to database
    // 3. Execute operation
    // 4. Format and display results
    // 5. Handle errors gracefully
  } catch (error) {
    // Error handling without API fallbacks
  }
}
```

### 5.2 Interactive Menu System Audit

#### A. Menu Command Mapping
| Menu Option | Current Implementation | Target Implementation |
|-------------|----------------------|----------------------|
| "List Tasks" | File operations | Direct database query |
| "Add Task" | File operations | Direct database write |
| "Update Task" | File operations | Direct database write |
| "Next Task" | File operations | Direct database query |
| "PRD Management" | File operations | Direct database/file operations |

#### B. Menu System Requirements
- All menu options use direct database operations
- No API calls from interactive menu
- Consistent error handling across menu options
- Real-time data display without API dependencies

### 5.3 Database Access Layer

#### A. Core Database Functions
```javascript
// Database access patterns
export class TaskHeroDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }
  
  // Task operations
  async getTasks(filters = {}) { /* Direct SQL query */ }
  async getTask(id) { /* Direct SQL query */ }
  async createTask(taskData) { /* Direct SQL insert */ }
  async updateTask(id, updates) { /* Direct SQL update */ }
  async deleteTask(id) { /* Direct SQL delete */ }
  
  // Status operations
  async updateTaskStatus(id, status) { /* Direct SQL update */ }
  async getNextTask(criteria = {}) { /* Complex SQL query */ }
  
  // PRD operations
  async getPRDs(filters = {}) { /* Direct SQL query */ }
  async linkTaskToPRD(taskId, prdId) { /* Direct SQL update */ }
}
```

#### B. Transaction Management
- Use database transactions for multi-step operations
- Implement rollback on errors
- Ensure data consistency across operations
- Add connection pooling for concurrent access

## 6. Testing Strategy

### 6.1 Unit Test Structure
```
tests/unit/
├── cli-commands/
│   ├── next-command.test.js
│   ├── list-command.test.js
│   ├── add-task-command.test.js
│   ├── set-status-command.test.js
│   ├── show-command.test.js
│   └── expand-command.test.js
├── interactive-menu/
│   ├── menu-navigation.test.js
│   ├── task-operations.test.js
│   └── prd-operations.test.js
├── database/
│   ├── task-queries.test.js
│   ├── prd-queries.test.js
│   └── transaction-handling.test.js
└── utils/
    ├── file-operations.test.js
    └── validation.test.js
```

### 6.2 Test Requirements

#### A. CLI Command Tests
- Test all parameter combinations for each command
- Test error handling for invalid inputs
- Test database operations with mock data
- Test output formatting and display
- Test edge cases and boundary conditions

#### B. Interactive Menu Tests
- Test menu navigation and option selection
- Test all menu-driven operations
- Test error handling in interactive mode
- Test user input validation
- Test menu state management

#### C. Database Tests
- Test all CRUD operations
- Test complex queries (next task, filtering)
- Test transaction handling and rollbacks
- Test concurrent access scenarios
- Test database schema validation

### 6.3 Test Data Management
```javascript
// Test database setup
beforeEach(async () => {
  // Create temporary test database
  testDb = await createTestDatabase();
  await seedTestData(testDb);
});

afterEach(async () => {
  // Clean up test database
  await testDb.close();
  await fs.unlink(testDbPath);
});
```

## 7. Architecture Documentation

### 7.1 Clear Layer Separation

#### CLI Layer (Direct Access)
- **Purpose**: Local development operations
- **Access**: Direct SQLite database, direct file system
- **Components**: CLI commands, interactive menu
- **Dependencies**: Database, file system, terminal UI
- **No Network**: No HTTP clients, no API calls

#### API Layer (Web/MCP Only)
- **Purpose**: Remote access, real-time updates, web interface
- **Access**: HTTP endpoints, WebSocket connections
- **Components**: API server, WebSocket server
- **Dependencies**: Database, authentication, caching
- **Network**: HTTP/WebSocket protocols

### 7.2 Benefits of Separation
- **Performance**: CLI operations are faster without network overhead
- **Reliability**: CLI works offline and without API server
- **Maintenance**: Clear boundaries reduce complexity
- **Testing**: Each layer can be tested independently
- **Scalability**: API layer can be optimized for concurrent access

## 8. Migration Plan

### 8.1 Phase 1: Revert API Integration (Tasks 3.2.1-3.2.3)
- Remove API integration files and tests
- Revert CLI commands to file-based operations
- Remove dev.js wrapper complexity
- Update command registration and routing

### 8.2 Phase 2: Database Integration (Tasks 3.2.4-3.2.7)
- Implement direct SQLite access layer
- Migrate CLI commands to use database operations
- Update interactive menu to use database
- Add transaction management and error handling

### 8.3 Phase 3: Testing Implementation (Tasks 3.2.8-3.2.11)
- Create comprehensive unit tests for all CLI commands
- Test interactive menu operations
- Test database operations and edge cases
- Add integration tests for complete workflows

### 8.4 Phase 4: Documentation and Cleanup (Tasks 3.2.12-3.2.15)
- Document architectural decisions and boundaries
- Update command help and documentation
- Remove unused files and dependencies
- Optimize performance and add monitoring

## 9. Success Criteria

### 9.1 Functional Requirements
- ✅ All CLI commands work without API server running
- ✅ Interactive menu operates with direct database access
- ✅ No network dependencies in CLI layer
- ✅ All existing functionality preserved

### 9.2 Performance Requirements
- ✅ CLI commands execute within 100ms for simple operations
- ✅ Database operations complete within 50ms
- ✅ No network latency impact on CLI performance
- ✅ Memory usage optimized for local operations

### 9.3 Quality Requirements
- ✅ 100% test coverage for all CLI commands
- ✅ Comprehensive error handling without API fallbacks
- ✅ Clear architectural documentation
- ✅ No breaking changes to existing workflows

## 10. Risk Assessment

### 10.1 High Risk
- **Data Consistency**: Direct database access might bypass validation
- **Performance**: Database queries might be slower than file operations
- **Complexity**: Transaction management adds complexity

### 10.2 Mitigation Strategies
- Implement comprehensive validation at database layer
- Optimize database queries and add indexing
- Use database transactions for data consistency
- Extensive testing with real-world scenarios

## 11. Detailed Implementation Tasks

### 11.1 Task 3.2.1: Remove API Integration Infrastructure
**Priority:** High | **Effort:** 2 days | **Dependencies:** None

#### Acceptance Criteria:
- [ ] Remove `scripts/modules/cli-api-commands.js`
- [ ] Remove `scripts/modules/api-service.js`
- [ ] Remove `scripts/modules/api-client.js`
- [ ] Remove `tests/unit/api-client.test.js`
- [ ] Remove `tests/unit/cli-api-integration.test.js`
- [ ] Update package.json to remove unused HTTP client dependencies
- [ ] Verify no remaining API imports in CLI code

#### Implementation Details:
```bash
# Files to remove
rm scripts/modules/cli-api-commands.js
rm scripts/modules/api-service.js
rm scripts/modules/api-client.js
rm tests/unit/api-client.test.js
rm tests/unit/cli-api-integration.test.js

# Update imports in commands.js
# Remove API-related options from CLI commands
```

### 11.2 Task 3.2.2: Revert CLI Commands to File Operations
**Priority:** High | **Effort:** 3 days | **Dependencies:** 3.2.1

#### Acceptance Criteria:
- [ ] Revert `next` command to original file-based implementation
- [ ] Revert `list` command to original file-based implementation
- [ ] Remove all API-related options (`--api`, `--no-api`)
- [ ] Remove fallback logic and error handling for API failures
- [ ] Restore original command help text and descriptions
- [ ] Verify all commands work without API server

#### Implementation Details:
```javascript
// Revert commands.js changes
// Remove API imports and fallback logic
// Restore original action functions
programInstance
  .command('next')
  .description('Show the next task to work on')
  .option('-f, --file <file>', 'Path to tasks file')
  .action(async (options) => {
    await displayNextTask(options.file, options.report);
  });
```

### 11.3 Task 3.2.3: Remove dev.js Wrapper Complexity
**Priority:** Medium | **Effort:** 2 days | **Dependencies:** 3.2.2

#### Acceptance Criteria:
- [ ] Analyze dev.js current functionality and dependencies
- [ ] Move essential functionality directly to bin/task-hero.js
- [ ] Remove dev.js file and update imports
- [ ] Update command registration to work without wrapper
- [ ] Test all CLI commands work with direct execution
- [ ] Update documentation to reflect simplified architecture

#### Implementation Details:
```javascript
// Update bin/task-hero.js to directly import and register commands
import { registerCommands } from '../scripts/modules/commands.js';

const program = new Command();
registerCommands(program);
program.parse(process.argv);
```

### 11.4 Task 3.2.4: Implement Database Access Layer
**Priority:** High | **Effort:** 4 days | **Dependencies:** 3.2.3

#### Acceptance Criteria:
- [ ] Create `scripts/modules/database.js` with TaskHeroDatabase class
- [ ] Implement all CRUD operations for tasks
- [ ] Implement complex queries (next task, filtering, search)
- [ ] Add transaction management and error handling
- [ ] Add connection pooling for performance
- [ ] Create database migration utilities
- [ ] Add comprehensive JSDoc documentation

#### Implementation Details:
```javascript
// Database access layer
export class TaskHeroDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async getTasks(filters = {}) {
    const { status, priority, search, limit = 50, offset = 0 } = filters;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    // ... additional filtering logic

    return this.db.prepare(query).all(...params);
  }
}
```

### 11.5 Task 3.2.5: Migrate CLI Commands to Database Operations
**Priority:** High | **Effort:** 5 days | **Dependencies:** 3.2.4

#### Acceptance Criteria:
- [ ] Update `next` command to use database queries
- [ ] Update `list` command to use database queries
- [ ] Update `show` command to use database queries
- [ ] Update `add-task` command to use database writes
- [ ] Update `set-status` command to use database writes
- [ ] Update `expand` command to use database writes
- [ ] Ensure all commands maintain existing functionality
- [ ] Add proper error handling for database operations

### 11.6 Task 3.2.6: Update Interactive Menu System
**Priority:** High | **Effort:** 3 days | **Dependencies:** 3.2.5

#### Acceptance Criteria:
- [ ] Audit all menu options and their underlying operations
- [ ] Update menu commands to use database operations
- [ ] Remove any API calls from menu system
- [ ] Test all menu navigation and operations
- [ ] Ensure consistent error handling across menu options
- [ ] Update menu help text and descriptions

### 11.7 Task 3.2.7: Implement Transaction Management
**Priority:** Medium | **Effort:** 2 days | **Dependencies:** 3.2.5

#### Acceptance Criteria:
- [ ] Add transaction support for multi-step operations
- [ ] Implement rollback on errors
- [ ] Add connection pooling for concurrent access
- [ ] Test transaction isolation and consistency
- [ ] Add monitoring for database performance
- [ ] Document transaction patterns and best practices

### 11.8 Task 3.2.8: Create CLI Command Unit Tests
**Priority:** High | **Effort:** 4 days | **Dependencies:** 3.2.6

#### Acceptance Criteria:
- [ ] Create test files for all CLI commands
- [ ] Test all parameter combinations and edge cases
- [ ] Test error handling for invalid inputs
- [ ] Test database operations with mock data
- [ ] Test output formatting and display
- [ ] Achieve 100% code coverage for CLI commands

#### Test Structure:
```javascript
// tests/unit/cli-commands/next-command.test.js
describe('Next Command', () => {
  beforeEach(async () => {
    testDb = await createTestDatabase();
    await seedTestData(testDb);
  });

  test('should find next available task', async () => {
    const result = await nextCommand({ priority: 'high' });
    expect(result.task).toBeDefined();
    expect(result.task.status).toBe('pending');
  });
});
```

### 11.9 Task 3.2.9: Create Interactive Menu Tests
**Priority:** High | **Effort:** 3 days | **Dependencies:** 3.2.8

#### Acceptance Criteria:
- [ ] Test menu navigation and option selection
- [ ] Test all menu-driven operations
- [ ] Test error handling in interactive mode
- [ ] Test user input validation
- [ ] Test menu state management
- [ ] Mock user interactions for automated testing

### 11.10 Task 3.2.10: Create Database Operation Tests
**Priority:** High | **Effort:** 3 days | **Dependencies:** 3.2.8

#### Acceptance Criteria:
- [ ] Test all CRUD operations
- [ ] Test complex queries and filtering
- [ ] Test transaction handling and rollbacks
- [ ] Test concurrent access scenarios
- [ ] Test database schema validation
- [ ] Test performance under load

### 11.11 Task 3.2.11: Integration Testing
**Priority:** Medium | **Effort:** 2 days | **Dependencies:** 3.2.10

#### Acceptance Criteria:
- [ ] Test complete CLI workflows end-to-end
- [ ] Test interactive menu workflows
- [ ] Test error recovery scenarios
- [ ] Test performance benchmarks
- [ ] Test with real project data
- [ ] Validate no regressions from original functionality

### 11.12 Task 3.2.12: Architecture Documentation
**Priority:** Medium | **Effort:** 2 days | **Dependencies:** 3.2.11

#### Acceptance Criteria:
- [ ] Document CLI layer architecture and boundaries
- [ ] Document database access patterns
- [ ] Document transaction management strategies
- [ ] Create developer guide for CLI development
- [ ] Document testing strategies and patterns
- [ ] Update README with new architecture

### 11.13 Task 3.2.13: Performance Optimization
**Priority:** Low | **Effort:** 2 days | **Dependencies:** 3.2.12

#### Acceptance Criteria:
- [ ] Optimize database queries and indexing
- [ ] Add query result caching where appropriate
- [ ] Optimize CLI startup time
- [ ] Add performance monitoring
- [ ] Benchmark against original file operations
- [ ] Document performance characteristics

### 11.14 Task 3.2.14: Error Handling Enhancement
**Priority:** Medium | **Effort:** 2 days | **Dependencies:** 3.2.13

#### Acceptance Criteria:
- [ ] Implement comprehensive error handling
- [ ] Add user-friendly error messages
- [ ] Add logging for debugging
- [ ] Handle database connection failures
- [ ] Add recovery mechanisms for corrupted data
- [ ] Test error scenarios thoroughly

### 11.15 Task 3.2.15: Final Cleanup and Validation
**Priority:** Low | **Effort:** 1 day | **Dependencies:** 3.2.14

#### Acceptance Criteria:
- [ ] Remove all unused files and dependencies
- [ ] Update package.json dependencies
- [ ] Run full test suite and ensure 100% pass rate
- [ ] Validate all CLI commands work independently
- [ ] Update command help and documentation
- [ ] Create migration guide for users

## 12. Dependencies and Constraints

### 12.1 Technical Dependencies
- SQLite database must be properly initialized
- Database schema must support all required operations
- Node.js version compatibility for database drivers
- File system permissions for database access

### 12.2 Process Dependencies
- Phase 2 (SQLite Migration) must be complete
- Current API integration work will be reverted
- Testing infrastructure must be established
- Documentation standards must be defined

### 12.3 Constraints
- No breaking changes to existing CLI command interfaces
- Maintain backward compatibility with existing workflows
- Performance must not degrade significantly
- All existing functionality must be preserved

---

*This comprehensive PRD provides detailed implementation guidance for establishing clean CLI architecture with direct database access and comprehensive testing coverage.*
