# PRD: Web Kanban PRD Functions Implementation

## Metadata
- **PRD ID**: prd_web_kanban_functions_implementation
- **Title**: Complete Implementation of Web Kanban PRD Functions
- **Status**: pending
- **Priority**: high
- **Complexity**: high
- **Created Date**: 2025-06-09
- **Estimated Effort**: 3-4 days

## Executive Summary

The TaskHero web kanban PRD interface currently displays PRDs but has incomplete or non-functional quick action buttons. This PRD addresses the complete implementation of all 6 quick action buttons in the PRD detail modal, ensuring they work correctly with the unified API and database.

## Problem Statement

The current PRD management modal in the web kanban interface has the following issues:
1. **Generate Tasks** button calls non-existent API endpoints
2. **Analyze PRD** functionality is not implemented in the API
3. **View Related Tasks** doesn't properly filter tasks by PRD
4. **Download PRD** endpoint is missing
5. **Edit Metadata** and **Archive PRD** have incomplete API integration
6. Task counts are stored in PRD metadata instead of being calculated from the database

## Goals

### Primary Goals
1. Implement all missing API endpoints for PRD operations
2. Fix Generate Tasks to create tasks via the unified API
3. Ensure task counts are retrieved from the tasks table dynamically
4. Complete PRD analysis functionality with complexity calculation
5. Implement proper PRD file download functionality
6. Fix metadata editing and archiving operations

### Secondary Goals
1. Add proper error handling and user feedback
2. Implement progress tracking for long-running operations
3. Add validation for all PRD operations
4. Ensure consistent API response formats

## Requirements

### Functional Requirements

#### FR1: Generate Tasks Functionality
- Parse PRD content and generate tasks using AI
- Create tasks via unified API endpoints
- Update PRD status to reflect task generation
- Calculate task count from database, not metadata

#### FR2: Analyze PRD Functionality  
- Implement complexity analysis for PRDs
- Calculate effort estimates and priority recommendations
- Store analysis results in database
- Update PRD analysis status

#### FR3: View Related Tasks
- Filter kanban board to show only tasks linked to specific PRD
- Open in new tab with proper PRD filter applied
- Handle cases where no tasks exist for the PRD

#### FR4: Download PRD
- Serve PRD files for download via API
- Support multiple file formats (markdown, text)
- Handle file not found scenarios gracefully

#### FR5: Edit Metadata
- Update PRD metadata via API
- Validate all metadata fields
- Refresh UI after successful updates

#### FR6: Archive PRD
- Move PRD to archived status
- Validate that all linked tasks are completed
- Handle archiving workflow properly

### Non-Functional Requirements
- All operations must complete within 30 seconds
- Proper error handling with user-friendly messages
- Consistent API response formats
- Database transactions for data integrity

## Implementation Plan

### Phase 1: API Endpoint Implementation (Day 1-2)

#### Task 1.1: Implement Missing PRD API Endpoints
- `POST /api/prds/:id/analyze` - PRD complexity analysis
- `POST /api/prds/:id/generate-tasks` - Generate tasks from PRD
- `GET /api/prds/:id/download` - Download PRD file
- `POST /api/prds/:id/archive` - Archive PRD
- `PUT /api/prds/:id` - Update PRD metadata

#### Task 1.2: Enhance Task API for PRD Integration
- Add PRD filtering to `GET /api/tasks`
- Implement task count calculation by PRD ID
- Add PRD reference validation in task creation

#### Task 1.3: Implement PRD Analysis Logic
- Create complexity calculation algorithm
- Integrate with AI services for analysis
- Store analysis results in database

### Phase 2: Frontend Integration (Day 2-3)

#### Task 2.1: Fix Generate Tasks Button
- Update API endpoint calls to use unified API
- Implement proper error handling and progress tracking
- Update PRD status after task generation

#### Task 2.2: Implement Analyze PRD Functionality
- Connect to new analysis API endpoint
- Show analysis progress and results
- Update PRD metadata with analysis data

#### Task 2.3: Fix View Related Tasks
- Implement proper PRD filtering in kanban board
- Handle URL parameters for PRD filtering
- Add fallback for PRDs with no tasks

### Phase 3: Enhanced Features (Day 3-4)

#### Task 3.1: Complete Download Functionality
- Implement file serving in API
- Add support for different file formats
- Handle file access permissions

#### Task 3.2: Enhance Metadata Editing
- Add field validation
- Implement optimistic updates
- Add undo functionality

#### Task 3.3: Complete Archive Workflow
- Add pre-archive validation
- Implement proper status transitions
- Add archive confirmation dialogs

### Phase 4: Testing and Polish (Day 4)

#### Task 4.1: Integration Testing
- Test all API endpoints with real data
- Verify error handling scenarios
- Test concurrent operations

#### Task 4.2: UI/UX Polish
- Improve loading states and feedback
- Add proper toast notifications
- Enhance error messages

## Technical Architecture

### API Endpoints to Implement

```typescript
// PRD Analysis
POST /api/prds/:id/analyze
{
  "aiModel": "claude-3-sonnet",
  "includeComplexity": true,
  "includeEffortEstimate": true
}

// Task Generation  
POST /api/prds/:id/generate-tasks
{
  "append": false,
  "aiModel": "claude-3-sonnet", 
  "numTasks": 12,
  "expandSubtasks": true
}

// PRD Download
GET /api/prds/:id/download?format=markdown

// PRD Archive
POST /api/prds/:id/archive
{
  "force": false,
  "validateTasks": true
}

// PRD Metadata Update
PUT /api/prds/:id
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "high",
  "complexity": "medium"
}
```

### Database Schema Updates

```sql
-- Add analysis fields to PRD table
ALTER TABLE prds ADD COLUMN analysis_data TEXT;
ALTER TABLE prds ADD COLUMN analyzed_at DATETIME;
ALTER TABLE prds ADD COLUMN effort_estimate TEXT;

-- Add task count calculation view
CREATE VIEW prd_task_counts AS
SELECT 
  prd_id,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks
FROM tasks 
WHERE prd_id IS NOT NULL 
GROUP BY prd_id;
```

## Success Criteria

1. All 6 quick action buttons function correctly
2. Generate Tasks creates tasks via unified API
3. Task counts are calculated from database
4. PRD analysis provides meaningful complexity data
5. Download functionality works for all PRD files
6. Metadata editing persists changes correctly
7. Archive workflow validates task completion
8. All operations provide proper user feedback
9. Error scenarios are handled gracefully
10. Performance meets requirements (< 30s operations)

## Risk Assessment

### High Risk
- **AI Integration Complexity**: PRD analysis and task generation require stable AI service integration
- **Database Migration**: Schema changes may require careful migration planning

### Medium Risk  
- **File Access**: PRD download functionality depends on proper file system access
- **Concurrent Operations**: Multiple users editing same PRD simultaneously

### Low Risk
- **UI Updates**: Frontend changes are well-contained and testable
- **API Integration**: Existing patterns can be followed for new endpoints

## Dependencies

1. Unified API infrastructure (already implemented)
2. SQLite database with PRD and task tables (already implemented)  
3. AI service integration (Claude/OpenAI APIs)
4. File system access for PRD downloads
5. React/TypeScript frontend framework (already implemented)

## Acceptance Criteria

### AC1: Generate Tasks Button
- Clicking Generate Tasks calls `POST /api/prds/:id/generate-tasks`
- Tasks are created in the database via unified API
- PRD status updates to reflect task generation
- Task count is calculated from database, not stored in PRD metadata
- Progress feedback is shown during generation
- Error handling for AI service failures

### AC2: Analyze PRD Button  
- Clicking Analyze PRD calls `POST /api/prds/:id/analyze`
- Complexity analysis is performed and stored
- PRD metadata is updated with analysis results
- Analysis status is tracked and displayed
- Results are persisted in database

### AC3: View Related Tasks Button
- Opens kanban board filtered to show only tasks for this PRD
- URL includes PRD filter parameter
- Handles cases where PRD has no tasks
- Opens in new browser tab

### AC4: Download PRD Button
- Calls `GET /api/prds/:id/download` endpoint
- File download is initiated in browser
- Supports markdown and text formats
- Handles file not found errors gracefully

### AC5: Edit Metadata Button
- Opens modal with current PRD metadata
- All fields are editable and validated
- Changes are saved via `PUT /api/prds/:id`
- UI updates reflect saved changes
- Validation errors are displayed clearly

### AC6: Archive PRD Button
- Validates all linked tasks are completed
- Calls `POST /api/prds/:id/archive` endpoint
- PRD status changes to archived
- Confirmation dialog prevents accidental archiving
- Error handling for incomplete tasks

## Testing Strategy

### Unit Tests
- API endpoint functionality
- Database operations
- Validation logic
- Error handling

### Integration Tests  
- End-to-end PRD workflows
- API and database integration
- Frontend and backend communication
- File operations

### Manual Testing
- User interface interactions
- Error scenarios
- Performance under load
- Cross-browser compatibility

## Monitoring and Metrics

1. **API Response Times**: Track performance of all PRD operations
2. **Error Rates**: Monitor failed operations and their causes
3. **User Engagement**: Track usage of each quick action button
4. **Task Generation Success**: Monitor AI-powered task creation success rates
5. **Database Performance**: Track query performance for task counting

## Detailed Button Implementation Plan

### Button 1: Analyze PRD 📊

**Current State**: API endpoint returns 501 Not Implemented
**Target State**: Functional complexity analysis with AI integration

**Implementation Steps**:
1. **API Endpoint** (`POST /api/prds/:id/analyze`)
   - Integrate with existing `analyze-project-complexity.js` module
   - Add PRD-specific complexity calculation
   - Store results in `prds.analysis_data` field
   - Update `prds.analysis_status` to 'analyzed'

2. **Frontend Integration**
   - Update `handleAnalyzePRD()` in `PRDManagementModal.tsx`
   - Change endpoint from `/api/v1/prds/:id/analyze` to `/api/prds/:id/analyze`
   - Add proper error handling for analysis failures
   - Show analysis results in PRD details

**API Response Format**:
```json
{
  "success": true,
  "data": {
    "complexity": "medium",
    "effortEstimate": "2-3 days",
    "analysisData": {
      "taskComplexity": 7.5,
      "dependencyCount": 3,
      "estimatedHours": 24
    }
  }
}
```

### Button 2: Generate Tasks ⚡

**Current State**: Calls non-existent `/api/v1/prds/:id/generate-tasks`
**Target State**: Creates tasks via unified API with database task counting

**Implementation Steps**:
1. **API Endpoint** (`POST /api/prds/:id/generate-tasks`)
   - Integrate with existing `parse-prd.js` module
   - Use unified TaskDAO for task creation
   - Remove task count storage in PRD metadata
   - Calculate task count from database queries

2. **Database Changes**:
   - Remove `taskCount` and `totalTasks` from PRD table
   - Create view for dynamic task counting:
   ```sql
   CREATE VIEW prd_task_stats AS
   SELECT
     prd_id,
     COUNT(*) as total_tasks,
     COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
     ROUND(COUNT(CASE WHEN status = 'done' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_percentage
   FROM tasks
   WHERE prd_id IS NOT NULL
   GROUP BY prd_id;
   ```

3. **Frontend Integration**:
   - Update `handleGenerateTasks()` to use `/api/prds/:id/generate-tasks`
   - Remove hardcoded task count display
   - Fetch task counts from `/api/prds/:id` response

### Button 3: View Related Tasks 👁️

**Current State**: Opens kanban with basic PRD filter
**Target State**: Proper PRD filtering with fallback handling

**Implementation Steps**:
1. **Kanban Board Enhancement**
   - Add PRD filter support to `EnhancedKanbanBoard.tsx`
   - Parse URL parameters for `prd` filter
   - Filter tasks by `prdId` field

2. **API Enhancement**:
   - Add `prdId` filter to `GET /api/tasks` endpoint
   - Return empty array with proper message if no tasks found

3. **Frontend Integration**:
   - Update `handleViewTasks()` to pass correct PRD ID
   - Add fallback message for PRDs with no tasks

### Button 4: Download PRD 📥

**Current State**: Calls non-existent `/api/v1/prds/:id/download`
**Target State**: Functional file download with format support

**Implementation Steps**:
1. **API Endpoint** (`GET /api/prds/:id/download`)
   - Read PRD file from `filePath` field
   - Support query parameter `?format=markdown|txt`
   - Set proper Content-Type and Content-Disposition headers
   - Handle file not found errors

2. **File Serving Logic**:
   ```javascript
   const filePath = prd.filePath;
   if (!fs.existsSync(filePath)) {
     throw new APIError('PRD file not found', 404, 'FILE_NOT_FOUND');
   }

   const fileContent = fs.readFileSync(filePath, 'utf8');
   res.setHeader('Content-Type', 'text/markdown');
   res.setHeader('Content-Disposition', `attachment; filename="${prd.id}.md"`);
   res.send(fileContent);
   ```

3. **Frontend Integration**:
   - Update `handleDownloadPRD()` to use `/api/prds/:id/download`
   - Add format selection option
   - Improve error handling for missing files

### Button 5: Edit Metadata ✏️

**Current State**: Calls non-existent `/api/v1/prds/:id` PUT endpoint
**Target State**: Functional metadata editing with validation

**Implementation Steps**:
1. **API Endpoint** (`PUT /api/prds/:id`)
   - Validate metadata fields using Zod schemas
   - Update PRD record in database
   - Return updated PRD data

2. **Validation Schema**:
   ```javascript
   const prdUpdateSchema = z.object({
     title: z.string().min(1).max(255).optional(),
     description: z.string().max(1000).optional(),
     priority: z.enum(['low', 'medium', 'high']).optional(),
     complexity: z.enum(['low', 'medium', 'high']).optional(),
     estimatedEffort: z.string().max(100).optional(),
     tags: z.array(z.string()).optional()
   });
   ```

3. **Frontend Integration**:
   - Update `handleSaveMetadata()` to use `/api/prds/:id`
   - Add field validation before submission
   - Refresh PRD data after successful update

### Button 6: Archive PRD 📦

**Current State**: Calls non-existent `/api/v1/prds/:id/archive`
**Target State**: Proper archiving with task completion validation

**Implementation Steps**:
1. **API Endpoint** (`POST /api/prds/:id/archive`)
   - Validate all linked tasks are completed
   - Move PRD file to archived directory
   - Update PRD status to 'archived'
   - Support `force` parameter for override

2. **Archive Logic**:
   ```javascript
   // Check task completion
   const incompleteTasks = await taskDAO.findAll({
     prdId: id,
     status: { $ne: 'done' }
   });

   if (incompleteTasks.tasks.length > 0 && !force) {
     throw new APIError('Cannot archive PRD with incomplete tasks', 400);
   }

   // Move file and update status
   await archivePrdFile(prd.filePath);
   await prdDAO.update(id, { status: 'archived' });
   ```

3. **Frontend Integration**:
   - Update `handleArchivePRD()` to use `/api/prds/:id/archive`
   - Add task completion validation
   - Show detailed error messages for incomplete tasks

## Implementation Priority

1. **High Priority** (Day 1): Generate Tasks, Analyze PRD
2. **Medium Priority** (Day 2): Edit Metadata, Archive PRD
3. **Low Priority** (Day 3): Download PRD, View Related Tasks

---

*This PRD ensures complete functionality of the web kanban PRD interface with proper API integration and database-driven task counting.*
