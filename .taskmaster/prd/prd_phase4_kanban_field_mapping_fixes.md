---
id: prd_phase4_kanban_field_mapping
title: TaskHero Kanban Field Mapping Fixes & API Completion
status: pending
priority: high
complexity: high
created_date: 2025-06-08
author: TaskHero Development Team
linked_tasks: []
file_path: .taskmaster/prd/prd_phase4_kanban_field_mapping_fixes.md
parsed_date: null
file_hash: null
---

# TaskHero Kanban Field Mapping Fixes & API Completion

## Context

### Overview

Phase 3 successfully removed all MCP function calls from the kanban web interface and established unified API integration. However, comprehensive field mapping analysis revealed **8 critical issues** that prevent the kanban interface from functioning correctly with the unified API. These field mapping mismatches cause task creation failures, broken dependency handling, missing metadata, and incomplete PRD linking.

The current kanban interface appears to work but has significant underlying data integrity issues that need immediate resolution to ensure reliable task management functionality.

### Current State Analysis

#### ✅ What Works (Phase 3 Achievements)
- **API Integration**: All components use unified API endpoints (`/api/tasks`, `/api/prds`, `/api/analytics`)
- **MCP Removal**: Zero MCP function calls remaining in kanban interface
- **PRD Upload**: File upload functionality working correctly
- **Basic Display**: Tasks display with basic metadata in kanban columns
- **Status Updates**: Drag-and-drop status changes function properly

#### ❌ Critical Issues Identified
1. **Dependencies Type Mismatch**: Frontend sends `string[]`, API expects `number[]`
2. **ID Type Inconsistency**: Mixed `string|number` vs `integer` types throughout
3. **Missing Task Identifier**: Cannot display task hierarchy (1.1, 1.2.1, etc.)
4. **Missing Complexity Score**: No complexity metrics in forms or display
5. **Broken PRD Linking**: `prdSource: string` vs `prd_id: integer` mismatch
6. **Tags Field Missing**: Tags not persisted to database
7. **Metadata Field Missing**: Important metadata lost during operations
8. **Form Field Gaps**: Several critical fields missing from creation/edit forms

### Business Impact

#### User Experience Issues
- **Task Creation Failures**: Users cannot create tasks with dependencies
- **Broken Hierarchy**: Cannot see parent-child task relationships
- **Missing Context**: No PRD source information displayed
- **Lost Metadata**: Important task details not preserved
- **Incomplete Forms**: Users cannot set all necessary task properties

#### Data Integrity Problems
- **Inconsistent IDs**: Data corruption risk from mixed ID types
- **Broken References**: Tasks cannot properly link to PRDs
- **Missing Relationships**: Dependency chains not properly maintained
- **Incomplete Records**: Critical fields not saved to database

## PRD

### Technical Architecture

#### Field Mapping Fixes Required

##### 1. Dependencies Type Conversion
**Problem**: Frontend sends `dependencies: string[]`, API expects `dependencies: number[]`

**Solution**: Implement bidirectional type conversion
- **Frontend → API**: Convert string IDs to integers before sending
- **API → Frontend**: Ensure consistent integer IDs in responses
- **Validation**: Add proper type checking and error handling

##### 2. ID Type Standardization
**Problem**: Mixed `string|number` vs `integer` types cause data mapping errors

**Solution**: Standardize on integer IDs throughout
- **Database**: All IDs as `INTEGER PRIMARY KEY`
- **API**: All ID fields as `number` type in schemas
- **Frontend**: Convert all ID handling to use integers consistently
- **Legacy Support**: Handle existing string IDs during migration

##### 3. Missing Frontend Fields Implementation
**Problem**: Critical fields missing from forms and display components

**Solution**: Add missing fields to all relevant components
- **Task Identifier**: Add `taskIdentifier` field to forms and display
- **Complexity Score**: Add complexity input and display components
- **Metadata**: Add metadata field support in forms
- **Tags**: Implement tags input component with proper validation

##### 4. PRD Linking System Fix
**Problem**: `prdSource: string` vs `prd_id: integer` field mismatch

**Solution**: Implement proper PRD reference system
- **API Schema**: Add `prd_id` field to task creation/update
- **Frontend**: Replace `prdSource` string with `prdId` integer
- **Display**: Show PRD information using proper database relationships
- **Migration**: Convert existing `prdSource` references to `prd_id`

#### Component Updates Required

##### TaskCreateModal Enhancements
- Add missing form fields: `taskIdentifier`, `complexityScore`, `metadata`, `tags`
- Fix dependencies field to handle integer IDs
- Implement PRD selection using `prd_id` instead of `prdSource`
- Add proper validation for all field types
- Enhance error handling for field mapping issues

##### TaskEditModal Improvements
- Support editing all task fields including missing ones
- Handle ID type conversion properly
- Implement bulk edit capabilities for metadata
- Add dependency management with proper ID handling

##### EnhancedKanbanBoard Updates
- Display task hierarchy using `taskIdentifier` field
- Show complexity scores with visual indicators
- Display PRD source information using proper relationships
- Handle ID type consistency in drag-and-drop operations

##### Form Components Standardization
- Create reusable components for missing field types
- Implement proper validation for all field combinations
- Add type conversion utilities for ID handling
- Standardize error display and user feedback

#### API Schema Enhancements

##### Task Schema Completion
```typescript
interface CompleteTaskSchema {
  // Core fields (existing)
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  
  // Fixed field types
  dependencies: number[];        // Was: string[]
  taskIdentifier: string;        // Was: missing
  complexityScore: number;       // Was: missing
  prdId: number | null;         // Was: prdSource string
  
  // Enhanced fields
  tags: string[];               // Was: missing from schema
  metadata: Record<string, any>; // Was: missing from forms
  
  // Existing optional fields
  details?: string;
  testStrategy?: string;
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string;
}
```

##### PRD Schema Enhancements
```typescript
interface CompletePRDSchema {
  id: number;
  prdIdentifier: string;
  title: string;
  fileName: string;
  filePath: string;
  
  // Enhanced linking
  linkedTaskIds: number[];      // Computed field
  taskStats: TaskStatistics;    // Computed field
  
  // Existing fields
  status: PRDStatus;
  complexity: Complexity;
  priority: Priority;
  metadata: Record<string, any>;
}
```

#### Database Migration Strategy

##### Schema Updates Required
1. **Add missing columns** to tasks table
2. **Update foreign key constraints** for PRD relationships
3. **Add indexes** for performance optimization
4. **Migrate existing data** to new field formats

##### Data Migration Steps
1. **Backup existing data** before any schema changes
2. **Convert string IDs** to integers where needed
3. **Migrate prdSource** references to prd_id foreign keys
4. **Populate missing fields** with default values
5. **Validate data integrity** after migration

### Implementation Tasks

#### Phase 4.1: Critical Field Type Fixes (High Priority)
- **Task 4.1.1**: Fix dependencies type mismatch (string[] → number[])
- **Task 4.1.2**: Standardize ID types throughout application
- **Task 4.1.3**: Implement bidirectional type conversion utilities
- **Task 4.1.4**: Add comprehensive validation for field types

#### Phase 4.2: Missing Field Implementation (High Priority)
- **Task 4.2.1**: Add taskIdentifier field to all components
- **Task 4.2.2**: Implement complexityScore input and display
- **Task 4.2.3**: Add metadata field support to forms
- **Task 4.2.4**: Implement tags input component

#### Phase 4.3: PRD Linking System (Medium Priority)
- **Task 4.3.1**: Replace prdSource with prdId in all components
- **Task 4.3.2**: Update API schema to support proper PRD relationships
- **Task 4.3.3**: Implement PRD selection dropdown in task forms
- **Task 4.3.4**: Add PRD information display in task cards

#### Phase 4.4: Form Component Enhancements (Medium Priority)
- **Task 4.4.1**: Enhance TaskCreateModal with all missing fields
- **Task 4.4.2**: Update TaskEditModal for complete field support
- **Task 4.4.3**: Add bulk edit capabilities for metadata
- **Task 4.4.4**: Implement advanced dependency management

#### Phase 4.5: Database Schema Updates (Medium Priority)
- **Task 4.5.1**: Add missing columns to tasks table
- **Task 4.5.2**: Update foreign key constraints
- **Task 4.5.3**: Migrate existing data to new schema
- **Task 4.5.4**: Add database indexes for performance

#### Phase 4.6: Testing and Validation (Low Priority)
- **Task 4.6.1**: Create comprehensive field mapping tests
- **Task 4.6.2**: Test all CRUD operations with new field structure
- **Task 4.6.3**: Validate data integrity after migrations
- **Task 4.6.4**: Performance testing with complete field set

### Success Criteria

#### Functional Requirements
- ✅ All task fields properly mapped between frontend and API
- ✅ Task creation works with all field types including dependencies
- ✅ Task hierarchy properly displayed using taskIdentifier
- ✅ PRD linking works correctly using database relationships
- ✅ All metadata preserved during task operations
- ✅ Tags functionality fully implemented and working

#### Technical Requirements
- ✅ Consistent integer ID types throughout application
- ✅ Proper type conversion between frontend and API
- ✅ Complete field validation and error handling
- ✅ Database schema supports all required fields
- ✅ No data loss during field mapping operations

#### User Experience Requirements
- ✅ All task properties editable through forms
- ✅ Clear display of task relationships and hierarchy
- ✅ Intuitive PRD selection and linking
- ✅ Comprehensive error messages for validation failures
- ✅ Smooth user experience with no field mapping errors

### Risk Assessment

#### High Risk Issues
- **Data Migration**: Risk of data loss during schema updates
- **Breaking Changes**: Field type changes may break existing functionality
- **Complex Dependencies**: Dependency type conversion may cause circular references

#### Mitigation Strategies
- **Comprehensive Backups**: Full database backup before any schema changes
- **Gradual Migration**: Implement changes incrementally with rollback capability
- **Extensive Testing**: Test all field combinations before production deployment
- **User Communication**: Clear documentation of changes and migration process

### Detailed Implementation Guide

#### Field Mapping Conversion Utilities

##### Type Conversion Functions
```typescript
// Utility functions for ID type conversion
export const convertToIntegerIds = (ids: (string | number)[]): number[] => {
  return ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
};

export const convertToStringIds = (ids: number[]): string[] => {
  return ids.map(id => id.toString());
};

// Task data transformation for API calls
export const transformTaskForAPI = (frontendTask: TaskFormData): APITaskData => {
  return {
    ...frontendTask,
    dependencies: convertToIntegerIds(frontendTask.dependencies),
    prdId: frontendTask.prdSource ? parseInt(frontendTask.prdSource, 10) : null,
    tags: frontendTask.tags || [],
    metadata: frontendTask.metadata || {}
  };
};

// Task data transformation from API response
export const transformTaskFromAPI = (apiTask: APITaskResponse): TaskMasterTask => {
  return {
    ...apiTask,
    id: apiTask.id.toString(), // For backward compatibility
    dependencies: convertToStringIds(apiTask.dependencies),
    prdSource: apiTask.prdId ? apiTask.prdId.toString() : null
  };
};
```

##### Validation Schema Updates
```typescript
// Enhanced validation for task creation
const enhancedTaskCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  taskIdentifier: z.string().regex(/^\d+(\.\d+)*$/), // e.g., "1", "1.1", "1.2.1"
  dependencies: z.array(z.number().int().positive()).default([]),
  prdId: z.number().int().positive().nullable().optional(),
  complexityScore: z.number().min(0).max(10).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  // ... existing fields
});
```

#### Database Migration Scripts

##### SQL Migration for Missing Fields
```sql
-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN task_identifier TEXT;
ALTER TABLE tasks ADD COLUMN complexity_score REAL DEFAULT 0.0;
ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE tasks ADD COLUMN metadata TEXT DEFAULT '{}'; -- JSON object

-- Update foreign key for PRD relationships
ALTER TABLE tasks ADD COLUMN prd_id INTEGER REFERENCES prds(id);

-- Create indexes for performance
CREATE INDEX idx_tasks_prd_id ON tasks(prd_id);
CREATE INDEX idx_tasks_task_identifier ON tasks(task_identifier);
CREATE INDEX idx_tasks_complexity_score ON tasks(complexity_score);

-- Migrate existing prdSource data to prd_id
UPDATE tasks SET prd_id = (
  SELECT p.id FROM prds p
  WHERE JSON_EXTRACT(tasks.metadata, '$.prdSource.fileName') = p.file_name
) WHERE JSON_EXTRACT(tasks.metadata, '$.prdSource') IS NOT NULL;
```

#### Component Implementation Examples

##### Enhanced TaskCreateModal
```typescript
// Add missing form fields
const TaskCreateModalEnhanced = () => {
  const [formData, setFormData] = useState<EnhancedTaskFormData>({
    title: '',
    description: '',
    taskIdentifier: '',
    dependencies: [],
    prdId: null,
    complexityScore: 0,
    tags: [],
    metadata: {},
    // ... existing fields
  });

  // Handle dependency selection with proper ID conversion
  const handleDependencyChange = (selectedDeps: string[]) => {
    const integerDeps = convertToIntegerIds(selectedDeps);
    setFormData(prev => ({ ...prev, dependencies: integerDeps }));
  };

  // Handle PRD selection
  const handlePRDChange = (prdId: string | null) => {
    setFormData(prev => ({
      ...prev,
      prdId: prdId ? parseInt(prdId, 10) : null
    }));
  };

  // Submit with proper data transformation
  const handleSubmit = async () => {
    const apiData = transformTaskForAPI(formData);
    await taskService.createTask(apiData);
  };
};
```

##### Enhanced Task Card Display
```typescript
// Display task with complete metadata
const EnhancedTaskCard = ({ task }: { task: TaskMasterTask }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="outline">{task.taskIdentifier}</Badge>
            <h3>{task.title}</h3>
          </div>
          <ComplexityIndicator score={task.complexityScore} />
        </div>
      </CardHeader>
      <CardContent>
        <p>{task.description}</p>

        {/* Dependencies with proper linking */}
        {task.dependencies.length > 0 && (
          <DependencyList dependencies={task.dependencies} />
        )}

        {/* PRD source information */}
        {task.prdId && (
          <PRDSourceBadge prdId={task.prdId} />
        )}

        {/* Tags display */}
        {task.tags.length > 0 && (
          <TagList tags={task.tags} />
        )}
      </CardContent>
    </Card>
  );
};
```

### Testing Strategy

#### Unit Tests Required
- **Type Conversion**: Test all ID conversion utilities
- **Form Validation**: Test enhanced validation schemas
- **Data Transformation**: Test API data mapping functions
- **Component Rendering**: Test all enhanced components

#### Integration Tests Required
- **API Endpoints**: Test all CRUD operations with new field structure
- **Database Operations**: Test migrations and data integrity
- **End-to-End Workflows**: Test complete task creation/editing flows
- **Field Mapping**: Test frontend-to-API data flow

#### Performance Tests Required
- **Large Dataset Handling**: Test with 1000+ tasks
- **Complex Dependencies**: Test with deep dependency chains
- **Metadata Operations**: Test with large metadata objects
- **Search and Filtering**: Test with all new fields

### Deployment Strategy

#### Phase 4.1 Deployment (Critical Fixes)
1. **Database Backup**: Full backup before schema changes
2. **Schema Migration**: Run migration scripts in staging
3. **Type Conversion**: Deploy conversion utilities
4. **Validation Updates**: Update API validation schemas
5. **Testing**: Comprehensive testing of critical paths

#### Phase 4.2 Deployment (Missing Fields)
1. **Component Updates**: Deploy enhanced form components
2. **Display Updates**: Update task card and list displays
3. **API Enhancements**: Deploy missing field support
4. **User Testing**: Beta testing with real users

#### Phase 4.3 Deployment (PRD Linking)
1. **PRD Migration**: Migrate prdSource to prdId references
2. **Component Updates**: Deploy PRD selection components
3. **Relationship Testing**: Test all PRD-task relationships
4. **Data Validation**: Verify all links are working

---

**Estimated Effort**: 3-4 weeks for complete implementation
**Priority**: High - Critical for kanban interface functionality
**Dependencies**: Phase 3 completion (MCP removal and unified API)
**Next Phase**: Performance optimization and advanced features

### Immediate Next Steps

1. **Start with Phase 4.1**: Fix critical type mismatches first
2. **Create Development Branch**: `feature/phase4-field-mapping-fixes`
3. **Database Backup**: Ensure full backup before any schema changes
4. **Incremental Testing**: Test each fix before moving to next
5. **User Communication**: Document all changes for team awareness
