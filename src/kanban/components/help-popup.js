/**
 * Help popup component for Kanban board
 */

import chalk from 'chalk';
import {
	hideCursor,
	showCursor,
	clearScreen,
	centerText,
	createRoundedHorizontalLine,
	createVerticalLine
} from '../utils/terminal-utils.js';

/**
 * Help popup class for displaying keyboard shortcuts and controls
 */
export class HelpPopup {
	constructor() {
		this.isOpen = false;
		this.scrollOffset = 0;
		this.contentLines = [];
		this.maxVisibleLines = 0;
		this.width = 0;
		this.height = 0;
		this.startX = 0;
		this.startY = 0;

		this.generateHelpContent();
	}

	/**
	 * Generate help content
	 */
	generateHelpContent() {
		this.contentLines = [];

		// Title
		this.contentLines.push(
			chalk.cyan.bold('📚 TASKMASTER KANBAN BOARD - HELP & CONTROLS')
		);
		this.contentLines.push('');

		// Navigation section
		this.contentLines.push(chalk.white.bold('🧭 NAVIGATION & BASIC CONTROLS:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray(
				'   ← →     : Move between columns (Pending, In Progress, Done)'
			)
		);
		this.contentLines.push(
			chalk.gray('   ↑ ↓     : Move between tasks within a column')
		);
		this.contentLines.push(
			chalk.gray('   Tab     : Cycle focus between board areas')
		);
		this.contentLines.push('');

		// Column scrolling
		this.contentLines.push(chalk.white.bold('📜 COLUMN SCROLLING:'));
		this.contentLines.push('');
		this.contentLines.push(chalk.gray('   PgUp/PgDn : Scroll column up/down'));
		this.contentLines.push(
			chalk.gray('   Ctrl+↑/↓ : Alternative column scrolling')
		);
		this.contentLines.push('');

		// Status changes
		this.contentLines.push(chalk.white.bold('🔄 STATUS CHANGES:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray('   1       : Move selected task to Pending')
		);
		this.contentLines.push(
			chalk.gray('   2       : Move selected task to In Progress')
		);
		this.contentLines.push(
			chalk.gray('   3       : Move selected task to Done')
		);
		this.contentLines.push('');

		// Task operations
		this.contentLines.push(chalk.white.bold('📋 TASK OPERATIONS:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray('   V       : View task details (large popup)')
		);
		this.contentLines.push(chalk.gray('   D       : Delete task'));
		this.contentLines.push(chalk.gray('   E       : Edit task title'));
		this.contentLines.push(chalk.gray('   I       : Show task info'));
		this.contentLines.push('');

		// Board operations
		this.contentLines.push(chalk.white.bold('🎛️  BOARD OPERATIONS:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray('   R       : Refresh board from tasks.json')
		);
		this.contentLines.push(chalk.gray('   S       : Show board statistics'));
		this.contentLines.push(chalk.gray('   F       : Toggle filters'));
		this.contentLines.push(chalk.gray('   /       : Search tasks'));
		this.contentLines.push('');

		// Help and exit
		this.contentLines.push(chalk.white.bold('ℹ️  HELP & EXIT:'));
		this.contentLines.push('');
		this.contentLines.push(chalk.gray('   H / ?   : Show this help'));
		this.contentLines.push(
			chalk.gray('   Q       : Return to TaskMaster main menu')
		);
		this.contentLines.push('');

		// Popup controls
		this.contentLines.push(chalk.white.bold('🪟 POPUP CONTROLS:'));
		this.contentLines.push('');
		this.contentLines.push(chalk.gray('   C       : Close popup'));
		this.contentLines.push(chalk.gray('   Escape  : Close popup'));
		this.contentLines.push(
			chalk.gray('   ↑ ↓     : Scroll popup content (if lengthy)')
		);
		this.contentLines.push('');

		// Visual indicators
		this.contentLines.push(chalk.white.bold('🎨 VISUAL INDICATORS:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray('   ╔═══╗   : Active column (double borders)')
		);
		this.contentLines.push(
			chalk.gray('   ╭───╮   : Inactive columns (rounded corners)')
		);
		this.contentLines.push(
			chalk.gray('   🔴 🟡 🟢 : Task priority (High, Medium, Low)')
		);
		this.contentLines.push(chalk.gray('   D:X     : Dependencies count'));
		this.contentLines.push(chalk.gray('   Sub:X   : Subtasks count'));
		this.contentLines.push(
			chalk.gray('   ↑↓      : Scroll indicators in columns')
		);
		this.contentLines.push('');

		// Tips
		this.contentLines.push(chalk.white.bold('💡 TIPS:'));
		this.contentLines.push('');
		this.contentLines.push(
			chalk.gray('   • Use V to view detailed task information')
		);
		this.contentLines.push(
			chalk.gray('   • Column headers show scroll position (e.g., "1-14/28")')
		);
		this.contentLines.push(
			chalk.gray('   • Selected tasks have blue highlighting')
		);
		this.contentLines.push(
			chalk.gray('   • Status bar shows current column and task counts')
		);
		this.contentLines.push('');
	}

	/**
	 * Calculate popup dimensions and position
	 */
	calculateDimensions() {
		const terminalWidth = process.stdout.columns || 120;
		const terminalHeight = process.stdout.rows || 30;

		// Use 75% of terminal size
		this.width = Math.floor(terminalWidth * 0.75);
		this.height = Math.floor(terminalHeight * 0.75);

		// Center the popup
		this.startX = Math.floor((terminalWidth - this.width) / 2);
		this.startY = Math.floor((terminalHeight - this.height) / 2);

		// Calculate content area (subtract borders and padding)
		const contentWidth = this.width - 4; // 2 chars for borders on each side
		this.maxVisibleLines = this.height - 4; // 2 lines for top/bottom borders, 2 for padding
	}

	/**
	 * Open the help popup
	 */
	open() {
		this.isOpen = true;
		this.scrollOffset = 0;
		this.calculateDimensions();
		hideCursor();
	}

	/**
	 * Close the help popup
	 */
	close() {
		this.isOpen = false;
		this.scrollOffset = 0;
		showCursor();
	}

	/**
	 * Check if popup is open
	 */
	isPopupOpen() {
		return this.isOpen;
	}

	/**
	 * Handle key press for popup
	 */
	handleKeyPress(key) {
		if (!this.isOpen) return false;

		switch (key) {
			case 'c':
			case 'C':
			case '\u001b': // Escape
				this.close();
				return true;

			case '\u001b[A': // Up arrow
				this.scrollUp();
				return true;

			case '\u001b[B': // Down arrow
				this.scrollDown();
				return true;

			default:
				return false;
		}
	}

	/**
	 * Scroll content up
	 */
	scrollUp() {
		if (this.scrollOffset > 0) {
			this.scrollOffset--;
		}
	}

	/**
	 * Scroll content down
	 */
	scrollDown() {
		const maxScroll = Math.max(
			0,
			this.contentLines.length - this.maxVisibleLines
		);
		if (this.scrollOffset < maxScroll) {
			this.scrollOffset++;
		}
	}

	/**
	 * Render the help popup
	 */
	render() {
		if (!this.isOpen) return [];

		const lines = [];
		const contentWidth = this.width - 4;

		// Top border
		lines.push(createRoundedHorizontalLine(this.width, true, false));

		// Title line
		const title = centerText('📚 HELP & CONTROLS', contentWidth);
		lines.push(createVerticalLine(chalk.cyan.bold(title), this.width));

		// Separator
		lines.push(createRoundedHorizontalLine(this.width, false, true));

		// Content lines with scrolling
		const visibleLines = this.contentLines.slice(
			this.scrollOffset,
			this.scrollOffset + this.maxVisibleLines - 3
		);

		for (const line of visibleLines) {
			const truncatedLine =
				line.length > contentWidth
					? line.substring(0, contentWidth - 3) + '...'
					: line;
			const paddedLine = truncatedLine.padEnd(contentWidth);
			lines.push(createVerticalLine(paddedLine, this.width));
		}

		// Fill remaining space
		const remainingLines = this.maxVisibleLines - 3 - visibleLines.length;
		for (let i = 0; i < remainingLines; i++) {
			lines.push(createVerticalLine('', this.width));
		}

		// Bottom border with controls
		const controls = centerText(
			'C: Close | ↑↓: Scroll | ESC: Close',
			contentWidth
		);
		lines.push(createVerticalLine(chalk.dim(controls), this.width));
		lines.push(createRoundedHorizontalLine(this.width, false, false));

		return lines;
	}

	/**
	 * Get popup position
	 */
	getPosition() {
		return {
			x: this.startX,
			y: this.startY,
			width: this.width,
			height: this.height
		};
	}
}

/**
 * Create a help popup instance
 */
export function createHelpPopup() {
	return new HelpPopup();
}
