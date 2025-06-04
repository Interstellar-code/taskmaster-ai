# Kanban API Migration Plan

## Overview
This document outlines the migration of Express.js API from `kanban-webapp` to `kanban-app` to create a unified kanban application with TaskMaster integration.

## Migration Objectives
- Integrate existing Express.js API server into the react-dnd-kit kanban application
- Connect TaskMaster core functionality to the kanban interface
- Implement task list and task detail views using existing API endpoints
- Maintain all existing API functionality while removing redundant kanban-webapp

## Source Analysis

### Current API Structure (kanban-webapp/server)
```
kanban-webapp/server/
├── index.js                    # Main Express server with TaskMaster integration
├── routes/
│   └── mcp-api-routes.js      # Complete MCP API endpoints
├── src/
│   └── logger.js              # Logger utility
└── simple-server.js           # Simple fallback server
```

### Key API Features to Migrate
1. **TaskMaster Core Integration**
   - Direct function calls to TaskMaster MCP server
   - Automatic project root and tasks.json path resolution
   - Fallback to legacy file operations

2. **Core API Endpoints**
   - `GET /api/tasks` - List all TaskMaster tasks
   - `GET /api/tasks/:id` - Get task details
   - `PUT /api/tasks/:id/status` - Update task status
   - `GET /api/taskhero/info` - Project information

3. **MCP API Routes (v1)**
   - Complete REST API for all TaskMaster functions
   - Task management, subtasks, dependencies
   - Status updates, validation, reports

4. **Security & Middleware**
   - CORS configuration for multiple origins
   - Rate limiting, helmet security
   - Request logging and error handling

## Migration Implementation Plan

### Phase 1: Backend Integration ✅
- [x] **Task 1.1**: Create server directory structure in kanban-app
- [x] **Task 1.2**: Copy and adapt Express server files
- [x] **Task 1.3**: Install required backend dependencies
- [x] **Task 1.4**: Update import paths for TaskMaster core integration
- [x] **Task 1.5**: Configure CORS for kanban-app port (5173)
- [x] **Task 1.6**: Test API server startup and TaskMaster integration

### Phase 2: Frontend API Integration ✅
- [x] **Task 2.1**: Create API service layer in kanban-app
- [x] **Task 2.2**: Implement task fetching from TaskMaster API
- [x] **Task 2.3**: Replace static task data with API data
- [x] **Task 2.4**: Add task status update functionality
- [x] **Task 2.5**: Implement error handling and loading states
- [x] **Task 2.6**: Test drag-and-drop with API integration

### Phase 3: Enhanced Features ✅
- [x] **Task 3.1**: Add task detail modal/view
- [x] **Task 3.2**: Implement task filtering and search
- [x] **Task 3.3**: Add project information display
- [x] **Task 3.4**: Integrate task creation functionality
- [x] **Task 3.5**: Add real-time updates and refresh capabilities

### Phase 4: Testing & Cleanup ✅
- [x] **Task 4.1**: Comprehensive testing of all API endpoints
- [x] **Task 4.2**: Verify TaskMaster core integration
- [x] **Task 4.3**: Test drag-and-drop with real TaskMaster data
- [x] **Task 4.4**: Performance testing and optimization
- [x] **Task 4.5**: Documentation updates

### Phase 5: Cleanup & Removal
- [x] **Task 5.1**: Remove kanban-webapp directory
- [x] **Task 5.2**: Update main package.json dependencies
- [x] **Task 5.3**: Update documentation references
- [x] **Task 5.4**: Clean up any remaining references

## Technical Requirements

### Dependencies to Add to kanban-app
```json
{
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "express-rate-limit": "^7.5.0"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

### New Scripts for kanban-app
```json
{
  "scripts": {
    "dev:server": "node server/index.js",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:server\"",
    "start:server": "node server/index.js"
  }
}
```

## API Integration Points

### TaskMaster Core Integration
- **Project Root**: Resolved from kanban-app location
- **Tasks Path**: `.taskmaster/tasks/tasks.json`
- **MCP Functions**: All direct functions available via REST API

### Frontend Integration
- **API Base URL**: `http://localhost:3003`
- **Primary Endpoints**:
  - Tasks List: `GET /api/tasks`
  - Task Details: `GET /api/tasks/:id`
  - Status Update: `PUT /api/tasks/:id/status`
  - Project Info: `GET /api/taskhero/info`

### Data Mapping
- **TaskMaster Status** → **Kanban Columns**:
  - `pending` → `todo`
  - `in-progress` → `in-progress`
  - `done` → `done`
  - `review` → `in-progress` (with indicator)
  - `blocked` → `todo` (with indicator)

## File Structure After Migration

```
kanban-app/
├── server/                     # Express API server
│   ├── index.js               # Main server with TaskMaster integration
│   ├── routes/
│   │   └── mcp-api-routes.js  # MCP API endpoints
│   └── src/
│       └── logger.js          # Logger utility
├── src/
│   ├── components/
│   │   ├── KanbanBoard.tsx    # Enhanced with API integration
│   │   ├── TaskCard.tsx       # Enhanced with TaskMaster data
│   │   └── api/               # API service layer
│   │       ├── taskService.ts # TaskMaster API client
│   │       └── types.ts       # API type definitions
│   └── ...
├── package.json               # Updated with backend dependencies
└── ...
```

## Success Criteria
1. ✅ Kanban board displays real TaskMaster tasks
2. ✅ Drag-and-drop updates task status in TaskMaster
3. ✅ Task details accessible via API
4. ✅ All existing API endpoints functional
5. ✅ TaskMaster core integration working
6. ✅ kanban-webapp completely removed
7. ✅ No broken references or dependencies

## Risk Mitigation
- **Backup**: Keep kanban-webapp until full migration verified
- **Testing**: Comprehensive API testing before removal
- **Rollback**: Document rollback procedure if issues arise
- **Dependencies**: Verify all TaskMaster core dependencies available

## Timeline
- **Phase 1-4**: ✅ Completed
- **Phase 5**: ✅ Completed
- **Total Estimated Time**: ✅ Migration completed successfully

## Notes
- TaskMaster core integration provides robust task management
- API supports both simple and advanced TaskMaster features
- Frontend maintains accessibility and drag-and-drop functionality
- Migration preserves all existing TaskMaster workflows
