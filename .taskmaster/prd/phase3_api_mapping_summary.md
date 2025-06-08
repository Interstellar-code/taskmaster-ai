# Phase 3: Complete API Mapping and Missing Endpoints Summary

**Created:** 2024-12-19  
**Updated:** 2024-12-19  

---

## Overview

This document provides a comprehensive mapping of all existing functions across CLI, MCP, and Kanban interfaces to the new unified API, along with a complete list of missing endpoints that need to be implemented.

## 1. Complete Function Mapping

### 1.1 CLI Commands → API Endpoints

| CLI Command | Current Function | File Access | New API Endpoint | Status |
|-------------|------------------|-------------|------------------|--------|
| `init` | initializeProject | Creates .taskmaster | `POST /api/projects/init` | ❌ Missing |
| `list` | listTasks | tasks.json | `GET /api/tasks` | ✅ Exists |
| `next` | findNextTask | tasks.json | `GET /api/tasks/next` | ❌ Missing |
| `show <id>` | showTask | tasks.json | `GET /api/tasks/:id` | ✅ Exists |
| `add-task` | addTask | tasks.json | `POST /api/tasks` | ✅ Exists |
| `set-status` | setTaskStatus | tasks.json | `PUT /api/tasks/:id/status` | ❌ Missing |
| `expand` | expandTask | tasks.json | `POST /api/tasks/:id/expand` | ❌ Missing |
| `update-task` | updateTaskById | tasks.json | `PUT /api/tasks/:id` | ✅ Exists |
| `remove-task` | removeTask | tasks.json | `DELETE /api/tasks/:id` | ✅ Exists |
| `parse-prd` | parsePRD | tasks.json, prds.json | `POST /api/prds/parse` | ❌ Missing |
| `generate` | generateTaskFiles | tasks.json | `POST /api/tasks/generate-files` | ❌ Missing |
| `models` | getModelConfiguration | config.json | `GET/PUT /api/config/models` | ❌ Missing |
| `analyze-complexity` | analyzeTaskComplexity | tasks.json | `GET /api/analytics/complexity` | ❌ Missing |
| `prd` | listPrds | prds.json | `GET /api/prds` | ✅ Exists |
| `prd-show` | showPrd | prds.json | `GET /api/prds/:id` | ✅ Exists |
| `prd-status` | updatePrdStatus | prds.json | `PUT /api/prds/:id/status` | ❌ Missing |
| `prd-sync` | syncPrdStatus | prds.json, tasks.json | `POST /api/prds/sync` | ❌ Missing |
| `prd-integrity` | checkPrdIntegrity | prds.json | `GET /api/prds/integrity` | ❌ Missing |
| `prd-migrate` | migratePrds | prds.json | `POST /api/prds/migrate` | ❌ Missing |
| `prd-archive` | archivePrd | prds.json | `POST /api/prds/:id/archive` | ❌ Missing |

### 1.2 MCP Tools → API Endpoints

| MCP Tool | Current Function | Direct Access | New API Endpoint | Status |
|----------|------------------|---------------|------------------|--------|
| `get_tasks` | listTasksDirect | JSON read | `GET /api/tasks` | ✅ Exists |
| `get_task` | showTaskDirect | JSON read | `GET /api/tasks/:id` | ✅ Exists |
| `add_task` | addTaskDirect | JSON write | `POST /api/tasks` | ✅ Exists |
| `set_task_status` | setTaskStatusDirect | JSON write | `PUT /api/tasks/:id/status` | ❌ Missing |
| `update_task` | updateTaskByIdDirect | JSON write | `PUT /api/tasks/:id` | ✅ Exists |
| `update_subtask` | updateSubtaskByIdDirect | JSON write | `PUT /api/tasks/:id/subtasks/:subId` | ❌ Missing |
| `remove_task` | removeTaskDirect | JSON write | `DELETE /api/tasks/:id` | ✅ Exists |
| `expand_task` | expandTaskDirect | JSON write | `POST /api/tasks/:id/expand` | ❌ Missing |
| `next_task` | findNextTaskDirect | JSON read | `GET /api/tasks/next` | ❌ Missing |
| `parse_prd` | parsePRDDirect | File/JSON write | `POST /api/prds/parse` | ❌ Missing |
| `generate` | generateTaskFilesDirect | JSON read | `POST /api/tasks/generate-files` | ❌ Missing |
| `analyze` | analyzeProjectComplexityDirect | JSON read | `GET /api/analytics/complexity` | ❌ Missing |
| `get_prds` | Direct PRD access | File read | `GET /api/prds` | ✅ Exists |
| `models` | Direct config access | Config read | `GET/PUT /api/config/models` | ❌ Missing |
| `initialize_project` | initializeProjectDirect | File system | `POST /api/projects/init` | ❌ Missing |
| `add_dependency` | Direct JSON manipulation | JSON write | `POST /api/tasks/:id/dependencies` | ❌ Missing |
| `remove_dependency` | Direct JSON manipulation | JSON write | `DELETE /api/tasks/:id/dependencies/:depId` | ❌ Missing |
| `validate_dependencies` | Direct validation | JSON read | `GET /api/tasks/dependencies/validate` | ❌ Missing |
| `fix_dependencies` | Direct JSON fix | JSON write | `POST /api/tasks/dependencies/fix` | ❌ Missing |
| `add_subtask` | Direct JSON manipulation | JSON write | `POST /api/tasks/:id/subtasks` | ❌ Missing |
| `remove_subtask` | Direct JSON manipulation | JSON write | `DELETE /api/tasks/:id/subtasks/:subId` | ❌ Missing |
| `clear_subtasks` | Direct JSON manipulation | JSON write | `DELETE /api/tasks/:id/subtasks` | ❌ Missing |
| `expand_all` | Direct expansion | JSON write | `POST /api/tasks/expand-all` | ❌ Missing |
| `complexity_report` | Direct file read | File read | `GET /api/analytics/complexity-report` | ❌ Missing |
| `move_task` | Direct JSON manipulation | JSON write | `PUT /api/tasks/:id/position` | ❌ Missing |

### 1.3 Kanban Web Interface → API Endpoints

| Current Endpoint | Method | Purpose | New API Endpoint | Status |
|------------------|--------|---------|------------------|--------|
| `/api/v1/tasks` | GET | Get all tasks | `GET /api/tasks` | ✅ Exists |
| `/api/v1/tasks/:id` | GET | Get task by ID | `GET /api/tasks/:id` | ✅ Exists |
| `/api/v1/tasks/:id/status` | PATCH | Update status | `PUT /api/tasks/:id/status` | ❌ Missing |
| `/api/taskhero/info` | GET | Project info | `GET /api/analytics/dashboard` | ✅ Exists |
| `/api/tasks` | POST | Create task | `POST /api/tasks` | ✅ Exists |
| `/api/tasks/:id` | PUT | Update task | `PUT /api/tasks/:id` | ✅ Exists |
| `/api/tasks/:id` | DELETE | Delete task | `DELETE /api/tasks/:id` | ✅ Exists |
| `/api/prds` | GET | Get PRDs | `GET /api/prds` | ✅ Exists |
| `/api/prds/:id` | GET | Get PRD details | `GET /api/prds/:id` | ✅ Exists |

## 2. Missing API Endpoints Summary

### 2.1 High Priority (Required for Core Functionality)

| Endpoint | Method | Purpose | Component Need |
|----------|--------|---------|----------------|
| `POST /api/projects/init` | POST | Initialize project | CLI, MCP |
| `GET /api/tasks/next` | GET | Find next task | CLI, MCP |
| `PUT /api/tasks/:id/status` | PUT | Update task status | CLI, MCP, Kanban |
| `POST /api/tasks/:id/expand` | POST | Expand task to subtasks | CLI, MCP |
| `POST /api/prds/parse` | POST | Parse PRD file | CLI, MCP |
| `GET/PUT /api/config/models` | GET/PUT | AI model config | CLI, MCP |
| `PUT /api/prds/:id/status` | PUT | Update PRD status | CLI |
| `POST /api/tasks/:id/subtasks` | POST | Add subtask | MCP, Kanban |
| `PUT /api/tasks/:id/subtasks/:subId` | PUT | Update subtask | MCP, Kanban |
| `DELETE /api/tasks/:id/subtasks/:subId` | DELETE | Remove subtask | MCP, Kanban |
| `POST /api/tasks/:id/dependencies` | POST | Add dependency | MCP |
| `DELETE /api/tasks/:id/dependencies/:depId` | DELETE | Remove dependency | MCP |

### 2.2 Medium Priority (Enhanced Functionality)

| Endpoint | Method | Purpose | Component Need |
|----------|--------|---------|----------------|
| `POST /api/tasks/generate-files` | POST | Generate task files | CLI, MCP |
| `GET /api/analytics/complexity` | GET | Complexity analysis | CLI, MCP |
| `POST /api/prds/sync` | POST | Sync PRD statuses | CLI |
| `GET /api/tasks/dependencies/validate` | GET | Validate dependencies | MCP |
| `POST /api/tasks/dependencies/fix` | POST | Fix dependencies | MCP |
| `DELETE /api/tasks/:id/subtasks` | DELETE | Clear all subtasks | MCP |
| `POST /api/tasks/expand-all` | POST | Expand all tasks | MCP |
| `PUT /api/tasks/:id/position` | PUT | Move task position | MCP |
| `POST /api/tasks/:id/copy` | POST | Copy/duplicate task | Kanban |
| `GET /api/tasks/search` | GET | Search tasks | Kanban |
| `POST /api/tasks/bulk-update` | POST | Bulk operations | Kanban |

### 2.3 Low Priority (Administrative/Maintenance)

| Endpoint | Method | Purpose | Component Need |
|----------|--------|---------|----------------|
| `GET /api/prds/integrity` | GET | Check PRD integrity | CLI |
| `POST /api/prds/migrate` | POST | Migrate PRDs | CLI |
| `POST /api/prds/:id/archive` | POST | Archive PRD | CLI |
| `GET /api/analytics/complexity-report` | GET | Detailed complexity | MCP |

## 3. Implementation Priority

### Phase 3.1: CLI Integration (12 missing endpoints)
- Focus on core CLI commands and PRD management
- Implement task status updates and expansion
- Add model configuration endpoints

### Phase 3.2: MCP Integration (15 missing endpoints)  
- Focus on subtask and dependency management
- Implement advanced task operations
- Add validation and utility endpoints

### Phase 3.3: Kanban Integration (3 missing endpoints)
- Focus on web-specific features
- Implement copy and search functionality
- Add bulk operations support

## 4. WebSocket Events for Real-time Updates

| Event | Purpose | Data | Components |
|-------|---------|------|------------|
| `task:created` | Task added | Task object | All |
| `task:updated` | Task modified | Task object | All |
| `task:deleted` | Task removed | Task ID | All |
| `task:status_changed` | Status updated | Task ID, old/new status | All |
| `task:expanded` | Task expanded | Task ID, subtask count | CLI, MCP |
| `prd:parsed` | PRD processed | PRD ID, task count | CLI, MCP |
| `dependency:added` | Dependency created | Task ID, dependency ID | MCP |
| `dependency:removed` | Dependency removed | Task ID, dependency ID | MCP |
| `subtask:added` | Subtask created | Task ID, subtask object | MCP, Kanban |
| `subtask:updated` | Subtask modified | Task ID, subtask object | MCP, Kanban |
| `subtask:deleted` | Subtask removed | Task ID, subtask ID | MCP, Kanban |

## 5. Data Format Standardization

### Current Inconsistencies
- Task IDs: String vs Integer
- Subtask completion: Boolean vs Status enum
- Date formats: Various formats vs ISO strings
- Response structures: Different pagination formats

### Target Unified Format
- All IDs as integers
- All status fields as enums
- All dates as ISO strings
- Consistent pagination: `{data: [...], page, limit, total, totalPages}`

---

**Total Missing Endpoints: 30**
- High Priority: 12
- Medium Priority: 11  
- Low Priority: 7

**Implementation Estimate: 3-4 weeks**
- Week 1: High priority endpoints + CLI integration
- Week 2: Medium priority endpoints + MCP integration  
- Week 3: Low priority endpoints + Kanban integration
- Week 4: Testing, optimization, and cleanup
