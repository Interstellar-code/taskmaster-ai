import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

import {
	log,
	truncate,
	readComplexityReport,
	addComplexityToTask
} from '../utils.js';
import findNextTaskDB from './find-next-task-db.js';

import {
	displayBanner,
	getStatusWithColor,
	formatDependenciesWithStatus,
	getComplexityWithColor,
	createProgressBar
} from '../ui.js';

import cliDatabase from '../database/cli-database.js';

/**
 * List all tasks using database
 * @param {string} tasksPath - Path to the tasks.json file (for compatibility)
 * @param {string} statusFilter - Filter by status
 * @param {string} reportPath - Path to the complexity report
 * @param {boolean} withSubtasks - Whether to show subtasks
 * @param {Object|string} prdFiltersOrOutputFormat - PRD filter options or output format for backward compatibility
 * @param {string} outputFormat - Output format (text or json) when prdFiltersOrOutputFormat is an object
 * @returns {Object} - Task list result for json format
 */
async function listTasksDB(
	tasksPath,
	statusFilter,
	reportPath = null,
	withSubtasks = false,
	prdFiltersOrOutputFormat = 'text',
	outputFormat = 'text'
) {
	// Handle backward compatibility - if prdFiltersOrOutputFormat is a string, it's the old outputFormat parameter
	let prdFilters = {};
	let actualOutputFormat = outputFormat;

	if (typeof prdFiltersOrOutputFormat === 'string') {
		// Old function signature - prdFiltersOrOutputFormat is actually outputFormat
		actualOutputFormat = prdFiltersOrOutputFormat;
		prdFilters = {};
	} else if (
		typeof prdFiltersOrOutputFormat === 'object' &&
		prdFiltersOrOutputFormat !== null
	) {
		// New function signature - prdFiltersOrOutputFormat contains PRD filter options
		prdFilters = prdFiltersOrOutputFormat;
		actualOutputFormat = outputFormat;
	}

	try {
		// Only display banner for text output
		if (actualOutputFormat === 'text') {
			displayBanner();
		}

		// Initialize database
		await cliDatabase.initialize();

		// Build database filters
		const dbFilters = {};
		if (statusFilter && statusFilter.toLowerCase() !== 'all') {
			dbFilters.status = statusFilter.toLowerCase();
		}

		if (prdFilters.priority) {
			dbFilters.priority = prdFilters.priority;
		}

		if (prdFilters.search) {
			dbFilters.search = prdFilters.search;
		}

		// Get tasks from database
		const allTasks = await cliDatabase.getTasks(dbFilters);

		if (!allTasks || allTasks.length === 0) {
			if (actualOutputFormat === 'json') {
				return {
					tasks: [],
					filter: statusFilter || 'all',
					stats: {
						total: 0,
						completed: 0,
						inProgress: 0,
						pending: 0,
						blocked: 0,
						deferred: 0,
						cancelled: 0,
						completionPercentage: 0,
						subtasks: {
							total: 0,
							completed: 0,
							inProgress: 0,
							pending: 0,
							blocked: 0,
							deferred: 0,
							cancelled: 0,
							completionPercentage: 0
						}
					}
				};
			}

			console.log(
				boxen(
					statusFilter
						? chalk.yellow(`No tasks with status '${statusFilter}' found`)
						: chalk.yellow('No tasks found'),
					{ padding: 1, borderColor: 'yellow', borderStyle: 'round' }
				)
			);
			return;
		}

		// Add complexity scores to tasks if report exists
		const complexityReport = readComplexityReport(reportPath);
		if (complexityReport && complexityReport.complexityAnalysis) {
			allTasks.forEach((task) => addComplexityToTask(task, complexityReport));
		}

		// Apply additional PRD source filters
		let filteredTasks = allTasks;

		if (prdFilters.prdFilter) {
			// Filter by specific PRD file
			const prdFilterLower = prdFilters.prdFilter.toLowerCase();
			filteredTasks = filteredTasks.filter((task) => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				const fileName = task.prdSource.fileName.toLowerCase();
				const filePath = task.prdSource.filePath.toLowerCase();
				return (
					fileName.includes(prdFilterLower) ||
					filePath.includes(prdFilterLower) ||
					fileName === prdFilterLower ||
					filePath.endsWith(prdFilterLower)
				);
			});
		} else if (prdFilters.manualOnly) {
			// Show only manually created tasks (no PRD source)
			filteredTasks = filteredTasks.filter(
				(task) => !task.prdSource || !task.prdSource.fileName
			);
		} else if (prdFilters.prdOnly) {
			// Show only tasks from PRD files
			filteredTasks = filteredTasks.filter(
				(task) => task.prdSource && task.prdSource.fileName
			);
		}

		// Get task statistics from database
		const stats = await cliDatabase.getTaskStats();

		// For JSON output, return structured data
		if (actualOutputFormat === 'json') {
			// Remove 'details' field for JSON output
			const tasksWithoutDetails = filteredTasks.map((task) => {
				const { details, ...taskRest } = task;
				return taskRest;
			});

			return {
				tasks: tasksWithoutDetails,
				filter: statusFilter || 'all',
				stats: {
					total: stats.total,
					completed: stats.completed,
					inProgress: stats.inProgress,
					pending: stats.pending,
					blocked: stats.blocked,
					deferred: stats.deferred,
					cancelled: stats.cancelled,
					completionPercentage: stats.completionPercentage,
					subtasks: {
						total: 0, // TODO: Implement subtasks in database
						completed: 0,
						inProgress: 0,
						pending: 0,
						blocked: 0,
						deferred: 0,
						cancelled: 0,
						completionPercentage: 0
					}
				}
			};
		}

		// Continue with text output formatting...
		// Calculate status breakdowns as percentages of total
		const taskStatusBreakdown = {
			'in-progress': stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0,
			pending: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0,
			blocked: stats.total > 0 ? (stats.blocked / stats.total) * 100 : 0,
			deferred: stats.total > 0 ? (stats.deferred / stats.total) * 100 : 0,
			cancelled: stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0
		};

		// Create progress bars with status breakdowns
		const taskProgressBar = createProgressBar(
			stats.completionPercentage,
			30,
			taskStatusBreakdown
		);

		// Calculate dependency statistics
		const completedTaskIds = new Set(
			allTasks
				.filter((t) => t.status === 'done' || t.status === 'completed')
				.map((t) => t.id)
		);

		const tasksWithNoDeps = allTasks.filter(
			(t) =>
				t.status !== 'done' &&
				t.status !== 'completed' &&
				(!t.dependencies || t.dependencies.length === 0)
		).length;

		const tasksWithAllDepsSatisfied = allTasks.filter(
			(t) =>
				t.status !== 'done' &&
				t.status !== 'completed' &&
				t.dependencies &&
				t.dependencies.length > 0 &&
				t.dependencies.every((depId) => completedTaskIds.has(depId))
		).length;

		const tasksWithUnsatisfiedDeps = allTasks.filter(
			(t) =>
				t.status !== 'done' &&
				t.status !== 'completed' &&
				t.dependencies &&
				t.dependencies.length > 0 &&
				!t.dependencies.every((depId) => completedTaskIds.has(depId))
		).length;

		// Calculate total tasks ready to work on (no deps + satisfied deps)
		const tasksReadyToWork = tasksWithNoDeps + tasksWithAllDepsSatisfied;

		// Find next task to work on, passing the complexity report
		const nextItem = await findNextTaskDB(complexityReport);

		// Get terminal width
		let terminalWidth;
		try {
			terminalWidth = process.stdout.columns;
		} catch (e) {
			log('debug', 'Could not determine terminal width, using default');
		}
		terminalWidth = terminalWidth || 80;
		terminalWidth = Math.max(terminalWidth, 80);

		// Calculate PRD source statistics
		const tasksWithPrdSource = allTasks.filter(
			(task) => task.prdSource && task.prdSource.fileName
		);
		const manualTasks = allTasks.filter(
			(task) => !task.prdSource || !task.prdSource.fileName
		);
		const uniquePrdSources = [
			...new Set(tasksWithPrdSource.map((task) => task.prdSource.fileName))
		];

		// Create dashboard content
		const projectDashboardContent =
			chalk.white.bold('Project Dashboard') +
			'\n' +
			`Tasks Progress: ${chalk.greenBright(taskProgressBar)} ${stats.completionPercentage.toFixed(0)}%\n` +
			`Done: ${chalk.green(stats.completed)}  In Progress: ${chalk.blue(stats.inProgress)}  Pending: ${chalk.yellow(stats.pending)}  Blocked: ${chalk.red(stats.blocked)}  Deferred: ${chalk.gray(stats.deferred)}  Cancelled: ${chalk.gray(stats.cancelled)}\n\n` +
			chalk.cyan.bold('Priority Breakdown:') +
			'\n' +
			`${chalk.red('•')} ${chalk.white('High priority:')} ${allTasks.filter((t) => t.priority === 'high').length}\n` +
			`${chalk.yellow('•')} ${chalk.white('Medium priority:')} ${allTasks.filter((t) => t.priority === 'medium').length}\n` +
			`${chalk.green('•')} ${chalk.white('Low priority:')} ${allTasks.filter((t) => t.priority === 'low').length}\n\n` +
			chalk.cyan.bold('PRD Source Breakdown:') +
			'\n' +
			`${chalk.blue('•')} ${chalk.white('Tasks from PRDs:')} ${tasksWithPrdSource.length}\n` +
			`${chalk.gray('•')} ${chalk.white('Manual tasks:')} ${manualTasks.length}\n` +
			`${chalk.magenta('•')} ${chalk.white('Unique PRD files:')} ${uniquePrdSources.length}` +
			(uniquePrdSources.length > 0
				? `\n${chalk.dim('   ' + uniquePrdSources.slice(0, 3).join(', ') + (uniquePrdSources.length > 3 ? '...' : ''))}`
				: '');

		const dependencyDashboardContent =
			chalk.white.bold('Dependency Status & Next Task') +
			'\n' +
			chalk.cyan.bold('Dependency Metrics:') +
			'\n' +
			`${chalk.green('•')} ${chalk.white('Tasks with no dependencies:')} ${tasksWithNoDeps}\n` +
			`${chalk.green('•')} ${chalk.white('Tasks ready to work on:')} ${tasksReadyToWork}\n` +
			`${chalk.yellow('•')} ${chalk.white('Tasks blocked by dependencies:')} ${tasksWithUnsatisfiedDeps}\n` +
			chalk.cyan.bold('Next Task to Work On:') +
			'\n' +
			`ID: ${chalk.cyan(nextItem ? nextItem.id : 'N/A')} - ${nextItem ? chalk.white.bold(truncate(nextItem.title, 40)) : chalk.yellow('No task available')}\n` +
			`Priority: ${nextItem ? chalk.white(nextItem.priority || 'medium') : ''}  Dependencies: ${nextItem ? formatDependenciesWithStatus(nextItem.dependencies, allTasks, true, complexityReport) : ''}\n` +
			`Complexity: ${nextItem && nextItem.complexityScore ? getComplexityWithColor(nextItem.complexityScore) : chalk.gray('N/A')}`;

		// Display dashboards
		const minDashboardWidth = 50;
		const minDependencyWidth = 50;
		const totalMinWidth = minDashboardWidth + minDependencyWidth + 4;

		if (terminalWidth >= totalMinWidth) {
			// Side by side display
			const halfWidth = Math.floor(terminalWidth / 2);
			const boxContentWidth = halfWidth - 4;

			const dashboardBox = boxen(projectDashboardContent, {
				padding: 1,
				borderColor: 'blue',
				borderStyle: 'round',
				width: boxContentWidth,
				dimBorder: false
			});

			const dependencyBox = boxen(dependencyDashboardContent, {
				padding: 1,
				borderColor: 'magenta',
				borderStyle: 'round',
				width: boxContentWidth,
				dimBorder: false
			});

			const dashboardLines = dashboardBox.split('\n');
			const dependencyLines = dependencyBox.split('\n');
			const maxHeight = Math.max(dashboardLines.length, dependencyLines.length);

			const combinedLines = [];
			for (let i = 0; i < maxHeight; i++) {
				const dashLine = i < dashboardLines.length ? dashboardLines[i] : '';
				const depLine = i < dependencyLines.length ? dependencyLines[i] : '';
				const trimmedDashLine = dashLine.trimEnd();
				const paddedDashLine = trimmedDashLine.padEnd(halfWidth, ' ');
				combinedLines.push(paddedDashLine + depLine);
			}

			console.log(combinedLines.join('\n'));
		} else {
			// Stacked display
			const dashboardBox = boxen(projectDashboardContent, {
				padding: 1,
				borderColor: 'blue',
				borderStyle: 'round',
				margin: { top: 0, bottom: 1 }
			});

			const dependencyBox = boxen(dependencyDashboardContent, {
				padding: 1,
				borderColor: 'magenta',
				borderStyle: 'round',
				margin: { top: 0, bottom: 1 }
			});

			console.log(dashboardBox);
			console.log(dependencyBox);
		}

		if (filteredTasks.length === 0) {
			console.log(
				boxen(
					statusFilter
						? chalk.yellow(`No tasks with status '${statusFilter}' found`)
						: chalk.yellow('No tasks found'),
					{ padding: 1, borderColor: 'yellow', borderStyle: 'round' }
				)
			);
			return;
		}

		// TODO: Add table display for filtered tasks
		console.log(chalk.blue(`\nShowing ${filteredTasks.length} tasks`));

	} catch (error) {
		console.error(chalk.red('Error listing tasks from database:'), error.message);
		throw error;
	}
}

export default listTasksDB;
