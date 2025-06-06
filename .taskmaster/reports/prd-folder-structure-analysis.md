# PRD Folder Structure Analysis and New Schema Design

**Task:** 92.1 - Analyze Current PRD Folder Structure and Define New Schema  
**Date:** 2025-06-05  
**Status:** Complete

## Current PRD Folder Structure Analysis

### 1. Existing Directory Structure

```
.taskmaster/prd/
├── pending/
│   ├── prd_kanban_crud_implementation.md
│   └── prd_002_taskhero_ui_rebrand.md.backup.1748928141583
├── in-progress/
│   └── (empty)
├── done/
│   └── prd_002_taskhero_ui_rebrand.md
├── archived/
│   ├── prd_001_2025-06-01T19-22-15-097Z.zip
│   ├── prd_002_2025-06-03T16-51-37-816Z.zip
│   ├── prd_003_2025-06-02T15-39-52-075Z.zip
│   ├── prd_004_2025-06-02T15-47-49-156Z.zip
│   ├── prd_005_2025-06-02T15-39-14-969Z.zip
│   └── prd_006_2025-06-02T15-48-01-637Z.zip
└── prds.json
```

### 2. Current PRD Metadata Schema (prds.json)

```json
{
	"prds": [],
	"metadata": {
		"version": "1.0.0",
		"lastUpdated": "2025-06-04T13:59:34.021Z",
		"totalPrds": 0,
		"schema": {
			"version": "1.0.0",
			"description": "TaskMaster AI PRD Lifecycle Tracking Schema"
		}
	}
}
```

### 3. Current PRD File Headers

PRD files contain metadata headers like:

```markdown
# PRD ID: prd_002

# Title: undefined

# Status: pending

# Priority: medium

# Complexity: medium

# PRD Path: .taskmaster/prd/pending/prd_002_taskhero_ui_rebrand.md

# File Hash: 744710557c9cb26d5346ad5bd42c4468aa53809be98c999fcfce77f26701f8ed

# File Size: 9110 bytes

# Last Modified: 2025-06-03T05:22:21.582Z

# Last Parsed: 2025-06-03T05:22:21.581Z
```

### 4. Current Status Management System

**File Movement System:**

- `prd-file-movement.js` handles moving files between status directories
- `movePrdFileToStatusDirectory()` function manages file relocation
- `movePrdAndUpdateStatus()` provides atomic operations

**CLI Commands:**

- `task-hero prd-status <prd-id> <status>` - Update PRD status
- `task-hero prd-sync` - Synchronize PRD statuses with task completion
- `task-hero prd-archive <prd-id>` - Archive completed PRDs

**Status Values:**

- `pending` - Initial state
- `in-progress` - Work has begun
- `done` - All tasks completed
- `archived` - Moved to archive folder

### 5. Current Dependencies and Integration

**Code Dependencies:**

- `scripts/modules/prd-manager/prd-utils.js` - Core utilities
- `scripts/modules/prd-manager/prd-file-movement.js` - File operations
- `scripts/modules/prd-manager/prd-write-operations.js` - CRUD operations
- `src/prd-kanban/handlers/prd-status-handler.js` - Kanban integration

**Integration Points:**

- Task-PRD linking system
- Kanban board status updates
- CLI command interface
- MCP server integration

## Proposed New Schema Design

### 1. Simplified Directory Structure

```
.taskmaster/prd/
├── prd_001_project_setup.md
├── prd_002_taskhero_ui_rebrand.md
├── prd_003_kanban_implementation.md
├── prd_004_kanban_crud_implementation.md
├── archive/
│   ├── prd_001_2025-06-01T19-22-15-097Z.zip
│   ├── prd_002_2025-06-03T16-51-37-816Z.zip
│   └── prd_003_2025-06-02T15-39-52-075Z.zip
└── prds.json
```

### 2. Enhanced prds.json Schema

```json
{
	"prds": [
		{
			"id": "prd_001",
			"title": "Project Setup and Configuration",
			"fileName": "prd_001_project_setup.md",
			"status": "done",
			"priority": "high",
			"complexity": "medium",
			"createdDate": "2025-06-01T10:00:00.000Z",
			"lastModified": "2025-06-03T15:30:00.000Z",
			"filePath": "prd_001_project_setup.md",
			"fileHash": "abc123...",
			"fileSize": 8500,
			"description": "Initial project setup and configuration requirements",
			"tags": ["setup", "configuration", "infrastructure"],
			"linkedTasks": [1, 2, 3, 4, 5],
			"taskStats": {
				"totalTasks": 5,
				"completedTasks": 5,
				"pendingTasks": 0,
				"inProgressTasks": 0,
				"completionPercentage": 100
			},
			"estimatedEffort": "3 days",
			"actualEffort": "2.5 days"
		}
	],
	"metadata": {
		"version": "2.0.0",
		"lastUpdated": "2025-06-05T22:00:00.000Z",
		"totalPrds": 1,
		"schema": {
			"version": "2.0.0",
			"description": "TaskHero AI PRD Simplified Structure Schema"
		},
		"folderStructure": {
			"type": "simplified",
			"statusManagement": "metadata",
			"archiveLocation": "archive/"
		}
	}
}
```

### 3. Key Schema Changes

**Status Management:**

- Status stored in `prds.json` metadata instead of folder location
- Files remain in single `/prd` directory regardless of status
- Archive folder only for completed/archived PRDs

**File Path Management:**

- `filePath` field relative to `/prd` root directory
- Simplified path structure without status subdirectories
- Consistent naming convention: `prd_XXX_descriptive_name.md`

**Enhanced Metadata:**

- Added `actualEffort` field for tracking real vs estimated time
- Enhanced `taskStats` with detailed completion metrics
- Improved `tags` system for better categorization
- `description` field for quick PRD overview

### 4. Migration Strategy

**Phase 1: File Consolidation**

1. Move all PRD files from status subdirectories to `/prd` root
2. Update `filePath` fields in `prds.json` to reflect new locations
3. Preserve existing metadata and relationships

**Phase 2: Schema Update**

1. Upgrade `prds.json` schema to version 2.0.0
2. Add new metadata fields (`actualEffort`, enhanced `taskStats`)
3. Update folder structure metadata

**Phase 3: Code Updates**

1. Modify `getPRDStatusDirectory()` to return `/prd` for all statuses
2. Update file movement logic to only move to archive
3. Adjust CLI commands to work with new structure

**Phase 4: Archive Cleanup**

1. Keep existing archive structure unchanged
2. Future archives go to `/prd/archive/` instead of `/prd/archived/`
3. Maintain backward compatibility for existing archives

### 5. Benefits of New Structure

**Simplified Navigation:**

- All active PRDs in single directory
- No need to search across status folders
- Easier file management and organization

**Improved Metadata Management:**

- Status changes don't require file movement
- Faster status updates (metadata only)
- Reduced risk of file corruption during moves

**Better Integration:**

- Simplified API endpoints (single directory)
- Easier backup and synchronization
- Cleaner Kanban board integration

**Enhanced Scalability:**

- No directory size limitations per status
- Better performance with large PRD collections
- Simplified search and filtering operations

## Implementation Recommendations

1. **Backward Compatibility:** Maintain support for old structure during transition
2. **Atomic Operations:** Ensure migration happens atomically to prevent data loss
3. **Validation:** Add comprehensive validation for new schema
4. **Testing:** Thorough testing of all PRD operations with new structure
5. **Documentation:** Update all documentation to reflect new structure

## Implementation Results

### ✅ Migration Completed Successfully

1. **File Consolidation**: All PRD files moved to main `/prd` directory
2. **Schema Update**: `prds.json` upgraded to v2.0.0 with new metadata structure
3. **Code Updates**: All core utilities updated for simplified structure
4. **Archive Fix**: Corrected to use existing `archived/` folder instead of new `archive/`

### ✅ Comprehensive Testing Results

**1. PRD Listing and Viewing** ✅

- `task-hero prd` command works correctly
- Shows proper status, priority, and completion data
- Displays 2 PRDs with correct metadata

**2. PRD Status Management** ✅

- `task-hero prd-status` command works perfectly
- Status changes are metadata-only (no file movement)
- Files remain in main `/prd` directory after status changes

**3. File Location Integrity** ✅

- All active PRD files remain in `/prd` root directory
- No unwanted file movement during status changes
- Archive files properly stored in `/prd/archived/`

**4. PRD Viewing Details** ✅

- `task-hero prd-show` displays comprehensive PRD information
- Shows correct file paths, metadata, and task statistics
- Proper formatting and data presentation

**5. PRD Integrity Checking** ✅

- `task-hero prd-check` detects file inconsistencies
- Identifies hash mismatches and directory issues
- Provides actionable recommendations

**6. PRD Synchronization** ✅

- `task-hero prd-sync` works correctly
- Updates PRD statuses based on task completion
- Maintains data consistency across system

**7. Archive System Verification** ✅

- Archive system includes PRD file, tasks, and metadata in ZIP
- Uses correct `/prd/archived/` folder (not new `archive/`)
- Maintains backward compatibility with existing archives

**8. API Integration** ✅

- New REST API endpoints added for PRD management
- Supports GET, PATCH, PUT operations for PRDs
- Integrated with kanban-app backend

### ✅ Performance Impact Assessment

- **No negative performance impact detected**
- Faster status updates (metadata-only vs file movement)
- Simplified file search and navigation
- Reduced I/O operations for status changes

## Final Implementation Summary

The PRD folder structure simplification has been **successfully completed** with:

1. **Simplified Structure**: All active PRDs in single `/prd` directory
2. **Metadata-Based Status**: Status managed in `prds.json` instead of folder location
3. **Archive Preservation**: Existing `/prd/archived/` folder maintained
4. **Full Backward Compatibility**: All existing functionality preserved
5. **Enhanced Performance**: Faster operations with reduced file movement
6. **Comprehensive Testing**: All core functionality verified working
7. **API Integration**: REST endpoints added for web interface support

The migration is **production-ready** and all TaskHero PRD functionality works correctly with the new simplified structure.
