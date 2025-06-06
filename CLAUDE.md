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

3. **Web Interface** (`kanban-app/` + `src/web/`)
   - React/TypeScript Kanban board with drag-and-drop
   - Express.js API server (`src/web/server.js`)
   - Terminal-based Kanban interface (`src/kanban/`)

### AI Provider System (`src/ai-providers/`)

- Modular AI provider implementations
- Supports: Anthropic, OpenAI, Google, Perplexity, xAI, OpenRouter, Ollama, Azure, Bedrock
- Unified interface through `ai-services-unified.js`

### Data Flow

- **CLI**: Commands → Core Logic → AI Services → Providers
- **MCP**: Tools → Direct Functions → Core Logic → AI Services → Providers
- **Web**: API → Core Logic → AI Services → Providers

## Key Conventions

### File Naming

- **MCP tools**: kebab-case (e.g., `add-task.js`)
- **Direct functions**: camelCase with 'Direct' suffix (e.g., `addTaskDirect`)
- **Core modules**: kebab-case or camelCase based on context

### Configuration

- **Project settings**: `.taskmasterconfig` (managed via `task-hero models`)
- **API keys**: `.env` file (CLI) or `mcp.json` env section (MCP)
- **Task data**: `tasks.json` in project root

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

- `tasks.json`: Central task data store
- `.taskmasterconfig`: Project configuration (models, parameters)
- `package.json`: Dependencies and npm scripts
- `jest.config.js`: Test configuration
- `bin/task-hero.js`: CLI entry point
- `mcp-server/server.js`: MCP server entry point

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
