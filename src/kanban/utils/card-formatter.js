/**
 * Card Formatter Utilities
 * Utilities for formatting and truncating task card content
 */

import chalk from 'chalk';
import { stripAnsi, truncateText } from './terminal-utils.js';

/**
 * Format task title with proper truncation and styling
 */
export function formatTaskTitle(title, maxWidth, taskId) {
	const idText = chalk.cyan.bold(`#${taskId}`);
	const idLength = stripAnsi(idText).length;
	const availableWidth = maxWidth - idLength - 1; // -1 for space

	if (availableWidth <= 0) {
		return idText;
	}

	const truncatedTitle = truncateText(title || 'Untitled Task', availableWidth);
	return `${idText} ${truncatedTitle}`;
}

/**
 * Format priority with appropriate colors and symbols
 */
export function formatPriority(priority, compact = false) {
	const priorityMap = {
		high: {
			symbol: '🔴',
			color: chalk.red,
			text: compact ? 'H' : 'High',
			bgColor: chalk.bgRed.white
		},
		medium: {
			symbol: '🟡',
			color: chalk.yellow,
			text: compact ? 'M' : 'Med',
			bgColor: chalk.bgYellow.black
		},
		low: {
			symbol: '🟢',
			color: chalk.green,
			text: compact ? 'L' : 'Low',
			bgColor: chalk.bgGreen.white
		}
	};

	const config = priorityMap[priority] || {
		symbol: '⚪',
		color: chalk.gray,
		text: compact ? '?' : 'None',
		bgColor: chalk.bgGray.white
	};

	if (compact) {
		return `${config.symbol}${config.color(config.text)}`;
	}

	return `${config.symbol} ${config.color(config.text)}`;
}

/**
 * Format dependencies count with status indicators
 */
export function formatDependencies(dependencies, compact = false) {
	if (!dependencies || dependencies.length === 0) {
		return '';
	}

	const count = dependencies.length;
	const text = compact ? `D:${count}` : `Deps: ${count}`;

	// Color based on dependency count (more deps = more complex)
	if (count > 3) {
		return chalk.red(text);
	} else if (count > 1) {
		return chalk.yellow(text);
	} else {
		return chalk.gray(text);
	}
}

/**
 * Format PRD source indicator
 */
export function formatPrdSource(prdSource, compact = false) {
	if (!prdSource) {
		return '';
	}

	if (compact) {
		return chalk.blue('📄');
	}

	const fileName = prdSource.fileName || 'PRD';
	return chalk.blue('📄 ') + chalk.gray(truncateText(fileName, 15));
}

/**
 * Format subtasks count
 */
export function formatSubtasks(subtasks, compact = false) {
	if (!subtasks || subtasks.length === 0) {
		return '';
	}

	const count = subtasks.length;
	const text = compact ? `S:${count}` : `Sub: ${count}`;

	return chalk.magenta(text);
}

/**
 * Format task status with appropriate styling
 */
export function formatStatus(status) {
	const statusMap = {
		pending: { emoji: '📋', color: chalk.yellow, name: 'PENDING' },
		'in-progress': { emoji: '🔄', color: chalk.blue, name: 'IN PROGRESS' },
		done: { emoji: '✅', color: chalk.green, name: 'DONE' },
		blocked: { emoji: '🚫', color: chalk.red, name: 'BLOCKED' },
		deferred: { emoji: '⏸️', color: chalk.gray, name: 'DEFERRED' },
		cancelled: { emoji: '❌', color: chalk.red, name: 'CANCELLED' }
	};

	const config = statusMap[status] || statusMap['pending'];
	return {
		emoji: config.emoji,
		color: config.color,
		name: config.name,
		formatted: `${config.emoji} ${config.color(config.name)}`
	};
}

/**
 * Create a metadata line for a task card
 */
export function createMetadataLine(task, maxWidth, compact = false) {
	const metadata = [];

	// Priority
	const priority = formatPriority(task.priority, compact);
	if (priority) metadata.push(priority);

	// Dependencies
	const deps = formatDependencies(task.dependencies, compact);
	if (deps) metadata.push(deps);

	// PRD source
	const prd = formatPrdSource(task.prdSource, compact);
	if (prd) metadata.push(prd);

	// Subtasks
	const subtasks = formatSubtasks(task.subtasks, compact);
	if (subtasks) metadata.push(subtasks);

	const metadataText = metadata.join(' ');
	return truncateText(metadataText, maxWidth);
}

/**
 * Calculate the display width needed for a task card
 */
export function calculateCardWidth(task, includeMetadata = true) {
	let width = 0;

	// ID and title
	const idLength = `#${task.id}`.length;
	const titleLength = (task.title || 'Untitled Task').length;
	width = Math.max(width, idLength + titleLength + 1);

	if (includeMetadata) {
		// Metadata line
		const metadataLength = stripAnsi(
			createMetadataLine(task, 100, false)
		).length;
		width = Math.max(width, metadataLength);
	}

	// Add padding for borders
	return width + 4; // +4 for borders and padding
}

/**
 * Fit text within a specific width with proper truncation
 */
export function fitTextToWidth(text, width, ellipsis = '...') {
	const textLength = stripAnsi(text).length;

	if (textLength <= width) {
		return text;
	}

	return truncateText(text, width, ellipsis);
}

/**
 * Create a progress indicator for task completion
 */
export function createProgressIndicator(completed, total, width = 10) {
	if (total === 0) return '';

	const percentage = Math.round((completed / total) * 100);
	const filledWidth = Math.round((completed / total) * width);
	const emptyWidth = width - filledWidth;

	const filled = '█'.repeat(filledWidth);
	const empty = '░'.repeat(emptyWidth);

	return (
		chalk.green(filled) + chalk.gray(empty) + chalk.white(` ${percentage}%`)
	);
}

/**
 * Format a task description with word wrapping
 */
export function formatDescription(description, width, maxLines = 3) {
	if (!description) return [];

	const words = description.split(' ');
	const lines = [];
	let currentLine = '';

	for (const word of words) {
		if (lines.length >= maxLines) break;

		const testLine = currentLine ? `${currentLine} ${word}` : word;

		if (stripAnsi(testLine).length <= width) {
			currentLine = testLine;
		} else {
			if (currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				// Word is too long, truncate it
				lines.push(truncateText(word, width));
				currentLine = '';
			}
		}
	}

	if (currentLine && lines.length < maxLines) {
		lines.push(currentLine);
	}

	return lines;
}

/**
 * Create a compact task summary for narrow displays
 */
export function createCompactSummary(task, maxWidth) {
	const id = chalk.cyan(`#${task.id}`);
	const priority = formatPriority(task.priority, true);
	const deps = formatDependencies(task.dependencies, true);
	const prd = formatPrdSource(task.prdSource, true);

	const parts = [id, priority, deps, prd].filter(Boolean);
	const prefix = parts.join(' ');
	const prefixLength = stripAnsi(prefix).length;

	const availableWidth = maxWidth - prefixLength - 1; // -1 for space
	const title = truncateText(task.title || 'Untitled', availableWidth);

	return `${prefix} ${title}`;
}
