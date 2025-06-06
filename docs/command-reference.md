# TaskMaster Command Reference

Here's a comprehensive reference of all available commands:

## Table of Contents

1. [Essential Commands](#essential-commands)
2. [Task Management](#task-management)
3. [PRD Lifecycle Management](#prd-lifecycle-management)
4. [PRD Source Tracking Commands](#prd-source-tracking-commands)
5. [Subtask Management](#subtask-management)
6. [Task Dependencies](#task-dependencies)
7. [Task Analysis & Complexity](#task-analysis--complexity)
8. [Interactive Features](#interactive-features)
9. [Configuration & Setup](#configuration--setup)
10. [Advanced Features](#advanced-features)

---

## Essential Commands

### Initialize Project

```bash
# Initialize a new TaskMaster project
task-hero init
# or
task-master init
```

### Interactive Menu (Recommended)

```bash
# Launch interactive menu system for better UX
task-hero menu
# or
task-master menu
```

### Parse PRD

```bash
# Parse a PRD file and generate tasks
task-hero parse-prd --input=<prd-file.txt>
# or
task-master parse-prd <prd-file.txt>

# Limit the number of tasks generated
task-hero parse-prd --input=<prd-file.txt> --num-tasks=10

# Append to existing project (recommended for existing projects)
task-hero parse-prd --input=<prd-file.txt> --append
```

### List Tasks

```bash
# List all tasks
task-hero list

# List tasks with specific status
task-hero list --status=pending

# List tasks with subtasks
task-hero list --with-subtasks

# Filter by PRD source
task-hero list --prd=requirements.txt

# Show only manually created tasks (no PRD source)
task-hero list --manual-only

# Show only tasks generated from PRD files
task-hero list --prd-only

# Combine filters
task-hero list --prd=api-spec.md --status=pending --with-subtasks
```

### Find Next Task

```bash
# Show the next task to work on based on dependencies and status
task-hero next
```

### Set Task Status

```bash
# Set status of a single task
task-hero set-status --id=<id> --status=<status>

# Set status for multiple tasks
task-hero set-status --id=1,2,3 --status=<status>

# Set status for subtasks
task-hero set-status --id=1.1,1.2 --status=<status>

# Available status values: pending, in-progress, done, review, blocked, deferred, cancelled
```

---

## Task Management

### Add New Task

```bash
# Add a new task using AI (main role)
task-hero add-task --prompt="Description of the new task"

# Add a new task using AI (research role)
task-hero add-task --prompt="Description of the new task" --research

# Add a task with dependencies
task-hero add-task --prompt="Description" --dependencies=1,2,3

# Add a task with priority
task-hero add-task --prompt="Description" --priority=high
```

### Update Tasks

```bash
# Update tasks from a specific ID and provide context
task-hero update --from=<id> --prompt="<prompt>"

# Update tasks using research role
task-hero update --from=<id> --prompt="<prompt>" --research

# Update a single task by ID with new information
task-hero update-task --id=<id> --prompt="<prompt>"

# Use research-backed updates
task-hero update-task --id=<id> --prompt="<prompt>" --research
```

### Show Task Details

```bash
# Show details of a specific task
task-hero show <id>
# or
task-hero show --id=<id>

# View a specific subtask (e.g., subtask 2 of task 1)
task-hero show 1.2
```

### Move Tasks

```bash
# Move a task or subtask to a new position
task-hero move --from=<id> --to=<id>

# Examples:
# Move task to become a subtask
task-hero move --from=5 --to=7

# Move subtask to become a standalone task
task-hero move --from=5.2 --to=7

# Move subtask to a different parent
task-hero move --from=5.2 --to=7.3

# Reorder subtasks within the same parent
task-hero move --from=5.2 --to=5.4

# Move a task to a new ID position (creates placeholder if doesn't exist)
task-hero move --from=5 --to=25

# Move multiple tasks at once (must have the same number of IDs)
task-hero move --from=10,11,12 --to=16,17,18
```

### Remove Tasks

```bash
# Remove a task
task-hero remove-task --id=<id>
```

---

## PRD Lifecycle Management

### List and Filter PRDs

```bash
# List PRDs with optional filtering
task-hero prd

# List PRDs with specific status
task-hero prd --status=in-progress

# List PRDs with specific priority
task-hero prd --priority=high
```

### PRD Information

```bash
# Show detailed PRD information
task-hero prd-show <prd-id>

# Show PRD with linked tasks
task-hero prd-show <prd-id> --with-tasks
```

### PRD Status Management

```bash
# Update PRD status
task-hero prd-status <prd-id> <status>

# Available statuses: pending, in-progress, done, archived
# Examples:
task-hero prd-status prd_001 in-progress
task-hero prd-status prd_002 done
```

### PRD Synchronization

```bash
# Synchronize PRD statuses with task completion
task-hero prd-sync

# Sync specific PRD
task-hero prd-sync --prd=<prd-id>
```

### PRD Migration and Maintenance

```bash
# Migrate legacy PRD files to new system
task-hero prd-migrate

# Archive completed PRDs
task-hero prd-archive <prd-id>

# Check and fix PRD file integrity
task-hero prd-integrity

# Fix integrity issues automatically
task-hero prd-integrity --fix
```

---

## PRD Source Tracking Commands

### List PRD Files

```bash
# List all PRD files that have generated tasks
task-hero list-prds

# Output in JSON format
task-hero list-prds --format=json
```

### Query Tasks by PRD Source

```bash
# Show all tasks from a specific PRD file
task-hero tasks-from-prd --prd=requirements.txt

# Filter by status
task-hero tasks-from-prd --prd=api-spec.md --status=pending

# Output in JSON format
task-hero tasks-from-prd --prd=requirements.txt --format=json
```

### Show PRD Source Information

```bash
# Display PRD source info for a specific task
task-hero show-prd-source --id=5

# Output in JSON format
task-hero show-prd-source --id=5 --format=json
```

### PRD Change Detection

```bash
# Check if PRD files have been modified
task-hero check-prd-changes

# Update PRD metadata after file changes
task-hero update-prd-metadata --prd=requirements.txt
```

---

## Subtask Management

### Expand Tasks into Subtasks

```bash
# Expand a specific task with subtasks
task-hero expand --id=<id>

# Expand with specific number of subtasks
task-hero expand --id=<id> --num=<number>

# Expand with additional context
task-hero expand --id=<id> --prompt="<context>"

# Research-backed subtask generation for a specific task
task-hero expand --id=<id> --research

# Expand all pending tasks
task-hero expand --all

# Force regeneration of subtasks for tasks that already have them
task-hero expand --all --force

# Research-backed generation for all tasks
task-hero expand --all --research

# Expand nested subtasks (supports X.Y.Z notation)
task-hero expand --id=5.2 --num=3
```

### Context Passing Examples

```bash
# PRD → Task context passing
task-hero expand --id=5 --prompt="Based on PRD section 3.2: Implement OAuth authentication with Google and GitHub providers"

# Task → Subtask context passing
task-hero expand --id=5 --prompt="Parent task: User authentication system. Create subtasks for OAuth setup, session management, and security middleware per PRD sections 3.2.1-3.2.3"

# Subtask → Nested subtask context passing
task-hero expand --id=5.2 --prompt="Context chain: User auth (PRD 3.2) → Session management (5.2) → Create nested tasks for session storage, validation, and cleanup"

# Include specific PRD references
task-hero expand --id=7 --prompt="PRD section 4.1: Database schema design. Create subtasks for table creation, indexing, and migration scripts"
```

### Update Subtasks

```bash
# Append additional information to a specific subtask
task-hero update-subtask --id=<parentId.subtaskId> --prompt="<prompt>"

# Example: Add details about API rate limiting to subtask 2 of task 5
task-hero update-subtask --id=5.2 --prompt="Add rate limiting of 100 requests per minute"

# Use research-backed updates
task-hero update-subtask --id=<parentId.subtaskId> --prompt="<prompt>" --research
```

### Context-Aware Subtask Updates

```bash
# Include parent task context when updating subtasks
task-hero update-subtask --id=5.2 --prompt="Parent context: User authentication system. Add PRD section 3.2.4 requirement: rate limiting of 100 requests/minute per user"

# Reference original PRD when updating
task-hero update-subtask --id=7.1 --prompt="PRD section 4.1.2: Add foreign key constraints for user_sessions table as specified in database schema requirements"

# Chain context for nested subtasks
task-hero update-subtask --id=5.2.1 --prompt="Context: User auth → Session mgmt → Session storage. Add Redis configuration per PRD section 3.2.2.1"
```

**Note**: Unlike the `update-task` command which replaces task information, the `update-subtask` command _appends_ new information to the existing subtask details, marking it with a timestamp. This is useful for iteratively enhancing subtasks while preserving the original content.

### Clear Subtasks

```bash
# Clear subtasks from a specific task
task-hero clear-subtasks --id=<id>

# Clear subtasks from multiple tasks
task-hero clear-subtasks --id=1,2,3

# Clear subtasks from all tasks
task-hero clear-subtasks --all
```

---

## Task Dependencies

### Managing Dependencies

```bash
# Add a dependency to a task
task-hero add-dependency --id=<id> --depends-on=<id>

# Remove a dependency from a task
task-hero remove-dependency --id=<id> --depends-on=<id>

# Validate dependencies without fixing them
task-hero validate-dependencies

# Find and fix invalid dependencies automatically
task-hero fix-dependencies
```

---

## Task Analysis & Complexity

### Analyze Task Complexity

```bash
# Analyze complexity of all tasks
task-hero analyze-complexity

# Save report to a custom location
task-hero analyze-complexity --output=my-report.json

# Use a specific LLM model
task-hero analyze-complexity --model=claude-3-opus-20240229

# Set a custom complexity threshold (1-10)
task-hero analyze-complexity --threshold=6

# Use an alternative tasks file
task-hero analyze-complexity --file=custom-tasks.json

# Use Perplexity AI for research-backed complexity analysis
task-hero analyze-complexity --research
```

### View Complexity Report

```bash
# Display the task complexity analysis report
task-hero complexity-report

# View a report at a custom location
task-hero complexity-report --file=my-report.json
```

---

## Interactive Features

### Interactive Menu System

```bash
# Launch interactive menu system (recommended for better UX)
task-hero menu

# Menu provides:
# - Numbered options and logical categorization
# - Breadcrumb navigation
# - Real-time project information
# - Task and PRD management workflows
```

### Kanban Boards

```bash
# Launch interactive task Kanban board
task-hero kanban

# Launch PRD lifecycle Kanban board
task-hero prd-kanban

# Features:
# - Drag-and-drop status updates
# - Visual status columns with borders
# - Keyboard navigation (arrow keys, Enter, Q to quit)
# - 75% terminal viewport coverage
# - Column scrolling with Page Up/Down
```

---

## Configuration & Setup

### AI Model Configuration

```bash
# View current AI model configuration and API key status
task-hero models

# Set the primary model for generation/updates (provider inferred if known)
task-hero models --set-main=claude-3-opus-20240229

# Set the research model
task-hero models --set-research=sonar-pro

# Set the fallback model
task-hero models --set-fallback=claude-3-haiku-20240307

# Set a custom Ollama model for the main role
task-hero models --set-main=my-local-llama --ollama

# Set a custom OpenRouter model for the research role
task-hero models --set-research=google/gemini-pro --openrouter

# Run interactive setup to configure models, including custom ones
task-hero models --setup
```

**Note**: Configuration is stored in `.taskmaster/config.json` in your project root. API keys are managed via `.env` or MCP configuration. Use `task-hero models` without flags to see available built-in models. Use `--setup` for a guided experience.

---

## Advanced Features

### Generate Task Files

```bash
# Generate individual task files from tasks.json
task-hero generate
```

### File Operations

```bash
# Generate task files and markdown documentation
task-hero generate

# Validate project structure and data integrity
task-hero validate-dependencies
```

### Package Information

- **NPM Package**: `task-hero-ai`
- **Binary Commands**: `task-hero`, `task-hero-ai`, `task-hero-mcp`
- **Installation**: `npm install -g task-hero-ai`
- **Local Development**: Clone repository and use `npm link`

---

## Status Values Reference

Available status values for tasks:

- `pending` - Task is ready to be worked on
- `in-progress` - Task is currently being worked on
- `done` - Task has been completed
- `review` - Task is completed but needs review
- `blocked` - Task cannot proceed due to dependencies or issues
- `deferred` - Task has been postponed
- `cancelled` - Task has been cancelled

**Note**: When marking a task as "done", all of its subtasks will automatically be marked as "done" as well.

---

## Examples and Common Workflows

### Complete PRD-to-Execution Workflow

```bash
# 1. Initialize project (if needed)
task-hero init

# 2. Parse PRD and create initial tasks
task-hero parse-prd --input=requirements.txt

# 3. Expand complex tasks into subtasks
task-hero expand --id=5 --num=3
task-hero expand --id=7 --research

# 4. Start working on tasks
task-hero next
task-hero set-status --id=1 --status=in-progress

# 5. Complete tasks and sync PRD status
task-hero set-status --id=1 --status=done
task-hero prd-sync

# 6. Archive completed PRD
task-hero prd-archive prd_001
```

### Working with Subtasks

```bash
# Create nested subtask structure
task-hero expand --id=5 --num=3           # Create 5.1, 5.2, 5.3
task-hero expand --id=5.2 --num=2         # Create 5.2.1, 5.2.2

# Update specific subtask
task-hero update-subtask --id=5.2.1 --prompt="Add error handling"

# Work on subtasks
task-hero set-status --id=5.2.1 --status=in-progress
task-hero set-status --id=5.2.1 --status=done
```

### Managing Complex Projects

```bash
# Analyze project complexity
task-hero analyze-complexity --research

# View complexity report
task-hero complexity-report

# Use interactive tools for better management
task-hero menu                    # Interactive menu system
task-hero kanban                  # Visual task board
task-hero prd-kanban             # PRD lifecycle board
```

---

## Best Practices

### For Augment AI Integration

1. **Use TaskMaster as tracking system** - Let Augment perform analysis, use TaskMaster for documentation
2. **Follow the workflow** - init → parse-prd → expand → execute → sync
3. **Leverage interactive tools** - Use `task-hero menu` and Kanban boards for better UX
4. **Maintain context** - Track PRD sources and task dependencies
5. **Autonomous operation** - Augment should perform complexity analysis without user prompts
6. **Pass context through hierarchy** - Ensure PRD context flows: PRD → Task → Subtask → Nested
7. **Reference specific PRD sections** - Include section numbers and requirements in prompts
8. **Preserve context chain** - Each level should reference its parent context

### For Task Management

1. **Use subtasks for complex tasks** - Break down tasks with complexity > 6
2. **Maintain dependencies** - Ensure proper task execution order
3. **Update status regularly** - Track progress through status transitions
4. **Use PRD references** - Maintain traceability from requirements to implementation
5. **Archive completed work** - Use PRD archiving for project milestones

### For Development Workflow

1. **Start with PRD analysis** - Begin from requirements rather than initialization
2. **Use research models** - Leverage research-backed analysis for complex tasks
3. **Monitor progress** - Use `task-hero next` to find optimal next tasks
4. **Handle blocking issues** - Use `blocked` status and document issues
5. **Sync regularly** - Keep PRD status synchronized with task completion

---

## Context Passing Strategies

### PRD → Task → Subtask Context Flow

TaskMaster supports rich context passing to maintain traceability from requirements to implementation:

#### **Context Hierarchy**

```
PRD Document
├── Task (references PRD sections)
│   ├── Subtask (inherits task + PRD context)
│   │   ├── Nested Subtask (full context chain)
│   │   └── Nested Subtask (full context chain)
│   └── Subtask (inherits task + PRD context)
└── Task (references PRD sections)
```

#### **Context Passing Examples**

**Level 1: PRD → Task**

```bash
# Include specific PRD sections when creating tasks
task-hero add-task --prompt="Implement user authentication system as specified in PRD section 3.2: OAuth integration with Google and GitHub providers, session management with Redis, and rate limiting per section 3.2.4"
```

**Level 2: Task → Subtask**

```bash
# Pass parent task context when expanding
task-hero expand --id=5 --prompt="Parent task: User authentication system (PRD 3.2). Create subtasks for: 1) OAuth provider setup (PRD 3.2.1), 2) Session management with Redis (PRD 3.2.2), 3) Rate limiting middleware (PRD 3.2.4)"
```

**Level 3: Subtask → Nested Subtask**

```bash
# Inherit full context chain for nested subtasks
task-hero expand --id=5.2 --prompt="Context chain: User auth system (PRD 3.2) → Session management (5.2) → Create nested tasks for: session storage schema, session validation logic, session cleanup cron job"
```

#### **Context Preservation Guidelines**

1. **Always Reference PRD Sections**: Include specific section numbers (e.g., "PRD 3.2.1")
2. **Maintain Parent Context**: Reference parent task/subtask when creating children
3. **Include Technical Specifications**: Pass technical details from PRD through hierarchy
4. **Preserve Business Logic**: Ensure business requirements flow to implementation
5. **Link Related Requirements**: Reference related PRD sections for dependencies

#### **Context Update Patterns**

```bash
# Update task with additional PRD context
task-hero update-task --id=5 --prompt="Add PRD section 4.1 database requirements: PostgreSQL with user_sessions table, foreign key constraints per section 4.1.2"

# Update subtask with parent + PRD context
task-hero update-subtask --id=5.2 --prompt="Parent: User auth system. Add PRD 3.2.4: Rate limiting 100 req/min per user, implement with Redis sliding window"

# Update nested subtask with full context chain
task-hero update-subtask --id=5.2.1 --prompt="Context: User auth → Session mgmt → Session storage. Add PRD 3.2.2.1: Redis cluster config with failover"
```

This context passing ensures that every task and subtask maintains clear traceability back to the original requirements, making the codebase more maintainable and ensuring nothing gets lost in translation from requirements to implementation.
