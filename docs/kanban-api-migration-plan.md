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

---

# Kanban App API Integration Guide

## Overview
This section documents the comprehensive API integration for the kanban app, including all transferred routes from the Express server to the TypeScript taskService.

## TaskService API Methods

### Core Task Management
The following methods provide essential task management functionality:

#### Basic Operations
```typescript
// Get all tasks (with optional filtering)
await taskService.getAllTasks(status?, withSubtasks?)

// Get specific task by ID
await taskService.getTaskById(id, status?)

// Create new task
await taskService.createTask({
  prompt: "Task description",
  dependencies: ["1", "2"],
  priority: "high",
  research: false
})

// Update existing task
await taskService.updateTask(id, { prompt: "Updated description" })

// Update task status (most common for Kanban)
await taskService.updateTaskStatus(id, "in-progress")

// Delete task
await taskService.deleteTask(id)

// Get next available task
await taskService.getNextTask()
```

#### Task Movement and Organization
```typescript
// Move task to new position
await taskService.moveTask(id, { after: "5" })

// Move task between Kanban columns
await taskService.moveTaskToColumn(taskId, "in-progress")

// Get tasks organized by Kanban columns
await taskService.getTasksByColumns()
```

### Subtask Management
```typescript
// Create subtask
await taskService.createSubtask(parentId, {
  prompt: "Subtask description",
  priority: "medium"
})

// Update subtask
await taskService.updateSubtask(parentId, subtaskId, {
  prompt: "Updated subtask"
})

// Delete subtask
await taskService.deleteSubtask(parentId, subtaskId)

// Clear all subtasks
await taskService.clearSubtasks(parentId)

// Expand task into subtasks
await taskService.expandTask(id, {
  prompt: "Expansion guidance",
  num: 5
})
```

### Dependency Management
```typescript
// Add dependency
await taskService.addDependency(id, { dependsOn: "3" })

// Remove dependency
await taskService.removeDependency(id, dependencyId)

// Validate all dependencies
await taskService.validateDependencies()

// Fix broken dependencies
await taskService.fixDependencies()
```

### Analysis and Reporting
```typescript
// Get complexity report
await taskService.getComplexityReport()

// Analyze specific task complexity
await taskService.analyzeTaskComplexity(id)

// Generate task files
await taskService.generateTaskFiles()
```

### Bulk Operations
```typescript
// Expand all tasks
await taskService.expandAllTasks("Expansion context")

// Update all tasks with AI
await taskService.updateAllTasks("Update context")
```

## Most Common API Functions for Kanban Integration

### Priority 1: Essential Kanban Operations
1. **`getAllTasks()`** - Load initial board data
2. **`updateTaskStatus(id, status)`** - Handle drag-and-drop
3. **`getTasksByColumns()`** - Organize tasks by status
4. **`moveTaskToColumn(taskId, columnId)`** - Column movement
5. **`getTaskById(id)`** - Task detail views

### Priority 2: Task Management
6. **`createTask(data)`** - Add new tasks
7. **`updateTask(id, data)`** - Edit task details
8. **`deleteTask(id)`** - Remove tasks
9. **`getNextTask()`** - Find next available work

### Priority 3: Advanced Features
10. **`createSubtask(parentId, data)`** - Break down tasks
11. **`addDependency(id, data)`** - Link related tasks
12. **`expandTask(id, data)`** - AI-powered task breakdown
13. **`validateDependencies()`** - Ensure task integrity

## Implementation Examples

### Basic Kanban Board Setup
```typescript
// Load initial data
const columns = await taskService.getTasksByColumns();

// Handle drag-and-drop
const handleTaskMove = async (taskId: string, newColumnId: ColumnId) => {
  try {
    await taskService.moveTaskToColumn(taskId, newColumnId);
    // Refresh board data
    const updatedColumns = await taskService.getTasksByColumns();
    setColumns(updatedColumns);
  } catch (error) {
    console.error('Failed to move task:', error);
  }
};
```

### Task Detail Modal
```typescript
const TaskDetailModal = ({ taskId }: { taskId: string }) => {
  const [task, setTask] = useState<TaskMasterTask | null>(null);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const taskData = await taskService.getTaskById(taskId);
        setTask(taskData);
      } catch (error) {
        console.error('Failed to load task:', error);
      }
    };

    loadTask();
  }, [taskId]);

  // Render task details...
};
```

### Task Creation Form
```typescript
const handleCreateTask = async (formData: TaskCreateRequest) => {
  try {
    const newTask = await taskService.createTask(formData);
    // Refresh board or add to local state
    const updatedColumns = await taskService.getTasksByColumns();
    setColumns(updatedColumns);
  } catch (error) {
    console.error('Failed to create task:', error);
  }
};
```

## Error Handling Best Practices

### API Error Handling
```typescript
const handleApiCall = async (apiFunction: () => Promise<any>) => {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

const performTaskOperation = async (operation: () => Promise<void>) => {
  setLoading(true);
  try {
    await operation();
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

## Integration Architecture

### Data Flow
1. **Frontend** → TaskService → **Express API** → **TaskMaster Core**
2. **TaskMaster Core** → **Express API** → TaskService → **Frontend**

### Key Components
- **TaskService**: TypeScript client with all API methods
- **Express Server**: Backend API server (keep in `/server` folder)
- **TaskMaster Core**: Direct function integration
- **Kanban Components**: React components using TaskService

### Configuration
- **API Base URL**: `http://localhost:3003`
- **Primary Endpoints**: `/api/v1/tasks/*`
- **Health Check**: `/health`
- **Project Info**: `/api/taskhero/info`

---

# ✅ MIGRATION COMPLETED SUCCESSFULLY

## Final Status: All Routes Transferred and TypeScript Errors Fixed

### ✅ Completed Tasks

#### 1. **TypeScript and ESLint Error Fixes**
- ❌ Removed unused `TasksResponse` import
- ✅ Replaced all `any` types with proper TypeScript interfaces:
  - `ManualTaskData` and `ManualSubtaskData` for task creation
  - `ValidationResult` for dependency validation
  - `TaskGenerationResult` for file generation
  - `TaskComplexityAnalysis` for complexity analysis
  - `BulkOperationResult` for expand/update all operations
- ✅ All methods now have proper return types with full type safety

#### 2. **Express Backend Migration**
- ✅ **Moved Express server** from `/server` folder to `/src/api` folder
- ✅ **Created new file structure**:
  ```
  kanban-app/src/api/
  ├── server.js          # Main Express server (moved from server/index.js)
  ├── routes.js          # All MCP API routes (moved from server/routes/mcp-api-routes.js)
  ├── logger.js          # Logger utility (moved from server/src/logger.js)
  ├── taskService.ts     # Enhanced TypeScript client with all API methods
  └── types.ts           # Type definitions
  ```
- ✅ **Updated package.json scripts**:
  - `dev:server`: `node src/api/server.js`
  - `start:server`: `node src/api/server.js`
  - `dev:full`: Runs both frontend and backend concurrently
- ✅ **Removed old server folder** completely

#### 3. **Complete API Route Transfer**
- ✅ **All 30+ MCP API routes** transferred from Express server to TypeScript taskService
- ✅ **Comprehensive API coverage**:
  - Core task management (CRUD operations)
  - Subtask management (create, update, delete, expand)
  - Dependency management (add, remove, validate, fix)
  - Analysis and reporting (complexity analysis, reports)
  - Bulk operations (expand all, update all)
  - Validation and file generation

#### 4. **Enhanced TaskService Features**
- ✅ **Type-safe API client** with proper interfaces
- ✅ **Error handling** with consistent response types
- ✅ **Kanban integration helpers** (column mapping, status conversion)
- ✅ **Health check and project info** methods
- ✅ **All Express routes** now available as TypeScript methods

### 🎯 Architecture After Migration

```
Frontend (React/TypeScript)
    ↓
TaskService (TypeScript Client) ← All API methods now here
    ↓ HTTP Requests
Express Server (src/api/server.js) ← Moved from /server
    ↓
TaskMaster Core Functions
    ↓
.taskmaster/tasks/tasks.json
```

### 📋 Updated Scripts

```bash
# Start frontend only
npm run dev

# Start backend only
npm run dev:server

# Start both frontend and backend
npm run dev:full

# Production server
npm run start:server
```

### 🔧 Key Benefits Achieved

1. **Type Safety**: All API calls now have proper TypeScript interfaces
2. **Code Organization**: Backend moved to logical `/src/api` location
3. **Simplified Structure**: No separate `/server` folder confusion
4. **Complete API Coverage**: All TaskMaster functions available in taskService
5. **Consistent Error Handling**: Unified error responses across all methods
6. **Better Developer Experience**: IntelliSense and type checking for all API calls

### 🚀 Ready for Development

The kanban app now has:
- ✅ Complete API integration with TaskMaster core
- ✅ Type-safe client with all 30+ API methods
- ✅ Proper error handling and validation
- ✅ Clean, organized file structure
- ✅ No TypeScript or ESLint errors
- ✅ Express backend in `/src/api` folder
- ✅ All routes transferred and functional

**Next steps**: Use the enhanced `taskService` methods in React components for full kanban functionality!
