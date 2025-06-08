# PRD: MCP Server to Unified API Integration

**PRD ID:** prd_phase3_mcp_api_integration  
**Status:** pending  
**Priority:** high  
**Complexity:** high  
**Created:** 2024-12-19  
**Updated:** 2024-12-19  

---

## 1. Executive Summary

Transform TaskHero MCP (Model Context Protocol) server from direct function calls to unified API proxy, ensuring consistent data access and enabling advanced features like real-time updates and centralized logging. **This PRD focuses exclusively on API layer integration for MCP server - CLI commands will use direct database access as per Phase 3.2 architectural decisions.**

## 2. Problem Statement

### Current State
- MCP tools directly call TaskHero core functions
- Inconsistent data access patterns with CLI and web interfaces
- No centralized logging or monitoring for MCP operations
- Limited real-time capabilities
- Difficult to maintain consistency across interfaces

### Target State
- MCP server proxies all requests through unified API
- **API layer serves MCP server and web interface exclusively**
- **CLI commands use direct database access (no API dependencies)**
- Consistent data validation and business logic for API operations
- Real-time updates via WebSocket integration for MCP tools
- Centralized logging and monitoring for API operations
- **No fallback mechanisms to CLI layer - API operates independently**
- Simplified maintenance and feature development

## 3. Current MCP Tools Analysis

### 3.1 Core MCP Tools (mcp-server/src/tools/)

| Tool Name | File | Current Function | API Mapping |
|-----------|------|------------------|-------------|
| `get_tasks` | get-tasks.js | listTasksDirect | `GET /api/tasks` |
| `get_task` | get-task.js | showTaskDirect | `GET /api/tasks/:id` |
| `add_task` | add-task.js | addTaskDirect | `POST /api/tasks` |
| `set_task_status` | set-task-status.js | setTaskStatusDirect | `PUT /api/tasks/:id/status` |
| `update_task` | update-task.js | updateTaskByIdDirect | `PUT /api/tasks/:id` |
| `update_subtask` | update-subtask.js | updateSubtaskByIdDirect | `PUT /api/tasks/:id/subtasks/:subId` |
| `remove_task` | remove-task.js | removeTaskDirect | `DELETE /api/tasks/:id` |
| `expand_task` | expand-task.js | expandTaskDirect | `POST /api/tasks/:id/expand` |
| `next_task` | next-task.js | findNextTaskDirect | `GET /api/tasks/next` |
| `parse_prd` | parse-prd.js | parsePRDDirect | `POST /api/prds/parse` |
| `generate` | generate.js | generateTaskFilesDirect | `POST /api/tasks/generate-files` |
| `analyze` | analyze.js | analyzeProjectComplexityDirect | `GET /api/analytics/complexity` |

### 3.2 PRD Management Tools

| Tool Name | File | Current Function | API Mapping |
|-----------|------|------------------|-------------|
| `get_prds` | get-prds.js | Direct PRD file access | `GET /api/prds` |
| `models` | models.js | Direct config access | `GET/PUT /api/config/models` |
| `initialize_project` | initialize-project.js | initializeProjectDirect | `POST /api/projects/init` |

### 3.3 Dependency Management Tools

| Tool Name | File | Current Function | API Mapping |
|-----------|------|------------------|-------------|
| `add_dependency` | add-dependency.js | Direct JSON manipulation | `POST /api/tasks/:id/dependencies` |
| `remove_dependency` | remove-dependency.js | Direct JSON manipulation | `DELETE /api/tasks/:id/dependencies/:depId` |
| `validate_dependencies` | validate-dependencies.js | Direct validation | `GET /api/tasks/dependencies/validate` |
| `fix_dependencies` | fix-dependencies.js | Direct JSON fix | `POST /api/tasks/dependencies/fix` |

### 3.4 Subtask Management Tools

| Tool Name | File | Current Function | API Mapping |
|-----------|------|------------------|-------------|
| `add_subtask` | add-subtask.js | Direct JSON manipulation | `POST /api/tasks/:id/subtasks` |
| `remove_subtask` | remove-subtask.js | Direct JSON manipulation | `DELETE /api/tasks/:id/subtasks/:subId` |
| `clear_subtasks` | clear-subtasks.js | Direct JSON manipulation | `DELETE /api/tasks/:id/subtasks` |
| `expand_all` | expand-all.js | Direct expansion | `POST /api/tasks/expand-all` |

### 3.5 Utility Tools

| Tool Name | File | Current Function | API Mapping |
|-----------|------|------------------|-------------|
| `complexity_report` | complexity-report.js | Direct file read | `GET /api/analytics/complexity-report` |
| `move_task` | move-task.js | Direct JSON manipulation | `PUT /api/tasks/:id/position` |

## 4. Current Direct Functions (mcp-server/src/core/direct-functions/)

### 4.1 Task Operations
| Function | File | Current Access | API Replacement |
|----------|------|----------------|-----------------|
| listTasksDirect | list-tasks.js | Direct JSON read | HTTP GET /api/tasks |
| showTaskDirect | show-task.js | Direct JSON read | HTTP GET /api/tasks/:id |
| addTaskDirect | add-task.js | Direct JSON write | HTTP POST /api/tasks |
| setTaskStatusDirect | set-task-status.js | Direct JSON write | HTTP PUT /api/tasks/:id/status |
| updateTaskByIdDirect | update-task-by-id.js | Direct JSON write | HTTP PUT /api/tasks/:id |
| removeTaskDirect | remove-task.js | Direct JSON write | HTTP DELETE /api/tasks/:id |
| expandTaskDirect | expand-task.js | Direct JSON write | HTTP POST /api/tasks/:id/expand |
| findNextTaskDirect | find-next-task.js | Direct JSON read | HTTP GET /api/tasks/next |

### 4.2 PRD Operations
| Function | File | Current Access | API Replacement |
|----------|------|----------------|-----------------|
| parsePRDDirect | parse-prd.js | Direct file/JSON write | HTTP POST /api/prds/parse |
| generateTaskFilesDirect | generate-task-files.js | Direct JSON read | HTTP POST /api/tasks/generate-files |

### 4.3 Analysis Operations
| Function | File | Current Access | API Replacement |
|----------|------|----------------|-----------------|
| analyzeProjectComplexityDirect | analyze-project-complexity.js | Direct JSON read | HTTP GET /api/analytics/complexity |

## 5. Missing API Endpoints for MCP Integration

### 5.1 Required New Endpoints

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `POST /api/tasks/:id/subtasks` | POST | Add subtask to task | High |
| `PUT /api/tasks/:id/subtasks/:subId` | PUT | Update specific subtask | High |
| `DELETE /api/tasks/:id/subtasks/:subId` | DELETE | Remove specific subtask | High |
| `DELETE /api/tasks/:id/subtasks` | DELETE | Clear all subtasks | Medium |
| `POST /api/tasks/:id/dependencies` | POST | Add task dependency | High |
| `DELETE /api/tasks/:id/dependencies/:depId` | DELETE | Remove task dependency | High |
| `GET /api/tasks/dependencies/validate` | GET | Validate all dependencies | Medium |
| `POST /api/tasks/dependencies/fix` | POST | Fix broken dependencies | Medium |
| `POST /api/tasks/expand-all` | POST | Expand all tasks | Low |
| `PUT /api/tasks/:id/position` | PUT | Move task position | Medium |
| `GET /api/analytics/complexity-report` | GET | Get complexity report | Medium |

### 5.2 WebSocket Events for Real-time Updates

| Event | Purpose | Data |
|-------|---------|------|
| `task:created` | Task added | Task object |
| `task:updated` | Task modified | Task object |
| `task:deleted` | Task removed | Task ID |
| `task:status_changed` | Status updated | Task ID, old status, new status |
| `prd:parsed` | PRD processed | PRD ID, task count |
| `dependency:added` | Dependency created | Task ID, dependency ID |
| `dependency:removed` | Dependency removed | Task ID, dependency ID |

## 6. Implementation Strategy

### 6.1 Phase 1: API Client Infrastructure (Tasks 3.2.1-3.2.3)
- Create HTTP client for MCP server
- Implement WebSocket client for real-time updates
- Add error handling and retry logic
- Create response transformation utilities

### 6.2 Phase 2: Core Tool Migration (Tasks 3.2.4-3.2.8)
- Migrate basic CRUD tools: get_tasks, get_task, add_task, set_task_status
- Replace direct function calls with API calls
- Maintain existing tool interfaces and response formats
- Add comprehensive error handling

### 6.3 Phase 3: Advanced Tool Migration (Tasks 3.2.9-3.2.12)
- Migrate complex tools: parse_prd, expand_task, analyze
- Implement missing API endpoints
- Add dependency and subtask management tools
- Integrate WebSocket for real-time updates

### 6.4 Phase 4: Cleanup and Enhancement (Tasks 3.2.13-3.2.15)
- Remove direct function implementations
- Add real-time capabilities via WebSocket
- Optimize API calls and caching
- Update documentation and tool descriptions

## 7. Technical Requirements

### 7.1 API Client Requirements
- HTTP client with automatic retry and timeout
- WebSocket client for real-time updates
- Automatic project root detection and header injection
- Response caching for read operations
- Error handling with graceful fallbacks

### 7.2 Tool Interface Compatibility
- Maintain existing tool parameter schemas
- Preserve response formats and structures
- Support all current tool capabilities
- Ensure no breaking changes for AI assistants

### 7.3 Performance Requirements
- API calls should not significantly impact tool response times
- Implement response caching for frequently accessed data
- Support concurrent tool operations
- Maintain sub-second response times for simple operations

## 8. WebSocket Integration

### 8.1 Real-time Features
- Live task status updates
- Real-time dependency validation
- Progress notifications for long-running operations
- Collaborative editing notifications

### 8.2 Event Handling
- Subscribe to relevant events based on tool usage
- Update cached data when events are received
- Notify AI assistants of relevant changes
- Handle connection failures gracefully

## 9. Success Criteria

### 9.1 Functional Requirements
- ✅ All MCP tools work identically to current implementation
- ✅ Real-time updates work across all interfaces
- ✅ No data corruption or loss during migration
- ✅ All existing AI assistant integrations continue working

### 9.2 Performance Requirements
- ✅ Tool response times within 10% of current performance
- ✅ Successful handling of concurrent tool operations
- ✅ Real-time updates delivered within 100ms

### 9.3 Quality Requirements
- ✅ 100% test coverage for migrated tools
- ✅ Comprehensive error handling and logging
- ✅ Clear documentation for new API integration patterns

## 10. Risk Assessment

### 10.1 High Risk
- **AI Assistant Compatibility**: Changes might break existing AI integrations
- **Performance Impact**: API calls might slow down tool operations
- **Real-time Complexity**: WebSocket integration adds complexity

### 10.2 Mitigation Strategies
- Maintain exact tool interfaces during migration
- Implement comprehensive testing with AI assistants
- Add fallback mechanisms for API failures
- Gradual rollout with feature flags

## 11. Dependencies

### 11.1 Technical Dependencies
- Unified API server must be running and accessible
- WebSocket server must be implemented
- HTTP and WebSocket client libraries

### 11.2 Process Dependencies
- Phase 2 (Unified API) must be complete
- **Phase 3.2 (CLI Architecture Refinement) establishes CLI independence**
- **No fallback mechanisms to CLI layer - MCP uses API exclusively**
- Kanban API integration should be in progress
- Comprehensive testing environment setup

---

*This PRD will be expanded with detailed task breakdowns and implementation specifications in subsequent iterations.*
