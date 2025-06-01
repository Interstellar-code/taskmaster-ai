/**
 * Edit Modal Component
 * Provides inline editing capabilities for task properties
 */

import chalk from 'chalk';
import {
    BOX_CHARS,
    createHorizontalLine,
    createVerticalLine,
    centerText,
    clearScreen,
    moveCursor
} from '../utils/terminal-utils.js';

/**
 * EditModal class for inline editing
 */
export class EditModal {
    constructor(width = 60, height = 10) {
        this.width = width;
        this.height = height;
        this.contentWidth = width - 2;
        this.isVisible = false;
        this.editType = null;
        this.task = null;
        this.currentValue = '';
        this.cursorPosition = 0;
    }

    /**
     * Show edit modal for task title
     * @param {Object} task - Task to edit
     */
    showTitleEdit(task) {
        this.task = task;
        this.editType = 'title';
        this.currentValue = task.title || '';
        this.cursorPosition = this.currentValue.length;
        this.isVisible = true;
        
        return this.render();
    }

    /**
     * Show edit modal for task description
     * @param {Object} task - Task to edit
     */
    showDescriptionEdit(task) {
        this.task = task;
        this.editType = 'description';
        this.currentValue = task.description || '';
        this.cursorPosition = this.currentValue.length;
        this.isVisible = true;
        
        return this.render();
    }

    /**
     * Show edit modal for task priority
     * @param {Object} task - Task to edit
     */
    showPriorityEdit(task) {
        this.task = task;
        this.editType = 'priority';
        this.currentValue = task.priority || 'medium';
        this.cursorPosition = 0;
        this.isVisible = true;
        
        return this.render();
    }

    /**
     * Render the edit modal
     */
    render() {
        if (!this.isVisible) return [];

        const lines = [];
        
        // Top border with title
        const title = ` Edit ${this.getEditTypeDisplay()} `;
        lines.push(this.createTitleBorder(title));
        
        // Current task info
        const taskInfo = `Task #${this.task.id}: ${this.task.title}`;
        lines.push(createVerticalLine(chalk.cyan(this.truncateText(taskInfo, this.contentWidth)), this.width));
        
        // Separator
        lines.push(createHorizontalLine(this.width, BOX_CHARS.leftTee, BOX_CHARS.rightTee));
        
        // Edit field
        if (this.editType === 'priority') {
            lines.push(...this.renderPrioritySelector());
        } else {
            lines.push(...this.renderTextInput());
        }
        
        // Instructions
        lines.push(createVerticalLine('', this.width)); // Empty line
        lines.push(createVerticalLine(chalk.gray('Instructions:'), this.width));
        
        if (this.editType === 'priority') {
            lines.push(createVerticalLine(chalk.dim('↑↓ to change, Enter to save, Esc to cancel'), this.width));
        } else {
            lines.push(createVerticalLine(chalk.dim('Type to edit, Enter to save, Esc to cancel'), this.width));
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
     * Render text input field
     */
    renderTextInput() {
        const lines = [];
        
        // Label
        const label = `${this.getEditTypeDisplay()}:`;
        lines.push(createVerticalLine(chalk.white(label), this.width));
        
        // Input field with cursor
        const inputValue = this.currentValue;
        const displayValue = this.truncateText(inputValue, this.contentWidth - 4);
        const inputLine = `> ${displayValue}${this.cursorPosition === inputValue.length ? '█' : ''}`;
        lines.push(createVerticalLine(chalk.yellow(inputLine), this.width));
        
        return lines;
    }

    /**
     * Render priority selector
     */
    renderPrioritySelector() {
        const lines = [];
        const priorities = ['high', 'medium', 'low'];
        const currentIndex = priorities.indexOf(this.currentValue);
        
        lines.push(createVerticalLine(chalk.white('Priority:'), this.width));
        
        priorities.forEach((priority, index) => {
            const isSelected = index === currentIndex;
            const symbol = this.getPrioritySymbol(priority);
            const text = `${symbol} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`;
            
            if (isSelected) {
                lines.push(createVerticalLine(chalk.bgBlue.white(`> ${text}`), this.width));
            } else {
                lines.push(createVerticalLine(chalk.gray(`  ${text}`), this.width));
            }
        });
        
        return lines;
    }

    /**
     * Handle character input
     * @param {string} char - Input character
     */
    handleInput(char) {
        if (!this.isVisible || this.editType === 'priority') return false;

        if (char === '\u0008' || char === '\u007f') { // Backspace or Delete
            if (this.cursorPosition > 0) {
                this.currentValue = this.currentValue.slice(0, this.cursorPosition - 1) + 
                                  this.currentValue.slice(this.cursorPosition);
                this.cursorPosition--;
            }
        } else if (char.length === 1 && char >= ' ') { // Printable character
            this.currentValue = this.currentValue.slice(0, this.cursorPosition) + 
                               char + 
                               this.currentValue.slice(this.cursorPosition);
            this.cursorPosition++;
        }
        
        return true;
    }

    /**
     * Handle arrow keys for priority selection
     * @param {string} direction - 'up' or 'down'
     */
    handleArrow(direction) {
        if (!this.isVisible || this.editType !== 'priority') return false;

        const priorities = ['high', 'medium', 'low'];
        const currentIndex = priorities.indexOf(this.currentValue);
        
        if (direction === 'up' && currentIndex > 0) {
            this.currentValue = priorities[currentIndex - 1];
        } else if (direction === 'down' && currentIndex < priorities.length - 1) {
            this.currentValue = priorities[currentIndex + 1];
        }
        
        return true;
    }

    /**
     * Save the current edit
     */
    save() {
        if (!this.isVisible || !this.task) return null;

        const result = {
            taskId: this.task.id,
            field: this.editType,
            oldValue: this.task[this.editType],
            newValue: this.currentValue.trim()
        };
        
        // Update the task object
        this.task[this.editType] = result.newValue;
        
        this.hide();
        return result;
    }

    /**
     * Cancel the edit
     */
    cancel() {
        this.hide();
        return null;
    }

    /**
     * Hide the modal
     */
    hide() {
        this.isVisible = false;
        this.editType = null;
        this.task = null;
        this.currentValue = '';
        this.cursorPosition = 0;
    }

    /**
     * Check if modal is visible
     */
    isOpen() {
        return this.isVisible;
    }

    /**
     * Get edit type display name
     */
    getEditTypeDisplay() {
        const typeMap = {
            'title': 'Title',
            'description': 'Description',
            'priority': 'Priority'
        };
        
        return typeMap[this.editType] || 'Field';
    }

    /**
     * Get priority symbol
     * @param {string} priority - Priority level
     */
    getPrioritySymbol(priority) {
        const symbolMap = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        };
        
        return symbolMap[priority] || '⚪';
    }

    /**
     * Create title border with centered title
     * @param {string} title - Title text
     */
    createTitleBorder(title) {
        const titleLength = title.length;
        const remainingWidth = this.width - titleLength - 2;
        const leftPadding = Math.floor(remainingWidth / 2);
        const rightPadding = remainingWidth - leftPadding;
        
        return BOX_CHARS.horizontal.repeat(leftPadding) + 
               title + 
               BOX_CHARS.horizontal.repeat(rightPadding);
    }

    /**
     * Truncate text to fit width
     * @param {string} text - Text to truncate
     * @param {number} maxWidth - Maximum width
     */
    truncateText(text, maxWidth) {
        if (text.length <= maxWidth) return text;
        return text.substring(0, maxWidth - 3) + '...';
    }
}

/**
 * Create an edit modal instance
 */
export function createEditModal(width = 60, height = 10) {
    return new EditModal(width, height);
}
