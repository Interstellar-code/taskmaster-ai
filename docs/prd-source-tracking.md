# PRD Source Tracking Documentation

TaskMaster's PRD Source Tracking system provides comprehensive traceability between Product Requirements Documents (PRDs) and the tasks generated from them. This feature ensures you always know which tasks originated from which PRD files and can monitor changes to your source documents.

## Overview

When you generate tasks from a PRD file using `task-master parse-prd`, TaskMaster automatically captures and stores metadata about the source PRD file with each generated task. This metadata includes:

- **File Path**: Absolute path to the PRD file
- **File Name**: Name of the PRD file
- **Parsed Date**: When the PRD was parsed and tasks were generated
- **File Hash**: SHA256 hash of the PRD content for change detection
- **File Size**: Size of the PRD file in bytes

## Key Features

### 1. Automatic PRD Metadata Capture
Every task generated from a PRD automatically includes source tracking information:

```json
{
  "id": 1,
  "title": "Setup Authentication System",
  "description": "Implement user authentication...",
  "prdSource": {
    "filePath": "/path/to/requirements.txt",
    "fileName": "requirements.txt",
    "parsedDate": "2024-01-15T10:30:00.000Z",
    "fileHash": "abc123def456...",
    "fileSize": 2048
  }
}
```

### 2. Visual PRD Source Display
PRD source information is displayed throughout TaskMaster's interface:

- **Task Lists**: PRD Source column shows the source file name
- **Task Details**: Complete PRD metadata in task information
- **Project Dashboard**: PRD source breakdown statistics
- **Interactive Menu**: PRD source counts in project header

### 3. PRD Query and Filtering Commands
Powerful commands to work with PRD-sourced tasks:

```bash
# List all PRD files that have generated tasks
task-master list-prds

# Show all tasks from a specific PRD file
task-master tasks-from-prd --prd=requirements.txt

# Display PRD source info for a specific task
task-master show-prd-source --id=5

# Filter task lists by PRD source
task-master list --prd=requirements.txt
task-master list --manual-only
task-master list --prd-only
```

### 4. PRD Change Detection
Monitor your PRD files for changes and keep tasks synchronized:

```bash
# Check if any PRD files have been modified
task-master check-prd-changes

# Update PRD metadata after file changes
task-master update-prd-metadata --prd=requirements.txt
```

## Command Reference

### Core PRD Commands

#### `list-prds`
Lists all unique PRD files that have generated tasks.

```bash
task-master list-prds [options]

Options:
  -f, --file <file>      Path to tasks file (default: tasks/tasks.json)
  --format <format>      Output format: table, json (default: table)
```

**Example Output:**
```
📋 PRD Files Summary
═══════════════════════════════════════════════════════════════════════════════
┌─────────────────────────┬────────┬──────────────┬────────────┬──────────────┐
│ PRD File                │ Tasks  │ Parsed Date  │ File Size  │ Hash (Short) │
├─────────────────────────┼────────┼──────────────┼────────────┼──────────────┤
│ requirements.txt        │ 15     │ 1/15/2024    │ 2KB        │ abc123de     │
│ api-spec.md            │ 8      │ 1/10/2024    │ 5KB        │ def456ab     │
└─────────────────────────┴────────┴──────────────┴────────────┴──────────────┘
```

#### `tasks-from-prd`
Shows all tasks generated from a specific PRD file.

```bash
task-master tasks-from-prd --prd=<prd-file> [options]

Options:
  -f, --file <file>      Path to tasks file (default: tasks/tasks.json)
  --prd <prd>           PRD file path or name to filter by (required)
  --format <format>     Output format: table, json (default: table)
  --status <status>     Filter tasks by status
```

**Examples:**
```bash
# Show all tasks from requirements.txt
task-master tasks-from-prd --prd=requirements.txt

# Show only pending tasks from a specific PRD
task-master tasks-from-prd --prd=api-spec.md --status=pending
```

#### `show-prd-source`
Displays detailed PRD source information for a specific task.

```bash
task-master show-prd-source --id=<task-id> [options]

Options:
  -f, --file <file>      Path to tasks file (default: tasks/tasks.json)
  --id <id>             Task ID to show PRD source for (required)
  --format <format>     Output format: table, json (default: table)
```

**Example:**
```bash
task-master show-prd-source --id=5
```

### Enhanced List Command

The `list` command now supports PRD source filtering:

```bash
task-master list [options]

New PRD Options:
  --prd <prd>           Filter by PRD source file (name or path)
  --manual-only         Show only manually created tasks (no PRD source)
  --prd-only           Show only tasks generated from PRD files
```

**Examples:**
```bash
# Show only tasks from requirements.txt
task-master list --prd=requirements.txt

# Show only manually created tasks
task-master list --manual-only

# Show only tasks generated from PRD files
task-master list --prd-only

# Combine with status filtering
task-master list --prd=api-spec.md --status=pending
```

### PRD Change Detection Commands

#### `check-prd-changes`
Checks if PRD files referenced in tasks have been modified.

```bash
task-master check-prd-changes [options]

Options:
  -f, --file <file>      Path to tasks file (default: tasks/tasks.json)
  --format <format>      Output format: table, json (default: table)
```

**Example Output:**
```
🔍 PRD File Change Detection Results
═══════════════════════════════════════════════════════════════════════════════
⚠️  1 of 2 PRD file(s) have changed

1. requirements.txt
   Path: /path/to/requirements.txt
   Change Type: modified
   Message: PRD file has been modified (content only changed)
   Original Hash: abc123de...
   Current Hash:  def456ab...
   Size: 2048 → 2156 bytes
   Last Modified: 1/16/2024, 2:30:00 PM
   Affected Tasks: 1, 2, 3, 5, 8

💡 Recommendations:
• Consider re-parsing requirements.txt to update affected tasks (1, 2, 3, 5, 8)
```

#### `update-prd-metadata`
Updates PRD metadata for tasks after a PRD file has been modified.

```bash
task-master update-prd-metadata --prd=<prd-file> [options]

Options:
  -f, --file <file>      Path to tasks file (default: tasks/tasks.json)
  --prd <prd>           Path to the modified PRD file (required)
```

**Example:**
```bash
task-master update-prd-metadata --prd=requirements.txt
```

## Best Practices

### 1. Regular PRD Monitoring
Set up a routine to check for PRD changes:

```bash
# Check for changes weekly
task-master check-prd-changes

# Update metadata when changes are detected
task-master update-prd-metadata --prd=changed-file.txt
```

### 2. PRD File Organization
- Keep PRD files in a dedicated directory (e.g., `docs/prds/`)
- Use descriptive file names that reflect the feature or component
- Version your PRD files using git or similar version control

### 3. Task Lifecycle Management
- Use `tasks-from-prd` to review all tasks from a specific PRD
- When PRD changes significantly, consider re-parsing to generate updated tasks
- Use `--append` flag when adding tasks from updated PRDs to preserve existing work

### 4. Filtering and Reporting
- Use `list --prd-only` to focus on PRD-generated tasks during reviews
- Use `list --manual-only` to identify tasks that may need PRD documentation
- Combine PRD filters with status filters for targeted task management

## Integration with Existing Workflows

### With Parse-PRD Command
The existing `parse-prd` command automatically captures PRD source metadata:

```bash
# Generate tasks with automatic PRD tracking
task-master parse-prd --input=requirements.txt

# Append new tasks while preserving PRD source info
task-master parse-prd --input=updated-requirements.txt --append
```

### With Interactive Menu
The interactive menu displays PRD source information:
- Project header shows PRD source statistics
- Task operations preserve PRD source metadata
- Menu navigation includes PRD-related options

### With Task Operations
All task operations preserve PRD source information:
- Status updates maintain PRD source metadata
- Task expansion inherits PRD source from parent tasks
- Task modifications preserve original PRD source tracking

## Troubleshooting

### Common Issues

**Q: PRD source shows "Manual" for all tasks**
A: This means tasks were created manually or before PRD source tracking was implemented. Only tasks generated via `parse-prd` will have PRD source information.

**Q: PRD file path shows as "unknown" or missing**
A: This can happen if the PRD file was moved or deleted after tasks were generated. Use `check-prd-changes` to identify missing files.

**Q: Hash mismatch detected but file appears unchanged**
A: This can occur due to line ending differences or encoding changes. The file content may be functionally the same but technically different.

### Recovery Procedures

**Restore missing PRD source information:**
1. Identify the original PRD file
2. Use `update-prd-metadata` to restore metadata
3. Verify with `show-prd-source`

**Handle moved PRD files:**
1. Update file paths in tasks.json manually, or
2. Re-parse the PRD from its new location with `--append`

## Future Enhancements

The PRD Source Tracking system is designed for extensibility:
- Automatic PRD file watching and notifications
- Integration with version control systems
- PRD diff analysis and impact assessment
- Automated task synchronization with PRD changes
