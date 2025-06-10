# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

- **Initialize project**: `node scripts/init.js` or `task-hero init`
- **Run tests**: `npm test` (Jest with ES modules support)
- **Test with coverage**: `npm run test:coverage`
- **Test watch mode**: `npm run test:watch`
- **Run E2E tests**: `npm run test:e2e`
- **Interactive menu**: `npm run menu` or `task-hero menu`
- **Web interface**: `npm run web` (starts Express server)
- **Build web app**: `npm run web:build` (builds React Kanban app)
- **Full dev environment**: `npm run dev:full` (API + React dev server)
- **API server**: `npm run api` (starts API server on port 3000)
- **API dev server**: `npm run api:dev` (starts API server on port 3001)
- **API tests**: `npm run api:test` (tests API endpoints)
- **MCP server**: `npm run mcp-server` or `node mcp-server/server.js`
- **Format code**: `npm run format` (Prettier)
- **Format check**: `npm run format-check`

### Main CLI Commands (via task-hero binary)

- **List tasks**: `task-hero list`
- **Next task**: `task-hero next`
- **Generate files**: `task-hero generate`
- **Parse PRD**: `task-hero parse-prd <file>`
- **Expand task**: `task-hero expand --id=<id>`
- **Set status**: `task-hero set-status --id=<id> --status=<status>`
- **Add task**: `task-hero add-task --prompt="<description>"`

### Testing Commands

- **Run single test**: `npm test -- <test-file-pattern>`
- **Run only failed tests**: `npm run test:fails`
- **Test specific pattern**: `npm test -- --testNamePattern="<pattern>"`

## Architecture Overview

TaskHero is an AI-driven task management system with three main interfaces:

### Core Components

1. **CLI System** (`scripts/modules/`)

   - `commands.js`: Command definitions using Commander.js
   - `task-manager.js` + `task-manager/`: Core task CRUD operations
   - `ai-services-unified.js`: Centralized AI service layer using Vercel AI SDK
   - `config-manager.js`: Configuration management (.taskmasterconfig)
   - `dependency-manager.js`: Task dependency handling
   - `ui.js`: CLI output formatting

2. **MCP Server** (`mcp-server/`)

   - Exposes TaskHero functionality via Model Control Protocol
   - `src/tools/`: MCP tool definitions (kebab-case naming)
   - `src/core/direct-functions/`: Direct function wrappers (camelCase with 'Direct' suffix)
   - `src/core/utils/path-utils.js`: Path resolution utilities

3. **Web Interface** (`kanban-app/` + `api/`)
   - React/TypeScript Kanban board with drag-and-drop (`kanban-app/`)
   - Express.js API server (`api/server.js`) with SQLite database
   - Terminal-based Kanban interface (`src/kanban/`)
   - REST API with routes for tasks, PRDs, analytics, and health checks

### AI Provider System (`src/ai-providers/`)

- Modular AI provider implementations
- Supports: Anthropic, OpenAI, Google, Perplexity, xAI, OpenRouter, Ollama, Azure, Bedrock
- Unified interface through `ai-services-unified.js`

### Web API Architecture (`api/`)

- **Express.js REST API** with SQLite database backend
- **DAO Pattern**: Data Access Objects handle database operations (`api/dao/`)
  - `BaseDAO.js`: Common database operations and utilities
  - `TaskDAO.js`: Task CRUD operations with dependency management
  - `PRDDAO.js`: PRD file management and analysis tracking
  - `ConfigurationDAO.js`: Application configuration management
- **Route Handlers** (`api/routes/`):
  - `tasks.js`: Task management endpoints with CRUD operations
  - `prds.js`: PRD upload, analysis, and task generation endpoints
  - `analytics.js`: Project analytics and reporting endpoints
  - `health.js`: System health and status monitoring
  - `config.js`: Configuration management endpoints
- **Middleware**: CORS, error handling, request logging, validation
- **Database**: SQLite with migrations support for schema updates

### Data Flow

- **CLI**: Commands → Core Logic → AI Services → Providers
- **MCP**: Tools → Direct Functions → Core Logic → AI Services → Providers
- **Web API**: REST Routes → DAO Layer → Database/File System
- **Web App**: React Components → API Services → REST API

## Key Conventions

### File Naming

- **MCP tools**: kebab-case (e.g., `add-task.js`)
- **Direct functions**: camelCase with 'Direct' suffix (e.g., `addTaskDirect`)
- **Core modules**: kebab-case or camelCase based on context

### Configuration

- **Project settings**: `.taskmasterconfig` (managed via `task-hero models`)
- **API keys**: `.env` file (CLI) or `mcp.json` env section (MCP)
- **Task data**: `tasks.json` in project root OR SQLite database (`.taskmaster/taskhero.db`)
- **PRD storage**: `.taskmaster/prd/` directory for file-based PRD management

### Silent Mode Implementation

MCP direct functions must use silent mode to prevent console output:

```javascript
import {
	enableSilentMode,
	disableSilentMode,
	isSilentMode
} from '../../../../scripts/modules/utils.js';

export async function someDirectFunction(args, log) {
	try {
		enableSilentMode();
		try {
			const result = await coreFunction(args);
			return { success: true, data: result, fromCache: false };
		} finally {
			disableSilentMode();
		}
	} catch (error) {
		return {
			success: false,
			error: { code: 'ERROR', message: error.message },
			fromCache: false
		};
	}
}
```

### Testing Architecture

- **Unit tests**: `tests/unit/` - Test individual modules
- **Integration tests**: `tests/integration/` - Test module interactions
- **E2E tests**: `tests/e2e/` - Test complete workflows
- **Test fixtures**: `tests/fixtures/` - Shared test data
- Jest with ES modules, Node 18+ environment

## Adding New Features

### MCP Tool Implementation

1. Create core logic in `scripts/modules/`
2. Create direct function in `mcp-server/src/core/direct-functions/`
3. Create MCP tool in `mcp-server/src/tools/`
4. Register tool in `mcp-server/src/tools/index.js`
5. Update tool exports in `mcp-server/src/core/task-master-core.js`

### CLI Command Implementation

1. Add command definition in `scripts/modules/commands.js`
2. Implement core logic in appropriate `scripts/modules/` file
3. Add tests in `tests/unit/` and `tests/integration/`

## Important Files

- `tasks.json`: Central task data store (CLI/MCP mode)
- `.taskmaster/taskhero.db`: SQLite database (Web API mode)
- `.taskmasterconfig`: Project configuration (models, parameters)
- `package.json`: Dependencies and npm scripts
- `jest.config.js`: Test configuration
- `bin/task-hero.js`: CLI entry point
- `mcp-server/server.js`: MCP server entry point
- `api/server.js`: Web API server entry point
- `kanban-app/`: React Kanban frontend application

## TaskHero Development Workflow

### Using TaskHero for Task Management

TaskHero itself uses TaskHero for task management. When working on this codebase:

1. **Initialize/Check Tasks**: Start by checking existing tasks with `task-hero list` or `task-hero next`
2. **Parse Requirements**: Use `task-hero parse-prd --input=<file>` to generate tasks from PRD files
3. **Interactive Menu**: Use `task-hero menu` for guided workflows and better UX
4. **Track Progress**: Update task status with `task-hero set-status --id=<id> --status=<status>`
5. **Break Down Complex Tasks**: Use `task-hero expand --id=<id>` to create subtasks
6. **Manage Dependencies**: Use `task-hero add-dependency` and `task-hero validate-dependencies`

### TaskHero-Specific Patterns

- **Task Structure**: Tasks use dot notation for subtasks (e.g., 5.2 = subtask 2 of task 5)
- **Status Values**: pending, in-progress, done, review, blocked, deferred, cancelled
- **Dependencies**: Array of task IDs that must be completed first
- **PRD Integration**: Requirements are stored in `.taskmaster/prd/` with lifecycle management

### File Organization

- `.taskmaster/config.json`: AI models and global configuration
- `.taskmaster/tasks/tasks.json`: Main task data file
- `.taskmaster/tasks/task_XXX.txt`: Individual task files
- `.taskmaster/prd/`: PRD lifecycle management with status-based directories
- `.taskmaster/reports/`: Analysis and complexity reports

### Essential TaskHero Commands

- **Project setup**: `task-hero init`
- **Interactive menu**: `task-hero menu` (recommended for guided workflows)
- **Task management**: `task-hero list`, `task-hero next`, `task-hero show <id>`
- **Task modification**: `task-hero add-task`, `task-hero update-task`, `task-hero expand`
- **Status tracking**: `task-hero set-status --id=<id> --status=<status>`
- **Dependencies**: `task-hero add-dependency`, `task-hero validate-dependencies`
- **PRD management**: `task-hero parse-prd`, `task-hero prd`, `task-hero prd-status`

### Best Practices When Using TaskHero

- Always check task dependencies before marking tasks as done
- Use subtasks to break down complex implementations
- Update task status regularly to track progress
- Use the interactive menu for better user experience
- Maintain PRD traceability from requirements to implementation
- Test changes with both CLI and MCP interfaces

## Running Lint/TypeCheck

This project uses Prettier for formatting. Run `npm run format-check` to check formatting and `npm run format` to fix formatting issues. The project does not currently have ESLint or TypeScript checking configured for the main codebase (only for the Kanban React app).

## Development Modes and Data Storage

TaskHero operates in different modes depending on the interface used:

### CLI/MCP Mode
- Uses `tasks.json` file for task storage
- File-based configuration with `.taskmasterconfig`
- Individual task files in `tasks/` directory
- Suitable for development workflows and AI editor integration

### Web API Mode  
- Uses SQLite database (`.taskmaster/taskhero.db`)
- DAO pattern for data access
- REST API endpoints for CRUD operations
- Suitable for web applications and multi-user scenarios

### PRD Management
- File-based storage in `.taskmaster/prd/` directory
- Lifecycle management with status-based organization
- AI-powered analysis and task generation
- Supports both CLI and web interfaces

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
