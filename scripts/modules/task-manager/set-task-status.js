import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';

import { log, readJSON, writeJSON, findTaskById } from '../utils.js';
import { displayBanner } from '../ui.js';
import { validateTaskDependencies } from '../dependency-manager.js';
import { getDebugFlag } from '../config-manager.js';
import updateSingleTaskStatus from './update-single-task-status.js';
import generateTaskFiles from './generate-task-files.js';
import {
	isValidTaskStatus,
	TASK_STATUS_OPTIONS
} from '../../../src/constants/task-status.js';
import { updatePrdStatusBasedOnTasks } from '../prd-manager/prd-status-automation.js';
import { readPrdsMetadata } from '../prd-manager/prd-utils.js';

/**
 * Set the status of a task
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {string} taskIdInput - Task ID(s) to update
 * @param {string} newStatus - New status
 * @param {Object} options - Additional options (mcpLog for MCP mode)
 * @returns {Object|undefined} Result object in MCP mode, undefined in CLI mode
 */
async function setTaskStatus(tasksPath, taskIdInput, newStatus, options = {}) {
	try {
		if (!isValidTaskStatus(newStatus)) {
			throw new Error(
				`Error: Invalid status value: ${newStatus}. Use one of: ${TASK_STATUS_OPTIONS.join(', ')}`
			);
		}
		// Determine if we're in MCP mode by checking for mcpLog
		const isMcpMode = !!options?.mcpLog;

		// Only display UI elements if not in MCP mode
		if (!isMcpMode) {
			displayBanner();

			console.log(
				boxen(chalk.white.bold(`Updating Task Status to: ${newStatus}`), {
					padding: 1,
					borderColor: 'blue',
					borderStyle: 'round'
				})
			);
		}

		log('info', `Reading tasks from ${tasksPath}...`);
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			throw new Error(`No valid tasks found in ${tasksPath}`);
		}

		// Handle multiple task IDs (comma-separated)
		const taskIds = taskIdInput.split(',').map((id) => id.trim());
		const updatedTasks = [];

		// Update each task
		for (const id of taskIds) {
			await updateSingleTaskStatus(tasksPath, id, newStatus, data, !isMcpMode);
			updatedTasks.push(id);
		}

		// Write the updated tasks to the file
		writeJSON(tasksPath, data);

		// Validate dependencies after status update
		log('info', 'Validating dependencies after status update...');
		validateTaskDependencies(data.tasks);

		// Generate individual task files
		log('info', 'Regenerating task files...');
		await generateTaskFiles(tasksPath, path.dirname(tasksPath), {
			mcpLog: options.mcpLog
		});

		// Auto-update PRD status based on task status changes
		try {
			await updatePrdStatusForChangedTasks(updatedTasks, newStatus, tasksPath, options, data);
		} catch (error) {
			log('warn', `PRD auto-update failed: ${error.message}`);
		}

		// Display success message - only in CLI mode
		if (!isMcpMode) {
			for (const id of updatedTasks) {
				const taskResult = findTaskById(data.tasks, id);
				const task = taskResult.task;
				const taskName = task ? task.title : id;

				console.log(
					boxen(
						chalk.white.bold(`Successfully updated task ${id} status:`) +
							'\n' +
							`From: ${chalk.yellow(task ? task.status : 'unknown')}\n` +
							`To:   ${chalk.green(newStatus)}`,
						{ padding: 1, borderColor: 'green', borderStyle: 'round' }
					)
				);
			}
		}

		// Return success value for programmatic use
		return {
			success: true,
			updatedTasks: updatedTasks.map((id) => ({
				id,
				status: newStatus
			}))
		};
	} catch (error) {
		log('error', `Error setting task status: ${error.message}`);

		// Only show error UI in CLI mode
		if (!options?.mcpLog) {
			console.error(chalk.red(`Error: ${error.message}`));

			// Pass session to getDebugFlag
			if (getDebugFlag(options?.session)) {
				// Use getter
				console.error(error);
			}

			process.exit(1);
		} else {
			// In MCP mode, throw the error for the caller to handle
			throw error;
		}
	}
}

/**
 * Auto-update PRD status when task status changes
 * @param {Array} updatedTaskIds - Array of task IDs that were updated
 * @param {string} newStatus - The new status that was set
 * @param {string} tasksPath - Path to tasks.json
 * @param {Object} options - Options object
 */
async function updatePrdStatusForChangedTasks(updatedTaskIds, newStatus, tasksPath, options = {}, tasksData = null) {
	try {
		log('info', `PRD auto-update triggered for tasks: ${updatedTaskIds.join(', ')} with status: ${newStatus}`);

		// Only trigger PRD status updates for specific status changes
		const triggerStatuses = ['in-progress', 'done', 'pending'];
		if (!triggerStatuses.includes(newStatus)) {
			log('info', `Skipping PRD auto-update - status '${newStatus}' not in trigger list`);
			return;
		}

		const isMcpMode = !!options?.mcpLog;
		const projectRoot = path.dirname(path.dirname(path.dirname(tasksPath)));
		const prdsPath = path.join(projectRoot, '.taskmaster', 'prd', 'prds.json');

		// Check if PRDs metadata file exists
		try {
			const prdsData = readPrdsMetadata(prdsPath);
			if (!prdsData || !prdsData.prds || prdsData.prds.length === 0) {
				// No PRDs to update
				return;
			}
		} catch (error) {
			// PRDs file doesn't exist or is invalid, skip PRD updates
			log('debug', 'No PRDs metadata found, skipping PRD status updates');
			return;
		}

		// Find PRDs that are linked to the updated tasks
		const data = tasksData || readJSON(tasksPath);
		const affectedPrdIds = new Set();

		for (const taskId of updatedTaskIds) {
			const taskResult = findTaskById(data.tasks, taskId);
			const task = taskResult.task;
			log('info', `Checking task ${taskId}: ${task ? 'found' : 'not found'}`);

			if (task && task.prdSource && task.prdSource.fileName) {
				// Extract PRD ID from fileName (format: "prd_kanban_webapp.md" -> "prd_001")
				const fileName = task.prdSource.fileName;
				log('info', `Task ${taskId} has PRD source: ${fileName}`);

				// Try to match the PRD by fileName to get the actual PRD ID
				const prdsData = readPrdsMetadata(prdsPath);
				const matchingPrd = prdsData.prds.find(prd => prd.fileName === fileName);
				if (matchingPrd) {
					log('info', `Found matching PRD: ${matchingPrd.id} for file: ${fileName}`);
					affectedPrdIds.add(matchingPrd.id);
				} else {
					log('info', `No matching PRD found for file: ${fileName}`);
				}
			} else {
				log('info', `Task ${taskId} has no PRD source or fileName`);
			}
		}

		// Update status for each affected PRD
		for (const prdId of affectedPrdIds) {
			try {
				const updateResult = updatePrdStatusBasedOnTasks(prdId, tasksPath, prdsPath, {
					allowManualOverride: false // Don't override manual status changes
				});

				if (updateResult.success && updateResult.data.changed) {
					const { previousStatus, newStatus: prdNewStatus } = updateResult.data;

					if (!isMcpMode) {
						console.log(
							boxen(
								chalk.blue.bold(`📋 PRD Auto-Update`) +
								'\n\n' +
								chalk.white(`PRD ${prdId} status automatically updated:`) +
								'\n' +
								chalk.white(`From: ${chalk.yellow(previousStatus)}`) +
								'\n' +
								chalk.white(`To:   ${chalk.green(prdNewStatus)}`) +
								'\n\n' +
								chalk.gray(`Triggered by task ${updatedTaskIds.join(', ')} → ${newStatus}`),
								{
									padding: 1,
									borderColor: 'blue',
									borderStyle: 'round',
									margin: { top: 1 }
								}
							)
						);
					}

					log('info', `Auto-updated PRD ${prdId} status from ${previousStatus} to ${prdNewStatus} due to task status change`);
				}
			} catch (error) {
				log('warn', `Failed to auto-update PRD ${prdId} status: ${error.message}`);
			}
		}

	} catch (error) {
		log('warn', `Error in PRD auto-status update: ${error.message}`);
		// Don't fail the main task status update if PRD update fails
	}
}

export default setTaskStatus;
