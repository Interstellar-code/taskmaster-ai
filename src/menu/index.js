/**
 * Interactive Menu System
 * Main entry point for the TaskMaster interactive menu
 */

import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';
import { findProjectRoot } from '../../scripts/modules/utils.js';
import { getConfig } from '../../scripts/modules/config-manager.js';
import { listTasks } from '../../scripts/modules/task-manager.js';
import {
    executeCommand,
    executeCommandWithParams,
    showCommandHelp,
    COMMON_PARAMS,
    logError,
    logWarning
} from './command-executor.js';

/**
 * Initialize and launch the interactive menu system
 */
export async function initializeInteractiveMenu() {
    console.log(chalk.blue('Initializing interactive menu...'));

    try {
        // Initialize session state
        const sessionState = {
            projectRoot: findProjectRoot(),
            menuPath: ['Main Menu'],
            projectInfo: await getProjectInfo()
        };

        // Start the main menu loop
        await mainMenuLoop(sessionState);
    } catch (error) {
        console.error(chalk.red('Error initializing interactive menu:'), error.message);
        process.exit(1);
    }
}

/**
 * Get project information for display in header
 */
async function getProjectInfo() {
    try {
        const projectRoot = findProjectRoot();
        if (!projectRoot) {
            return {
                name: 'No Project',
                totalTasks: 0,
                pendingTasks: 0,
                status: '⚠ Not Configured'
            };
        }

        // Get project name from package.json or directory name
        let projectName = 'TaskMaster Project';
        try {
            const fs = await import('fs');
            const path = await import('path');
            const packagePath = path.join(projectRoot, 'package.json');
            if (fs.existsSync(packagePath)) {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                projectName = packageJson.name || projectName;
            }
        } catch (err) {
            // Use default name if package.json can't be read
        }

        // Get task counts safely
        let totalTasks = 0;
        let pendingTasks = 0;
        try {
            const path = await import('path');
            const tasksPath = path.join(projectRoot, 'tasks', 'tasks.json');
            const result = listTasks(tasksPath, null, null, false, 'json');
            if (result && result.tasks && Array.isArray(result.tasks)) {
                totalTasks = result.tasks.length;
                pendingTasks = result.tasks.filter(task => task.status === 'pending').length;
            }
        } catch (err) {
            // Use default values if tasks can't be read
        }

        // Check configuration status
        let status = '✓ Configured';
        try {
            getConfig(projectRoot);
        } catch (err) {
            status = '⚠ Not Configured';
        }

        return {
            name: projectName,
            totalTasks,
            pendingTasks,
            status
        };
    } catch (error) {
        return {
            name: 'Error Loading Project',
            totalTasks: 0,
            pendingTasks: 0,
            status: '❌ Error'
        };
    }
}

/**
 * Render the menu header with project information
 */
function renderMenuHeader(sessionState) {
    const { projectInfo, menuPath } = sessionState;

    const headerContent = [
        chalk.bold.blue(`📋 ${projectInfo.name}`),
        '',
        chalk.gray(`Tasks: ${projectInfo.totalTasks} total (${projectInfo.pendingTasks} pending)`),
        chalk.gray(`Status: ${projectInfo.status}`),
        '',
        chalk.yellow(`📍 ${menuPath.join(' > ')}`)
    ].join('\n');

    const header = boxen(headerContent, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue',
        title: 'TaskMaster Interactive Menu',
        titleAlignment: 'center'
    });

    console.log('\n' + header);
}

/**
 * Main menu loop
 */
async function mainMenuLoop(sessionState) {
    while (true) {
        try {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('What would you like to do?'),
                    choices: [
                        {
                            name: chalk.blue('📁 Project Management'),
                            value: 'project',
                            short: 'Project Management'
                        },
                        {
                            name: chalk.green('📋 Task Operations'),
                            value: 'tasks',
                            short: 'Task Operations'
                        },
                        {
                            name: chalk.yellow('🔧 Task Management'),
                            value: 'task-mgmt',
                            short: 'Task Management'
                        },
                        {
                            name: chalk.magenta('📝 Subtask Operations'),
                            value: 'subtasks',
                            short: 'Subtask Operations'
                        },
                        {
                            name: chalk.cyan('📊 Analysis & Dependencies'),
                            value: 'analysis',
                            short: 'Analysis & Dependencies'
                        },
                        {
                            name: chalk.blue('❓ Help & Information'),
                            value: 'help',
                            short: 'Help & Information'
                        },
                        {
                            name: chalk.gray('⚙️ Settings'),
                            value: 'settings',
                            short: 'Settings'
                        },
                        new inquirer.Separator(),
                        {
                            name: chalk.dim('🔄 Refresh Project Info'),
                            value: 'refresh',
                            short: 'Refresh'
                        },
                        {
                            name: chalk.red('🚪 Exit'),
                            value: 'exit',
                            short: 'Exit'
                        }
                    ],
                    pageSize: 12
                }
            ]);

            switch (action) {
                case 'project':
                    await handleProjectManagement(sessionState);
                    break;
                case 'tasks':
                    await handleTaskOperations(sessionState);
                    break;
                case 'task-mgmt':
                    await handleTaskManagement(sessionState);
                    break;
                case 'subtasks':
                    await handleSubtaskOperations(sessionState);
                    break;
                case 'analysis':
                    await handleAnalysis(sessionState);
                    break;
                case 'help':
                    await handleHelp(sessionState);
                    break;
                case 'settings':
                    await handleSettings(sessionState);
                    break;
                case 'refresh':
                    try {
                        sessionState.projectInfo = await getProjectInfo();
                        console.log(chalk.green('✅ Project information refreshed'));
                    } catch (error) {
                        console.error(chalk.red('❌ Failed to refresh project information:'), error.message);
                        logError('Project info refresh failed', error);
                    }
                    break;
                case 'exit':
                    console.log(chalk.green('\nGoodbye! 👋'));
                    process.exit(0);
                    break;
                default:
                    logWarning('Unknown menu action selected', { action });
                    console.log(chalk.yellow('Feature coming soon...'));
                    await inquirer.prompt([{
                        type: 'input',
                        name: 'continue',
                        message: 'Press Enter to continue...'
                    }]);
            }
        } catch (error) {
            console.error(chalk.red('❌ Menu error:'), error.message);
            logError('Main menu error', error, { sessionState: sessionState.menuPath });

            // Provide helpful error recovery options
            const { recovery } = await inquirer.prompt([{
                type: 'list',
                name: 'recovery',
                message: 'How would you like to proceed?',
                choices: [
                    { name: '🔄 Try again', value: 'retry' },
                    { name: '🏠 Return to main menu', value: 'main' },
                    { name: '🚪 Exit application', value: 'exit' }
                ]
            }]);

            switch (recovery) {
                case 'exit':
                    console.log(chalk.yellow('Exiting due to error...'));
                    process.exit(1);
                    break;
                case 'main':
                    // Reset to main menu
                    sessionState.menuPath = ['Main Menu'];
                    break;
                // 'retry' will continue the loop
            }
        }
    }
}

/**
 * Menu handlers for different sections
 */
async function handleProjectManagement(sessionState) {
    sessionState.menuPath.push('Project Management');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select a project management action:'),
                    choices: [
                        { name: chalk.blue('🚀 Initialize Project'), value: 'init' },
                        { name: chalk.green('📄 Parse PRD'), value: 'parse-prd' },
                        { name: chalk.yellow('🤖 Configure Models'), value: 'models' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'init':
                    await executeCommand('init', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'parse-prd':
                    await handleParsePRD(sessionState);
                    break;
                case 'models':
                    await executeCommand('models', ['--setup'], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleTaskOperations(sessionState) {
    sessionState.menuPath.push('Task Operations');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select a task operation:'),
                    choices: [
                        { name: chalk.green('📋 List Tasks'), value: 'list' },
                        { name: chalk.blue('🔍 Next Task'), value: 'next' },
                        { name: chalk.yellow('👁️ Show Task'), value: 'show' },
                        { name: chalk.magenta('✅ Set Status'), value: 'set-status' },
                        { name: chalk.cyan('🔄 Generate Files'), value: 'generate' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'list':
                    await executeCommand('list', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'next':
                    await executeCommand('next', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'show':
                    await executeCommandWithParams('show', [
                        COMMON_PARAMS.taskId
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'set-status':
                    await executeCommandWithParams('set-status', [
                        COMMON_PARAMS.taskId,
                        COMMON_PARAMS.taskStatus
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'generate':
                    await executeCommand('generate', [], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleTaskManagement(sessionState) {
    sessionState.menuPath.push('Task Management');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select a task management action:'),
                    choices: [
                        { name: chalk.green('➕ Add Task'), value: 'add-task' },
                        { name: chalk.blue('✏️ Update Task'), value: 'update-task' },
                        { name: chalk.yellow('🔄 Update Multiple'), value: 'update' },
                        { name: chalk.red('🗑️ Remove Task'), value: 'remove-task' },
                        { name: chalk.magenta('📦 Move Task'), value: 'move' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'add-task':
                    await executeCommandWithParams('add-task', [
                        {
                            name: 'prompt',
                            type: 'input',
                            message: 'Enter task description:',
                            validate: (input) => input.trim().length > 0 ? true : 'Task description cannot be empty'
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'update-task':
                    await executeCommandWithParams('update-task', [
                        COMMON_PARAMS.taskId,
                        {
                            name: 'prompt',
                            type: 'input',
                            message: 'Enter update context:',
                            validate: (input) => input.trim().length > 0 ? true : 'Update context cannot be empty'
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'update':
                    await executeCommandWithParams('update', [
                        {
                            name: 'from',
                            type: 'input',
                            message: 'Enter starting task ID:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID';
                            }
                        },
                        {
                            name: 'prompt',
                            type: 'input',
                            message: 'Enter update context:',
                            validate: (input) => input.trim().length > 0 ? true : 'Update context cannot be empty'
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'remove-task':
                    await executeCommandWithParams('remove-task', [
                        COMMON_PARAMS.taskId
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'move':
                    await executeCommandWithParams('move', [
                        {
                            name: 'from',
                            type: 'input',
                            message: 'Enter source task ID:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID';
                            }
                        },
                        {
                            name: 'to',
                            type: 'input',
                            message: 'Enter target position:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid position';
                            }
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleSubtaskOperations(sessionState) {
    sessionState.menuPath.push('Subtask Operations');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select a subtask operation:'),
                    choices: [
                        { name: chalk.green('➕ Add Subtask'), value: 'add-subtask' },
                        { name: chalk.blue('✏️ Update Subtask'), value: 'update-subtask' },
                        { name: chalk.red('🗑️ Remove Subtask'), value: 'remove-subtask' },
                        { name: chalk.yellow('🔍 Expand Task'), value: 'expand' },
                        { name: chalk.magenta('🧹 Clear Subtasks'), value: 'clear-subtasks' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'add-subtask':
                    await executeCommandWithParams('add-subtask', [
                        {
                            name: 'parent',
                            type: 'input',
                            message: 'Enter parent task ID:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID';
                            }
                        },
                        {
                            name: 'title',
                            type: 'input',
                            message: 'Enter subtask title:',
                            validate: (input) => input.trim().length > 0 ? true : 'Subtask title cannot be empty'
                        },
                        {
                            name: 'description',
                            type: 'input',
                            message: 'Enter subtask description (optional):',
                            default: ''
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'update-subtask':
                    await executeCommandWithParams('update-subtask', [
                        {
                            name: 'id',
                            type: 'input',
                            message: 'Enter subtask ID (format: parentId.subtaskId):',
                            validate: (input) => {
                                const parts = input.split('.');
                                return parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))
                                    ? true : 'Please enter a valid subtask ID (e.g., 1.2)';
                            }
                        },
                        {
                            name: 'prompt',
                            type: 'input',
                            message: 'Enter update context:',
                            validate: (input) => input.trim().length > 0 ? true : 'Update context cannot be empty'
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'remove-subtask':
                    await executeCommandWithParams('remove-subtask', [
                        {
                            name: 'id',
                            type: 'input',
                            message: 'Enter subtask ID (format: parentId.subtaskId):',
                            validate: (input) => {
                                const parts = input.split('.');
                                return parts.length === 2 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))
                                    ? true : 'Please enter a valid subtask ID (e.g., 1.2)';
                            }
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'expand':
                    await executeCommandWithParams('expand', [
                        COMMON_PARAMS.taskId,
                        {
                            name: 'num',
                            type: 'input',
                            message: 'Number of subtasks to generate:',
                            default: '5',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 && num <= 20 ? true : 'Please enter a number between 1 and 20';
                            }
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'clear-subtasks':
                    await executeCommandWithParams('clear-subtasks', [
                        COMMON_PARAMS.taskId
                    ], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleAnalysis(sessionState) {
    sessionState.menuPath.push('Analysis & Dependencies');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select an analysis or dependency action:'),
                    choices: [
                        { name: chalk.blue('🔍 Analyze Complexity'), value: 'analyze-complexity' },
                        { name: chalk.green('📊 Complexity Report'), value: 'complexity-report' },
                        { name: chalk.yellow('➕ Add Dependency'), value: 'add-dependency' },
                        { name: chalk.red('➖ Remove Dependency'), value: 'remove-dependency' },
                        { name: chalk.magenta('✅ Validate Dependencies'), value: 'validate-dependencies' },
                        { name: chalk.cyan('🔧 Fix Dependencies'), value: 'fix-dependencies' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'analyze-complexity':
                    await executeCommand('analyze-complexity', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'complexity-report':
                    await executeCommand('complexity-report', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'add-dependency':
                    await executeCommandWithParams('add-dependency', [
                        COMMON_PARAMS.taskId,
                        {
                            name: 'depends-on',
                            type: 'input',
                            message: 'Enter dependency task ID:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID';
                            }
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'remove-dependency':
                    await executeCommandWithParams('remove-dependency', [
                        COMMON_PARAMS.taskId,
                        {
                            name: 'depends-on',
                            type: 'input',
                            message: 'Enter dependency task ID to remove:',
                            validate: (input) => {
                                const num = parseInt(input);
                                return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID';
                            }
                        }
                    ], { projectRoot: sessionState.projectRoot });
                    break;
                case 'validate-dependencies':
                    await executeCommand('validate-dependencies', [], { projectRoot: sessionState.projectRoot });
                    break;
                case 'fix-dependencies':
                    await executeCommand('fix-dependencies', [], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleHelp(sessionState) {
    sessionState.menuPath.push('Help & Information');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select help topic:'),
                    choices: [
                        { name: chalk.blue('📖 Command Reference'), value: 'command-reference' },
                        { name: chalk.green('🚀 Quick Start Guide'), value: 'quick-start' },
                        { name: chalk.yellow('⌨️ Keyboard Shortcuts'), value: 'shortcuts' },
                        { name: chalk.magenta('🔧 Configuration Help'), value: 'config-help' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'command-reference':
                    await showCommandReference();
                    break;
                case 'quick-start':
                    await showQuickStartGuide();
                    break;
                case 'shortcuts':
                    await showKeyboardShortcuts();
                    break;
                case 'config-help':
                    await showConfigurationHelp();
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

async function handleSettings(sessionState) {
    sessionState.menuPath.push('Settings');

    try {
        while (true) {
            renderMenuHeader(sessionState);

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: chalk.cyan('Select a setting to configure:'),
                    choices: [
                        { name: chalk.blue('🔬 Toggle Research Mode'), value: 'research-mode' },
                        { name: chalk.green('📁 Set Default File Paths'), value: 'file-paths' },
                        { name: chalk.yellow('🐛 Debug Mode'), value: 'debug-mode' },
                        { name: chalk.magenta('🤖 Model Configuration'), value: 'models' },
                        new inquirer.Separator(),
                        { name: chalk.gray('← Back to Main Menu'), value: 'back' }
                    ]
                }
            ]);

            if (action === 'back') {
                break;
            }

            // Handle the selected action
            switch (action) {
                case 'research-mode':
                    console.log(chalk.blue('\n🔬 Research Mode'));
                    console.log(chalk.gray('This setting controls whether to use research models for analysis.'));
                    console.log(chalk.yellow('Feature coming soon...'));
                    break;
                case 'file-paths':
                    console.log(chalk.green('\n📁 Default File Paths'));
                    console.log(chalk.gray('Configure default paths for PRD files, output directories, etc.'));
                    console.log(chalk.yellow('Feature coming soon...'));
                    break;
                case 'debug-mode':
                    console.log(chalk.yellow('\n🐛 Debug Mode'));
                    console.log(chalk.gray('Enable/disable debug logging and verbose output.'));
                    console.log(chalk.yellow('Feature coming soon...'));
                    break;
                case 'models':
                    await executeCommand('models', ['--setup'], { projectRoot: sessionState.projectRoot });
                    break;
            }

            await inquirer.prompt([{
                type: 'input',
                name: 'continue',
                message: chalk.dim('Press Enter to continue...')
            }]);
        }
    } finally {
        sessionState.menuPath.pop();
    }
}

/**
 * Specialized handlers for complex operations
 */
async function handleParsePRD(sessionState) {
    try {
        // Check if tasks already exist
        const path = await import('path');
        const fs = await import('fs');
        const tasksPath = path.join(sessionState.projectRoot, 'tasks', 'tasks.json');

        let hasExistingTasks = false;
        let existingTaskCount = 0;

        try {
            if (fs.existsSync(tasksPath)) {
                const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
                if (tasksData.tasks && Array.isArray(tasksData.tasks) && tasksData.tasks.length > 0) {
                    hasExistingTasks = true;
                    existingTaskCount = tasksData.tasks.length;
                }
            }
        } catch (err) {
            // If we can't read tasks, assume no existing tasks
        }

        // Show warning if tasks exist
        if (hasExistingTasks) {
            console.log(chalk.yellow(`\n⚠️  Found ${existingTaskCount} existing tasks`));

            const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'How would you like to proceed?',
                choices: [
                    {
                        name: chalk.green('➕ Append new tasks (recommended)'),
                        value: 'append',
                        short: 'Append'
                    },
                    {
                        name: chalk.yellow('🔄 Replace all tasks'),
                        value: 'replace',
                        short: 'Replace'
                    },
                    {
                        name: chalk.gray('❌ Cancel'),
                        value: 'cancel',
                        short: 'Cancel'
                    }
                ]
            }]);

            if (action === 'cancel') {
                console.log(chalk.gray('Operation cancelled.'));
                return;
            }

            // Get PRD file path and other parameters
            const params = await promptForPRDParameters();
            if (!params) return;

            // Build arguments based on user choice
            const args = [`--input=${params.filePath}`, `--num-tasks=${params.numTasks}`];
            if (action === 'append') {
                args.push('--append');
            }

            await executeCommand('parse-prd', args, { projectRoot: sessionState.projectRoot });
        } else {
            // No existing tasks, proceed normally
            const params = await promptForPRDParameters();
            if (!params) return;

            const args = [`--input=${params.filePath}`, `--num-tasks=${params.numTasks}`];
            await executeCommand('parse-prd', args, { projectRoot: sessionState.projectRoot });
        }
    } catch (error) {
        console.error(chalk.red('Error handling PRD parsing:'), error.message);
        logError('PRD parsing error', error, { sessionState: sessionState.menuPath });
    }
}

async function promptForPRDParameters() {
    try {
        // First, let user choose how to specify the PRD file
        const { fileSource } = await inquirer.prompt([{
            type: 'list',
            name: 'fileSource',
            message: 'How would you like to specify the PRD file?',
            choices: [
                {
                    name: chalk.blue('📁 Browse and select file'),
                    value: 'browse',
                    short: 'Browse'
                },
                {
                    name: chalk.green('⌨️ Enter file path manually'),
                    value: 'manual',
                    short: 'Manual'
                },
                {
                    name: chalk.yellow('📄 Use default (scripts/prd.txt)'),
                    value: 'default',
                    short: 'Default'
                }
            ]
        }]);

        let filePath;

        switch (fileSource) {
            case 'browse':
                filePath = await browsePRDFiles();
                if (!filePath) return null;
                break;
            case 'manual':
                const { manualPath } = await inquirer.prompt([{
                    type: 'input',
                    name: 'manualPath',
                    message: 'Enter PRD file path:',
                    validate: (input) => {
                        if (!input.trim()) return 'File path cannot be empty';
                        // Basic validation - could be enhanced
                        return true;
                    }
                }]);
                filePath = manualPath;
                break;
            case 'default':
                filePath = 'scripts/prd.txt';
                break;
        }

        // Get number of tasks
        const { numTasks } = await inquirer.prompt([{
            type: 'input',
            name: 'numTasks',
            message: 'Number of tasks to generate:',
            default: '10',
            validate: (input) => {
                const num = parseInt(input);
                return !isNaN(num) && num > 0 && num <= 50 ? true : 'Please enter a number between 1 and 50';
            }
        }]);

        return { filePath, numTasks };
    } catch (error) {
        console.error(chalk.red('Error getting PRD parameters:'), error.message);
        return null;
    }
}

async function browsePRDFiles() {
    try {
        const fs = await import('fs');
        const path = await import('path');

        // Common PRD file locations
        const searchPaths = [
            'scripts',
            'docs',
            'requirements',
            '.',
            'prd'
        ];

        const prdFiles = [];

        for (const searchPath of searchPaths) {
            try {
                if (fs.existsSync(searchPath)) {
                    const files = fs.readdirSync(searchPath);
                    const prdFilesInPath = files
                        .filter(file => {
                            const ext = path.extname(file).toLowerCase();
                            const name = path.basename(file, ext).toLowerCase();
                            return (ext === '.txt' || ext === '.md') &&
                                   (name.includes('prd') || name.includes('requirement') || name.includes('spec'));
                        })
                        .map(file => ({
                            name: `${searchPath}/${file}`,
                            value: path.join(searchPath, file)
                        }));

                    prdFiles.push(...prdFilesInPath);
                }
            } catch (err) {
                // Skip directories we can't read
            }
        }

        if (prdFiles.length === 0) {
            console.log(chalk.yellow('No PRD files found in common locations.'));
            const { manualPath } = await inquirer.prompt([{
                type: 'input',
                name: 'manualPath',
                message: 'Enter PRD file path manually:',
                validate: (input) => input.trim().length > 0 ? true : 'File path cannot be empty'
            }]);
            return manualPath;
        }

        // Add option to enter manual path
        prdFiles.push(
            new inquirer.Separator(),
            {
                name: chalk.gray('⌨️ Enter path manually'),
                value: 'manual'
            }
        );

        const { selectedFile } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedFile',
            message: 'Select a PRD file:',
            choices: prdFiles,
            pageSize: 10
        }]);

        if (selectedFile === 'manual') {
            const { manualPath } = await inquirer.prompt([{
                type: 'input',
                name: 'manualPath',
                message: 'Enter PRD file path:',
                validate: (input) => input.trim().length > 0 ? true : 'File path cannot be empty'
            }]);
            return manualPath;
        }

        return selectedFile;
    } catch (error) {
        console.error(chalk.red('Error browsing PRD files:'), error.message);
        return null;
    }
}

/**
 * Help functions
 */
async function showCommandReference() {
    console.log(chalk.blue('\n📖 Command Reference'));
    console.log(chalk.white('═'.repeat(50)));

    const commands = [
        { cmd: 'task-master init', desc: 'Initialize a new project' },
        { cmd: 'task-master list', desc: 'List all tasks' },
        { cmd: 'task-master next', desc: 'Show next task to work on' },
        { cmd: 'task-master show <id>', desc: 'Show task details' },
        { cmd: 'task-master set-status --id=<id> --status=<status>', desc: 'Update task status' },
        { cmd: 'task-master add-task --prompt="<text>"', desc: 'Add a new task' },
        { cmd: 'task-master parse-prd --input=<file>', desc: 'Generate tasks from PRD' },
        { cmd: 'task-master models --setup', desc: 'Configure AI models' }
    ];

    commands.forEach(({ cmd, desc }) => {
        console.log(chalk.cyan(`  ${cmd}`));
        console.log(chalk.gray(`    ${desc}\n`));
    });
}

async function showQuickStartGuide() {
    console.log(chalk.green('\n🚀 Quick Start Guide'));
    console.log(chalk.white('═'.repeat(50)));

    const steps = [
        '1. Initialize project: task-master init',
        '2. Configure models: task-master models --setup',
        '3. Parse PRD file: task-master parse-prd --input=<file>',
        '4. List tasks: task-master list',
        '5. Find next task: task-master next',
        '6. Set task status: task-master set-status --id=<id> --status=in-progress'
    ];

    steps.forEach(step => {
        console.log(chalk.yellow(`  ${step}`));
    });

    console.log(chalk.white('\n💡 Tip: Use the interactive menu (task-master menu) for easier navigation!'));
}

async function showKeyboardShortcuts() {
    console.log(chalk.yellow('\n⌨️ Keyboard Shortcuts'));
    console.log(chalk.white('═'.repeat(50)));

    const shortcuts = [
        { key: '↑/↓ Arrow Keys', desc: 'Navigate menu options' },
        { key: 'Enter', desc: 'Select option' },
        { key: 'Ctrl+C', desc: 'Exit menu' },
        { key: 'j/k', desc: 'Navigate (vim-style)' },
        { key: 'Tab', desc: 'Auto-complete (in prompts)' }
    ];

    shortcuts.forEach(({ key, desc }) => {
        console.log(chalk.cyan(`  ${key.padEnd(20)} ${chalk.gray(desc)}`));
    });
}

async function showConfigurationHelp() {
    console.log(chalk.magenta('\n🔧 Configuration Help'));
    console.log(chalk.white('═'.repeat(50)));

    console.log(chalk.white('Configuration Files:'));
    console.log(chalk.cyan('  .taskmasterconfig') + chalk.gray(' - AI model configuration'));
    console.log(chalk.cyan('  .env') + chalk.gray(' - API keys (ANTHROPIC_API_KEY, etc.)'));
    console.log(chalk.cyan('  tasks/tasks.json') + chalk.gray(' - Task data'));

    console.log(chalk.white('\nAI Integration Files:'));
    console.log(chalk.cyan('  .cursor/rules/') + chalk.gray(' - Cursor AI workspace rules'));
    console.log(chalk.cyan('  .augment-guidelines') + chalk.gray(' - Augment AI workspace guidelines'));
    console.log(chalk.cyan('  .windsurfrules') + chalk.gray(' - Windsurf AI rules'));
    console.log(chalk.cyan('  .roo/') + chalk.gray(' - Roo Code integration rules'));

    console.log(chalk.white('\nRequired Setup:'));
    console.log(chalk.yellow('  1. Set API keys in .env file'));
    console.log(chalk.yellow('  2. Run: task-master models --setup'));
    console.log(chalk.yellow('  3. Initialize project: task-master init'));

    console.log(chalk.white('\nAI Editor Integration:'));
    console.log(chalk.gray('  • Cursor: Uses .cursor/rules/ for context'));
    console.log(chalk.gray('  • Augment: Uses .augment-guidelines for workspace context'));
    console.log(chalk.gray('  • Windsurf: Uses .windsurfrules for AI assistance'));
    console.log(chalk.gray('  • Roo Code: Uses .roo/ directory for mode-specific rules'));
}
