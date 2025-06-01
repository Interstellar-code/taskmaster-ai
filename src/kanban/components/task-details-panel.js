/**
 * Task Details Panel Component
 * Displays detailed task information in a panel format
 */

import chalk from 'chalk';
import {
    BOX_CHARS,
    createHorizontalLine,
    createVerticalLine,
    centerText,
    truncateText,
    stripAnsi
} from '../utils/terminal-utils.js';

/**
 * TaskDetailsPanel class for rendering task details
 */
export class TaskDetailsPanel {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.contentWidth = width - 2; // Account for borders
        this.task = null;
    }

    /**
     * Set the task to display
     * @param {Object} task - Task object
     */
    setTask(task) {
        this.task = task;
    }

    /**
     * Render the task details panel
     */
    render() {
        if (!this.task) {
            return this.renderEmpty();
        }

        const lines = [];
        
        // Top border with title
        const title = ` Task #${this.task.id} Details `;
        lines.push(this.createTitleBorder(title));
        
        // Task title
        const titleLine = truncateText(this.task.title || 'Untitled Task', this.contentWidth);
        lines.push(createVerticalLine(chalk.white.bold(titleLine), this.width));
        
        // Separator
        lines.push(createHorizontalLine(this.width, BOX_CHARS.leftTee, BOX_CHARS.rightTee));
        
        // Status and priority line
        const statusText = this.getStatusDisplay(this.task.status);
        const priorityText = this.getPriorityDisplay(this.task.priority);
        const statusPriorityLine = `${statusText}  ${priorityText}`;
        lines.push(createVerticalLine(statusPriorityLine, this.width));
        
        // Dependencies line
        if (this.task.dependencies && this.task.dependencies.length > 0) {
            const depsText = chalk.gray('Dependencies: ') + chalk.yellow(this.task.dependencies.join(', '));
            lines.push(createVerticalLine(truncateText(depsText, this.contentWidth), this.width));
        }
        
        // PRD source line
        if (this.task.prdSource) {
            const prdText = chalk.gray('PRD Source: ') + chalk.cyan(this.task.prdSource.fileName || 'Unknown');
            lines.push(createVerticalLine(truncateText(prdText, this.contentWidth), this.width));
        }
        
        // Subtasks line
        if (this.task.subtasks && this.task.subtasks.length > 0) {
            const subtasksText = chalk.gray('Subtasks: ') + chalk.magenta(`${this.task.subtasks.length} items`);
            lines.push(createVerticalLine(subtasksText, this.width));
        }
        
        // Description section
        if (this.task.description) {
            lines.push(createVerticalLine('', this.width)); // Empty line
            lines.push(createVerticalLine(chalk.white.bold('Description:'), this.width));
            const descLines = this.wrapText(this.task.description, this.contentWidth);
            descLines.forEach(line => {
                lines.push(createVerticalLine(chalk.gray(line), this.width));
            });
        }
        
        // Details section
        if (this.task.details) {
            lines.push(createVerticalLine('', this.width)); // Empty line
            lines.push(createVerticalLine(chalk.white.bold('Implementation Details:'), this.width));
            const detailLines = this.wrapText(this.task.details, this.contentWidth);
            detailLines.slice(0, 3).forEach(line => { // Limit to 3 lines
                lines.push(createVerticalLine(chalk.gray(line), this.width));
            });
            if (detailLines.length > 3) {
                lines.push(createVerticalLine(chalk.dim('... (truncated)'), this.width));
            }
        }
        
        // Fill remaining space
        while (lines.length < this.height - 1) {
            lines.push(createVerticalLine('', this.width));
        }
        
        // Bottom border
        lines.push(createHorizontalLine(this.width, BOX_CHARS.bottomLeft, BOX_CHARS.bottomRight));
        
        return lines;
    }

    /**
     * Render empty panel
     */
    renderEmpty() {
        const lines = [];
        
        // Top border
        lines.push(createHorizontalLine(this.width));
        
        // Empty content
        const emptyMessage = chalk.gray('No task selected');
        const centeredMessage = centerText(emptyMessage, this.contentWidth);
        
        // Add vertical padding
        const contentHeight = this.height - 2; // Exclude borders
        const verticalPadding = Math.floor((contentHeight - 1) / 2);
        
        for (let i = 0; i < verticalPadding; i++) {
            lines.push(createVerticalLine('', this.width));
        }
        
        lines.push(createVerticalLine(centeredMessage, this.width));
        
        for (let i = verticalPadding + 1; i < contentHeight; i++) {
            lines.push(createVerticalLine('', this.width));
        }
        
        // Bottom border
        lines.push(createHorizontalLine(this.width, BOX_CHARS.bottomLeft, BOX_CHARS.bottomRight));
        
        return lines;
    }

    /**
     * Create title border with centered title
     * @param {string} title - Title text
     */
    createTitleBorder(title) {
        const titleLength = stripAnsi(title).length;
        const remainingWidth = this.width - titleLength - 2; // -2 for border chars
        const leftPadding = Math.floor(remainingWidth / 2);
        const rightPadding = remainingWidth - leftPadding;
        
        return BOX_CHARS.horizontal.repeat(leftPadding) + 
               title + 
               BOX_CHARS.horizontal.repeat(rightPadding);
    }

    /**
     * Get status display with colors
     * @param {string} status - Task status
     */
    getStatusDisplay(status) {
        const statusMap = {
            'pending': chalk.yellow('📋 Pending'),
            'in-progress': chalk.blue('🔄 In Progress'),
            'done': chalk.green('✅ Done'),
            'blocked': chalk.red('🚫 Blocked'),
            'deferred': chalk.gray('⏸️ Deferred'),
            'cancelled': chalk.red('❌ Cancelled')
        };
        
        return statusMap[status] || chalk.gray(`❓ ${status}`);
    }

    /**
     * Get priority display with colors
     * @param {string} priority - Task priority
     */
    getPriorityDisplay(priority) {
        const priorityMap = {
            'high': chalk.red('🔴 High'),
            'medium': chalk.yellow('🟡 Medium'),
            'low': chalk.green('🟢 Low')
        };
        
        return priorityMap[priority] || chalk.gray(`⚪ ${priority || 'None'}`);
    }

    /**
     * Wrap text to fit within panel width
     * @param {string} text - Text to wrap
     * @param {number} width - Maximum width
     */
    wrapText(text, width) {
        if (!text) return [];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
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
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Update panel dimensions
     * @param {number} width - New width
     * @param {number} height - New height
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.contentWidth = width - 2;
    }

    /**
     * Check if panel has a task
     */
    hasTask() {
        return !!this.task;
    }

    /**
     * Clear the current task
     */
    clear() {
        this.task = null;
    }

    /**
     * Get the current task
     */
    getTask() {
        return this.task;
    }
}

/**
 * Create a task details panel instance
 */
export function createTaskDetailsPanel(width, height) {
    return new TaskDetailsPanel(width, height);
}
