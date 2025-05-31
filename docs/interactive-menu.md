# TaskMaster Interactive Menu System

The TaskMaster Interactive Menu provides a user-friendly, menu-driven interface for all TaskMaster operations. This eliminates the need to remember command syntax and provides guided workflows for common tasks.

## Quick Start

Launch the interactive menu using any of these methods:

```bash
# Method 1: Menu command
task-master menu

# Method 2: Menu flag
task-master --menu
task-master -m
```

## Menu Structure

The interactive menu is organized into logical categories:

### 📁 Project Management
- **🚀 Initialize Project** - Set up a new TaskMaster project
- **📄 Parse PRD** - Generate tasks from Product Requirements Document
- **🤖 Configure Models** - Set up AI model configuration

### 📋 Task Operations
- **📋 List Tasks** - View all tasks with status
- **🔍 Next Task** - Find the next task to work on
- **👁️ Show Task** - Display detailed task information
- **✅ Set Status** - Update task status
- **🔄 Generate Files** - Create individual task files

### 🔧 Task Management
- **➕ Add Task** - Create new tasks using AI
- **✏️ Update Task** - Modify existing task details
- **🔄 Update Multiple** - Batch update tasks
- **🗑️ Remove Task** - Delete tasks
- **📦 Move Task** - Reorder tasks

### 📝 Subtask Operations
- **➕ Add Subtask** - Create subtasks for existing tasks
- **✏️ Update Subtask** - Modify subtask details
- **🗑️ Remove Subtask** - Delete subtasks
- **🔍 Expand Task** - Break down tasks into subtasks
- **🧹 Clear Subtasks** - Remove all subtasks from a task

### 📊 Analysis & Dependencies
- **🔍 Analyze Complexity** - Analyze task complexity
- **📊 Complexity Report** - Generate complexity reports
- **➕ Add Dependency** - Create task dependencies
- **➖ Remove Dependency** - Remove task dependencies
- **✅ Validate Dependencies** - Check dependency integrity
- **🔧 Fix Dependencies** - Automatically fix dependency issues

### ❓ Help & Information
- **📖 Command Reference** - Complete command documentation
- **🚀 Quick Start Guide** - Step-by-step getting started
- **⌨️ Keyboard Shortcuts** - Navigation shortcuts
- **🔧 Configuration Help** - Setup and configuration guide

### ⚙️ Settings
- **🔬 Toggle Research Mode** - Enable/disable research features
- **📁 Set Default File Paths** - Configure default paths
- **🐛 Debug Mode** - Enable debug logging
- **🤖 Model Configuration** - AI model setup

## Navigation

### Keyboard Shortcuts
- **↑/↓ Arrow Keys** - Navigate menu options
- **Enter** - Select option
- **Ctrl+C** - Exit menu
- **j/k** - Navigate (vim-style)
- **Tab** - Auto-complete (in prompts)

### Menu Features
- **Breadcrumb Navigation** - Shows current location (e.g., "Main Menu > Task Operations")
- **Back Navigation** - Return to previous menu level
- **Project Information** - Real-time display of project status
- **Error Recovery** - Graceful error handling with recovery options

## Project Information Display

The menu header shows:
- **Project Name** - Current project name
- **Task Count** - Total tasks and pending tasks
- **Configuration Status** - Whether project is properly configured
- **Current Location** - Breadcrumb navigation path

## Parameter Prompting

When commands require parameters, the menu will prompt you with:
- **Input Validation** - Ensures valid input before execution
- **Default Values** - Sensible defaults where applicable
- **Help Text** - Clear descriptions of what each parameter does
- **Error Messages** - Clear feedback on invalid input

## Error Handling

The menu includes robust error handling:
- **Command Failures** - Clear error messages with context
- **Recovery Options** - Choose how to proceed after errors
- **Logging** - Debug information for troubleshooting
- **Graceful Degradation** - Menu continues working even if some features fail

## Examples

### Basic Workflow
1. Launch menu: `task-master menu`
2. Select "📁 Project Management"
3. Choose "🚀 Initialize Project"
4. Follow prompts to set up project
5. Return to main menu
6. Select "📄 Parse PRD" to generate tasks

### Task Management Workflow
1. Select "📋 Task Operations"
2. Choose "📋 List Tasks" to see current tasks
3. Select "🔍 Next Task" to find what to work on
4. Use "✅ Set Status" to update progress

## Configuration

The menu system respects your TaskMaster configuration:
- **Model Settings** - Uses configured AI models
- **Project Settings** - Reads from `.taskmasterconfig`
- **Environment Variables** - Respects debug and development settings

## Troubleshooting

### Menu Won't Start
- Ensure TaskMaster is properly installed
- Check that all dependencies are installed (`npm install`)
- Verify Node.js version compatibility

### Commands Fail
- Check project initialization (`task-master init`)
- Verify model configuration (`task-master models --setup`)
- Check API keys in `.env` file

### Performance Issues
- Enable debug mode to identify bottlenecks
- Check system resources
- Verify project file permissions

## Advanced Features

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=1 task-master menu
```

### Development Mode
For development and troubleshooting:
```bash
NODE_ENV=development task-master menu
```

## Integration with CLI

The interactive menu is fully integrated with the CLI:
- All menu actions execute the same commands as CLI
- Parameters are validated the same way
- Output and error handling are consistent
- Can switch between menu and CLI seamlessly

## Benefits

### User Experience
- **No Command Memorization** - Visual menu eliminates need to remember syntax
- **Guided Workflows** - Step-by-step processes for complex operations
- **Context Awareness** - Shows relevant information and options
- **Error Prevention** - Input validation prevents common mistakes

### Productivity
- **Faster Navigation** - Quick access to all features
- **Batch Operations** - Efficient handling of multiple tasks
- **Smart Defaults** - Reduces repetitive input
- **Real-time Feedback** - Immediate status updates

### Accessibility
- **Keyboard Navigation** - Full keyboard support
- **Clear Visual Hierarchy** - Organized, easy-to-scan interface
- **Consistent Patterns** - Predictable navigation and interaction
- **Help Integration** - Built-in documentation and guidance
