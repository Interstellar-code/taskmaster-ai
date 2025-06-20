﻿/**
 * Task Master
 * Copyright (c) 2025 Eyal Toledano, Ralph Khreish
 *
 * This software is licensed under the MIT License with Commons Clause.
 * You may use this software for any purpose, including commercial applications,
 * and modify and redistribute it freely, subject to the following restrictions:
 *
 * 1. You may not sell this software or offer it as a service.
 * 2. The origin of this software must not be misrepresented.
 * 3. Altered source versions must be plainly marked as such.
 *
 * For the full license text, see the LICENSE file in the root directory.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import { isSilentMode } from './modules/utils.js';
import { convertAllCursorRulesToRooRules } from './modules/rule-transformer.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to prompt user for AI editor selection
async function selectAIEditors() {
	if (isSilentMode()) {
		// In silent mode (MCP), default to cursor for compatibility
		return ['cursor'];
	}

	console.log(chalk.cyan('\n🤖 AI Editor Integration Setup'));
	console.log(
		chalk.gray(
			'TaskHero can integrate with multiple AI-powered code editors.\n'
		)
	);

	const answers = await inquirer.prompt([
		{
			type: 'checkbox',
			name: 'editors',
			message: 'Which AI editor(s) are you using? (Select all that apply)',
			choices: [
				{
					name: 'Cursor (also works with Cline)',
					value: 'cursor',
					checked: true // Default to Cursor as it's most common
				},
				{
					name: 'Augment AI',
					value: 'augment',
					checked: false
				},
				{
					name: 'Roo Code',
					value: 'roo',
					checked: false
				},
				{
					name: 'Windsurf',
					value: 'windsurf',
					checked: false
				},
				{
					name: 'None (TaskHero only, no AI editor integration)',
					value: 'none',
					checked: false
				}
			],
			validate: function (answer) {
				if (answer.length < 1) {
					return 'You must choose at least one option.';
				}
				// If "none" is selected with other options, show error
				if (answer.includes('none') && answer.length > 1) {
					return 'Cannot select "None" with other AI editors. Please choose either AI editors OR "None".';
				}
				return true;
			}
		}
	]);

	if (answers.editors.length > 0) {
		const selectedNames = answers.editors.map((e) =>
			e === 'cursor'
				? 'Cursor/Cline'
				: e === 'augment'
					? 'Augment AI'
					: e === 'roo'
						? 'Roo Code'
						: e === 'windsurf'
							? 'Windsurf'
							: e === 'none'
								? 'None (TaskHero only)'
								: e
		);
		console.log(chalk.green(`\n✅ Selected: ${selectedNames.join(', ')}\n`));
	}

	return answers.editors;
}

// Function to detect existing TaskHero project
function detectExistingProject(targetDir) {
	const taskmasterDir = path.join(targetDir, '.taskmaster');
	const tasksJsonPath = path.join(taskmasterDir, 'tasks', 'tasks.json');
	const configPath = path.join(targetDir, '.taskmasterconfig');

	// Check for project indicators
	const hasTaskmasterDir = fs.existsSync(taskmasterDir);
	const hasTasksJson = fs.existsSync(tasksJsonPath);
	const hasConfig = fs.existsSync(configPath);

	if (hasTaskmasterDir || hasTasksJson || hasConfig) {
		// Try to get project name from config
		let projectName = 'TaskHero Project';

		if (hasConfig) {
			try {
				const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
				if (config.projectName) {
					projectName = config.projectName;
				}
			} catch (error) {
				// Ignore config parsing errors
			}
		}

		// Count existing tasks if tasks.json exists
		let taskCount = 0;
		if (hasTasksJson) {
			try {
				const tasksData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8'));
				if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
					taskCount = tasksData.tasks.length;
				}
			} catch (error) {
				// Ignore tasks.json parsing errors
			}
		}

		return {
			exists: true,
			projectName,
			taskCount,
			hasTaskmasterDir,
			hasTasksJson,
			hasConfig
		};
	}

	return { exists: false };
}

// Define log levels
const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	success: 4
};

// Determine log level from environment variable or default to 'info'
const LOG_LEVEL = process.env.TASKMASTER_LOG_LEVEL
	? LOG_LEVELS[process.env.TASKMASTER_LOG_LEVEL.toLowerCase()]
	: LOG_LEVELS.info; // Default to info

// Create a color gradient for the banner
const coolGradient = gradient(['#00b4d8', '#0077b6', '#03045e']);
const warmGradient = gradient(['#fb8b24', '#e36414', '#9a031e']);

// Display a fancy banner
function displayBanner() {
	if (isSilentMode()) return;

	console.clear();
	const bannerText = figlet.textSync('TaskHero AI', {
		font: 'Standard',
		horizontalLayout: 'default',
		verticalLayout: 'default'
	});

	console.log(coolGradient(bannerText));

	// Add creator credit line below the banner
	console.log(chalk.dim('by ') + chalk.cyan('interstellar-code'));

	console.log(
		boxen(chalk.white(`${chalk.bold('Initializing')} your new project`), {
			padding: 1,
			margin: { top: 0, bottom: 1 },
			borderStyle: 'round',
			borderColor: 'cyan'
		})
	);
}

// Logging function with icons and colors
function log(level, ...args) {
	const icons = {
		debug: chalk.gray('ðŸ”'),
		info: chalk.blue('â„¹ï¸'),
		warn: chalk.yellow('âš ï¸'),
		error: chalk.red('âŒ'),
		success: chalk.green('âœ…')
	};

	if (LOG_LEVELS[level] >= LOG_LEVEL) {
		const icon = icons[level] || '';

		// Only output to console if not in silent mode
		if (!isSilentMode()) {
			if (level === 'error') {
				console.error(icon, chalk.red(...args));
			} else if (level === 'warn') {
				console.warn(icon, chalk.yellow(...args));
			} else if (level === 'success') {
				console.log(icon, chalk.green(...args));
			} else if (level === 'info') {
				console.log(icon, chalk.blue(...args));
			} else {
				console.log(icon, ...args);
			}
		}
	}

	// Write to debug log if DEBUG=true
	if (process.env.DEBUG === 'true') {
		const logMessage = `[${level.toUpperCase()}] ${args.join(' ')}\n`;
		fs.appendFileSync('init-debug.log', logMessage);
	}
}

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		log('info', `Created directory: ${dirPath}`);
	}
}

// Function to add shell aliases to the user's shell configuration
function addShellAliases() {
	const homeDir = process.env.HOME || process.env.USERPROFILE;
	let shellConfigFile;

	// Determine which shell config file to use
	if (process.env.SHELL?.includes('zsh')) {
		shellConfigFile = path.join(homeDir, '.zshrc');
	} else if (process.env.SHELL?.includes('bash')) {
		shellConfigFile = path.join(homeDir, '.bashrc');
	} else {
		log('warn', 'Could not determine shell type. Aliases not added.');
		return false;
	}

	try {
		// Check if file exists
		if (!fs.existsSync(shellConfigFile)) {
			log(
				'warn',
				`Shell config file ${shellConfigFile} not found. Aliases not added.`
			);
			return false;
		}

		// Check if aliases already exist
		const configContent = fs.readFileSync(shellConfigFile, 'utf8');
		if (configContent.includes("alias th='task-hero'")) {
			log('info', 'TaskHero aliases already exist in shell config.');
			return true;
		}

		// Add aliases to the shell config file
		const aliasBlock = `
# TaskHero aliases added on ${new Date().toLocaleDateString()}
alias th='task-hero'
alias taskhero='task-hero'
`;

		fs.appendFileSync(shellConfigFile, aliasBlock);
		log('success', `Added TaskHero aliases to ${shellConfigFile}`);
		log(
			'info',
			'To use the aliases in your current terminal, run: source ' +
				shellConfigFile
		);

		return true;
	} catch (error) {
		log('error', `Failed to add aliases: ${error.message}`);
		return false;
	}
}

// Function to clear project data for fresh start
function clearProjectData(targetDir, dryRun = false) {
	const action = dryRun ? 'Would clear' : 'Clearing';
	log('info', `${action} project data for fresh start...`);

	const pathsToClear = [
		// TaskMaster directory structure
		{ path: path.join(targetDir, '.taskmaster', 'tasks'), type: 'directory' },
		{ path: path.join(targetDir, '.taskmaster', 'reports'), type: 'directory' },

		// PRD status subdirectories (clear contents but keep structure)
		{
			path: path.join(targetDir, '.taskmaster', 'prd', 'pending'),
			type: 'directory'
		},
		{
			path: path.join(targetDir, '.taskmaster', 'prd', 'in-progress'),
			type: 'directory'
		},
		{
			path: path.join(targetDir, '.taskmaster', 'prd', 'done'),
			type: 'directory'
		},
		{
			path: path.join(targetDir, '.taskmaster', 'prd', 'archived'),
			type: 'directory'
		},

		// Legacy directory structure
		{ path: path.join(targetDir, 'tasks'), type: 'directory' },

		// Legacy PRD status subdirectories (clear contents but keep structure)
		{ path: path.join(targetDir, 'prd', 'pending'), type: 'directory' },
		{ path: path.join(targetDir, 'prd', 'in-progress'), type: 'directory' },
		{ path: path.join(targetDir, 'prd', 'done'), type: 'directory' },
		{ path: path.join(targetDir, 'prd', 'archived'), type: 'directory' },

		// Test files
		{ path: path.join(targetDir, 'tests', 'unit'), type: 'directory' },
		{ path: path.join(targetDir, 'tests', 'integration'), type: 'directory' },
		{ path: path.join(targetDir, 'tests', 'e2e'), type: 'directory' }
	];

	let clearedCount = 0;
	let errorCount = 0;

	for (const item of pathsToClear) {
		try {
			if (fs.existsSync(item.path)) {
				if (dryRun) {
					log('info', `  Would clear: ${item.path}`);
					clearedCount++;
				} else {
					if (item.type === 'directory') {
						// Clear directory contents but keep the directory structure
						const files = fs.readdirSync(item.path);
						for (const file of files) {
							const filePath = path.join(item.path, file);
							const stat = fs.statSync(filePath);
							if (stat.isDirectory()) {
								fs.rmSync(filePath, { recursive: true, force: true });
							} else {
								fs.unlinkSync(filePath);
							}
						}
						log('info', `  Cleared directory: ${item.path}`);
					} else {
						fs.unlinkSync(item.path);
						log('info', `  Removed file: ${item.path}`);
					}
					clearedCount++;
				}
			}
		} catch (error) {
			log('error', `Failed to clear ${item.path}: ${error.message}`);
			errorCount++;
		}
	}

	// Recreate essential files
	if (!dryRun) {
		try {
			// Recreate tasks.json files
			const tasksJsonContent = {
				tasks: [],
				metadata: {
					version: '1.0.0',
					lastUpdated: new Date().toISOString(),
					totalTasks: 0
				}
			};

			const tasksJsonPaths = [
				path.join(targetDir, '.taskmaster', 'tasks', 'tasks.json'),
				path.join(targetDir, 'tasks', 'tasks.json')
			];

			for (const tasksJsonPath of tasksJsonPaths) {
				if (fs.existsSync(path.dirname(tasksJsonPath))) {
					fs.writeFileSync(
						tasksJsonPath,
						JSON.stringify(tasksJsonContent, null, 2)
					);
					log('info', `  Recreated: ${tasksJsonPath}`);
				}
			}

			// Recreate prds.json files
			const prdsJsonContent = {
				prds: [],
				metadata: {
					version: '1.0.0',
					lastUpdated: new Date().toISOString(),
					totalPrds: 0,
					schema: {
						version: '1.0.0',
						description: 'TaskMaster AI PRD Lifecycle Tracking Schema'
					}
				}
			};

			const prdsJsonPaths = [
				path.join(targetDir, '.taskmaster', 'prd', 'prds.json'),
				path.join(targetDir, 'prd', 'prds.json')
			];

			for (const prdsJsonPath of prdsJsonPaths) {
				if (fs.existsSync(path.dirname(prdsJsonPath))) {
					fs.writeFileSync(
						prdsJsonPath,
						JSON.stringify(prdsJsonContent, null, 2)
					);
					log('info', `  Recreated: ${prdsJsonPath}`);
				}
			}
		} catch (error) {
			log('error', `Failed to recreate essential files: ${error.message}`);
			errorCount++;
		}
	}

	const summary = dryRun
		? `Would clear ${clearedCount} items with ${errorCount} potential errors`
		: `Cleared ${clearedCount} items with ${errorCount} errors`;

	log(errorCount > 0 ? 'warn' : 'success', summary);

	return { cleared: clearedCount, errors: errorCount };
}

// Function to copy a file from the package to the target directory
function copyTemplateFile(templateName, targetPath, replacements = {}) {
	// Get the file content from the appropriate source directory
	let sourcePath;

	// Map template names to their actual source paths
	switch (templateName) {
		// case 'scripts_README.md':
		// 	sourcePath = path.join(__dirname, '..', 'assets', 'scripts_README.md');
		// 	break;
		case 'dev_workflow.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'assets',
				'cursor-rules',
				'dev_workflow.mdc'
			);
			break;
		case 'taskmaster.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'assets',
				'cursor-rules',
				'taskmaster.mdc'
			);
			break;
		case 'cursor_rules.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'assets',
				'cursor-rules',
				'cursor_rules.mdc'
			);
			break;
		case 'self_improve.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'assets',
				'cursor-rules',
				'self_improve.mdc'
			);
			break;
			// case 'README-task-master.md':
			// 	sourcePath = path.join(__dirname, '..', 'README-task-master.md');
			break;
		case 'windsurfrules':
			sourcePath = path.join(__dirname, '..', 'assets', '.windsurfrules');
			break;
		case '.roomodes':
			sourcePath = path.join(__dirname, '..', 'assets', 'roocode', '.roomodes');
			break;
		case 'augment-guidelines':
			sourcePath = path.join(__dirname, '..', 'assets', 'augment-guidelines');
			break;
		case 'architect-rules':
		case 'ask-rules':
		case 'boomerang-rules':
		case 'code-rules':
		case 'debug-rules':
		case 'test-rules':
			// Extract the mode name from the template name (e.g., 'architect' from 'architect-rules')
			const mode = templateName.split('-')[0];
			sourcePath = path.join(
				__dirname,
				'..',
				'assets',
				'roocode',
				'.roo',
				`rules-${mode}`,
				templateName
			);
			break;
		default:
			// For other files like env.example, gitignore, etc. that don't have direct equivalents
			sourcePath = path.join(__dirname, '..', 'assets', templateName);
	}

	// Check if the source file exists
	if (!fs.existsSync(sourcePath)) {
		// Fall back to templates directory for files that might not have been moved yet
		sourcePath = path.join(__dirname, '..', 'assets', templateName);
		if (!fs.existsSync(sourcePath)) {
			log('error', `Source file not found: ${sourcePath}`);
			return;
		}
	}

	let content = fs.readFileSync(sourcePath, 'utf8');

	// Replace placeholders with actual values
	Object.entries(replacements).forEach(([key, value]) => {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		content = content.replace(regex, value);
	});

	// Handle special files that should be merged instead of overwritten
	if (fs.existsSync(targetPath)) {
		const filename = path.basename(targetPath);

		// Handle .gitignore - append lines that don't exist
		if (filename === '.gitignore') {
			log('info', `${targetPath} already exists, merging content...`);
			const existingContent = fs.readFileSync(targetPath, 'utf8');
			const existingLines = new Set(
				existingContent.split('\n').map((line) => line.trim())
			);
			const newLines = content
				.split('\n')
				.filter((line) => !existingLines.has(line.trim()));

			if (newLines.length > 0) {
				// Add a comment to separate the original content from our additions
				const updatedContent =
					existingContent.trim() +
					'\n\n# Added by Claude Task Master\n' +
					newLines.join('\n');
				fs.writeFileSync(targetPath, updatedContent);
				log('success', `Updated ${targetPath} with additional entries`);
			} else {
				log('info', `No new content to add to ${targetPath}`);
			}
			return;
		}

		// Handle .windsurfrules - append the entire content
		if (filename === '.windsurfrules') {
			log(
				'info',
				`${targetPath} already exists, appending content instead of overwriting...`
			);
			const existingContent = fs.readFileSync(targetPath, 'utf8');

			// Add a separator comment before appending our content
			const updatedContent =
				existingContent.trim() +
				'\n\n# Added by Task Master - Development Workflow Rules\n\n' +
				content;
			fs.writeFileSync(targetPath, updatedContent);
			log('success', `Updated ${targetPath} with additional rules`);
			return;
		}

		// Handle README.md - offer to preserve or create a different file
		if (filename === 'README-task-master.md') {
			log('info', `${targetPath} already exists`);
			// Create a separate README file specifically for this project
			const taskMasterReadmePath = path.join(
				path.dirname(targetPath),
				'README-task-master.md'
			);
			fs.writeFileSync(taskMasterReadmePath, content);
			log(
				'success',
				`Created ${taskMasterReadmePath} (preserved original README-task-master.md)`
			);
			return;
		}

		// For other files, warn and prompt before overwriting
		log('warn', `${targetPath} already exists, skipping.`);
		return;
	}

	// If the file doesn't exist, create it normally
	fs.writeFileSync(targetPath, content);
	log('info', `Created file: ${targetPath}`);
}

// Main function to initialize a new project (No longer needs isInteractive logic)
async function initializeProject(options = {}) {
	// Receives options as argument
	// Only display banner if not in silent mode
	if (!isSilentMode()) {
		displayBanner();
	}

	// Debug logging only if not in silent mode
	// if (!isSilentMode()) {
	// 	console.log('===== DEBUG: INITIALIZE PROJECT OPTIONS RECEIVED =====');
	// 	console.log('Full options object:', JSON.stringify(options));
	// 	console.log('options.yes:', options.yes);
	// 	console.log('==================================================');
	// }

	const skipPrompts = options.yes || (options.name && options.description);

	// if (!isSilentMode()) {
	// 	console.log('Skip prompts determined:', skipPrompts);
	// }

	if (skipPrompts) {
		if (!isSilentMode()) {
			console.log('SKIPPING PROMPTS - Using defaults or provided values');
		}

		// Detect existing project FIRST, before creating any files
		const existingProject = detectExistingProject(process.cwd());

		// Use provided options or defaults
		const projectName = options.name || 'task-master-project';
		const projectDescription =
			options.description || 'A project managed with Task Master AI';
		const projectVersion = options.version || '0.1.0';
		const authorName = options.author || 'Vibe coder';
		const dryRun = options.dryRun || false;
		const addAliases = options.aliases || false;
		const resetProject = options.reset || false;

		if (dryRun) {
			log('info', 'DRY RUN MODE: No files will be modified');
			log('info', 'Would initialize TaskHero project');
			log('info', 'Would create/update necessary project files');
			if (addAliases) {
				log('info', 'Would add shell aliases for task-hero');
			}
			if (resetProject) {
				log('info', 'Would reset project data for fresh start');
			}
			return {
				dryRun: true
			};
		}

		// Handle existing project in non-interactive mode
		if (existingProject.exists && !resetProject) {
			log(
				'info',
				`📁 Existing TaskHero project detected: ${existingProject.projectName}`
			);
			log('info', `   Tasks found: ${existingProject.taskCount}`);
			log(
				'info',
				'✅ Project already initialized. Use --reset to start fresh.'
			);
			return {
				skipped: true,
				reason: 'Project already exists'
			};
		}

		// Reset project data if requested
		if (resetProject) {
			const resetResult = clearProjectData(process.cwd(), dryRun);
			if (resetResult.errors > 0) {
				log(
					'warn',
					`Project reset completed with ${resetResult.errors} errors. Continuing with initialization...`
				);
			} else {
				log('success', 'Project data reset successfully');
			}
		}

		// Get AI editor selection
		const selectedEditors = await selectAIEditors();

		createProjectStructure(addAliases, dryRun, selectedEditors);
	} else {
		// Interactive logic
		log('info', 'Required options not provided, proceeding with prompts.');

		// Detect existing project first
		const existingProject = detectExistingProject(process.cwd());

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		try {
			let resetProjectPrompted = false;
			let shouldContinueWithExisting = true;

			// If existing project detected, ask about continuing vs resetting
			if (existingProject.exists) {
				console.log(
					chalk.cyan(
						`\n📁 Existing TaskHero project detected: ${existingProject.projectName}`
					)
				);
				console.log(chalk.gray(`   Tasks found: ${existingProject.taskCount}`));

				const continueProjectInput = await promptQuestion(
					rl,
					chalk.cyan(
						'Do you want to continue with this existing project? (Y/n): '
					)
				);
				shouldContinueWithExisting =
					continueProjectInput.trim().toLowerCase() !== 'n';

				if (!shouldContinueWithExisting) {
					const resetConfirmInput = await promptQuestion(
						rl,
						chalk.yellow(
							'⚠️  Reset project data? This will clear all tasks, PRDs, reports and tests for a fresh start (y/N): '
						)
					);
					resetProjectPrompted = resetConfirmInput.trim().toLowerCase() === 'y';
				} else {
					// If continuing with existing project, skip the rest of setup
					rl.close();
					log(
						'success',
						'Continuing with existing TaskHero project. No changes made.'
					);
					return;
				}
			}

			// Only prompt for shell aliases for new projects or when resetting
			const addAliasesInput = await promptQuestion(
				rl,
				chalk.cyan(
					'Add shell aliases for task-hero? This lets you type "th" instead of "task-hero" (Y/n): '
				)
			);
			const addAliasesPrompted = addAliasesInput.trim().toLowerCase() !== 'n';

			// Confirm settings...
			console.log('\nTaskHero Project settings:');
			console.log(
				chalk.blue(
					'Add shell aliases (so you can use "th" instead of "task-hero"):'
				),
				chalk.white(addAliasesPrompted ? 'Yes' : 'No')
			);
			console.log(
				chalk.blue('Reset project data for fresh start:'),
				chalk.white(resetProjectPrompted ? 'Yes' : 'No')
			);

			if (resetProjectPrompted) {
				console.log(
					chalk.yellow(
						'âš ï¸  Warning: This will permanently delete all existing tasks, PRDs, reports, and test files!'
					)
				);
			}

			const confirmInput = await promptQuestion(
				rl,
				chalk.yellow('\nDo you want to continue with these settings? (Y/n): ')
			);
			const shouldContinue = confirmInput.trim().toLowerCase() !== 'n';
			rl.close();

			if (!shouldContinue) {
				log('info', 'Project initialization cancelled by user');
				process.exit(0);
				return;
			}

			const dryRun = options.dryRun || false;

			if (dryRun) {
				log('info', 'DRY RUN MODE: No files will be modified');
				log('info', 'Would initialize TaskHero project');
				log('info', 'Would create/update necessary project files');
				if (addAliasesPrompted) {
					log('info', 'Would add shell aliases for task-hero');
				}
				if (resetProjectPrompted) {
					log('info', 'Would reset project data for fresh start');
				}
				return {
					dryRun: true
				};
			}

			// Reset project data if requested
			if (resetProjectPrompted) {
				const resetResult = clearProjectData(process.cwd(), dryRun);
				if (resetResult.errors > 0) {
					log(
						'warn',
						`Project reset completed with ${resetResult.errors} errors. Continuing with initialization...`
					);
				} else {
					log('success', 'Project data reset successfully');
				}
			}

			// Get AI editor selection
			rl.close();
			const selectedEditors = await selectAIEditors();

			// Create structure using only necessary values
			createProjectStructure(addAliasesPrompted, dryRun, selectedEditors);
		} catch (error) {
			rl.close();
			log('error', `Error during initialization process: ${error.message}`);
			process.exit(1);
		}
	}
}

// Helper function to promisify readline question
function promptQuestion(rl, question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

// Function to manage gitignore for TaskMaster installations
function manageProjectGitignore(targetDir) {
	const projectRoot = path.dirname(targetDir);
	const taskMasterDirName = path.basename(targetDir);
	const projectGitignore = path.join(projectRoot, '.gitignore');

	// Check if we're installing TaskMaster as a subdirectory in another project
	const isSubdirectoryInstall =
		projectRoot !== targetDir && fs.existsSync(projectGitignore);

	if (isSubdirectoryInstall) {
		log(
			'info',
			'Detected installation in existing project, managing parent .gitignore...'
		);

		// Read existing gitignore
		let gitignoreContent = '';
		if (fs.existsSync(projectGitignore)) {
			gitignoreContent = fs.readFileSync(projectGitignore, 'utf8');
		}

		// Define the gitignore rules for TaskMaster subdirectory
		const taskMasterRules = `
# TaskMaster AI - Ignore everything in ${taskMasterDirName}/ except prd/ and tasks/
${taskMasterDirName}/
!${taskMasterDirName}/prd/
!${taskMasterDirName}/tasks/
!${taskMasterDirName}/prd/**
!${taskMasterDirName}/tasks/**
`;

		// Check if TaskMaster rules already exist
		if (
			!gitignoreContent.includes(
				`# TaskMaster AI - Ignore everything in ${taskMasterDirName}/`
			)
		) {
			// Append TaskMaster rules
			const updatedContent = gitignoreContent.trim() + '\n' + taskMasterRules;
			fs.writeFileSync(projectGitignore, updatedContent);
			log(
				'success',
				`Updated ${projectGitignore} with TaskMaster-specific rules`
			);
			log(
				'info',
				`TaskMaster directory will be ignored except for prd/ and tasks/ folders`
			);
		} else {
			log('info', 'TaskMaster gitignore rules already exist in parent project');
		}
	}
}

// Function to generate dynamic getting started message based on selected editors
function generateGettingStartedMessage(selectedEditors = []) {
	// Determine the primary AI editor and appropriate messaging
	let aiEditorName = 'your AI editor';
	let mcpToolsInfo = '';
	let workflowInfo = '';

	if (selectedEditors.includes('none')) {
		aiEditorName = 'TaskHero CLI';
		mcpToolsInfo = 'CLI: ';
		workflowInfo = 'Use TaskHero CLI commands to';
	} else if (selectedEditors.includes('cursor')) {
		aiEditorName = 'Cursor Agent';
		mcpToolsInfo = 'MCP Tool: ';
		workflowInfo = 'Ask Cursor Agent (or run CLI) to';
	} else if (selectedEditors.includes('augment')) {
		aiEditorName = 'Augment AI';
		mcpToolsInfo = 'CLI: ';
		workflowInfo = 'Use Augment AI with TaskHero commands to';
	} else if (selectedEditors.includes('windsurf')) {
		aiEditorName = 'Windsurf';
		mcpToolsInfo = 'CLI: ';
		workflowInfo = 'Use Windsurf with TaskHero commands to';
	} else if (selectedEditors.includes('roo')) {
		aiEditorName = 'Roo Code';
		mcpToolsInfo = 'CLI: ';
		workflowInfo = 'Use Roo Code with TaskHero commands to';
	}

	// Build API keys instruction based on selected editors
	let apiKeysInstruction = 'Add provider API keys to .env';
	if (selectedEditors.includes('cursor')) {
		apiKeysInstruction +=
			' (or inside the MCP config file i.e. .cursor/mcp.json)';
	}

	// Build step 3 based on whether MCP tools are available
	let step3Content = '';
	if (selectedEditors.includes('cursor')) {
		step3Content =
			chalk.white('   â""â"€ ') +
			chalk.dim('MCP Tool: ') +
			chalk.cyan('parse_prd') +
			chalk.dim(' | CLI: ') +
			chalk.cyan('task-hero parse-prd scripts/prd.txt');
	} else {
		step3Content =
			chalk.white('   â""â"€ ') +
			chalk.dim('CLI: ') +
			chalk.cyan('task-hero parse-prd scripts/prd.txt');
	}

	// Build step 4 based on whether MCP tools are available
	let step4Content = '';
	if (selectedEditors.includes('cursor')) {
		step4Content =
			chalk.white('   â""â"€ ') +
			chalk.dim('MCP Tool: ') +
			chalk.cyan('analyze_project_complexity') +
			chalk.dim(' | CLI: ') +
			chalk.cyan('task-hero analyze-complexity');
	} else {
		step4Content =
			chalk.white('   â""â"€ ') +
			chalk.dim('CLI: ') +
			chalk.cyan('task-hero analyze-complexity');
	}

	// Generate guidelines file reference based on selected editor
	let guidelinesRef = '';
	if (selectedEditors.includes('augment')) {
		guidelinesRef =
			'\n' +
			chalk.dim(
				'* Check .augment-guidelines for Augment AI integration workflow.'
			);
	} else if (selectedEditors.includes('cursor')) {
		guidelinesRef =
			'\n' +
			chalk.dim(
				'* Review .cursor/rules/ files for Cursor integration guidelines.'
			);
	} else if (selectedEditors.includes('windsurf')) {
		guidelinesRef =
			'\n' +
			chalk.dim('* Check .windsurfrules for Windsurf integration guidelines.');
	} else if (selectedEditors.includes('roo')) {
		guidelinesRef =
			'\n' +
			chalk.dim(
				'* Review .roo/rules/ files for Roo Code integration guidelines.'
			);
	}

	return (
		chalk.cyan.bold('Things you should do next:') +
		'\n\n' +
		chalk.white('1. ') +
		chalk.yellow('Configure AI models (if needed) and add API keys to `.env`') +
		'\n' +
		chalk.white('   â"œâ"€ ') +
		chalk.dim('Models: Use `task-hero models` commands') +
		'\n' +
		chalk.white('   â""â"€ ') +
		chalk.dim(apiKeysInstruction) +
		'\n' +
		chalk.white('2. ') +
		chalk.yellow(
			'Discuss your idea with AI and ask for a PRD using example_prd.txt, and save it to scripts/PRD.txt'
		) +
		'\n' +
		chalk.white('3. ') +
		chalk.yellow(`${workflowInfo} parse your PRD and generate initial tasks:`) +
		'\n' +
		step3Content +
		'\n' +
		chalk.white('4. ') +
		chalk.yellow(
			`Ask ${aiEditorName} to analyze the complexity of the tasks in your PRD using research`
		) +
		'\n' +
		step4Content +
		'\n' +
		chalk.white('5. ') +
		chalk.yellow(
			`Ask ${aiEditorName} to expand all of your tasks using the complexity analysis`
		) +
		'\n' +
		chalk.white('6. ') +
		chalk.yellow(`Ask ${aiEditorName} to begin working on the next task`) +
		'\n' +
		chalk.white('7. ') +
		chalk.yellow(
			`Ask ${aiEditorName} to set the status of one or many tasks/subtasks at a time. Use the task id from the task lists.`
		) +
		'\n' +
		chalk.white('8. ') +
		chalk.yellow(
			`Ask ${aiEditorName} to update all tasks from a specific task id based on new learnings or pivots in your project.`
		) +
		'\n' +
		chalk.white('9. ') +
		chalk.green.bold('Ship it!') +
		'\n\n' +
		chalk.dim(
			`* Use the task-hero command without arguments to see all available commands.`
		) +
		guidelinesRef
	);
}

// Function to create the project structure
function createProjectStructure(addAliases, dryRun, selectedEditors = []) {
	const targetDir = process.cwd();
	log('info', `Initializing project in ${targetDir}`);

	// Manage parent project's gitignore if we're in a subdirectory
	manageProjectGitignore(targetDir);

	// Create directories based on selected AI editors
	if (selectedEditors.includes('cursor')) {
		ensureDirectoryExists(path.join(targetDir, '.cursor', 'rules'));
	}

	if (selectedEditors.includes('roo')) {
		// Create Roo directories
		ensureDirectoryExists(path.join(targetDir, '.roo'));
		ensureDirectoryExists(path.join(targetDir, '.roo', 'rules'));
		for (const mode of [
			'architect',
			'ask',
			'boomerang',
			'code',
			'debug',
			'test'
		]) {
			ensureDirectoryExists(path.join(targetDir, '.roo', `rules-${mode}`));
		}
	}

	// Create TaskMaster directory structure
	ensureDirectoryExists(path.join(targetDir, '.taskmaster'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'tasks'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'reports'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'templates'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'prd'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'prd', 'pending'));
	ensureDirectoryExists(
		path.join(targetDir, '.taskmaster', 'prd', 'in-progress')
	);
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'prd', 'done'));
	ensureDirectoryExists(path.join(targetDir, '.taskmaster', 'prd', 'archived'));

	// Create legacy directories for backward compatibility
	ensureDirectoryExists(path.join(targetDir, 'scripts'));
	ensureDirectoryExists(path.join(targetDir, 'tasks'));

	// Create test directories
	ensureDirectoryExists(path.join(targetDir, 'tests'));
	ensureDirectoryExists(path.join(targetDir, 'tests', 'unit'));
	ensureDirectoryExists(path.join(targetDir, 'tests', 'integration'));
	ensureDirectoryExists(path.join(targetDir, 'tests', 'e2e'));

	// Create default data files
	log('info', 'Creating default data files...');

	// Create default tasks.json in new structure
	const tasksJsonContent = {
		tasks: [],
		metadata: {
			version: '1.0.0',
			lastUpdated: new Date().toISOString(),
			totalTasks: 0
		}
	};

	const newTasksJsonPath = path.join(
		targetDir,
		'.taskmaster',
		'tasks',
		'tasks.json'
	);
	if (!fs.existsSync(newTasksJsonPath)) {
		fs.writeFileSync(
			newTasksJsonPath,
			JSON.stringify(tasksJsonContent, null, 2)
		);
		log('success', `Created default tasks.json at ${newTasksJsonPath}`);
	}

	// Create default prds.json in new structure
	const prdsJsonContent = {
		prds: [],
		metadata: {
			version: '1.0.0',
			lastUpdated: new Date().toISOString(),
			totalPrds: 0,
			schema: {
				version: '1.0.0',
				description: 'TaskHero AI PRD Lifecycle Tracking Schema'
			}
		}
	};

	const newPrdsJsonPath = path.join(
		targetDir,
		'.taskmaster',
		'prd',
		'prds.json'
	);
	if (!fs.existsSync(newPrdsJsonPath)) {
		fs.writeFileSync(newPrdsJsonPath, JSON.stringify(prdsJsonContent, null, 2));
		log('success', `Created default prds.json at ${newPrdsJsonPath}`);
	}

	// Create default config.json in new structure
	const configJsonContent = {
		version: '1.0.0',
		models: {
			primary: 'claude-3-5-sonnet-20241022',
			research: 'claude-3-5-sonnet-20241022',
			fallback: 'gpt-4o'
		},
		settings: {
			maxTokens: 4000,
			temperature: 0.7,
			enableResearch: true
		}
	};

	const configJsonPath = path.join(targetDir, '.taskmaster', 'config.json');
	if (!fs.existsSync(configJsonPath)) {
		fs.writeFileSync(
			configJsonPath,
			JSON.stringify(configJsonContent, null, 2)
		);
		log('success', `Created default config.json at ${configJsonPath}`);
	}

	// Copy template files with replacements
	const replacements = {
		year: new Date().getFullYear()
	};

	// Copy .env.example
	copyTemplateFile(
		'env.example',
		path.join(targetDir, '.env.example'),
		replacements
	);

	// Copy .taskmasterconfig with project name
	copyTemplateFile(
		'.taskmasterconfig',
		path.join(targetDir, '.taskmasterconfig'),
		{
			...replacements
		}
	);

	// Copy .gitignore
	copyTemplateFile('gitignore', path.join(targetDir, '.gitignore'));

	// Copy AI editor files based on selection
	if (selectedEditors.includes('none')) {
		log('info', 'Skipping AI editor integration (None selected)');
	} else if (selectedEditors.includes('cursor')) {
		log('info', 'Setting up Cursor/Cline integration...');

		// Copy Cursor rule files
		copyTemplateFile(
			'dev_workflow.mdc',
			path.join(targetDir, '.cursor', 'rules', 'dev_workflow.mdc')
		);
		copyTemplateFile(
			'taskmaster.mdc',
			path.join(targetDir, '.cursor', 'rules', 'taskmaster.mdc')
		);
		copyTemplateFile(
			'cursor_rules.mdc',
			path.join(targetDir, '.cursor', 'rules', 'cursor_rules.mdc')
		);
		copyTemplateFile(
			'self_improve.mdc',
			path.join(targetDir, '.cursor', 'rules', 'self_improve.mdc')
		);

		// Setup MCP configuration for Cursor
		setupMCPConfiguration(targetDir);
	}

	if (selectedEditors.includes('roo')) {
		log('info', 'Setting up Roo Code integration...');

		// Generate Roo rules from Cursor rules (if Cursor rules exist)
		if (selectedEditors.includes('cursor')) {
			convertAllCursorRulesToRooRules(targetDir);
		}

		// Copy .roomodes for Roo Code integration
		copyTemplateFile('.roomodes', path.join(targetDir, '.roomodes'));

		// Copy Roo rule files for each mode
		const rooModes = ['architect', 'ask', 'boomerang', 'code', 'debug', 'test'];
		for (const mode of rooModes) {
			copyTemplateFile(
				`${mode}-rules`,
				path.join(targetDir, '.roo', `rules-${mode}`, `${mode}-rules`)
			);
		}
	}

	if (selectedEditors.includes('windsurf')) {
		log('info', 'Setting up Windsurf integration...');

		// Copy .windsurfrules
		copyTemplateFile('windsurfrules', path.join(targetDir, '.windsurfrules'));
	}

	if (selectedEditors.includes('augment')) {
		log('info', 'Setting up Augment AI integration...');

		// Copy Augment AI guidelines
		copyTemplateFile(
			'augment-guidelines',
			path.join(targetDir, '.augment-guidelines')
		);
	}

	// Copy example_prd.txt
	copyTemplateFile(
		'example_prd.txt',
		path.join(targetDir, 'scripts', 'example_prd.txt')
	);

	// // Create main README.md
	// copyTemplateFile(
	// 	'README-task-master.md',
	// 	path.join(targetDir, 'README-task-master.md'),
	// 	replacements
	// );

	// Initialize git repository if git is available
	try {
		if (!fs.existsSync(path.join(targetDir, '.git'))) {
			log('info', 'Initializing git repository...');
			execSync('git init', { stdio: 'ignore' });
			log('success', 'Git repository initialized');
		}
	} catch (error) {
		log('warn', 'Git not available, skipping repository initialization');
	}

	// Run npm install automatically
	const npmInstallOptions = {
		cwd: targetDir,
		// Default to inherit for interactive CLI, change if silent
		stdio: 'inherit'
	};

	if (isSilentMode()) {
		// If silent (MCP mode), suppress npm install output
		npmInstallOptions.stdio = 'ignore';
		log('info', 'Running npm install silently...'); // Log our own message
	} else {
		// Interactive mode, show the boxen message
		console.log(
			boxen(chalk.cyan('Installing dependencies...'), {
				padding: 0.5,
				margin: 0.5,
				borderStyle: 'round',
				borderColor: 'blue'
			})
		);
	}

	// === Add Model Configuration Step ===
	if (!isSilentMode() && !dryRun) {
		console.log(
			boxen(chalk.cyan('Configuring AI Models...'), {
				padding: 0.5,
				margin: { top: 1, bottom: 0.5 },
				borderStyle: 'round',
				borderColor: 'blue'
			})
		);
		log(
			'info',
			'Running interactive model setup. Please select your preferred AI models.'
		);
		try {
			execSync('npx task-hero models --setup', {
				stdio: 'inherit',
				cwd: targetDir
			});
			log('success', 'AI Models configured.');
		} catch (error) {
			log('error', 'Failed to configure AI models:', error.message);
			log('warn', 'You may need to run "task-hero models --setup" manually.');
		}
	} else if (isSilentMode() && !dryRun) {
		log('info', 'Skipping interactive model setup in silent (MCP) mode.');
		log(
			'warn',
			'Please configure AI models using "task-hero models --set-..." or the "models" MCP tool.'
		);
	} else if (dryRun) {
		log('info', 'DRY RUN: Skipping interactive model setup.');
	}
	// ====================================

	// Display success message
	if (!isSilentMode()) {
		console.log(
			boxen(
				warmGradient.multiline(
					figlet.textSync('Success!', { font: 'Standard' })
				) +
					'\n' +
					chalk.green('Project initialized successfully!'),
				{
					padding: 1,
					margin: 1,
					borderStyle: 'double',
					borderColor: 'green'
				}
			)
		);
	}

	// Display next steps in a nice box
	if (!isSilentMode()) {
		console.log(
			boxen(generateGettingStartedMessage(selectedEditors), {
				padding: 1,
				margin: 1,
				borderStyle: 'round',
				borderColor: 'yellow',
				title: 'Getting Started',
				titleAlignment: 'center'
			})
		);
	}
}

// Function to setup MCP configuration for Cursor integration
function setupMCPConfiguration(targetDir) {
	const mcpDirPath = path.join(targetDir, '.cursor');
	const mcpJsonPath = path.join(mcpDirPath, 'mcp.json');

	log('info', 'Setting up MCP configuration for Cursor integration...');

	// Create .cursor directory if it doesn't exist
	ensureDirectoryExists(mcpDirPath);

	// New MCP config to be added - references the installed package
	const newMCPServer = {
		'task-master-ai': {
			command: 'npx',
			args: ['-y', '--package=task-master-ai', 'task-master-ai'],
			env: {
				ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY_HERE',
				PERPLEXITY_API_KEY: 'PERPLEXITY_API_KEY_HERE',
				OPENAI_API_KEY: 'OPENAI_API_KEY_HERE',
				GOOGLE_API_KEY: 'GOOGLE_API_KEY_HERE',
				XAI_API_KEY: 'XAI_API_KEY_HERE',
				OPENROUTER_API_KEY: 'OPENROUTER_API_KEY_HERE',
				MISTRAL_API_KEY: 'MISTRAL_API_KEY_HERE',
				AZURE_OPENAI_API_KEY: 'AZURE_OPENAI_API_KEY_HERE',
				OLLAMA_API_KEY: 'OLLAMA_API_KEY_HERE'
			}
		}
	};

	// Check if mcp.json already existsimage.png
	if (fs.existsSync(mcpJsonPath)) {
		log(
			'info',
			'MCP configuration file already exists, checking for existing task-master-mcp...'
		);
		try {
			// Read existing config
			const mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));

			// Initialize mcpServers if it doesn't exist
			if (!mcpConfig.mcpServers) {
				mcpConfig.mcpServers = {};
			}

			// Check if any existing server configuration already has task-master-mcp in its args
			const hasMCPString = Object.values(mcpConfig.mcpServers).some(
				(server) =>
					server.args &&
					server.args.some(
						(arg) => typeof arg === 'string' && arg.includes('task-master-ai')
					)
			);

			if (hasMCPString) {
				log(
					'info',
					'Found existing task-master-ai MCP configuration in mcp.json, leaving untouched'
				);
				return; // Exit early, don't modify the existing configuration
			}

			// Add the task-master-ai server if it doesn't exist
			if (!mcpConfig.mcpServers['task-master-ai']) {
				mcpConfig.mcpServers['task-master-ai'] = newMCPServer['task-master-ai'];
				log(
					'info',
					'Added task-master-ai server to existing MCP configuration'
				);
			} else {
				log('info', 'task-master-ai server already configured in mcp.json');
			}

			// Write the updated configuration
			fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 4));
			log('success', 'Updated MCP configuration file');
		} catch (error) {
			log('error', `Failed to update MCP configuration: ${error.message}`);
			// Create a backup before potentially modifying
			const backupPath = `${mcpJsonPath}.backup-${Date.now()}`;
			if (fs.existsSync(mcpJsonPath)) {
				fs.copyFileSync(mcpJsonPath, backupPath);
				log('info', `Created backup of existing mcp.json at ${backupPath}`);
			}

			// Create new configuration
			const newMCPConfig = {
				mcpServers: newMCPServer
			};

			fs.writeFileSync(mcpJsonPath, JSON.stringify(newMCPConfig, null, 4));
			log(
				'warn',
				'Created new MCP configuration file (backup of original file was created if it existed)'
			);
		}
	} else {
		// If mcp.json doesn't exist, create it
		const newMCPConfig = {
			mcpServers: newMCPServer
		};

		fs.writeFileSync(mcpJsonPath, JSON.stringify(newMCPConfig, null, 4));
		log('success', 'Created MCP configuration file for Cursor integration');
	}

	// Add note to console about MCP integration
	log('info', 'MCP server will use the installed task-master-ai package');
}

// Ensure necessary functions are exported
export { initializeProject, log }; // Only export what's needed by commands.js
