# PRD: CLI Commands to Unified API Integration

**PRD ID:** prd_phase3_cli_api_integration  
**Status:** pending  
**Priority:** high  
**Complexity:** high  
**Created:** 2024-12-19  
**Updated:** 2024-12-19  

---

## 1. Executive Summary

Transform TaskHero CLI commands from direct file access to unified API integration, ensuring consistent data access patterns across all interfaces while maintaining backward compatibility and performance.

## 2. Problem Statement

### Current State
- CLI commands directly access JSON files (`tasks.json`, `prds.json`, config files)
- Inconsistent data access patterns between CLI, MCP, and web interfaces
- No centralized data validation or business logic enforcement
- Potential data corruption from concurrent access
- Difficult to maintain and extend functionality

### Target State
- All CLI commands use unified API endpoints for data operations
- Consistent data validation and business logic across all interfaces
- Centralized error handling and logging
- Improved data integrity and concurrent access safety
- Simplified maintenance and feature development

## 3. Current CLI Functions Analysis

### 3.1 Core CLI Commands (scripts/modules/commands.js)

| Command | Current Function | File Access | API Mapping |
|---------|------------------|-------------|-------------|
| `init` | initializeProject | Creates .taskmaster structure | `POST /api/projects/init` |
| `list` | listTasks | Reads tasks.json | `GET /api/tasks` |
| `next` | findNextTask | Reads tasks.json | `GET /api/tasks/next` |
| `show <id>` | showTask | Reads tasks.json | `GET /api/tasks/:id` |
| `add-task` | addTask | Writes tasks.json | `POST /api/tasks` |
| `set-status` | setTaskStatus | Writes tasks.json | `PUT /api/tasks/:id/status` |
| `expand` | expandTask | Writes tasks.json | `POST /api/tasks/:id/expand` |
| `update-task` | updateTaskById | Writes tasks.json | `PUT /api/tasks/:id` |
| `remove-task` | removeTask | Writes tasks.json | `DELETE /api/tasks/:id` |
| `parse-prd` | parsePRD | Writes tasks.json, prds.json | `POST /api/prds/parse` |
| `generate` | generateTaskFiles | Reads tasks.json | `POST /api/tasks/generate-files` |
| `models` | getModelConfiguration | Reads/writes config.json | `GET/PUT /api/config/models` |
| `analyze-complexity` | analyzeTaskComplexity | Reads tasks.json | `GET /api/analytics/complexity` |

### 3.2 PRD Management Commands (scripts/modules/prd-commands.js)

| Command | Current Function | File Access | API Mapping |
|---------|------------------|-------------|-------------|
| `prd` | listPrds | Reads prds.json | `GET /api/prds` |
| `prd-show` | showPrd | Reads prds.json | `GET /api/prds/:id` |
| `prd-status` | updatePrdStatusCommand | Writes prds.json | `PUT /api/prds/:id/status` |
| `prd-sync` | syncPrdStatus | Reads/writes prds.json, tasks.json | `POST /api/prds/sync` |
| `prd-integrity` | checkPrdIntegrity | Reads prds.json | `GET /api/prds/integrity` |
| `prd-migrate` | migratePrds | Writes prds.json | `POST /api/prds/migrate` |
| `prd-archive` | archivePrdCommand | Writes prds.json | `POST /api/prds/:id/archive` |

### 3.3 Task Manager Functions (scripts/modules/task-manager/)

| Function | File | Current Access | API Mapping |
|----------|------|----------------|-------------|
| addTask | add-task.js | Direct JSON write | `POST /api/tasks` |
| listTasks | list-tasks.js | Direct JSON read | `GET /api/tasks` |
| setTaskStatus | set-task-status.js | Direct JSON write | `PUT /api/tasks/:id/status` |
| expandTask | expand-task.js | Direct JSON write | `POST /api/tasks/:id/expand` |
| updateTaskById | update-task-by-id.js | Direct JSON write | `PUT /api/tasks/:id` |
| removeTask | remove-task.js | Direct JSON write | `DELETE /api/tasks/:id` |
| findNextTask | find-next-task.js | Direct JSON read | `GET /api/tasks/next` |
| generateTaskFiles | generate-task-files.js | Direct JSON read | `POST /api/tasks/generate-files` |
| analyzeTaskComplexity | analyze-task-complexity.js | Direct JSON read | `GET /api/analytics/complexity` |

## 4. Missing API Endpoints

### 4.1 Required New Endpoints

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `POST /api/projects/init` | POST | Initialize project structure | High |
| `GET /api/tasks/next` | GET | Find next available task | High |
| `POST /api/tasks/:id/expand` | POST | Expand task into subtasks | High |
| `POST /api/tasks/generate-files` | POST | Generate task files from JSON | Medium |
| `POST /api/prds/parse` | POST | Parse PRD and generate tasks | High |
| `POST /api/prds/sync` | POST | Sync PRD statuses with tasks | Medium |
| `GET /api/prds/integrity` | GET | Check PRD file integrity | Low |
| `POST /api/prds/migrate` | POST | Migrate legacy PRD files | Low |
| `POST /api/prds/:id/archive` | POST | Archive PRD | Medium |
| `GET/PUT /api/config/models` | GET/PUT | AI model configuration | High |
| `GET /api/analytics/complexity` | GET | Task complexity analysis | Medium |

### 4.2 Enhanced Existing Endpoints

| Endpoint | Enhancement Needed |
|----------|-------------------|
| `GET /api/tasks` | Add PRD filtering, complexity data |
| `POST /api/tasks` | Support AI-generated tasks with dependencies |
| `PUT /api/tasks/:id` | Support AI-powered updates |
| `GET /api/prds` | Add task statistics, file integrity status |

## 5. Implementation Strategy

### 5.1 Phase 1: API Client Infrastructure (Tasks 3.1.1-3.1.3)
- Create HTTP client wrapper for CLI commands
- Implement authentication/authorization if needed
- Add error handling and retry logic
- Create API response parsing utilities

### 5.2 Phase 2: Core Command Migration (Tasks 3.1.4-3.1.8)
- Migrate essential commands: list, show, add-task, set-status
- Update task manager functions to use API calls
- Maintain backward compatibility with file access as fallback
- Add comprehensive testing

### 5.3 Phase 3: Advanced Command Migration (Tasks 3.1.9-3.1.12)
- Migrate complex commands: parse-prd, expand, update-task
- Implement missing API endpoints
- Update PRD management commands
- Add AI service integration through API

### 5.4 Phase 4: Cleanup and Optimization (Tasks 3.1.13-3.1.15)
- Remove direct file access code
- Optimize API calls for performance
- Add caching where appropriate
- Update documentation and help text

## 6. Technical Requirements

### 6.1 API Client Requirements
- HTTP client with timeout and retry logic
- Automatic project root detection and header injection
- Response caching for read-heavy operations
- Error handling with graceful fallbacks

### 6.2 Backward Compatibility
- Maintain existing CLI command signatures
- Preserve output formats (text, JSON, table)
- Support offline mode with file access fallback
- Ensure no breaking changes to existing workflows

### 6.3 Performance Requirements
- API calls should not significantly impact CLI performance
- Implement response caching for frequently accessed data
- Batch operations where possible
- Maintain sub-second response times for common operations

## 7. Success Criteria

### 7.1 Functional Requirements
- ✅ All CLI commands work identically to current implementation
- ✅ Data consistency across CLI, MCP, and web interfaces
- ✅ No data corruption or loss during migration
- ✅ All existing tests pass with new implementation

### 7.2 Performance Requirements
- ✅ CLI command response times within 10% of current performance
- ✅ Successful handling of concurrent operations
- ✅ Graceful degradation when API is unavailable

### 7.3 Quality Requirements
- ✅ 100% test coverage for migrated functions
- ✅ Comprehensive error handling and logging
- ✅ Clear documentation for new API integration patterns

## 8. Risk Assessment

### 8.1 High Risk
- **Data Loss**: Improper migration could corrupt existing task data
- **Performance Degradation**: API calls might slow down CLI operations
- **Breaking Changes**: Modified behavior could break existing workflows

### 8.2 Mitigation Strategies
- Implement comprehensive backup and rollback procedures
- Maintain file access fallback for critical operations
- Extensive testing with real-world data sets
- Gradual rollout with feature flags

## 9. Dependencies

### 9.1 Technical Dependencies
- Unified API server must be running and accessible
- Database migration must be complete
- HTTP client library selection and integration

### 9.2 Process Dependencies
- Phase 2 (Unified API) must be complete
- Comprehensive testing environment setup
- Documentation updates for new patterns

---

*This PRD will be expanded with detailed task breakdowns and implementation specifications in subsequent iterations.*
