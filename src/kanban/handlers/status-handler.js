/**
 * Status Handler for Kanban Board
 * Manages task status updates and persistence
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { readJSON } from '../../../scripts/modules/utils.js';

/**
 * StatusHandler class for managing task status updates
 */
export class StatusHandler {
	constructor(kanbanBoard) {
		this.kanbanBoard = kanbanBoard;
		this.projectRoot = kanbanBoard.projectRoot;
		this.tasksPath = kanbanBoard.tasksPath;
		this.validStatuses = ['pending', 'in-progress', 'done'];
		this.statusHistory = [];
		this.maxHistorySize = 20;
	}

	/**
	 * Move a task to a different status
	 * @param {Object} task - Task to move
	 * @param {string} newStatus - Target status
	 */
	async moveTaskToStatus(task, newStatus) {
		if (!task) {
			return { success: false, reason: 'No task provided' };
		}

		if (!this.validStatuses.includes(newStatus)) {
			return { success: false, reason: `Invalid status: ${newStatus}` };
		}

		const oldStatus = task.status;
		if (oldStatus === newStatus) {
			return { success: false, reason: `Task is already ${newStatus}` };
		}

		try {
			// Add to history before making changes
			this.addToHistory(task.id, oldStatus, newStatus);

			// Update task status in memory
			task.status = newStatus;

			// Update the tasks array in the kanban board
			const taskIndex = this.kanbanBoard.tasks.findIndex(
				(t) => t.id === task.id
			);
			if (taskIndex !== -1) {
				this.kanbanBoard.tasks[taskIndex].status = newStatus;
			}

			// Persist changes to file
			await this.saveTasks();

			// Reload tasks into board layout
			this.kanbanBoard.boardLayout.loadTasks(this.kanbanBoard.tasks);

			return {
				success: true,
				taskId: task.id,
				oldStatus,
				newStatus,
				message: `Task #${task.id} moved from ${oldStatus} to ${newStatus}`
			};
		} catch (error) {
			// Revert the change if save failed
			task.status = oldStatus;

			return {
				success: false,
				reason: `Failed to update task status: ${error.message}`,
				error
			};
		}
	}

	/**
	 * Move the currently selected task to a status
	 * @param {string} newStatus - Target status
	 */
	async moveSelectedTaskToStatus(newStatus) {
		const selectedTask = this.kanbanBoard.boardLayout.getSelectedTask();

		if (!selectedTask) {
			return { success: false, reason: 'No task selected' };
		}

		return await this.moveTaskToStatus(selectedTask, newStatus);
	}

	/**
	 * Batch update multiple tasks
	 * @param {Array} taskIds - Array of task IDs to update
	 * @param {string} newStatus - Target status
	 */
	async batchUpdateStatus(taskIds, newStatus) {
		if (!this.validStatuses.includes(newStatus)) {
			return { success: false, reason: `Invalid status: ${newStatus}` };
		}

		const results = [];
		let successCount = 0;
		let errorCount = 0;

		for (const taskId of taskIds) {
			const task = this.kanbanBoard.tasks.find((t) => t.id === taskId);
			if (task) {
				const result = await this.moveTaskToStatus(task, newStatus);
				results.push({ taskId, ...result });

				if (result.success) {
					successCount++;
				} else {
					errorCount++;
				}
			} else {
				results.push({
					taskId,
					success: false,
					reason: `Task #${taskId} not found`
				});
				errorCount++;
			}
		}

		return {
			success: errorCount === 0,
			successCount,
			errorCount,
			totalTasks: taskIds.length,
			results
		};
	}

	/**
	 * Save tasks back to tasks.json
	 */
	async saveTasks() {
		try {
			const data = readJSON(this.tasksPath);
			data.tasks = this.kanbanBoard.tasks;

			// Update metadata
			data.meta = data.meta || {};
			data.meta.updatedAt = new Date().toISOString();

			// Write back to file
			fs.writeFileSync(this.tasksPath, JSON.stringify(data, null, 2));

			return { success: true };
		} catch (error) {
			throw new Error(`Failed to save tasks: ${error.message}`);
		}
	}

	/**
	 * Validate task dependencies before status change
	 * @param {Object} task - Task to validate
	 * @param {string} newStatus - Target status
	 */
	validateDependencies(task, newStatus) {
		if (newStatus !== 'done') {
			return { valid: true };
		}

		// Check if all dependencies are completed
		if (task.dependencies && task.dependencies.length > 0) {
			const incompleteDeps = [];

			for (const depId of task.dependencies) {
				const depTask = this.kanbanBoard.tasks.find((t) => t.id === depId);
				if (depTask && depTask.status !== 'done') {
					incompleteDeps.push(depId);
				}
			}

			if (incompleteDeps.length > 0) {
				return {
					valid: false,
					reason: `Cannot mark as done: dependencies not completed`,
					incompleteDependencies: incompleteDeps
				};
			}
		}

		return { valid: true };
	}

	/**
	 * Get tasks that depend on a given task
	 * @param {number} taskId - Task ID to check
	 */
	getDependentTasks(taskId) {
		return this.kanbanBoard.tasks.filter(
			(task) => task.dependencies && task.dependencies.includes(taskId)
		);
	}

	/**
	 * Add status change to history
	 * @param {number} taskId - Task ID
	 * @param {string} oldStatus - Previous status
	 * @param {string} newStatus - New status
	 */
	addToHistory(taskId, oldStatus, newStatus) {
		this.statusHistory.push({
			taskId,
			oldStatus,
			newStatus,
			timestamp: Date.now(),
			date: new Date().toISOString()
		});

		// Keep history size manageable
		if (this.statusHistory.length > this.maxHistorySize) {
			this.statusHistory.shift();
		}
	}

	/**
	 * Get status change history
	 */
	getHistory() {
		return [...this.statusHistory];
	}

	/**
	 * Get recent status changes
	 * @param {number} limit - Number of recent changes to return
	 */
	getRecentChanges(limit = 5) {
		return this.statusHistory.slice(-limit).reverse();
	}

	/**
	 * Undo the last status change
	 */
	async undoLastChange() {
		if (this.statusHistory.length === 0) {
			return { success: false, reason: 'No status changes to undo' };
		}

		const lastChange = this.statusHistory.pop();
		const task = this.kanbanBoard.tasks.find((t) => t.id === lastChange.taskId);

		if (!task) {
			return { success: false, reason: `Task #${lastChange.taskId} not found` };
		}

		try {
			// Revert the status
			task.status = lastChange.oldStatus;

			// Update the tasks array
			const taskIndex = this.kanbanBoard.tasks.findIndex(
				(t) => t.id === task.id
			);
			if (taskIndex !== -1) {
				this.kanbanBoard.tasks[taskIndex].status = lastChange.oldStatus;
			}

			// Save changes
			await this.saveTasks();

			// Reload board
			this.kanbanBoard.boardLayout.loadTasks(this.kanbanBoard.tasks);

			return {
				success: true,
				taskId: lastChange.taskId,
				revertedFrom: lastChange.newStatus,
				revertedTo: lastChange.oldStatus,
				message: `Reverted task #${lastChange.taskId} from ${lastChange.newStatus} to ${lastChange.oldStatus}`
			};
		} catch (error) {
			// Re-add to history if revert failed
			this.statusHistory.push(lastChange);

			return {
				success: false,
				reason: `Failed to undo status change: ${error.message}`,
				error
			};
		}
	}

	/**
	 * Get status statistics
	 */
	getStatusStatistics() {
		const stats = {
			pending: 0,
			'in-progress': 0,
			done: 0,
			total: this.kanbanBoard.tasks.length
		};

		this.kanbanBoard.tasks.forEach((task) => {
			const status = task.status || 'pending';
			if (stats.hasOwnProperty(status)) {
				stats[status]++;
			}
		});

		stats.completionPercentage =
			stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

		return stats;
	}

	/**
	 * Clear status history
	 */
	clearHistory() {
		this.statusHistory = [];
	}

	/**
	 * Get valid status options
	 */
	getValidStatuses() {
		return [...this.validStatuses];
	}
}

/**
 * Create a status handler instance
 */
export function createStatusHandler(kanbanBoard) {
	return new StatusHandler(kanbanBoard);
}
