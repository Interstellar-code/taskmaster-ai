/**
 * PRD Status Handler
 * Following the exact same pattern as task Kanban status handler
 */

import chalk from 'chalk';
import { writeJSON, readJSON } from '../../../scripts/modules/utils.js';
import path from 'path';
import fs from 'fs';

/**
 * PRD Status Handler class
 */
export class PRDStatusHandler {
	constructor(board) {
		this.board = board;
		this.projectRoot = board.projectRoot;
		this.prdsPath = board.prdsPath;
	}

	/**
	 * Move PRD to different status
	 */
	async movePRDToStatus(targetStatus) {
		const selectedPRD = this.board.getSelectedPRD();
		if (!selectedPRD) {
			return {
				success: false,
				message: 'No PRD selected'
			};
		}

		if (selectedPRD.status === targetStatus) {
			return {
				success: true,
				message: `PRD ${selectedPRD.id} is already in ${targetStatus} status`,
				noChange: true
			};
		}

		try {
			// Update PRD status in memory
			const oldStatus = selectedPRD.status;
			selectedPRD.status = targetStatus;
			selectedPRD.lastModified = new Date().toISOString();

			// If moving to "done" status, also mark all linked tasks as done
			let tasksUpdated = 0;
			if (targetStatus === 'done') {
				tasksUpdated = await this.markLinkedTasksAsDone(selectedPRD.id);
			}

			// Update PRD in the JSON file
			await this.updatePRDInFile(selectedPRD);

			// Update board layout
			await this.board.loadPRDs();

			// Navigate to the moved PRD in its new column
			this.board.navigationHandler.navigateToPRD(selectedPRD.id);

			const message = tasksUpdated > 0 
				? `Moved PRD ${selectedPRD.id} from ${oldStatus} to ${targetStatus} and marked ${tasksUpdated} linked tasks as done`
				: `Moved PRD ${selectedPRD.id} from ${oldStatus} to ${targetStatus}`;

			return {
				success: true,
				message,
				oldStatus,
				newStatus: targetStatus,
				prd: selectedPRD,
				tasksUpdated
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to move PRD: ${error.message}`,
				error
			};
		}
	}

	/**
	 * Update PRD in the JSON file
	 */
	async updatePRDInFile(updatedPRD) {
		try {
			const prdsData = await readJSON(this.prdsPath);

			// Find and update the PRD
			const prdIndex = prdsData.prds.findIndex(
				(prd) => prd.id === updatedPRD.id
			);
			if (prdIndex === -1) {
				throw new Error(`PRD ${updatedPRD.id} not found in file`);
			}

			prdsData.prds[prdIndex] = { ...prdsData.prds[prdIndex], ...updatedPRD };
			prdsData.metadata.lastUpdated = new Date().toISOString();

			// Write back to file
			await writeJSON(this.prdsPath, prdsData);

			return true;
		} catch (error) {
			console.error(chalk.red('Error updating PRD in file:'), error.message);
			throw error;
		}
	}

	/**
	 * Mark all linked tasks as done when PRD is marked as done (using database)
	 */
	async markLinkedTasksAsDone(prdId) {
		try {
			// Import database module
			const { default: cliDatabase } = await import('../../../scripts/modules/database/cli-database.js');
			await cliDatabase.initialize();

			// Get all tasks from database
			const allTasks = await cliDatabase.getAllTasks();

			if (!allTasks || allTasks.length === 0) {
				console.log(chalk.yellow(`No tasks found in database`));
				return 0;
			}

			let updatedCount = 0;

			// Find and update tasks linked to this PRD
			for (const task of allTasks) {
				// Check if task is linked to this PRD
				const isLinked = (task.prdSource && task.prdSource === prdId) ||
					(task.prdSource && typeof task.prdSource === 'object' && task.prdSource.prdId === prdId) ||
					(task.prd_id && task.prd_id.toString() === prdId.toString());

				if (isLinked && task.status !== 'done') {
					// Update task status in database
					await cliDatabase.updateTaskStatus(task.task_identifier || task.id, 'done');
					updatedCount++;

					// Also mark subtasks as done
					const subtasks = await cliDatabase.getSubtasks(task.task_identifier || task.id);
					for (const subtask of subtasks) {
						if (subtask.status !== 'done') {
							await cliDatabase.updateTaskStatus(subtask.task_identifier || subtask.id, 'done');
							updatedCount++;
						}
					}
				}
			}

			if (updatedCount > 0) {
				console.log(chalk.green(`✅ Marked ${updatedCount} tasks as done for PRD ${prdId}`));
			}

			return updatedCount;
		} catch (error) {
			console.error(chalk.red('Error marking linked tasks as done:'), error.message);
			return 0;
		}
	}

	/**
	 * Get available status options
	 */
	getAvailableStatuses() {
		return [
			{ key: '1', status: 'pending', name: 'Pending', color: chalk.yellow },
			{
				key: '2',
				status: 'in-progress',
				name: 'In Progress',
				color: chalk.blue
			},
			{ key: '3', status: 'done', name: 'Done', color: chalk.green }
		];
	}

	/**
	 * Get status color
	 */
	getStatusColor(status) {
		const colors = {
			pending: chalk.yellow,
			'in-progress': chalk.blue,
			done: chalk.green
		};
		return colors[status] || chalk.white;
	}

	/**
	 * Get status display name
	 */
	getStatusDisplayName(status) {
		const names = {
			pending: 'Pending',
			'in-progress': 'In Progress',
			done: 'Done'
		};
		return names[status] || status;
	}

	/**
	 * Validate status
	 */
	isValidStatus(status) {
		return ['pending', 'in-progress', 'done'].includes(status);
	}

	/**
	 * Get PRD status statistics
	 */
	getStatusStatistics() {
		const allPRDs = this.board.getAllPRDs();
		const stats = {
			pending: 0,
			'in-progress': 0,
			done: 0,
			total: allPRDs.length
		};

		allPRDs.forEach((prd) => {
			const status = prd.status || 'pending';
			if (stats.hasOwnProperty(status)) {
				stats[status]++;
			}
		});

		return stats;
	}

	/**
	 * Get completion percentage
	 */
	getCompletionPercentage() {
		const stats = this.getStatusStatistics();
		if (stats.total === 0) return 0;
		return Math.round((stats.done / stats.total) * 100);
	}

	/**
	 * Bulk status update
	 */
	async bulkStatusUpdate(prdIds, targetStatus) {
		if (!this.isValidStatus(targetStatus)) {
			return {
				success: false,
				message: `Invalid status: ${targetStatus}`
			};
		}

		const results = [];
		let successCount = 0;
		let errorCount = 0;

		for (const prdId of prdIds) {
			try {
				// Find PRD in current data
				const prd = this.board.getAllPRDs().find((p) => p.id === prdId);
				if (!prd) {
					results.push({
						prdId,
						success: false,
						message: 'PRD not found'
					});
					errorCount++;
					continue;
				}

				// Update status
				prd.status = targetStatus;
				prd.lastModified = new Date().toISOString();

				// Update in file
				await this.updatePRDInFile(prd);

				results.push({
					prdId,
					success: true,
					message: `Updated to ${targetStatus}`
				});
				successCount++;
			} catch (error) {
				results.push({
					prdId,
					success: false,
					message: error.message
				});
				errorCount++;
			}
		}

		// Reload board data
		await this.board.loadPRDs();

		return {
			success: errorCount === 0,
			message: `Updated ${successCount} PRDs, ${errorCount} errors`,
			results,
			successCount,
			errorCount
		};
	}
}

/**
 * Create a PRD status handler instance
 */
export function createPRDStatusHandler(board) {
	return new PRDStatusHandler(board);
}
