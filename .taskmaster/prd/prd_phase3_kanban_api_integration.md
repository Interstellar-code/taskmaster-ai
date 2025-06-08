# PRD: Kanban Web Interface to Unified API Integration

**PRD ID:** prd_phase3_kanban_api_integration  
**Status:** pending  
**Priority:** high  
**Complexity:** medium  
**Created:** 2024-12-19  
**Updated:** 2024-12-19  

---

## 1. Executive Summary

Migrate TaskHero Kanban web interface from legacy API endpoints to unified API integration, enabling real-time collaboration, improved performance, and consistent data access patterns. **This PRD focuses exclusively on API layer integration for web interface - CLI commands will use direct database access as per Phase 3.2 architectural decisions.**

## 2. Problem Statement

### Current State
- Kanban web interface uses legacy API endpoints (`/api/v1/tasks`)
- Inconsistent data formats between web interface and other components
- Limited real-time capabilities
- Separate API server creates complexity and maintenance overhead
- No centralized logging or monitoring for web operations

### Target State
- Kanban interface uses unified API endpoints (`/api/tasks`, `/api/prds`, etc.)
- **API layer serves web interface and MCP server exclusively**
- **CLI commands use direct database access (no API dependencies)**
- Real-time updates via WebSocket integration for web interface
- Single API server for web/MCP operations only
- Centralized logging and monitoring for API operations

## 3. Current Kanban API Analysis

### 3.1 Existing Web API Endpoints (src/web/server.js)

| Current Endpoint | Method | Purpose | New API Mapping |
|------------------|--------|---------|-----------------|
| `/api/v1/tasks` | GET | Get all tasks | `GET /api/tasks` |
| `/api/v1/tasks/:id` | GET | Get task by ID | `GET /api/tasks/:id` |
| `/api/v1/tasks/:id/status` | PATCH | Update task status | `PUT /api/tasks/:id/status` |
| `/api/taskhero/info` | GET | Get project info | `GET /api/analytics/dashboard` |
| `/health` | GET | Health check | `GET /health` |

### 3.2 Legacy Kanban App API (kanban-app/src/api/)

| Legacy Endpoint | Method | Purpose | New API Mapping |
|-----------------|--------|---------|-----------------|
| `/api/tasks` | GET | Get tasks with filtering | `GET /api/tasks` |
| `/api/tasks` | POST | Create new task | `POST /api/tasks` |
| `/api/tasks/:id` | GET | Get task details | `GET /api/tasks/:id` |
| `/api/tasks/:id` | PUT | Update task | `PUT /api/tasks/:id` |
| `/api/tasks/:id` | DELETE | Delete task | `DELETE /api/tasks/:id` |
| `/api/tasks/:id/status` | PUT | Update status | `PUT /api/tasks/:id/status` |
| `/api/prds` | GET | Get PRDs | `GET /api/prds` |
| `/api/prds/:id` | GET | Get PRD details | `GET /api/prds/:id` |

### 3.3 Frontend API Calls (React Components)

Based on the kanban webapp structure, the frontend likely makes these API calls:

| Component | API Calls | Current Format | New Format |
|-----------|-----------|----------------|------------|
| KanbanBoard | `GET /api/tasks` | `{tasks: [...]}` | `{tasks: [...], page, total}` |
| TaskCard | `PUT /api/tasks/:id/status` | `{status: "done"}` | `{status: "done"}` |
| TaskForm | `POST /api/tasks` | Task object | Task object |
| TaskForm | `PUT /api/tasks/:id` | Task object | Task object |
| TaskForm | `DELETE /api/tasks/:id` | - | - |
| PRDSelector | `GET /api/prds` | `{prds: [...]}` | `{prds: [...], page, total}` |

### 3.4 Current Data Formats

#### Legacy Task Format
```json
{
  "id": "1",
  "title": "Task title",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "dependencies": ["2", "3"],
  "subtasks": [
    {"id": "1.1", "title": "Subtask", "completed": true}
  ]
}
```

#### New Unified API Format
```json
{
  "id": 1,
  "task_identifier": "1",
  "title": "Task title",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "dependencies": [2, 3],
  "subtasks": [
    {"id": "1.1", "title": "Subtask", "status": "done"}
  ],
  "created_at": "2024-12-19T10:00:00Z",
  "updated_at": "2024-12-19T10:00:00Z"
}
```

## 4. Required API Endpoint Enhancements

### 4.1 Missing Endpoints for Kanban Features

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `POST /api/tasks/:id/copy` | POST | Copy/duplicate task | High |
| `GET /api/tasks/search` | GET | Search tasks by text | Medium |
| `POST /api/tasks/bulk-update` | POST | Update multiple tasks | Medium |
| `GET /api/analytics/task-stats` | GET | Task statistics for dashboard | High |
| `POST /api/tasks/:id/subtasks` | POST | Add subtask | High |
| `PUT /api/tasks/:id/subtasks/:subId` | PUT | Update subtask | High |
| `DELETE /api/tasks/:id/subtasks/:subId` | DELETE | Delete subtask | High |

### 4.2 WebSocket Events for Real-time Updates

| Event | Purpose | Data |
|-------|---------|------|
| `task:created` | New task added | Task object |
| `task:updated` | Task modified | Task object |
| `task:deleted` | Task removed | Task ID |
| `task:status_changed` | Status updated via drag-drop | Task ID, old status, new status |
| `task:copied` | Task duplicated | Original ID, new task object |
| `subtask:added` | Subtask created | Task ID, subtask object |
| `subtask:updated` | Subtask modified | Task ID, subtask object |
| `subtask:deleted` | Subtask removed | Task ID, subtask ID |

## 5. Frontend Integration Strategy

### 5.1 API Client Refactoring

#### Current API Client Pattern
```javascript
// Legacy pattern
const response = await fetch('/api/v1/tasks');
const data = await response.json();
return data.tasks;
```

#### New Unified API Pattern
```javascript
// New pattern with error handling and pagination
const response = await apiClient.get('/api/tasks', {
  params: { page: 1, limit: 50, status: 'pending' }
});
return response.data; // {tasks: [...], page, total, totalPages}
```

### 5.2 Data Transformation Layer

Create transformation utilities to handle format differences:

```javascript
// Transform legacy format to new format
function transformTaskToUnified(legacyTask) {
  return {
    ...legacyTask,
    id: parseInt(legacyTask.id),
    task_identifier: legacyTask.id,
    subtasks: legacyTask.subtasks?.map(sub => ({
      ...sub,
      status: sub.completed ? 'done' : 'pending'
    }))
  };
}
```

### 5.3 WebSocket Integration

```javascript
// Real-time updates
const ws = new WebSocket('ws://localhost:3001');
ws.on('task:status_changed', (data) => {
  updateTaskInState(data.taskId, { status: data.newStatus });
  showToast(`Task ${data.taskId} moved to ${data.newStatus}`);
});
```

## 6. Implementation Strategy

### 6.1 Phase 1: API Client Infrastructure (Tasks 3.3.1-3.3.3)
- Create unified API client for frontend
- Implement WebSocket client for real-time updates
- Add error handling and retry logic
- Create data transformation utilities

### 6.2 Phase 2: Core Component Migration (Tasks 3.3.4-3.3.7)
- Migrate KanbanBoard component to use new API
- Update TaskCard drag-and-drop to use new endpoints
- Migrate TaskForm CRUD operations
- Add real-time update handling

### 6.3 Phase 3: Advanced Features (Tasks 3.3.8-3.3.11)
- Implement task copying functionality
- Add subtask management via new API
- Integrate PRD management features
- Add search and filtering capabilities

### 6.4 Phase 4: Cleanup and Enhancement (Tasks 3.3.12-3.3.15)
- Remove legacy API endpoints
- Optimize performance with caching
- Add advanced real-time features
- Update documentation and deployment

## 7. Technical Requirements

### 7.1 Frontend Requirements
- React 18+ with TypeScript
- Axios or Fetch API for HTTP requests
- WebSocket client for real-time updates
- State management for real-time data synchronization
- Error boundary components for API failures

### 7.2 Backward Compatibility
- Support gradual migration with feature flags
- Maintain existing component interfaces
- Preserve user experience during transition
- Ensure no data loss during migration

### 7.3 Performance Requirements
- API calls should not impact UI responsiveness
- Real-time updates should be delivered within 100ms
- Support for offline mode with local caching
- Optimistic updates for better user experience

## 8. Data Migration Strategy

### 8.1 Format Transformation
- Handle ID format changes (string to integer)
- Transform subtask completion status to new format
- Map legacy field names to new schema
- Preserve all existing data during migration

### 8.2 Validation
- Ensure data integrity during transformation
- Validate API responses against expected schemas
- Handle edge cases and malformed data
- Provide clear error messages for validation failures

## 9. Success Criteria

### 9.1 Functional Requirements
- ✅ All kanban features work with new API
- ✅ Real-time updates work across multiple browser tabs
- ✅ No data loss during migration
- ✅ All existing user workflows continue working

### 9.2 Performance Requirements
- ✅ Page load times within 10% of current performance
- ✅ Real-time updates delivered within 100ms
- ✅ Smooth drag-and-drop operations
- ✅ Responsive UI during API operations

### 9.3 Quality Requirements
- ✅ 100% test coverage for API integration
- ✅ Comprehensive error handling
- ✅ Clear user feedback for all operations

## 10. Risk Assessment

### 10.1 High Risk
- **Data Format Incompatibility**: New API format might break existing components
- **Real-time Complexity**: WebSocket integration adds complexity
- **Performance Impact**: Additional API calls might slow down UI

### 10.2 Mitigation Strategies
- Implement comprehensive data transformation layer
- Add feature flags for gradual rollout
- Extensive testing with real user scenarios
- Performance monitoring and optimization

## 11. Legacy Code Cleanup

### 11.1 Files to Remove After Migration
- `src/web/server.js` (legacy API endpoints)
- `kanban-app/src/api/` (if separate API server exists)
- Legacy API client utilities
- Old data transformation functions

### 11.2 Files to Update
- All React components making API calls
- API client configuration
- Environment configuration
- Build and deployment scripts

## 12. Dependencies

### 12.1 Technical Dependencies
- Unified API server must be running and accessible
- WebSocket server must be implemented
- Frontend build system updates

### 12.2 Process Dependencies
- Phase 2 (Unified API) must be complete
- **Phase 3.2 (CLI Architecture Refinement) establishes CLI independence**
- MCP API integration should be in progress
- **No fallback mechanisms to CLI layer - API operates independently**
- Comprehensive testing environment setup

---

*This PRD will be expanded with detailed task breakdowns and implementation specifications in subsequent iterations.*
