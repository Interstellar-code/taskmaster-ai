/**
 * Task Card Component
 * Renders individual task cards with enhanced metadata display
 */

import chalk from 'chalk';
import {
	BOX_CHARS,
	createHorizontalLine,
	createVerticalLine,
	truncateText,
	stripAnsi,
	getPriorityDisplay
} from '../utils/terminal-utils.js';

/**
 * TaskCard class for rendering individual task cards
 */
export class TaskCard {
	constructor(task, width, isSelected = false) {
		this.task = task;
		this.width = width;
		this.isSelected = isSelected;
		this.contentWidth = width - 2; // Account for borders
	}

	/**
	 * Render the complete task card
	 */
	render() {
		const lines = [];

		// Top border
		lines.push(this.createTopBorder());

		// Task ID and title line
		lines.push(this.createTitleLine());

		// Priority and metadata line
		lines.push(this.createMetadataLine());

		// Dependencies line (if any)
		if (this.task.dependencies && this.task.dependencies.length > 0) {
			lines.push(this.createDependenciesLine());
		}

		// Bottom border
		lines.push(this.createBottomBorder());

		// Apply selection highlighting if needed
		if (this.isSelected) {
			return lines.map((line) => chalk.bgBlue.white(line));
		}

		return lines;
	}

	/**
	 * Create the top border of the card
	 */
	createTopBorder() {
		return createHorizontalLine(
			this.width,
			BOX_CHARS.topLeft,
			BOX_CHARS.topRight
		);
	}

	/**
	 * Create the bottom border of the card
	 */
	createBottomBorder() {
		return createHorizontalLine(
			this.width,
			BOX_CHARS.bottomLeft,
			BOX_CHARS.bottomRight
		);
	}

	/**
	 * Create the title line with task ID and title
	 */
	createTitleLine() {
		const idText = chalk.cyan.bold(`#${this.task.id}`);
		const idLength = stripAnsi(idText).length;

		// Calculate available space for title
		const availableSpace = this.contentWidth - idLength - 1; // -1 for space
		const titleText = this.task.title || 'Untitled Task';
		const truncatedTitle = truncateText(titleText, availableSpace);

		const content = `${idText} ${truncatedTitle}`;
		return createVerticalLine(content, this.width);
	}

	/**
	 * Create the metadata line with priority, PRD source, and other info
	 */
	createMetadataLine() {
		const metadata = [];

		// Priority display
		const priorityDisplay = getPriorityDisplay(this.task.priority);
		metadata.push(
			`${priorityDisplay.symbol} ${priorityDisplay.color(priorityDisplay.text)}`
		);

		// Dependencies count
		if (this.task.dependencies && this.task.dependencies.length > 0) {
			metadata.push(chalk.gray(`Deps: ${this.task.dependencies.length}`));
		}

		// PRD source indicator
		if (this.task.prdSource) {
			metadata.push(chalk.blue('📄 PRD'));
		}

		// Subtasks count
		if (this.task.subtasks && this.task.subtasks.length > 0) {
			metadata.push(chalk.magenta(`Sub: ${this.task.subtasks.length}`));
		}

		const metadataText = metadata.join(' ');
		const truncatedMetadata = truncateText(metadataText, this.contentWidth);

		return createVerticalLine(truncatedMetadata, this.width);
	}

	/**
	 * Create dependencies line showing dependency status
	 */
	createDependenciesLine() {
		const deps = this.task.dependencies || [];
		if (deps.length === 0) return '';

		const depText = deps
			.map((depId) => {
				// For now, just show the ID. In a full implementation,
				// we'd check the actual status of the dependency
				return chalk.yellow(`#${depId}`);
			})
			.join(', ');

		const content = chalk.gray('Depends on: ') + depText;
		const truncatedContent = truncateText(content, this.contentWidth);

		return createVerticalLine(truncatedContent, this.width);
	}

	/**
	 * Get the card height (number of lines)
	 */
	getHeight() {
		let height = 3; // Top border, title, metadata, bottom border

		// Add line for dependencies if present
		if (this.task.dependencies && this.task.dependencies.length > 0) {
			height += 1;
		}

		return height;
	}

	/**
	 * Create a compact single-line card for narrow columns
	 */
	renderCompact() {
		const idText = chalk.cyan(`#${this.task.id}`);
		const priorityDisplay = getPriorityDisplay(this.task.priority);
		const priorityText = priorityDisplay.symbol;

		// Calculate available space for title
		const reservedSpace =
			stripAnsi(idText).length + stripAnsi(priorityText).length + 2; // +2 for spaces
		const availableSpace = this.contentWidth - reservedSpace;
		const titleText = this.task.title || 'Untitled';
		const truncatedTitle = truncateText(titleText, availableSpace);

		const content = `${idText} ${truncatedTitle} ${priorityText}`;
		const line = createVerticalLine(content, this.width);

		return this.isSelected ? [chalk.bgBlue.white(line)] : [line];
	}

	/**
	 * Create a detailed multi-line card for wide columns
	 */
	renderDetailed() {
		const lines = [];

		// Top border
		lines.push(this.createTopBorder());

		// Title line
		lines.push(this.createTitleLine());

		// Separator
		lines.push(
			createHorizontalLine(this.width, BOX_CHARS.leftTee, BOX_CHARS.rightTee)
		);

		// Priority line
		const priorityDisplay = getPriorityDisplay(this.task.priority);
		const priorityLine = `Priority: ${priorityDisplay.symbol} ${priorityDisplay.color(priorityDisplay.text)}`;
		lines.push(createVerticalLine(priorityLine, this.width));

		// Dependencies line
		if (this.task.dependencies && this.task.dependencies.length > 0) {
			lines.push(this.createDependenciesLine());
		}

		// PRD source line
		if (this.task.prdSource) {
			const prdText =
				chalk.blue('📄 ') +
				chalk.gray(this.task.prdSource.fileName || 'PRD Source');
			lines.push(createVerticalLine(prdText, this.width));
		}

		// Subtasks line
		if (this.task.subtasks && this.task.subtasks.length > 0) {
			const subtaskText = chalk.magenta(
				`📝 ${this.task.subtasks.length} subtasks`
			);
			lines.push(createVerticalLine(subtaskText, this.width));
		}

		// Bottom border
		lines.push(this.createBottomBorder());

		// Apply selection highlighting if needed
		if (this.isSelected) {
			return lines.map((line) => chalk.bgBlue.white(line));
		}

		return lines;
	}

	/**
	 * Auto-select rendering mode based on available width
	 */
	renderAuto() {
		if (this.width < 30) {
			return this.renderCompact();
		} else if (this.width > 50) {
			return this.renderDetailed();
		} else {
			return this.render();
		}
	}
}

/**
 * Factory function to create a task card
 */
export function createTaskCard(task, width, isSelected = false) {
	return new TaskCard(task, width, isSelected);
}

/**
 * Render multiple task cards in a column
 */
export function renderTaskCards(
	tasks,
	columnWidth,
	selectedIndex = -1,
	maxCards = 10
) {
	const cards = [];
	const tasksToShow = tasks.slice(0, maxCards);

	tasksToShow.forEach((task, index) => {
		const isSelected = index === selectedIndex;
		const card = new TaskCard(task, columnWidth, isSelected);
		const cardLines = card.renderAuto();

		cards.push(...cardLines);

		// Add spacing between cards (except for the last one)
		if (index < tasksToShow.length - 1) {
			cards.push(' '.repeat(columnWidth));
		}
	});

	return cards;
}
