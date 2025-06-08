import chalk from 'chalk';
import boxen from 'boxen';

import {
	log,
	readComplexityReport,
	addComplexityToTask
} from '../utils.js';
import findNextTaskDB from './find-next-task-db.js';

import {
	displayBanner,
	getStatusWithColor,
	formatDependenciesWithStatus,
	getComplexityWithColor
} from '../ui.js';

import cliDatabase from '../database/cli-database.js';

/**
 * Display the next task to work on using database
 * @param {string} tasksPath - Path to the tasks.json file (for compatibility)
 * @param {string} reportPath - Path to the complexity report
 * @returns {Promise<void>}
 */
async function displayNextTaskDB(tasksPath, reportPath = null) {
	try {
		displayBanner();

		// Initialize database
		await cliDatabase.initialize();

		// Read complexity report if available
		const complexityReport = readComplexityReport(reportPath);

		// Find the next task using database
		const nextTask = await findNextTaskDB(complexityReport);

		if (!nextTask) {
			console.log(
				boxen(
					chalk.yellow('🎉 No pending tasks found!\n\n') +
					chalk.white('All tasks are either completed, in progress, or blocked by dependencies.\n') +
					chalk.cyan('Great job on your progress!'),
					{
						padding: 1,
						borderColor: 'green',
						borderStyle: 'round',
						title: 'Task Status',
						titleAlignment: 'center'
					}
				)
			);
			return;
		}

		// Get all tasks for dependency formatting
		const allTasks = await cliDatabase.getTasks();

		// Format the next task display
		const taskInfo = [
			chalk.cyan.bold('Next Task to Work On:'),
			'',
			`${chalk.white.bold('ID:')} ${chalk.cyan(nextTask.id)}`,
			`${chalk.white.bold('Title:')} ${chalk.white(nextTask.title)}`,
			`${chalk.white.bold('Status:')} ${getStatusWithColor(nextTask.status)}`,
			`${chalk.white.bold('Priority:')} ${chalk.white(nextTask.priority || 'medium')}`,
		];

		// Add description if available
		if (nextTask.description) {
			taskInfo.push(`${chalk.white.bold('Description:')} ${chalk.gray(nextTask.description)}`);
		}

		// Add dependencies if any
		if (nextTask.dependencies && nextTask.dependencies.length > 0) {
			taskInfo.push(
				`${chalk.white.bold('Dependencies:')} ${formatDependenciesWithStatus(
					nextTask.dependencies,
					allTasks,
					true,
					complexityReport
				)}`
			);
		} else {
			taskInfo.push(`${chalk.white.bold('Dependencies:')} ${chalk.green('None')}`);
		}

		// Add complexity score if available
		if (nextTask.complexityScore) {
			taskInfo.push(
				`${chalk.white.bold('Complexity:')} ${getComplexityWithColor(nextTask.complexityScore)}`
			);
		}

		// Add PRD source if available
		if (nextTask.prdSource && nextTask.prdSource.fileName) {
			taskInfo.push(
				`${chalk.white.bold('PRD Source:')} ${chalk.blue(nextTask.prdSource.fileName)}`
			);
		}

		// Add details if available
		if (nextTask.details) {
			taskInfo.push('');
			taskInfo.push(chalk.white.bold('Details:'));
			taskInfo.push(chalk.gray(nextTask.details));
		}

		// Display the task information
		console.log(
			boxen(taskInfo.join('\n'), {
				padding: 1,
				borderColor: 'blue',
				borderStyle: 'round',
				title: '🎯 Next Task',
				titleAlignment: 'center'
			})
		);

		// Show helpful commands
		const commands = [
			chalk.cyan.bold('Helpful Commands:'),
			'',
			`${chalk.white('Start working:')} ${chalk.green(`task-hero set-status --id=${nextTask.id} --status=in-progress`)}`,
			`${chalk.white('Show details:')} ${chalk.green(`task-hero show ${nextTask.id}`)}`,
			`${chalk.white('Update task:')} ${chalk.green(`task-hero update-task --id=${nextTask.id} --prompt="<context>"`)}`,
		];

		// Add expand command if it's a main task (not a subtask)
		if (!nextTask.id.includes('.')) {
			commands.push(`${chalk.white('Break into subtasks:')} ${chalk.green(`task-hero expand --id=${nextTask.id}`)}`);
		}

		console.log(
			boxen(commands.join('\n'), {
				padding: 1,
				borderColor: 'green',
				borderStyle: 'round',
				title: '💡 Quick Actions',
				titleAlignment: 'center'
			})
		);

		// Show task statistics
		const stats = await cliDatabase.getTaskStats();
		
		const statsInfo = [
			chalk.cyan.bold('Project Progress:'),
			'',
			`${chalk.white('Total tasks:')} ${chalk.yellow(stats.total)}`,
			`${chalk.white('Completed:')} ${chalk.green(stats.completed)} (${stats.completionPercentage.toFixed(1)}%)`,
			`${chalk.white('In progress:')} ${chalk.blue(stats.inProgress)}`,
			`${chalk.white('Pending:')} ${chalk.yellow(stats.pending)}`,
		];

		if (stats.blocked > 0) {
			statsInfo.push(`${chalk.white('Blocked:')} ${chalk.red(stats.blocked)}`);
		}

		if (stats.deferred > 0) {
			statsInfo.push(`${chalk.white('Deferred:')} ${chalk.gray(stats.deferred)}`);
		}

		console.log(
			boxen(statsInfo.join('\n'), {
				padding: 1,
				borderColor: 'magenta',
				borderStyle: 'round',
				title: '📊 Progress',
				titleAlignment: 'center'
			})
		);

	} catch (error) {
		console.error(chalk.red('Error displaying next task from database:'), error.message);
		throw error;
	}
}

export default displayNextTaskDB;
