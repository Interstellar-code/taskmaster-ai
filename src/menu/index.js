/**
 * Interactive Menu System
 * Main entry point for the TaskHero interactive menu
 */

import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { findProjectRoot, readJSON } from '../../scripts/modules/utils.js';
import { getConfig } from '../../scripts/modules/config-manager.js';
import { listTasks } from '../../scripts/modules/task-manager.js';
import { launchKanbanBoard } from '../kanban/kanban-board.js';
import {
	executeCommand,
	executeCommandWithParams,
	showCommandHelp,
	COMMON_PARAMS,
	logError,
	logWarning
} from './command-executor.js';

/**
 * Get the correct tasks.json path based on the new directory structure
 * @param {string} projectRoot - Project root directory
 * @returns {string} - Path to tasks.json file
 */
function getTasksJsonPath(projectRoot) {
	// Try new structure first
	const newPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
	if (fs.existsSync(newPath)) {
		return newPath;
	}

	// Fall back to old structure
	const oldPath = path.join(projectRoot, 'tasks', 'tasks.json');
	return oldPath;
}

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
		console.error(
			chalk.red('Error initializing interactive menu:'),
			error.message
		);
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
		let tasksWithPrdSource = 0;
		let uniquePrdSources = 0;
		try {
			const tasksPath = getTasksJsonPath(projectRoot);

			// Check if file exists before trying to read it
			if (!fs.existsSync(tasksPath)) {
				// File doesn't exist, use default values
				return {
					name: projectName,
					totalTasks: 0,
					pendingTasks: 0,
					tasksWithPrdSource: 0,
					uniquePrdSources: 0,
					status: '⚠ No Tasks File'
				};
			}

			// Try to read the file directly first to check if it's valid JSON
			const data = readJSON(tasksPath);
			if (!data || !data.tasks || !Array.isArray(data.tasks)) {
				// Invalid or empty tasks file
				return {
					name: projectName,
					totalTasks: 0,
					pendingTasks: 0,
					tasksWithPrdSource: 0,
					uniquePrdSources: 0,
					status: '⚠ Invalid Tasks File'
				};
			}

			// File is valid, calculate statistics
			totalTasks = data.tasks.length;
			pendingTasks = data.tasks.filter(
				(task) => task.status === 'pending'
			).length;

			// Calculate PRD source statistics
			tasksWithPrdSource = data.tasks.filter(
				(task) => task.prdSource && task.prdSource.fileName
			).length;
			const prdFileNames = [
				...new Set(
					data.tasks
						.filter((task) => task.prdSource && task.prdSource.fileName)
						.map((task) => task.prdSource.fileName)
				)
			];
			uniquePrdSources = prdFileNames.length;
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
			tasksWithPrdSource,
			uniquePrdSources,
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
		chalk.gray(
			`Tasks: ${projectInfo.totalTasks} total (${projectInfo.pendingTasks} pending)`
		),
		chalk.gray(
			`PRD Sources: ${projectInfo.tasksWithPrdSource || 0} tasks from ${projectInfo.uniquePrdSources || 0} PRD files`
		),
		chalk.gray(`Status: ${projectInfo.status}`),
		'',
		chalk.yellow(`📍 ${menuPath.join(' > ')}`)
	].join('\n');

	const header = boxen(headerContent, {
		padding: 1,
		margin: 1,
		borderStyle: 'round',
		borderColor: 'blue',
		title: 'TaskHero Interactive Menu',
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
						console.error(
							chalk.red('❌ Failed to refresh project information:'),
							error.message
						);
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
					await inquirer.prompt([
						{
							type: 'input',
							name: 'continue',
							message: 'Press Enter to continue...'
						}
					]);
			}
		} catch (error) {
			console.error(chalk.red('❌ Menu error:'), error.message);
			logError('Main menu error', error, {
				sessionState: sessionState.menuPath
			});

			// Provide helpful error recovery options
			const { recovery } = await inquirer.prompt([
				{
					type: 'list',
					name: 'recovery',
					message: 'How would you like to proceed?',
					choices: [
						{ name: '🔄 Try again', value: 'retry' },
						{ name: '🏠 Return to main menu', value: 'main' },
						{ name: '🚪 Exit application', value: 'exit' }
					]
				}
			]);

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
						{ name: chalk.magenta('📄 PRD Management'), value: 'prd-mgmt' },
						{ name: chalk.cyan('📊 PRD Kanban Board'), value: 'prd-kanban' },
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
					await executeCommand('init', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'parse-prd':
					await handleParsePRD(sessionState);
					break;
				case 'prd-mgmt':
					await handlePrdManagement(sessionState);
					break;
				case 'prd-kanban':
					await handlePRDKanbanBoard(sessionState);
					break;
				case 'models':
					await executeCommand('models', ['--setup'], {
						projectRoot: sessionState.projectRoot
					});
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
						{ name: chalk.magenta('📊 Kanban Board View'), value: 'kanban' },
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
					await handleListTasks(sessionState);
					break;
				case 'next':
					await executeCommand('next', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'show':
					await executeCommandWithParams('show', [COMMON_PARAMS.taskId], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'set-status':
					await executeCommandWithParams(
						'set-status',
						[COMMON_PARAMS.taskId, COMMON_PARAMS.taskStatus],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'generate':
					await executeCommand('generate', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'kanban':
					await handleKanbanBoard(sessionState);
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
					await executeCommandWithParams(
						'add-task',
						[
							{
								name: 'prompt',
								type: 'input',
								message: 'Enter task description:',
								validate: (input) =>
									input.trim().length > 0
										? true
										: 'Task description cannot be empty'
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'update-task':
					await executeCommandWithParams(
						'update-task',
						[
							COMMON_PARAMS.taskId,
							{
								name: 'prompt',
								type: 'input',
								message: 'Enter update context:',
								validate: (input) =>
									input.trim().length > 0
										? true
										: 'Update context cannot be empty'
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'remove-task':
					await executeCommandWithParams(
						'remove-task',
						[COMMON_PARAMS.taskId],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'move':
					await executeCommandWithParams(
						'move',
						[
							{
								name: 'from',
								type: 'input',
								message: 'Enter source task ID:',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0
										? true
										: 'Please enter a valid task ID';
								}
							},
							{
								name: 'to',
								type: 'input',
								message: 'Enter target position:',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0
										? true
										: 'Please enter a valid position';
								}
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
						{
							name: chalk.cyan('🔄 Set Subtask Status'),
							value: 'set-subtask-status'
						},
						{ name: chalk.red('🗑️ Remove Subtask'), value: 'remove-subtask' },
						{ name: chalk.yellow('🔍 Expand Task'), value: 'expand' },
						{
							name: chalk.magenta('🧹 Clear Subtasks'),
							value: 'clear-subtasks'
						},
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
					await executeCommandWithParams(
						'add-subtask',
						[
							{
								name: 'parent',
								type: 'input',
								message: 'Enter parent task ID:',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0
										? true
										: 'Please enter a valid task ID';
								}
							},
							{
								name: 'title',
								type: 'input',
								message: 'Enter subtask title:',
								validate: (input) =>
									input.trim().length > 0
										? true
										: 'Subtask title cannot be empty'
							},
							{
								name: 'description',
								type: 'input',
								message: 'Enter subtask description (optional):',
								default: ''
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'update-subtask':
					await executeCommandWithParams(
						'update-subtask',
						[
							{
								name: 'id',
								type: 'input',
								message: 'Enter subtask ID (format: parentId.subtaskId):',
								validate: (input) => {
									const parts = input.split('.');
									return parts.length === 2 &&
										!isNaN(parseInt(parts[0])) &&
										!isNaN(parseInt(parts[1]))
										? true
										: 'Please enter a valid subtask ID (e.g., 1.2)';
								}
							},
							{
								name: 'prompt',
								type: 'input',
								message: 'Enter update context:',
								validate: (input) =>
									input.trim().length > 0
										? true
										: 'Update context cannot be empty'
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'set-subtask-status':
					await executeCommandWithParams(
						'set-status',
						[
							{
								name: 'id',
								type: 'input',
								message: 'Enter subtask ID (format: parentId.subtaskId):',
								validate: (input) => {
									const parts = input.split('.');
									return parts.length === 2 &&
										!isNaN(parseInt(parts[0])) &&
										!isNaN(parseInt(parts[1]))
										? true
										: 'Please enter a valid subtask ID (e.g., 1.2)';
								}
							},
							{
								name: 'status',
								type: 'list',
								message: 'Select new status:',
								choices: [
									{ name: 'Pending', value: 'pending' },
									{ name: 'In Progress', value: 'in-progress' },
									{ name: 'Done', value: 'done' },
									{ name: 'Review', value: 'review' },
									{ name: 'Blocked', value: 'blocked' },
									{ name: 'Deferred', value: 'deferred' },
									{ name: 'Cancelled', value: 'cancelled' }
								]
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'remove-subtask':
					await executeCommandWithParams(
						'remove-subtask',
						[
							{
								name: 'id',
								type: 'input',
								message: 'Enter subtask ID (format: parentId.subtaskId):',
								validate: (input) => {
									const parts = input.split('.');
									return parts.length === 2 &&
										!isNaN(parseInt(parts[0])) &&
										!isNaN(parseInt(parts[1]))
										? true
										: 'Please enter a valid subtask ID (e.g., 1.2)';
								}
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'expand':
					await executeCommandWithParams(
						'expand',
						[
							COMMON_PARAMS.taskId,
							{
								name: 'num',
								type: 'input',
								message: 'Number of subtasks to generate:',
								default: '5',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0 && num <= 20
										? true
										: 'Please enter a number between 1 and 20';
								}
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'clear-subtasks':
					await executeCommandWithParams(
						'clear-subtasks',
						[COMMON_PARAMS.taskId],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
						{
							name: chalk.blue('🔍 Analyze Complexity'),
							value: 'analyze-complexity'
						},
						{
							name: chalk.green('📊 Complexity Report'),
							value: 'complexity-report'
						},
						{
							name: chalk.yellow('➕ Add Dependency'),
							value: 'add-dependency'
						},
						{
							name: chalk.red('➖ Remove Dependency'),
							value: 'remove-dependency'
						},
						{
							name: chalk.magenta('✅ Validate Dependencies'),
							value: 'validate-dependencies'
						},
						{
							name: chalk.cyan('🔧 Fix Dependencies'),
							value: 'fix-dependencies'
						},
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
					await executeCommand('analyze-complexity', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'complexity-report':
					await executeCommand('complexity-report', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'add-dependency':
					await executeCommandWithParams(
						'add-dependency',
						[
							COMMON_PARAMS.taskId,
							{
								name: 'depends-on',
								type: 'input',
								message: 'Enter dependency task ID:',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0
										? true
										: 'Please enter a valid task ID';
								}
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'remove-dependency':
					await executeCommandWithParams(
						'remove-dependency',
						[
							COMMON_PARAMS.taskId,
							{
								name: 'depends-on',
								type: 'input',
								message: 'Enter dependency task ID to remove:',
								validate: (input) => {
									const num = parseInt(input);
									return !isNaN(num) && num > 0
										? true
										: 'Please enter a valid task ID';
								}
							}
						],
						{ projectRoot: sessionState.projectRoot }
					);
					break;
				case 'validate-dependencies':
					await executeCommand('validate-dependencies', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'fix-dependencies':
					await executeCommand('fix-dependencies', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
						{
							name: chalk.blue('📖 Command Reference'),
							value: 'command-reference'
						},
						{ name: chalk.green('🚀 Quick Start Guide'), value: 'quick-start' },
						{ name: chalk.yellow('⌨️ Keyboard Shortcuts'), value: 'shortcuts' },
						{
							name: chalk.magenta('🔧 Configuration Help'),
							value: 'config-help'
						},
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

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
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
						{
							name: chalk.blue('🔬 Toggle Research Mode'),
							value: 'research-mode'
						},
						{
							name: chalk.green('📁 Set Default File Paths'),
							value: 'file-paths'
						},
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
					console.log(
						chalk.gray(
							'This setting controls whether to use research models for analysis.'
						)
					);
					console.log(chalk.yellow('Feature coming soon...'));
					break;
				case 'file-paths':
					console.log(chalk.green('\n📁 Default File Paths'));
					console.log(
						chalk.gray(
							'Configure default paths for PRD files, output directories, etc.'
						)
					);
					console.log(chalk.yellow('Feature coming soon...'));
					break;
				case 'debug-mode':
					console.log(chalk.yellow('\n🐛 Debug Mode'));
					console.log(
						chalk.gray('Enable/disable debug logging and verbose output.')
					);
					console.log(chalk.yellow('Feature coming soon...'));
					break;
				case 'models':
					await executeCommand('models', ['--setup'], {
						projectRoot: sessionState.projectRoot
					});
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
		}
	} finally {
		sessionState.menuPath.pop();
	}
}

/**
 * Generate menu choices for PRD parsing based on whether existing tasks are present
 * @param {boolean} hasExistingTasks - Whether existing tasks are detected
 * @returns {Array} Array of Inquirer.js choice objects
 */
function generatePRDMenuChoices(hasExistingTasks) {
	const choices = [
		{
			name: chalk.green('➕ Append new tasks (recommended)'),
			value: 'append',
			short: 'Append'
		},
		{
			name: chalk.yellow('🔄 Replace all tasks'),
			value: 'replace',
			short: 'Replace'
		}
	];

	// Add the new "Append + Auto-Expand" option only when existing tasks are detected
	if (hasExistingTasks) {
		choices.splice(1, 0, {
			name: chalk.cyan('➕ Append new tasks + Auto-expand complex tasks'),
			value: 'appendAndAutoExpand',
			short: 'Append + Expand'
		});
	}

	// Add cancel option at the end
	choices.push({
		name: chalk.gray('❌ Cancel'),
		value: 'cancel',
		short: 'Cancel'
	});

	return choices;
}

/**
 * Specialized handlers for complex operations
 */
async function handleParsePRD(sessionState) {
	try {
		// Check if tasks already exist
		const fs = await import('fs');
		const tasksPath = getTasksJsonPath(sessionState.projectRoot);

		let hasExistingTasks = false;
		let existingTaskCount = 0;

		try {
			if (fs.existsSync(tasksPath)) {
				const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
				if (
					tasksData.tasks &&
					Array.isArray(tasksData.tasks) &&
					tasksData.tasks.length > 0
				) {
					hasExistingTasks = true;
					existingTaskCount = tasksData.tasks.length;
				}
			}
		} catch (err) {
			// If we can't read tasks, assume no existing tasks
		}

		// Show warning if tasks exist
		if (hasExistingTasks) {
			console.log(
				chalk.yellow(`\n⚠️  Found ${existingTaskCount} existing tasks`)
			);

			const { action } = await inquirer.prompt([
				{
					type: 'list',
					name: 'action',
					message: 'How would you like to proceed?',
					choices: generatePRDMenuChoices(hasExistingTasks)
				}
			]);

			if (action === 'cancel') {
				console.log(chalk.gray('Operation cancelled.'));
				return;
			}

			// Get PRD file path and other parameters
			const params = await promptForPRDParameters();
			if (!params) return;

			// Build arguments based on user choice
			const args = [
				`--input=${params.filePath}`,
				`--num-tasks=${params.numTasks}`
			];
			if (action === 'append' || action === 'appendAndAutoExpand') {
				args.push('--append');
			}

			// Handle the new append + auto-expand option
			if (action === 'appendAndAutoExpand') {
				await handleAppendAndAutoExpand(args, sessionState);
			} else {
				await executeCommand('parse-prd', args, {
					projectRoot: sessionState.projectRoot
				});
			}
		} else {
			// No existing tasks, proceed normally
			const params = await promptForPRDParameters();
			if (!params) return;

			const args = [
				`--input=${params.filePath}`,
				`--num-tasks=${params.numTasks}`
			];
			await executeCommand('parse-prd', args, {
				projectRoot: sessionState.projectRoot
			});
		}
	} catch (error) {
		console.error(chalk.red('Error handling PRD parsing:'), error.message);
		logError('PRD parsing error', error, {
			sessionState: sessionState.menuPath
		});
	}
}

async function promptForPRDParameters() {
	try {
		// First, let user choose how to specify the PRD file
		const { fileSource } = await inquirer.prompt([
			{
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
			}
		]);

		let filePath;

		switch (fileSource) {
			case 'browse':
				filePath = await browsePRDFiles();
				if (!filePath) return null;
				break;
			case 'manual':
				const { manualPath } = await inquirer.prompt([
					{
						type: 'input',
						name: 'manualPath',
						message: 'Enter PRD file path:',
						validate: (input) => {
							if (!input.trim()) return 'File path cannot be empty';
							// Basic validation - could be enhanced
							return true;
						}
					}
				]);
				filePath = manualPath;
				break;
			case 'default':
				filePath = 'scripts/prd.txt';
				break;
		}

		// Get number of tasks
		const { numTasks } = await inquirer.prompt([
			{
				type: 'input',
				name: 'numTasks',
				message: 'Number of tasks to generate:',
				default: '10',
				validate: (input) => {
					const num = parseInt(input);
					return !isNaN(num) && num > 0 && num <= 50
						? true
						: 'Please enter a number between 1 and 50';
				}
			}
		]);

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

		// Common PRD file locations - prioritize new structure
		const searchPaths = [
			'.taskmaster/prd/pending',
			'.taskmaster/prd/in-progress',
			'.taskmaster/prd/done',
			'.taskmaster/prd',
			'prd/pending',
			'prd/in-progress',
			'prd/done',
			'prd',
			'scripts',
			'docs',
			'requirements',
			'.'
		];

		const prdFiles = [];

		for (const searchPath of searchPaths) {
			try {
				if (fs.existsSync(searchPath)) {
					const files = fs.readdirSync(searchPath);
					const prdFilesInPath = files
						.filter((file) => {
							const ext = path.extname(file).toLowerCase();
							const name = path.basename(file, ext).toLowerCase();
							return (
								(ext === '.txt' || ext === '.md') &&
								(name.includes('prd') ||
									name.includes('requirement') ||
									name.includes('spec'))
							);
						})
						.map((file) => ({
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
			const { manualPath } = await inquirer.prompt([
				{
					type: 'input',
					name: 'manualPath',
					message: 'Enter PRD file path manually:',
					validate: (input) =>
						input.trim().length > 0 ? true : 'File path cannot be empty'
				}
			]);
			return manualPath;
		}

		// Add option to enter manual path
		prdFiles.push(new inquirer.Separator(), {
			name: chalk.gray('⌨️ Enter path manually'),
			value: 'manual'
		});

		const { selectedFile } = await inquirer.prompt([
			{
				type: 'list',
				name: 'selectedFile',
				message: 'Select a PRD file:',
				choices: prdFiles,
				pageSize: 10
			}
		]);

		if (selectedFile === 'manual') {
			const { manualPath } = await inquirer.prompt([
				{
					type: 'input',
					name: 'manualPath',
					message: 'Enter PRD file path:',
					validate: (input) =>
						input.trim().length > 0 ? true : 'File path cannot be empty'
				}
			]);
			return manualPath;
		}

		return selectedFile;
	} catch (error) {
		console.error(chalk.red('Error browsing PRD files:'), error.message);
		return null;
	}
}

/**
 * Handle the "Append + Auto-Expand" option for PRD parsing
 * This function first parses the PRD to append new tasks, then automatically expands complex tasks
 * @param {Array} args - Command arguments for parse-prd
 * @param {Object} sessionState - Current session state
 */
async function handleAppendAndAutoExpand(args, sessionState) {
	try {
		console.log(chalk.cyan('\n🚀 Starting Append + Auto-Expand process...'));

		// Step 1: Parse PRD and append new tasks
		console.log(
			chalk.blue('📝 Step 1: Parsing PRD and appending new tasks...')
		);
		await executeCommand('parse-prd', args, {
			projectRoot: sessionState.projectRoot
		});

		// Step 2: Perform complexity analysis
		console.log(
			chalk.blue('🔍 Step 2: Performing comprehensive complexity analysis...')
		);

		// Read the updated tasks to find newly added ones
		const fs = await import('fs');
		const tasksPath = getTasksJsonPath(sessionState.projectRoot);

		// Perform complexity analysis first
		try {
			await executeCommand('analyze-complexity', ['--file', tasksPath], {
				projectRoot: sessionState.projectRoot
			});
			console.log(
				chalk.green('✅ Complexity analysis completed successfully!')
			);
		} catch (analysisError) {
			console.log(
				chalk.yellow(
					`⚠️  Complexity analysis failed: ${analysisError.message}. Using fallback criteria.`
				)
			);
		}

		// Step 3: Identify complex tasks for expansion
		console.log(
			chalk.blue('🔍 Step 3: Identifying tasks suitable for auto-expansion...')
		);

		if (fs.existsSync(tasksPath)) {
			const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
			const complexTasks = identifyComplexTasks(tasksData.tasks);

			if (complexTasks.length > 0) {
				console.log(
					chalk.yellow(
						`🎯 Found ${complexTasks.length} complex task(s) suitable for expansion:`
					)
				);

				// Try to read complexity analysis results for better display
				const complexityReportPath = path.join(
					sessionState.projectRoot,
					'.taskmaster',
					'reports',
					'task-complexity-report.json'
				);
				let complexityReport = null;
				try {
					if (fs.existsSync(complexityReportPath)) {
						complexityReport = JSON.parse(
							fs.readFileSync(complexityReportPath, 'utf8')
						);
					}
				} catch (error) {
					// Ignore errors, use fallback display
				}

				complexTasks.forEach((task, index) => {
					console.log(
						chalk.gray(`   ${index + 1}. Task ${task.id}: ${task.title}`)
					);

					// Show complexity information if available
					if (complexityReport?.complexityAnalysis) {
						const analysis = complexityReport.complexityAnalysis.find(
							(a) => a.taskId === task.id
						);
						if (analysis) {
							console.log(
								chalk.gray(
									`      Complexity: ${analysis.complexityScore}/10, Recommended subtasks: ${analysis.recommendedSubtasks || 3}`
								)
							);
						}
					}
				});

				// Step 4: Auto-expand each complex task
				console.log(chalk.blue('⚡ Step 4: Auto-expanding complex tasks...'));
				const startTime = Date.now();
				let expandedCount = 0;

				for (let i = 0; i < complexTasks.length; i++) {
					const task = complexTasks[i];
					const taskStartTime = Date.now();

					try {
						// Show progress
						const progressBar =
							'█'.repeat(i) + '░'.repeat(complexTasks.length - i);
						console.log(
							chalk.blue(
								`   📊 Progress: [${progressBar}] ${i}/${complexTasks.length}`
							)
						);
						console.log(
							chalk.cyan(
								`   ${i + 1}/${complexTasks.length} Expanding task ${task.id}...`
							)
						);

						await executeCommand('expand', [`--id=${task.id}`], {
							projectRoot: sessionState.projectRoot
						});

						const taskDuration = Date.now() - taskStartTime;
						console.log(
							chalk.green(
								`   ✅ Successfully expanded task ${task.id} (${taskDuration}ms)`
							)
						);
						expandedCount++;
					} catch (error) {
						const taskDuration = Date.now() - taskStartTime;
						console.log(
							chalk.red(
								`   ❌ Failed to expand task ${task.id} after ${taskDuration}ms: ${error.message}`
							)
						);
					}
				}

				// Final progress
				const finalProgressBar = '█'.repeat(complexTasks.length);
				console.log(
					chalk.green(
						`   📊 Progress: [${finalProgressBar}] ${complexTasks.length}/${complexTasks.length} - Complete!`
					)
				);

				// Step 4: Display enhanced summary
				const totalDuration = Date.now() - startTime;
				const avgTimePerTask =
					expandedCount > 0 ? Math.round(totalDuration / expandedCount) : 0;

				console.log(
					chalk.green(
						`\n✅ Append + Auto-Expand completed in ${totalDuration}ms!`
					)
				);
				console.log(chalk.white(`📊 Detailed Summary:`));
				console.log(chalk.gray(`   • Tasks appended from PRD`));
				console.log(
					chalk.gray(
						`   • ${complexTasks.length} complex tasks identified using intelligent criteria`
					)
				);
				console.log(
					chalk.gray(`   • ${expandedCount} tasks successfully expanded`)
				);
				console.log(
					chalk.gray(`   • Total processing time: ${totalDuration}ms`)
				);

				if (expandedCount > 0) {
					console.log(
						chalk.gray(`   • Average time per expansion: ${avgTimePerTask}ms`)
					);
				}

				if (expandedCount < complexTasks.length) {
					console.log(
						chalk.yellow(
							`   ⚠️  ${complexTasks.length - expandedCount} tasks failed to expand`
						)
					);
				}

				// Performance insights
				if (totalDuration > 30000) {
					// > 30 seconds
					console.log(
						chalk.blue(
							`   💡 Performance note: Expansion took ${Math.round(totalDuration / 1000)}s. Consider using smaller batches for large PRDs.`
						)
					);
				}
			} else {
				console.log(
					chalk.green(
						'✅ PRD parsing completed. No complex tasks identified for auto-expansion.'
					)
				);
			}
		} else {
			console.log(chalk.red('❌ Could not find tasks file after PRD parsing.'));
		}
	} catch (error) {
		console.error(
			chalk.red('❌ Error in Append + Auto-Expand process:'),
			error.message
		);
		throw error;
	}
}

/**
 * Identify complex tasks that should be automatically expanded using intelligent criteria
 * This is a simplified version of the intelligent complexity analysis for the menu system
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Array of complex tasks suitable for expansion
 */
function identifyComplexTasks(tasks) {
	if (!Array.isArray(tasks)) return [];

	// Use a simplified version of the intelligent criteria for the menu
	const MENU_COMPLEXITY_THRESHOLD = 60;

	return tasks.filter((task) => {
		// Skip tasks that already have subtasks
		if (task.subtasks && task.subtasks.length > 0) return false;

		const description = task.description || '';
		const title = task.title || '';
		const details = task.details || '';
		const combinedText = `${title} ${description} ${details}`.toLowerCase();

		let score = 0;

		// Length scoring (simplified)
		if (combinedText.length > 500) score += 30;
		else if (combinedText.length > 250) score += 20;
		else if (combinedText.length > 100) score += 10;

		// High complexity keywords
		const highComplexityKeywords = [
			'architecture',
			'framework',
			'infrastructure',
			'microservice',
			'distributed',
			'scalable',
			'enterprise',
			'integration',
			'authentication',
			'authorization',
			'security',
			'encryption'
		];
		const highMatches = highComplexityKeywords.filter((k) =>
			combinedText.includes(k)
		);
		score += highMatches.length * 15;

		// Medium complexity keywords
		const mediumComplexityKeywords = [
			'implement',
			'develop',
			'design',
			'create',
			'build',
			'configure',
			'setup',
			'establish',
			'database',
			'api',
			'interface',
			'component',
			'module',
			'service',
			'system'
		];
		const mediumMatches = mediumComplexityKeywords.filter((k) =>
			combinedText.includes(k)
		);
		score += mediumMatches.length * 10;

		// Technical indicators
		const technicalIndicators = [
			'algorithm',
			'optimization',
			'performance',
			'caching',
			'queue',
			'async',
			'concurrent',
			'parallel',
			'real-time',
			'streaming'
		];
		const techMatches = technicalIndicators.filter((k) =>
			combinedText.includes(k)
		);
		score += techMatches.length * 12;

		// Multiple requirements
		const scopeIndicators = [
			' and ',
			' or ',
			'including',
			'such as',
			'multiple'
		];
		const scopeMatches = scopeIndicators.filter((k) =>
			combinedText.includes(k)
		);
		score += scopeMatches.length * 8;

		return score >= MENU_COMPLEXITY_THRESHOLD;
	});
}

async function handleListTasks(sessionState) {
	try {
		const { filterType } = await inquirer.prompt([
			{
				type: 'list',
				name: 'filterType',
				message: chalk.cyan('How would you like to filter the task list?'),
				choices: [
					{ name: chalk.blue('📋 Show All Tasks'), value: 'all' },
					{ name: chalk.yellow('🔍 Filter by Status'), value: 'status' },
					{ name: chalk.green('📄 Filter by PRD Source'), value: 'prd' },
					{ name: chalk.gray('✋ Manual Tasks Only'), value: 'manual' },
					{ name: chalk.magenta('🤖 PRD Tasks Only'), value: 'prd-only' },
					{ name: chalk.cyan('🔧 Advanced Filters'), value: 'advanced' }
				]
			}
		]);

		let args = [];

		switch (filterType) {
			case 'all':
				// No additional arguments needed
				break;

			case 'status':
				const { status } = await inquirer.prompt([
					{
						type: 'list',
						name: 'status',
						message: 'Select status to filter by:',
						choices: [
							{ name: chalk.yellow('Pending'), value: 'pending' },
							{ name: chalk.blue('In Progress'), value: 'in-progress' },
							{ name: chalk.green('Done'), value: 'done' },
							{ name: chalk.red('Blocked'), value: 'blocked' },
							{ name: chalk.gray('Deferred'), value: 'deferred' },
							{ name: chalk.gray('Cancelled'), value: 'cancelled' }
						]
					}
				]);
				args.push('--status', status);
				break;

			case 'prd':
				const { prdFile } = await inquirer.prompt([
					{
						type: 'input',
						name: 'prdFile',
						message: 'Enter PRD file name or path to filter by:',
						validate: (input) =>
							input.trim().length > 0 ? true : 'PRD file name cannot be empty'
					}
				]);
				args.push('--prd', prdFile);
				break;

			case 'manual':
				args.push('--manual-only');
				break;

			case 'prd-only':
				args.push('--prd-only');
				break;

			case 'advanced':
				const filters = await inquirer.prompt([
					{
						type: 'list',
						name: 'status',
						message: 'Filter by status (optional):',
						choices: [
							{ name: 'No status filter', value: null },
							{ name: chalk.yellow('Pending'), value: 'pending' },
							{ name: chalk.blue('In Progress'), value: 'in-progress' },
							{ name: chalk.green('Done'), value: 'done' },
							{ name: chalk.red('Blocked'), value: 'blocked' },
							{ name: chalk.gray('Deferred'), value: 'deferred' },
							{ name: chalk.gray('Cancelled'), value: 'cancelled' }
						]
					},
					{
						type: 'input',
						name: 'prd',
						message:
							'Filter by PRD file (optional, leave empty for no filter):',
						default: ''
					},
					{
						type: 'confirm',
						name: 'withSubtasks',
						message: 'Include subtasks in the listing?',
						default: false
					}
				]);

				if (filters.status) {
					args.push('--status', filters.status);
				}
				if (filters.prd && filters.prd.trim()) {
					args.push('--prd', filters.prd.trim());
				}
				if (filters.withSubtasks) {
					args.push('--with-subtasks');
				}
				break;
		}

		await executeCommand('list', args, {
			projectRoot: sessionState.projectRoot
		});
	} catch (error) {
		console.error(chalk.red('❌ Failed to list tasks:'), error.message);
		logError('List tasks failed', error);
	}
}

/**
 * Handle PRD Kanban board view
 */
async function handlePRDKanbanBoard(sessionState) {
	try {
		console.log(chalk.blue('Launching PRD Kanban board...'));
		console.log(
			chalk.gray(
				'Use arrow keys to navigate, 1-3 to move PRDs, V for details, Q to return to menu'
			)
		);

		// Give user a moment to read the instructions
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Import and create a PRD Kanban board instance using the NEW implementation
		const { PRDKanbanBoard } = await import(
			'../prd-kanban/prd-kanban-board.js'
		);
		const board = new PRDKanbanBoard();

		// Start the board and wait for it to finish
		await board.start();

		// Give a moment for cleanup to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Board has finished, show completion message
		console.log(chalk.green('\n✅ PRD Kanban board session completed'));
	} catch (error) {
		console.error(
			chalk.red('Error launching PRD Kanban board:'),
			error.message
		);
		logError('PRD Kanban board error', error, {
			sessionState: sessionState.menuPath
		});
	}
}

/**
 * Handle Kanban board view
 */
async function handleKanbanBoard(sessionState) {
	try {
		// First, ask user if they want to filter by PRD
		const { viewType } = await inquirer.prompt([
			{
				type: 'list',
				name: 'viewType',
				message: chalk.cyan('How would you like to view the Kanban board?'),
				choices: [
					{ name: chalk.green('📋 View All Tasks'), value: 'all' },
					{ name: chalk.blue('📄 View Tasks by PRD'), value: 'prd' },
					new inquirer.Separator(),
					{ name: chalk.gray('← Back to Task Operations'), value: 'back' }
				]
			}
		]);

		if (viewType === 'back') {
			return;
		}

		let prdFilter = null;

		if (viewType === 'prd') {
			// Import the function to get unique PRD references and the path utility
			const { getUniquePRDReferences } = await import(
				'../kanban/kanban-board.js'
			);
			const projectRoot = sessionState.projectRoot;

			// Use the same path resolution logic as the Kanban board
			const newPath = path.join(
				projectRoot,
				'.taskmaster',
				'tasks',
				'tasks.json'
			);
			const tasksPath = fs.existsSync(newPath)
				? newPath
				: path.join(projectRoot, 'tasks', 'tasks.json');

			const prdReferences = getUniquePRDReferences(tasksPath);

			if (prdReferences.length === 0) {
				console.log(
					chalk.yellow(
						'⚠️ No PRD references found in tasks. Showing all tasks instead.'
					)
				);
				await inquirer.prompt([
					{
						type: 'input',
						name: 'continue',
						message: chalk.dim('Press Enter to continue...')
					}
				]);
			} else {
				const { selectedPRD } = await inquirer.prompt([
					{
						type: 'list',
						name: 'selectedPRD',
						message: chalk.cyan('Select a PRD to filter by:'),
						choices: [
							...prdReferences.map((prd) => ({
								name: chalk.white(prd),
								value: prd
							})),
							new inquirer.Separator(),
							{ name: chalk.gray('← Back to view options'), value: 'back' }
						]
					}
				]);

				if (selectedPRD === 'back') {
					return handleKanbanBoard(sessionState); // Recursive call to show view options again
				}

				prdFilter = selectedPRD;
			}
		}

		console.log(chalk.blue('Launching Kanban board...'));
		console.log(
			chalk.gray(
				'Use arrow keys to navigate, 1-3 to move tasks, Q to return to menu'
			)
		);

		// Give user a moment to read the instructions
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Import and create a Kanban board instance with optional PRD filter
		const { KanbanBoard } = await import('../kanban/kanban-board.js');
		const board = new KanbanBoard(prdFilter);

		// Start the board and wait for it to finish
		await board.start();

		// Give a moment for cleanup to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Board has finished, show completion message
		console.log(chalk.green('\n✅ Kanban board session completed'));
	} catch (error) {
		console.error(
			chalk.red('❌ Failed to launch Kanban board:'),
			error.message
		);
		logError('Kanban board launch failed', error);

		await inquirer.prompt([
			{
				type: 'input',
				name: 'continue',
				message: chalk.dim('Press Enter to continue...')
			}
		]);
	}
}

/**
 * Help functions
 */
async function showCommandReference() {
	console.log(chalk.blue('\n📖 Command Reference'));
	console.log(chalk.white('═'.repeat(100)));

	// Enhanced command list with more commands
	const allCommands = [
		// Essential Commands
		{ cmd: 'task-hero init', desc: 'Initialize a new project' },
		{ cmd: 'task-hero menu', desc: 'Launch interactive menu' },
		{ cmd: 'task-hero list', desc: 'List all tasks' },
		{ cmd: 'task-hero next', desc: 'Show next task to work on' },
		{ cmd: 'task-hero show <id>', desc: 'Show task details' },
		{
			cmd: 'task-hero set-status --id=<id> --status=<status>',
			desc: 'Update task status'
		},
		{ cmd: 'task-hero add-task --prompt="<text>"', desc: 'Add a new task' },
		{
			cmd: 'task-hero parse-prd --input=<file>',
			desc: 'Generate tasks from PRD'
		},
		{ cmd: 'task-hero models --setup', desc: 'Configure AI models' },
		{ cmd: 'task-hero expand --id=<id>', desc: 'Break task into subtasks' },

		// Task Management
		{
			cmd: 'task-hero update-task --id=<id> --prompt="<context>"',
			desc: 'Update specific task'
		},
		{ cmd: 'task-hero remove-task --id=<id>', desc: 'Delete task' },
		{
			cmd: 'task-hero move-task --id=<id> --after=<target-id>',
			desc: 'Reorder tasks'
		},
		{
			cmd: 'task-hero add-dependency --id=<id> --depends-on=<id>',
			desc: 'Add dependencies'
		},
		{
			cmd: 'task-hero validate-dependencies',
			desc: 'Check dependency integrity'
		},
		{ cmd: 'task-hero fix-dependencies', desc: 'Fix broken dependencies' },

		// PRD Management
		{ cmd: 'task-hero prd', desc: 'List PRDs with filtering' },
		{
			cmd: 'task-hero prd-show <prd-id>',
			desc: 'Show detailed PRD information'
		},
		{
			cmd: 'task-hero prd-status <prd-id> <status>',
			desc: 'Update PRD status'
		},
		{ cmd: 'task-hero prd-sync', desc: 'Synchronize PRD statuses' },
		{ cmd: 'task-hero list-prds', desc: 'List all PRD files' },
		{
			cmd: 'task-hero tasks-from-prd --prd=<file>',
			desc: 'Show tasks from specific PRD'
		},

		// Advanced Features
		{ cmd: 'task-hero analyze-complexity', desc: 'Analyze task complexity' },
		{ cmd: 'task-hero generate', desc: 'Generate task files from tasks.json' },
		{ cmd: 'task-hero check-prd-changes', desc: 'Check for PRD file changes' },
		{ cmd: 'task-hero prd-integrity', desc: 'Check and fix PRD file integrity' }
	];

	// Split commands into two columns
	const midPoint = Math.ceil(allCommands.length / 2);
	const leftColumn = allCommands.slice(0, midPoint);
	const rightColumn = allCommands.slice(midPoint);

	// Display in two columns
	const maxRows = Math.max(leftColumn.length, rightColumn.length);

	for (let i = 0; i < maxRows; i++) {
		let line = '';

		// Left column
		if (i < leftColumn.length) {
			const { cmd, desc } = leftColumn[i];
			const leftContent = `${chalk.cyan(cmd)}\n    ${chalk.gray(desc)}`;
			line += leftContent.padEnd(60); // Adjust padding as needed
		} else {
			line += ' '.repeat(60);
		}

		// Right column
		if (i < rightColumn.length) {
			const { cmd, desc } = rightColumn[i];
			const rightContent = `${chalk.cyan(cmd)}\n    ${chalk.gray(desc)}`;
			line += rightContent;
		}

		console.log(line);
		if (i < maxRows - 1) console.log(); // Add spacing between rows
	}
}

async function showQuickStartGuide() {
	console.log(chalk.green('\n🚀 Quick Start Guide'));
	console.log(chalk.white('═'.repeat(70)));

	console.log(
		chalk.cyan('\n📋 TaskHero + AI Coding Agent Integration Workflow')
	);
	console.log(chalk.gray('─'.repeat(70)));

	const phases = [
		{
			title: '🏗️ Phase 1: Project Setup',
			steps: [
				'1. Initialize project: task-hero init',
				'2. Configure AI models: task-hero models --setup',
				'3. Launch interactive menu: task-hero menu'
			]
		},
		{
			title: '📄 Phase 2: PRD Analysis & Task Generation',
			steps: [
				'4. Provide PRD to AI Coding Agent for analysis',
				'5. AI Agent: Parse PRD: task-hero parse-prd --input=<file>',
				'6. AI Agent: Analyze complexity: task-hero analyze-complexity',
				'7. AI Agent: Expand tasks: task-hero expand --id=<id>'
			]
		},
		{
			title: '⚡ Phase 3: Task Execution',
			steps: [
				'8. AI Agent: Find next task: task-hero next',
				'9. AI Agent: Set status: task-hero set-status --id=<id> --status=in-progress',
				'10. AI Agent: Implement changes and test',
				'11. AI Agent: Mark complete: task-hero set-status --id=<id> --status=done'
			]
		},
		{
			title: '📊 Phase 4: Progress Monitoring',
			steps: [
				'12. Monitor progress: task-hero list',
				'13. Check PRD status: task-hero prd-show <prd-id>',
				'14. Sync completion: task-hero prd-sync'
			]
		}
	];

	phases.forEach(({ title, steps }) => {
		console.log(chalk.yellow(`\n${title}`));
		steps.forEach((step) => {
			console.log(chalk.white(`  ${step}`));
		});
	});

	console.log(chalk.cyan('\n🤖 AI Integration Notes:'));
	console.log(
		chalk.gray('  • AI Coding Agent performs analysis and heavy lifting')
	);
	console.log(
		chalk.gray('  • TaskHero focuses on task/PRD tracking and management')
	);
	console.log(
		chalk.gray('  • Works even without API keys configured (pure tracking)')
	);
	console.log(
		chalk.gray(
			'  • Use interactive menu (task-hero menu) for easier navigation'
		)
	);

	console.log(chalk.green('\n✨ Pro Tips:'));
	console.log(
		chalk.white(
			'  • Start with PRD analysis rather than project initialization'
		)
	);
	console.log(
		chalk.white('  • Let AI Agent handle complexity analysis autonomously')
	);
	console.log(
		chalk.white('  • Use dependency validation for proper task execution order')
	);
	console.log(
		chalk.white('  • Monitor PRD completion percentage for project progress')
	);
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
	console.log(
		chalk.cyan('  .taskmaster/config.json') +
			chalk.gray(' - AI model configuration')
	);
	console.log(
		chalk.cyan('  .env') + chalk.gray(' - API keys (ANTHROPIC_API_KEY, etc.)')
	);
	console.log(
		chalk.cyan('  .taskmaster/tasks/tasks.json') + chalk.gray(' - Task data')
	);

	console.log(chalk.white('\nPRD Management Files:'));
	console.log(
		chalk.cyan('  .taskmaster/prd/prds.json') +
			chalk.gray(' - PRD metadata and tracking')
	);
	console.log(
		chalk.cyan('  .taskmaster/prd/pending/') +
			chalk.gray(' - New or not-yet-started PRDs')
	);
	console.log(
		chalk.cyan('  .taskmaster/prd/in-progress/') +
			chalk.gray(' - PRDs with active tasks')
	);
	console.log(
		chalk.cyan('  .taskmaster/prd/done/') +
			chalk.gray(' - Completed PRDs (ready for archive)')
	);
	console.log(
		chalk.cyan('  .taskmaster/prd/archived/') +
			chalk.gray(' - Archived PRDs and task bundles')
	);
	console.log(
		chalk.cyan('  .taskmaster/templates/') +
			chalk.gray(' - PRD templates for consistent creation')
	);

	console.log(chalk.white('\nAI Integration Files:'));
	console.log(
		chalk.cyan('  .cursor/rules/') + chalk.gray(' - Cursor AI workspace rules')
	);
	console.log(
		chalk.cyan('  .augment-guidelines') +
			chalk.gray(' - Augment AI workspace guidelines')
	);
	console.log(
		chalk.cyan('  .windsurfrules') + chalk.gray(' - Windsurf AI rules')
	);
	console.log(
		chalk.cyan('  .roo/') + chalk.gray(' - Roo Code integration rules')
	);

	console.log(chalk.white('\nRequired Setup:'));
	console.log(chalk.yellow('  1. Set API keys in .env file'));
	console.log(chalk.yellow('  2. Run: task-hero models --setup'));
	console.log(chalk.yellow('  3. Initialize project: task-hero init'));

	console.log(chalk.white('\nAI Editor Integration:'));
	console.log(chalk.gray('  • Cursor: Uses .cursor/rules/ for context'));
	console.log(
		chalk.gray('  • Augment: Uses .augment-guidelines for workspace context')
	);
	console.log(
		chalk.gray('  • Windsurf: Uses .windsurfrules for AI assistance')
	);
	console.log(
		chalk.gray('  • Roo Code: Uses .roo/ directory for mode-specific rules')
	);

	console.log(chalk.white('\nRepository & Updates:'));
	console.log(
		chalk.cyan('  Repository: ') +
			chalk.gray('https://github.com/Interstellar-code/taskmaster-ai')
	);
	console.log(chalk.cyan('  NPM Package: ') + chalk.gray('task-hero-ai'));
	console.log(
		chalk.cyan('  Update: ') + chalk.gray('npm update -g task-hero-ai')
	);
	console.log(
		chalk.cyan('  Issues: ') +
			chalk.gray('https://github.com/Interstellar-code/taskmaster-ai/issues')
	);
}

/**
 * Handle PRD Management menu
 */
async function handlePrdManagement(sessionState) {
	sessionState.menuPath.push('PRD Management');

	try {
		while (true) {
			renderMenuHeader(sessionState);

			const { action } = await inquirer.prompt([
				{
					type: 'list',
					name: 'action',
					message: chalk.cyan('Select a PRD management action:'),
					choices: [
						{ name: chalk.green('📋 List PRDs'), value: 'list' },
						{ name: chalk.blue('👁️ Show PRD Details'), value: 'show' },
						{ name: chalk.yellow('🔄 Update PRD Status'), value: 'status' },
						{ name: chalk.magenta('🔗 Sync with Tasks'), value: 'sync' },
						{ name: chalk.cyan('📁 Organize Files'), value: 'organize' },
						{ name: chalk.red('🔍 Check Integrity'), value: 'check' },
						{ name: chalk.gray('📦 Archive PRD'), value: 'archive' },
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
					await handleListPrds(sessionState);
					break;
				case 'show':
					await handlePrdShow(sessionState);
					break;
				case 'status':
					await handlePrdStatus(sessionState);
					break;
				case 'sync':
					await handlePrdSync(sessionState);
					break;
				case 'organize':
					await executeCommand('prd-organize', [], {
						projectRoot: sessionState.projectRoot
					});
					break;
				case 'check':
					await handlePrdIntegrityCheck(sessionState);
					break;
				case 'archive':
					await handlePrdArchive(sessionState);
					break;
			}

			await inquirer.prompt([
				{
					type: 'input',
					name: 'continue',
					message: chalk.dim('Press Enter to continue...')
				}
			]);
		}
	} finally {
		sessionState.menuPath.pop();
	}
}

/**
 * Handle PRD Show Details
 */
async function handlePrdShow(sessionState) {
	try {
		const { prdId } = await inquirer.prompt([
			{
				type: 'input',
				name: 'prdId',
				message: 'Enter PRD ID (e.g., prd_001, prd_002):',
				validate: (input) =>
					input.trim().length > 0 ? true : 'PRD ID cannot be empty'
			}
		]);

		// Execute the command with the PRD ID as a positional argument
		await executeCommand('prd-show', [prdId], {
			projectRoot: sessionState.projectRoot
		});
	} catch (error) {
		console.error(chalk.red('Error showing PRD details:'), error.message);
		logError('PRD show error', error, { sessionState: sessionState.menuPath });
	}
}

/**
 * Handle PRD Status Update
 */
async function handlePrdStatus(sessionState) {
	try {
		const { prdId, status } = await inquirer.prompt([
			{
				type: 'input',
				name: 'prdId',
				message: 'Enter PRD ID (e.g., prd_001, prd_002):',
				validate: (input) =>
					input.trim().length > 0 ? true : 'PRD ID cannot be empty'
			},
			{
				type: 'list',
				name: 'status',
				message: 'Select new status:',
				choices: [
					{ name: 'Pending', value: 'pending' },
					{ name: 'In Progress', value: 'in-progress' },
					{ name: 'Done', value: 'done' },
					{ name: 'Archived', value: 'archived' }
				]
			}
		]);

		// Execute the command with both PRD ID and status as positional arguments
		await executeCommand('prd-status', [prdId, status], {
			projectRoot: sessionState.projectRoot
		});
	} catch (error) {
		console.error(chalk.red('Error updating PRD status:'), error.message);
		logError('PRD status error', error, {
			sessionState: sessionState.menuPath
		});
	}
}

/**
 * Handle List PRDs with filtering options
 */
async function handleListPrds(sessionState) {
	const { filters } = await inquirer.prompt([
		{
			type: 'checkbox',
			name: 'filters',
			message: 'Select filters (optional):',
			choices: [
				{ name: 'Filter by Status', value: 'status' },
				{ name: 'Filter by Priority', value: 'priority' },
				{ name: 'Filter by Complexity', value: 'complexity' },
				{ name: 'Include Task Details', value: 'include-tasks' }
			]
		}
	]);

	const params = [];

	if (filters.includes('status')) {
		params.push({
			name: 'status',
			type: 'list',
			message: 'Select status filter:',
			choices: [
				{ name: 'Pending', value: 'pending' },
				{ name: 'In Progress', value: 'in-progress' },
				{ name: 'Done', value: 'done' },
				{ name: 'Archived', value: 'archived' }
			]
		});
	}

	if (filters.includes('priority')) {
		params.push({
			name: 'priority',
			type: 'list',
			message: 'Select priority filter:',
			choices: [
				{ name: 'Low', value: 'low' },
				{ name: 'Medium', value: 'medium' },
				{ name: 'High', value: 'high' }
			]
		});
	}

	if (filters.includes('complexity')) {
		params.push({
			name: 'complexity',
			type: 'list',
			message: 'Select complexity filter:',
			choices: [
				{ name: 'Low', value: 'low' },
				{ name: 'Medium', value: 'medium' },
				{ name: 'High', value: 'high' }
			]
		});
	}

	await executeCommandWithParams('prd', params, {
		projectRoot: sessionState.projectRoot,
		additionalFlags: filters.includes('include-tasks')
			? ['--include-tasks']
			: []
	});
}

/**
 * Handle PRD Sync with options
 */
async function handlePrdSync(sessionState) {
	const { syncType } = await inquirer.prompt([
		{
			type: 'list',
			name: 'syncType',
			message: 'Select sync type:',
			choices: [
				{ name: 'Sync All PRDs', value: 'all' },
				{ name: 'Sync Specific PRD', value: 'specific' },
				{ name: 'Dry Run (Preview Changes)', value: 'dry-run' }
			]
		}
	]);

	const params = [];
	const flags = [];

	if (syncType === 'specific') {
		params.push({
			name: 'prdId',
			type: 'input',
			message: 'Enter PRD ID (e.g., prd_001, prd_002):',
			validate: (input) =>
				input.trim().length > 0 ? true : 'PRD ID cannot be empty'
		});
	}

	if (syncType === 'dry-run') {
		flags.push('--dry-run');
	}

	await executeCommandWithParams('prd-sync', params, {
		projectRoot: sessionState.projectRoot,
		additionalFlags: flags
	});
}

/**
 * Handle PRD Integrity Check with auto-fix option
 */
async function handlePrdIntegrityCheck(sessionState) {
	try {
		const { autoFix } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'autoFix',
				message: 'Automatically fix missing task links?',
				default: false
			}
		]);

		const args = autoFix ? ['--auto-fix'] : [];
		await executeCommand('prd-check', args, {
			projectRoot: sessionState.projectRoot
		});
	} catch (error) {
		console.error(chalk.red('Error checking PRD integrity:'), error.message);
		logError('PRD integrity check error', error, {
			sessionState: sessionState.menuPath
		});
	}
}

/**
 * Handle PRD Archive with selection and confirmation
 */
async function handlePrdArchive(sessionState) {
	try {
		// Import the interactive archive function and path utilities
		const { interactivePrdArchive } = await import(
			'../../scripts/modules/prd-manager/prd-archiving.js'
		);
		const { getPRDsJsonPath, getTasksJsonPath, getPRDStatusDirectory } =
			await import('../../scripts/modules/prd-manager/prd-utils.js');

		// Run the interactive archive process with proper path resolution
		const result = await interactivePrdArchive({
			prdsPath: getPRDsJsonPath(),
			tasksPath: getTasksJsonPath(),
			archiveDir: getPRDStatusDirectory('archived') // Now returns prd/archive
		});

		if (result.cancelled) {
			console.log(chalk.yellow('\n📦 Archive operation cancelled.'));
		} else if (!result.success && !result.cancelled) {
			console.error(chalk.red(`\n❌ Archive failed: ${result.error}`));
		}
	} catch (error) {
		console.error(
			chalk.red('\n❌ Error during archive operation:'),
			error.message
		);
	}
}
