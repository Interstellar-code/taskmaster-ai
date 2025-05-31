# TaskMaster AI Integration with Augment

This guide explains how TaskMaster integrates with Augment AI to provide enhanced development assistance through workspace-specific guidelines and context.

## Overview

TaskMaster automatically generates an `.augment-guidelines` file during project initialization that provides Augment AI with comprehensive context about your TaskMaster project structure, patterns, and best practices.

## Automatic Setup

When you initialize a TaskMaster project, the system automatically creates:

```
.augment-guidelines    # Augment AI workspace guidelines
```

This file contains:
- **Project Overview** - Understanding of TaskMaster's purpose and architecture
- **Technology Stack** - Node.js, ES modules, Commander.js, Inquirer.js, etc.
- **TaskMaster Patterns** - Task structure, command patterns, file organization
- **Development Guidelines** - Code style, error handling, testing approaches
- **Command Reference** - Complete list of TaskMaster commands and usage
- **Best Practices** - Specific guidance for working with TaskMaster projects

## Benefits for Augment Users

### Enhanced Context Awareness
Augment AI will understand:
- TaskMaster's task structure and status values
- Proper command usage and parameters
- File organization and naming conventions
- Integration patterns for CLI and MCP interfaces

### Improved Code Suggestions
With the guidelines, Augment can:
- Suggest appropriate TaskMaster commands for specific scenarios
- Recommend proper error handling patterns
- Guide implementation of interactive menu features
- Provide context-aware code completions

### Project-Specific Guidance
The guidelines help Augment:
- Understand the relationship between tasks.json and individual task files
- Suggest proper dependency management between tasks
- Recommend appropriate AI model configurations
- Guide integration with multiple AI providers

## Using Augment with TaskMaster

### Getting Started
1. **Initialize Project**: Run `task-master init` to create the `.augment-guidelines` file
2. **Open in Augment**: Open your project in VS Code with Augment extension
3. **Verify Guidelines**: Augment should automatically detect the `.augment-guidelines` file
4. **Start Coding**: Augment will now provide TaskMaster-aware assistance

### Best Practices with Augment

#### When Working with Tasks
Ask Augment to:
- "Help me create a new task using TaskMaster patterns"
- "Show me how to update task status properly"
- "Generate subtasks for this complex task"
- "Add dependencies between these tasks"

#### When Developing Features
Request Augment assistance for:
- "Implement a new CLI command following TaskMaster patterns"
- "Add error handling to this TaskMaster function"
- "Create an interactive menu option"
- "Integrate with the MCP server"

#### When Debugging
Use Augment to:
- "Debug this TaskMaster command execution"
- "Fix the task dependency validation"
- "Troubleshoot AI model configuration"
- "Resolve interactive menu navigation issues"

## Guidelines Content Structure

The `.augment-guidelines` file includes:

### 1. Project Overview
- TaskMaster's purpose and goals
- Target use cases and workflows
- Integration with AI-powered development

### 2. Core Technologies
- Node.js with ES modules
- Commander.js for CLI
- Inquirer.js for interactive prompts
- Multiple AI provider integrations
- MCP server for editor integration

### 3. TaskMaster Patterns
- Task structure with IDs, status, dependencies
- Subtask notation (e.g., 5.2 for subtask 2 of task 5)
- Command patterns for CLI and MCP
- File organization conventions

### 4. Development Guidelines
- Code style preferences (ES modules, async/await)
- Error handling patterns
- Testing approaches
- Documentation standards

### 5. Command Reference
- Essential commands (init, menu, parse-prd, list, next)
- Task management commands
- Advanced features and analysis tools
- Interactive menu usage

### 6. Best Practices
- When to use different commands
- How to structure complex tasks
- AI model configuration guidance
- Integration testing approaches

## Customizing Guidelines

You can customize the `.augment-guidelines` file for your specific project needs:

### Adding Project-Specific Context
```markdown
## Project-Specific Guidelines

### Custom Patterns
- Use specific naming conventions for your domain
- Follow your team's coding standards
- Integrate with your existing tools and workflows

### Domain Knowledge
- Include business logic patterns
- Add domain-specific terminology
- Reference your project's architecture decisions
```

### Team Conventions
```markdown
## Team Guidelines

### Code Review Process
- Always test TaskMaster commands before committing
- Validate interactive menu flows
- Check MCP integration compatibility

### Deployment Practices
- Test with multiple AI providers
- Validate cross-platform compatibility
- Update documentation with new features
```

## Troubleshooting

### Guidelines Not Detected
If Augment doesn't seem to be using the guidelines:
1. Ensure `.augment-guidelines` is in the project root
2. Restart VS Code to refresh Augment's context
3. Check that the file is properly formatted
4. Verify Augment extension is up to date

### Outdated Guidelines
To update guidelines after TaskMaster changes:
1. Re-run `task-master init` (will preserve existing files)
2. Manually update `.augment-guidelines` with new patterns
3. Add project-specific customizations as needed

### Performance Issues
If guidelines are too large:
1. Focus on the most important patterns for your project
2. Remove sections not relevant to your use case
3. Keep guidelines under 2000 characters for optimal performance

## Integration with Other AI Editors

TaskMaster also generates guidelines for other AI-powered editors:
- **Cursor**: `.cursor/rules/` directory with comprehensive rule files
- **Windsurf**: `.windsurfrules` file for AI assistance  
- **Roo Code**: `.roo/` directory with mode-specific rules

This ensures consistent AI assistance across different development environments.

## Examples

### Asking Augment for TaskMaster Help

**Creating Tasks:**
```
"Help me parse this PRD file and create tasks using TaskMaster. 
The file is at scripts/requirements.txt and I want about 15 tasks."
```

**Managing Dependencies:**
```
"I need to add dependencies between these tasks. Task 5 should depend on 
tasks 2 and 3, and task 8 should depend on task 5. Show me the commands."
```

**Interactive Menu Development:**
```
"I want to add a new option to the TaskMaster interactive menu for 
exporting tasks to CSV. Follow the existing patterns."
```

**Error Handling:**
```
"This TaskMaster command is failing silently. Add proper error handling 
and user feedback following the project patterns."
```

The guidelines ensure Augment provides accurate, context-aware assistance that follows TaskMaster's established patterns and best practices.
