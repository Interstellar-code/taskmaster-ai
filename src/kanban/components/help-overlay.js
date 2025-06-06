/**
 * Help Overlay Component
 * Displays comprehensive help information for the Kanban board
 */

import chalk from 'chalk';
import {
	BOX_CHARS,
	createHorizontalLine,
	createVerticalLine,
	centerText,
	getTerminalSize
} from '../utils/terminal-utils.js';

/**
 * HelpOverlay class for displaying help information
 */
export class HelpOverlay {
	constructor() {
		this.isVisible = false;
		this.currentPage = 0;
		this.totalPages = 3;
		this.helpPages = this.createHelpPages();
	}

	/**
	 * Create help pages with different sections
	 */
	createHelpPages() {
		return [
			{
				title: 'Navigation & Basic Controls',
				sections: [
					{
						title: 'Navigation',
						items: [
							'← →  : Move between columns (Pending, In Progress, Done)',
							'↑ ↓  : Move between tasks within a column',
							'Tab  : Cycle focus between board areas'
						]
					},
					{
						title: 'Status Changes',
						items: [
							'1    : Move selected task to Pending',
							'2    : Move selected task to In Progress',
							'3    : Move selected task to Done'
						]
					},
					{
						title: 'Basic Operations',
						items: [
							'R    : Refresh board from tasks.json',
							'S    : Show board statistics',
							'Q    : Quit to TaskMaster menu',
							'H/?  : Show this help'
						]
					}
				]
			},
			{
				title: 'Task Operations',
				sections: [
					{
						title: 'Task Details',
						items: [
							'V    : View detailed task information',
							'I    : Show task info in status bar',
							'E    : Edit task title (inline editing)',
							'D    : Delete task (with confirmation)'
						]
					},
					{
						title: 'Task Information Display',
						items: [
							'🔴   : High priority task',
							'🟡   : Medium priority task',
							'🟢   : Low priority task',
							'📄   : Task has PRD source',
							'Deps : Number of dependencies',
							'Sub  : Number of subtasks'
						]
					}
				]
			},
			{
				title: 'Advanced Features',
				sections: [
					{
						title: 'Filtering & Search',
						items: [
							'F    : Toggle filter mode',
							'/    : Open search mode',
							'C    : Clear all filters (in filter mode)',
							'ESC  : Exit filter/search mode'
						]
					},
					{
						title: 'Filter Options',
						items: [
							'1    : Filter by status',
							'2    : Filter by priority',
							'3    : Filter by PRD source',
							'4    : Filter by subtasks',
							'5    : Filter by dependencies'
						]
					},
					{
						title: 'Board Layout',
						items: [
							'Columns automatically resize to terminal width',
							'Task cards show truncated info for narrow columns',
							'Status bar shows current selection and navigation hints'
						]
					}
				]
			}
		];
	}

	/**
	 * Show help overlay
	 */
	show() {
		this.isVisible = true;
		this.currentPage = 0;
		return this.render();
	}

	/**
	 * Hide help overlay
	 */
	hide() {
		this.isVisible = false;
		return null;
	}

	/**
	 * Go to next help page
	 */
	nextPage() {
		if (this.currentPage < this.totalPages - 1) {
			this.currentPage++;
		} else {
			this.currentPage = 0; // Wrap to first page
		}
		return this.render();
	}

	/**
	 * Go to previous help page
	 */
	previousPage() {
		if (this.currentPage > 0) {
			this.currentPage--;
		} else {
			this.currentPage = this.totalPages - 1; // Wrap to last page
		}
		return this.render();
	}

	/**
	 * Render the help overlay
	 */
	render() {
		if (!this.isVisible) return null;

		const { width, height } = getTerminalSize();
		const helpWidth = Math.min(80, width - 4);
		const helpHeight = Math.min(25, height - 4);

		const lines = [];
		const currentPageData = this.helpPages[this.currentPage];

		// Top border with title
		const title = ` ${currentPageData.title} (${this.currentPage + 1}/${this.totalPages}) `;
		lines.push(this.createTitleBorder(title, helpWidth));

		// Content
		let contentLines = 0;
		const maxContentLines = helpHeight - 6; // Reserve space for borders and navigation

		for (const section of currentPageData.sections) {
			if (contentLines >= maxContentLines) break;

			// Section title
			lines.push(
				createVerticalLine(chalk.white.bold(section.title + ':'), helpWidth)
			);
			contentLines++;

			// Section items
			for (const item of section.items) {
				if (contentLines >= maxContentLines) break;

				lines.push(createVerticalLine(chalk.gray(`  ${item}`), helpWidth));
				contentLines++;
			}

			// Add spacing between sections
			if (contentLines < maxContentLines) {
				lines.push(createVerticalLine('', helpWidth));
				contentLines++;
			}
		}

		// Fill remaining space
		while (lines.length < helpHeight - 3) {
			lines.push(createVerticalLine('', helpWidth));
		}

		// Navigation instructions
		lines.push(
			createHorizontalLine(helpWidth, BOX_CHARS.leftTee, BOX_CHARS.rightTee)
		);
		const navText = 'PgUp/PgDn: Navigate pages | ESC/H: Close help';
		lines.push(
			createVerticalLine(
				chalk.cyan(centerText(navText, helpWidth - 2)),
				helpWidth
			)
		);

		// Bottom border
		lines.push(
			createHorizontalLine(
				helpWidth,
				BOX_CHARS.bottomLeft,
				BOX_CHARS.bottomRight
			)
		);

		return {
			lines,
			width: helpWidth,
			height: helpHeight,
			centerX: Math.floor((width - helpWidth) / 2),
			centerY: Math.floor((height - helpHeight) / 2)
		};
	}

	/**
	 * Create title border with centered title
	 * @param {string} title - Title text
	 * @param {number} width - Border width
	 */
	createTitleBorder(title, width) {
		const titleLength = title.length;
		const remainingWidth = width - titleLength - 2;
		const leftPadding = Math.floor(remainingWidth / 2);
		const rightPadding = remainingWidth - leftPadding;

		return (
			BOX_CHARS.horizontal.repeat(leftPadding) +
			chalk.blue.bold(title) +
			BOX_CHARS.horizontal.repeat(rightPadding)
		);
	}

	/**
	 * Handle keyboard input for help navigation
	 * @param {string} key - Pressed key
	 */
	handleKeyPress(key) {
		if (!this.isVisible) return false;

		switch (key) {
			case '\u001b[5~': // Page Up
				this.previousPage();
				return true;

			case '\u001b[6~': // Page Down
				this.nextPage();
				return true;

			case '\u001b[C': // Right arrow
				this.nextPage();
				return true;

			case '\u001b[D': // Left arrow
				this.previousPage();
				return true;

			case 'h':
			case 'H':
			case '?':
			case '\u001b': // Escape
				this.hide();
				return true;

			default:
				return false;
		}
	}

	/**
	 * Get current page info
	 */
	getCurrentPageInfo() {
		return {
			currentPage: this.currentPage,
			totalPages: this.totalPages,
			title: this.helpPages[this.currentPage].title,
			isVisible: this.isVisible
		};
	}

	/**
	 * Check if help is visible
	 */
	isOpen() {
		return this.isVisible;
	}

	/**
	 * Get quick help text for status bar
	 */
	getQuickHelp() {
		return 'H: Help | ←→: Columns | ↑↓: Tasks | 1-3: Move | V: View | F: Filter | /: Search | Q: Quit';
	}

	/**
	 * Get context-sensitive help based on current mode
	 * @param {string} mode - Current mode ('normal', 'filter', 'search', 'edit')
	 */
	getContextHelp(mode = 'normal') {
		const contextHelp = {
			normal:
				'H: Help | ←→: Columns | ↑↓: Tasks | 1-3: Move | V: View | Q: Quit',
			filter: 'F: Toggle Filter | 1-5: Set Filter | C: Clear | ESC: Exit',
			search: '/: Search | Type to search | Enter: Apply | ESC: Exit',
			edit: 'Type to edit | Enter: Save | ESC: Cancel'
		};

		return contextHelp[mode] || contextHelp.normal;
	}
}

/**
 * Create a help overlay instance
 */
export function createHelpOverlay() {
	return new HelpOverlay();
}
