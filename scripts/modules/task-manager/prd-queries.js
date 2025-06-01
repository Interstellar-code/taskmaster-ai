/**
 * prd-queries.js
 * PRD source query and filter commands for TaskMaster
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { readJSON, log } from '../utils.js';

/**
 * List all unique PRD files that have generated tasks
 * @param {string} tasksPath - Path to tasks.json file
 * @param {string} format - Output format (table, json)
 */
export async function listPRDs(tasksPath, format = 'table') {
	try {
		// Read tasks data
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			console.error(chalk.red(`Error: No tasks found in ${tasksPath}`));
			return;
		}

		// Extract unique PRD sources
		const prdSources = new Map();
		
		data.tasks.forEach(task => {
			if (task.prdSource && task.prdSource.fileName) {
				const fileName = task.prdSource.fileName;
				if (!prdSources.has(fileName)) {
					prdSources.set(fileName, {
						fileName: fileName,
						filePath: task.prdSource.filePath,
						parsedDate: task.prdSource.parsedDate,
						fileHash: task.prdSource.fileHash,
						fileSize: task.prdSource.fileSize,
						taskCount: 0
					});
				}
				prdSources.get(fileName).taskCount++;
			}
		});

		// Convert to array and sort by task count (descending)
		const prdList = Array.from(prdSources.values()).sort((a, b) => b.taskCount - a.taskCount);

		if (prdList.length === 0) {
			console.log(chalk.yellow('No PRD files found. All tasks were created manually.'));
			return;
		}

		if (format === 'json') {
			console.log(JSON.stringify(prdList, null, 2));
			return;
		}

		// Display as table
		console.log(chalk.blue.bold('\n📋 PRD Files Summary'));
		console.log(chalk.gray('═'.repeat(80)));

		const table = new Table({
			head: [
				chalk.cyan.bold('PRD File'),
				chalk.cyan.bold('Tasks'),
				chalk.cyan.bold('Parsed Date'),
				chalk.cyan.bold('File Size'),
				chalk.cyan.bold('Hash (Short)')
			],
			colWidths: [25, 8, 12, 10, 12],
			style: {
				head: [],
				border: [],
				compact: false
			},
			wordWrap: true
		});

		prdList.forEach(prd => {
			const parsedDate = prd.parsedDate ? new Date(prd.parsedDate).toLocaleDateString() : 'Unknown';
			const fileSize = prd.fileSize ? `${Math.round(prd.fileSize / 1024)}KB` : 'Unknown';
			const shortHash = prd.fileHash && prd.fileHash !== 'unknown' ? prd.fileHash.substring(0, 8) : 'Unknown';

			table.push([
				chalk.blue(prd.fileName),
				chalk.green(prd.taskCount.toString()),
				chalk.gray(parsedDate),
				chalk.gray(fileSize),
				chalk.gray(shortHash)
			]);
		});

		console.log(table.toString());
		console.log(chalk.gray(`\nTotal: ${prdList.length} PRD file(s) found`));

	} catch (error) {
		console.error(chalk.red(`Error listing PRDs: ${error.message}`));
		log('error', `listPRDs error: ${error.message}`);
	}
}

/**
 * Show all tasks generated from a specific PRD file
 * @param {string} tasksPath - Path to tasks.json file
 * @param {string} prdFilter - PRD file path or name to filter by
 * @param {string} format - Output format (table, json)
 * @param {string} statusFilter - Optional status filter
 */
export async function tasksFromPRD(tasksPath, prdFilter, format = 'table', statusFilter = null) {
	try {
		// Read tasks data
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			console.error(chalk.red(`Error: No tasks found in ${tasksPath}`));
			return;
		}

		// Filter tasks by PRD source
		const filteredTasks = data.tasks.filter(task => {
			if (!task.prdSource || !task.prdSource.fileName) {
				return false;
			}

			// Check if PRD filter matches file name or file path
			const fileName = task.prdSource.fileName.toLowerCase();
			const filePath = task.prdSource.filePath.toLowerCase();
			const filter = prdFilter.toLowerCase();

			const matchesPrd = fileName.includes(filter) || filePath.includes(filter) || 
							  fileName === filter || filePath.endsWith(filter);

			// Apply status filter if provided
			if (statusFilter && matchesPrd) {
				return task.status === statusFilter;
			}

			return matchesPrd;
		});

		if (filteredTasks.length === 0) {
			console.log(chalk.yellow(`No tasks found from PRD: ${prdFilter}`));
			if (statusFilter) {
				console.log(chalk.gray(`(with status filter: ${statusFilter})`));
			}
			return;
		}

		if (format === 'json') {
			console.log(JSON.stringify(filteredTasks, null, 2));
			return;
		}

		// Display as table
		const prdInfo = filteredTasks[0].prdSource;
		console.log(chalk.blue.bold(`\n📋 Tasks from PRD: ${chalk.white(prdInfo.fileName)}`));
		if (statusFilter) {
			console.log(chalk.gray(`Status filter: ${statusFilter}`));
		}
		console.log(chalk.gray('═'.repeat(80)));

		const table = new Table({
			head: [
				chalk.cyan.bold('ID'),
				chalk.cyan.bold('Title'),
				chalk.cyan.bold('Status'),
				chalk.cyan.bold('Priority'),
				chalk.cyan.bold('Dependencies')
			],
			colWidths: [6, 35, 12, 10, 15],
			style: {
				head: [],
				border: [],
				compact: false
			},
			wordWrap: true
		});

		filteredTasks.forEach(task => {
			const statusColor = getStatusColor(task.status);
			const priorityColor = getPriorityColor(task.priority);
			const deps = task.dependencies && task.dependencies.length > 0 
				? task.dependencies.join(', ') 
				: chalk.gray('None');

			table.push([
				task.id.toString(),
				task.title,
				statusColor(task.status || 'pending'),
				priorityColor(task.priority || 'medium'),
				deps
			]);
		});

		console.log(table.toString());
		console.log(chalk.gray(`\nTotal: ${filteredTasks.length} task(s) found`));

		// Show PRD metadata
		console.log(chalk.blue.bold('\n📄 PRD Metadata:'));
		console.log(chalk.gray(`File Path: ${prdInfo.filePath}`));
		console.log(chalk.gray(`Parsed Date: ${new Date(prdInfo.parsedDate).toLocaleString()}`));
		console.log(chalk.gray(`File Size: ${Math.round(prdInfo.fileSize / 1024)}KB`));
		console.log(chalk.gray(`File Hash: ${prdInfo.fileHash}`));

	} catch (error) {
		console.error(chalk.red(`Error filtering tasks from PRD: ${error.message}`));
		log('error', `tasksFromPRD error: ${error.message}`);
	}
}

/**
 * Display PRD source information for a specific task
 * @param {string} tasksPath - Path to tasks.json file
 * @param {string} taskId - Task ID to show PRD source for
 * @param {string} format - Output format (table, json)
 */
export async function showPRDSource(tasksPath, taskId, format = 'table') {
	try {
		// Read tasks data
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			console.error(chalk.red(`Error: No tasks found in ${tasksPath}`));
			return;
		}

		// Find the task
		const task = data.tasks.find(t => t.id.toString() === taskId.toString());
		if (!task) {
			console.error(chalk.red(`Error: Task with ID ${taskId} not found`));
			return;
		}

		if (!task.prdSource || !task.prdSource.fileName) {
			console.log(chalk.yellow(`Task ${taskId} was created manually (no PRD source)`));
			return;
		}

		if (format === 'json') {
			console.log(JSON.stringify(task.prdSource, null, 2));
			return;
		}

		// Display as formatted output
		console.log(chalk.blue.bold(`\n📄 PRD Source for Task ${taskId}: ${chalk.white(task.title)}`));
		console.log(chalk.gray('═'.repeat(80)));

		const table = new Table({
			style: {
				head: [],
				border: [],
				compact: false
			},
			colWidths: [20, 60],
			wordWrap: true
		});

		table.push(
			[chalk.cyan.bold('PRD File:'), chalk.white(task.prdSource.fileName)],
			[chalk.cyan.bold('File Path:'), chalk.gray(task.prdSource.filePath)],
			[chalk.cyan.bold('Parsed Date:'), chalk.gray(new Date(task.prdSource.parsedDate).toLocaleString())],
			[chalk.cyan.bold('File Size:'), chalk.gray(`${Math.round(task.prdSource.fileSize / 1024)}KB (${task.prdSource.fileSize} bytes)`)],
			[chalk.cyan.bold('File Hash:'), chalk.gray(task.prdSource.fileHash)]
		);

		console.log(table.toString());

		// Check if PRD file still exists
		if (fs.existsSync(task.prdSource.filePath)) {
			console.log(chalk.green('\n✓ PRD file still exists at the original location'));
		} else {
			console.log(chalk.red('\n✗ PRD file no longer exists at the original location'));
		}

	} catch (error) {
		console.error(chalk.red(`Error showing PRD source: ${error.message}`));
		log('error', `showPRDSource error: ${error.message}`);
	}
}

/**
 * Get color function for task status
 * @param {string} status - Task status
 * @returns {Function} Chalk color function
 */
function getStatusColor(status) {
	switch (status) {
		case 'done':
		case 'completed':
			return chalk.green;
		case 'in-progress':
			return chalk.blue;
		case 'blocked':
			return chalk.red;
		case 'deferred':
		case 'cancelled':
			return chalk.gray;
		case 'pending':
		default:
			return chalk.yellow;
	}
}

/**
 * Get color function for task priority
 * @param {string} priority - Task priority
 * @returns {Function} Chalk color function
 */
function getPriorityColor(priority) {
	switch (priority) {
		case 'high':
			return chalk.red;
		case 'low':
			return chalk.green;
		case 'medium':
		default:
			return chalk.yellow;
	}
}
