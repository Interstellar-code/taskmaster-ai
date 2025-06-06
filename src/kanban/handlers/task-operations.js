/**
 * Task Operations Handler for Kanban Board
 * Handles quick task operations like view, delete, edit, etc.
 */

import chalk from 'chalk';
import fs from 'fs';
import { readJSON } from '../../../scripts/modules/utils.js';

/**
 * TaskOperationsHandler class for managing task operations
 */
export class TaskOperationsHandler {
	constructor(kanbanBoard) {
		this.kanbanBoard = kanbanBoard;
		this.projectRoot = kanbanBoard.projectRoot;
		this.tasksPath = kanbanBoard.tasksPath;
		this.operationHistory = [];
		this.maxHistorySize = 10;
	}

	/**
	 * View detailed task information (V key)
	 * @param {Object} task - Task to view
	 */
	async viewTaskDetails(task) {
		if (!task) {
			return { success: false, reason: 'No task provided' };
		}

		try {
			// Clear screen and show detailed task info
			console.clear();

			console.log(chalk.blue.bold(`\n╭─── Task Details ───╮`));
			console.log(chalk.blue(`│ ID: ${chalk.white.bold(`#${task.id}`)}`));
			console.log(
				chalk.blue(`│ Title: ${chalk.white(task.title || 'Untitled Task')}`)
			);
			console.log(
				chalk.blue(`│ Status: ${this.getStatusDisplay(task.status)}`)
			);
			console.log(
				chalk.blue(`│ Priority: ${this.getPriorityDisplay(task.priority)}`)
			);

			if (task.dependencies && task.dependencies.length > 0) {
				console.log(
					chalk.blue(
						`│ Dependencies: ${chalk.yellow(task.dependencies.join(', '))}`
					)
				);
			}

			if (task.prdSource) {
				console.log(
					chalk.blue(
						`│ PRD Source: ${chalk.cyan(task.prdSource.fileName || 'Unknown')}`
					)
				);
			}

			if (task.subtasks && task.subtasks.length > 0) {
				console.log(
					chalk.blue(`│ Subtasks: ${chalk.magenta(task.subtasks.length)}`)
				);
			}

			console.log(chalk.blue(`╰${'─'.repeat(20)}╯`));

			if (task.description) {
				console.log(chalk.white('\nDescription:'));
				console.log(chalk.gray(this.wrapText(task.description, 60)));
			}

			if (task.details) {
				console.log(chalk.white('\nDetails:'));
				console.log(chalk.gray(this.wrapText(task.details, 60)));
			}

			if (task.testStrategy) {
				console.log(chalk.white('\nTest Strategy:'));
				console.log(chalk.gray(this.wrapText(task.testStrategy, 60)));
			}

			console.log(chalk.dim('\nPress any key to return to board...'));

			// Wait for user input
			await this.waitForKeyPress();

			this.addToHistory('view', task.id);

			return { success: true, task, waitedForInput: true };
		} catch (error) {
			return { success: false, reason: error.message };
		}
	}

	/**
	 * Wait for user to press any key
	 */
	async waitForKeyPress() {
		return new Promise((resolve) => {
			const stdin = process.stdin;
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding('utf8');

			const onData = () => {
				stdin.setRawMode(false);
				stdin.pause();
				stdin.removeListener('data', onData);
				resolve();
			};

			stdin.on('data', onData);
		});
	}

	/**
	 * Delete a task with confirmation (D key)
	 * @param {Object} task - Task to delete
	 */
	async deleteTask(task) {
		if (!task) {
			return { success: false, reason: 'No task provided' };
		}

		try {
			// Show confirmation prompt
			console.log(chalk.red.bold(`\n⚠️  Delete Task #${task.id}?`));
			console.log(chalk.white(`Title: ${task.title}`));
			console.log(chalk.yellow('This action cannot be undone!'));
			console.log(chalk.dim('Press Y to confirm, any other key to cancel...'));

			// Note: In a full implementation, we'd wait for user input here
			// For now, we'll just show the confirmation and return

			this.addToHistory('delete_attempt', task.id);

			return {
				success: false,
				reason: 'Delete confirmation required (full implementation pending)',
				requiresConfirmation: true
			};
		} catch (error) {
			return { success: false, reason: error.message };
		}
	}

	/**
	 * Edit task title inline (E key)
	 * @param {Object} task - Task to edit
	 */
	async editTaskTitle(task) {
		if (!task) {
			return { success: false, reason: 'No task provided' };
		}

		try {
			console.log(chalk.blue(`\n✏️  Edit Task #${task.id} Title`));
			console.log(chalk.gray(`Current: ${task.title}`));
			console.log(chalk.dim('Enter new title (or press Enter to cancel):'));

			// Note: In a full implementation, we'd capture user input here
			// For now, we'll just show the edit prompt

			this.addToHistory('edit_attempt', task.id);

			return {
				success: false,
				reason:
					'Title editing requires input capture (full implementation pending)',
				requiresInput: true
			};
		} catch (error) {
			return { success: false, reason: error.message };
		}
	}

	/**
	 * Show task ID and metadata in status bar (I key)
	 * @param {Object} task - Task to show info for
	 */
	showTaskInfo(task) {
		if (!task) {
			return { success: false, reason: 'No task provided' };
		}

		try {
			const info = [];

			info.push(`ID: #${task.id}`);
			info.push(`Status: ${task.status}`);
			info.push(`Priority: ${task.priority || 'none'}`);

			if (task.dependencies && task.dependencies.length > 0) {
				info.push(`Deps: ${task.dependencies.length}`);
			}

			if (task.subtasks && task.subtasks.length > 0) {
				info.push(`Subtasks: ${task.subtasks.length}`);
			}

			if (task.prdSource) {
				info.push(`PRD: ${task.prdSource.fileName || 'Yes'}`);
			}

			const infoText = info.join(' | ');
			console.log(chalk.cyan(`\n📋 ${infoText}`));

			this.addToHistory('info', task.id);

			return { success: true, info: infoText };
		} catch (error) {
			return { success: false, reason: error.message };
		}
	}

	/**
	 * Refresh board from tasks.json (R key)
	 */
	async refreshBoard() {
		try {
			console.log(chalk.blue('🔄 Refreshing board...'));

			// Reload tasks from file
			await this.kanbanBoard.loadTasks();

			console.log(chalk.green('✅ Board refreshed'));

			this.addToHistory('refresh', null);

			return { success: true };
		} catch (error) {
			return { success: false, reason: error.message };
		}
	}

	/**
	 * Get status display with colors
	 * @param {string} status - Task status
	 */
	getStatusDisplay(status) {
		const statusMap = {
			pending: chalk.yellow('📋 Pending'),
			'in-progress': chalk.blue('🔄 In Progress'),
			done: chalk.green('✅ Done'),
			blocked: chalk.red('🚫 Blocked'),
			deferred: chalk.gray('⏸️ Deferred'),
			cancelled: chalk.red('❌ Cancelled')
		};

		return statusMap[status] || chalk.gray(`❓ ${status}`);
	}

	/**
	 * Get priority display with colors
	 * @param {string} priority - Task priority
	 */
	getPriorityDisplay(priority) {
		const priorityMap = {
			high: chalk.red('🔴 High'),
			medium: chalk.yellow('🟡 Medium'),
			low: chalk.green('🟢 Low')
		};

		return priorityMap[priority] || chalk.gray(`⚪ ${priority || 'None'}`);
	}

	/**
	 * Wrap text to specified width
	 * @param {string} text - Text to wrap
	 * @param {number} width - Maximum width
	 */
	wrapText(text, width = 60) {
		if (!text) return '';

		const words = text.split(' ');
		const lines = [];
		let currentLine = '';

		for (const word of words) {
			if ((currentLine + word).length <= width) {
				currentLine += (currentLine ? ' ' : '') + word;
			} else {
				if (currentLine) {
					lines.push(currentLine);
				}
				currentLine = word;
			}
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		return lines.join('\n');
	}

	/**
	 * Add operation to history
	 * @param {string} operation - Operation type
	 * @param {number} taskId - Task ID (if applicable)
	 */
	addToHistory(operation, taskId) {
		this.operationHistory.push({
			operation,
			taskId,
			timestamp: Date.now(),
			date: new Date().toISOString()
		});

		// Keep history size manageable
		if (this.operationHistory.length > this.maxHistorySize) {
			this.operationHistory.shift();
		}
	}

	/**
	 * Get operation history
	 */
	getHistory() {
		return [...this.operationHistory];
	}

	/**
	 * Get recent operations
	 * @param {number} limit - Number of recent operations to return
	 */
	getRecentOperations(limit = 5) {
		return this.operationHistory.slice(-limit).reverse();
	}

	/**
	 * Clear operation history
	 */
	clearHistory() {
		this.operationHistory = [];
	}
}

/**
 * Create a task operations handler instance
 */
export function createTaskOperationsHandler(kanbanBoard) {
	return new TaskOperationsHandler(kanbanBoard);
}
