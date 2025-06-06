/**
 * Status Bar Component
 * Displays status information and navigation hints at the bottom of the Kanban board
 */

import chalk from 'chalk';
import {
	getTerminalSize,
	truncateText,
	stripAnsi
} from '../utils/terminal-utils.js';

/**
 * StatusBar class for rendering the status bar
 */
export class StatusBar {
	constructor() {
		this.mode = 'normal'; // 'normal', 'filter', 'search', 'edit', 'help'
		this.message = '';
		this.messageTimeout = null;
		this.showProgress = false;
		this.progressValue = 0;
		this.progressMax = 100;
	}

	/**
	 * Render the status bar
	 * @param {Object} boardState - Current board state
	 */
	render(boardState = {}) {
		const { width } = getTerminalSize();
		const statusBarContent = this.buildStatusBarContent(boardState, width);

		// Create status bar with background color
		const statusBar = chalk.bgBlue.white(
			' ' + statusBarContent.padEnd(width - 2) + ' '
		);

		return statusBar;
	}

	/**
	 * Build status bar content based on current state
	 * @param {Object} boardState - Current board state
	 * @param {number} width - Available width
	 */
	buildStatusBarContent(boardState, width) {
		const parts = [];

		// Current selection info
		if (boardState.currentColumn) {
			parts.push(`Column: ${boardState.currentColumn.toUpperCase()}`);
		}

		if (boardState.selectedTask) {
			const taskInfo = `Task: #${boardState.selectedTask.id} - ${boardState.selectedTask.title}`;
			parts.push(truncateText(taskInfo, 40));
		}

		// Mode-specific information
		const modeInfo = this.getModeInfo(boardState);
		if (modeInfo) {
			parts.push(modeInfo);
		}

		// Navigation hints
		const navHints = this.getNavigationHints();
		if (navHints) {
			parts.push(navHints);
		}

		// Join parts with separators
		let content = parts.join(' | ');

		// Add temporary message if present
		if (this.message) {
			content = `${this.message} | ${content}`;
		}

		// Add progress bar if enabled
		if (this.showProgress) {
			const progressBar = this.createProgressBar(20);
			content = `${progressBar} | ${content}`;
		}

		// Truncate to fit width
		return truncateText(content, width - 2);
	}

	/**
	 * Get mode-specific information
	 * @param {Object} boardState - Current board state
	 */
	getModeInfo(boardState) {
		switch (this.mode) {
			case 'filter':
				const activeFilters = Object.keys(
					boardState.activeFilters || {}
				).length;
				return activeFilters > 0
					? chalk.yellow(`FILTER (${activeFilters} active)`)
					: chalk.yellow('FILTER MODE');

			case 'search':
				return boardState.searchQuery
					? chalk.cyan(`SEARCH: "${boardState.searchQuery}"`)
					: chalk.cyan('SEARCH MODE');

			case 'edit':
				return chalk.magenta('EDIT MODE');

			case 'help':
				return chalk.green('HELP MODE');

			default:
				// Show task counts
				if (boardState.statusCounts) {
					const counts = boardState.statusCounts;
					return `P:${counts.pending || 0} | I:${counts['in-progress'] || 0} | D:${counts.done || 0}`;
				}
				return null;
		}
	}

	/**
	 * Get navigation hints based on current mode
	 */
	getNavigationHints() {
		switch (this.mode) {
			case 'filter':
				return '1-5: Set Filter | C: Clear | ESC: Exit';

			case 'search':
				return 'Type to search | Enter: Apply | ESC: Exit';

			case 'edit':
				return 'Type to edit | Enter: Save | ESC: Cancel';

			case 'help':
				return 'PgUp/PgDn: Navigate | ESC: Close';

			default:
				return '←→: Columns | ↑↓: Tasks | 1-3: Move | H: Help | Q: Quit';
		}
	}

	/**
	 * Set the current mode
	 * @param {string} mode - Mode to set
	 */
	setMode(mode) {
		this.mode = mode;
	}

	/**
	 * Show a temporary message
	 * @param {string} message - Message to show
	 * @param {number} duration - Duration in milliseconds
	 */
	showMessage(message, duration = 3000) {
		this.message = message;

		// Clear any existing timeout
		if (this.messageTimeout) {
			clearTimeout(this.messageTimeout);
		}

		// Set timeout to clear message
		this.messageTimeout = setTimeout(() => {
			this.message = '';
			this.messageTimeout = null;
		}, duration);
	}

	/**
	 * Clear the current message
	 */
	clearMessage() {
		this.message = '';
		if (this.messageTimeout) {
			clearTimeout(this.messageTimeout);
			this.messageTimeout = null;
		}
	}

	/**
	 * Show progress bar
	 * @param {number} value - Current progress value
	 * @param {number} max - Maximum progress value
	 */
	showProgress(value, max = 100) {
		this.showProgress = true;
		this.progressValue = value;
		this.progressMax = max;
	}

	/**
	 * Hide progress bar
	 */
	hideProgress() {
		this.showProgress = false;
		this.progressValue = 0;
		this.progressMax = 100;
	}

	/**
	 * Create a progress bar
	 * @param {number} width - Width of progress bar
	 */
	createProgressBar(width = 20) {
		const percentage = Math.round(
			(this.progressValue / this.progressMax) * 100
		);
		const filledWidth = Math.round(
			(this.progressValue / this.progressMax) * width
		);
		const emptyWidth = width - filledWidth;

		const filled = '█'.repeat(filledWidth);
		const empty = '░'.repeat(emptyWidth);

		return (
			chalk.green(filled) + chalk.gray(empty) + chalk.white(` ${percentage}%`)
		);
	}

	/**
	 * Update progress
	 * @param {number} value - New progress value
	 */
	updateProgress(value) {
		this.progressValue = Math.min(value, this.progressMax);
	}

	/**
	 * Show success message
	 * @param {string} message - Success message
	 */
	showSuccess(message) {
		this.showMessage(chalk.green(`✓ ${message}`), 2000);
	}

	/**
	 * Show error message
	 * @param {string} message - Error message
	 */
	showError(message) {
		this.showMessage(chalk.red(`✗ ${message}`), 3000);
	}

	/**
	 * Show warning message
	 * @param {string} message - Warning message
	 */
	showWarning(message) {
		this.showMessage(chalk.yellow(`⚠ ${message}`), 2500);
	}

	/**
	 * Show info message
	 * @param {string} message - Info message
	 */
	showInfo(message) {
		this.showMessage(chalk.blue(`ℹ ${message}`), 2000);
	}

	/**
	 * Get current mode
	 */
	getMode() {
		return this.mode;
	}

	/**
	 * Check if message is showing
	 */
	hasMessage() {
		return !!this.message;
	}

	/**
	 * Check if progress is showing
	 */
	hasProgress() {
		return this.showProgress;
	}

	/**
	 * Reset status bar to default state
	 */
	reset() {
		this.mode = 'normal';
		this.clearMessage();
		this.hideProgress();
	}

	/**
	 * Get status bar height (always 1 line)
	 */
	getHeight() {
		return 1;
	}

	/**
	 * Create a minimal status bar for narrow terminals
	 * @param {Object} boardState - Current board state
	 * @param {number} width - Available width
	 */
	renderMinimal(boardState, width) {
		const parts = [];

		// Essential info only
		if (boardState.currentColumn) {
			parts.push(boardState.currentColumn.charAt(0).toUpperCase());
		}

		if (boardState.selectedTask) {
			parts.push(`#${boardState.selectedTask.id}`);
		}

		// Mode indicator
		if (this.mode !== 'normal') {
			parts.push(this.mode.charAt(0).toUpperCase());
		}

		// Basic navigation
		parts.push('H:Help Q:Quit');

		let content = parts.join('|');

		if (this.message) {
			content = `${this.message}|${content}`;
		}

		return chalk.bgBlue.white(
			' ' + truncateText(content, width - 2).padEnd(width - 2) + ' '
		);
	}
}

/**
 * Create a status bar instance
 */
export function createStatusBar() {
	return new StatusBar();
}
