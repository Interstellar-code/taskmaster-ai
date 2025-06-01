/**
 * Kanban Column Component
 * Renders individual columns for the Kanban board
 */

import chalk from 'chalk';
import {
    BOX_CHARS,
    createHorizontalLine,
    createVerticalLine,
    createRoundedHorizontalLine,
    createDoubleHorizontalLine,
    createDoubleVerticalLine,
    centerText,
    getStatusDisplay,
    stripAnsi
} from '../utils/terminal-utils.js';
import { createTaskCard } from './task-card.js';
import {
    formatTaskTitle,
    formatPriority,
    createMetadataLine,
    createCompactSummary
} from '../utils/card-formatter.js';

/**
 * Column class for rendering Kanban columns
 */
export class KanbanColumn {
    constructor(status, width, height) {
        this.status = status;
        this.width = width;
        this.height = height;
        this.tasks = [];
        this.selectedTaskIndex = -1;
        this.isActive = false;
        this.scrollOffset = 0;
        this.maxVisibleTasks = 0;
        this.calculateMaxVisibleTasks();
    }

    /**
     * Calculate maximum number of tasks that can be visible in the column
     */
    calculateMaxVisibleTasks() {
        // Reserve space for header (3 lines) and borders
        const availableHeight = this.height - 4;
        // Each task takes 2 lines (task line + separator), but last task doesn't need separator
        this.maxVisibleTasks = Math.floor((availableHeight + 1) / 2);
    }

    /**
     * Set tasks for this column
     * @param {Array} tasks - Array of tasks for this column
     */
    setTasks(tasks) {
        this.tasks = tasks || [];
    }

    /**
     * Set selected task index
     * @param {number} index - Index of selected task
     */
    setSelectedTask(index) {
        this.selectedTaskIndex = index;
    }

    /**
     * Set whether this column is active
     * @param {boolean} active - Whether column is active
     */
    setActive(active) {
        this.isActive = active;
    }

    /**
     * Scroll the column up (show earlier tasks)
     */
    scrollUp() {
        if (this.scrollOffset > 0) {
            this.scrollOffset--;
            return true;
        }
        return false;
    }

    /**
     * Scroll the column down (show later tasks)
     */
    scrollDown() {
        const maxScroll = Math.max(0, this.tasks.length - this.maxVisibleTasks);
        if (this.scrollOffset < maxScroll) {
            this.scrollOffset++;
            return true;
        }
        return false;
    }

    /**
     * Get scroll information for display
     */
    getScrollInfo() {
        if (this.tasks.length <= this.maxVisibleTasks) {
            return null; // No scrolling needed
        }

        const startTask = this.scrollOffset + 1;
        const endTask = Math.min(this.scrollOffset + this.maxVisibleTasks, this.tasks.length);
        const totalTasks = this.tasks.length;

        return {
            startTask,
            endTask,
            totalTasks,
            canScrollUp: this.scrollOffset > 0,
            canScrollDown: this.scrollOffset < (this.tasks.length - this.maxVisibleTasks)
        };
    }

    /**
     * Get the column header
     */
    getHeader() {
        const statusDisplay = getStatusDisplay(this.status);
        const taskCount = this.tasks.length;
        const scrollInfo = this.getScrollInfo();

        let headerText;
        if (scrollInfo) {
            headerText = `${statusDisplay.emoji} ${statusDisplay.name} (${scrollInfo.startTask}-${scrollInfo.endTask}/${taskCount})`;
        } else {
            headerText = `${statusDisplay.emoji} ${statusDisplay.name} (${taskCount})`;
        }

        return statusDisplay.color.bold(centerText(headerText, this.width - 2));
    }

    /**
     * Render the column
     * @param {number} maxTasksToShow - Maximum number of tasks to show
     */
    render(maxTasksToShow = 10) {
        const lines = [];

        // Use double borders for active column, rounded for inactive
        const useDouble = this.isActive;
        const useRounded = !this.isActive;

        // Top border with header
        if (useDouble) {
            lines.push(createDoubleHorizontalLine(this.width, true));
            lines.push(createDoubleVerticalLine(this.getHeader(), this.width));
            lines.push(createDoubleHorizontalLine(this.width, true).replace(BOX_CHARS.doubleTopLeft, BOX_CHARS.doubleLeftTee).replace(BOX_CHARS.doubleTopRight, BOX_CHARS.doubleRightTee));
        } else if (useRounded) {
            lines.push(createRoundedHorizontalLine(this.width, true, false));
            lines.push(createVerticalLine(this.getHeader(), this.width));
            lines.push(createHorizontalLine(this.width, BOX_CHARS.leftTee, BOX_CHARS.rightTee));
        } else {
            lines.push(createHorizontalLine(this.width));
            lines.push(createVerticalLine(this.getHeader(), this.width));
            lines.push(createHorizontalLine(this.width, BOX_CHARS.leftTee, BOX_CHARS.rightTee));
        }

        // Task content area with scrolling
        const contentHeight = Math.max(3, this.height - 4); // Reserve space for header and borders
        this.calculateMaxVisibleTasks(); // Recalculate in case height changed

        // Get tasks to show based on scroll offset
        const startIndex = this.scrollOffset;
        const endIndex = startIndex + this.maxVisibleTasks;
        const tasksToShow = this.tasks.slice(startIndex, endIndex);

        // Add scroll indicators if needed
        const scrollInfo = this.getScrollInfo();

        if (tasksToShow.length === 0) {
            // Show "No tasks" message
            const noTasksMessage = chalk.gray('No tasks');
            const centeredMessage = centerText(noTasksMessage, this.width - 2);

            // Add some vertical padding
            const verticalPadding = Math.floor((contentHeight - 1) / 2);

            for (let i = 0; i < verticalPadding; i++) {
                if (useDouble) {
                    lines.push(createDoubleVerticalLine('', this.width));
                } else {
                    lines.push(createVerticalLine('', this.width));
                }
            }

            if (useDouble) {
                lines.push(createDoubleVerticalLine(centeredMessage, this.width));
            } else {
                lines.push(createVerticalLine(centeredMessage, this.width));
            }

            for (let i = verticalPadding + 1; i < contentHeight; i++) {
                if (useDouble) {
                    lines.push(createDoubleVerticalLine('', this.width));
                } else {
                    lines.push(createVerticalLine('', this.width));
                }
            }
        } else {
            // Show tasks
            let currentLine = 0;

            // Add scroll up indicator if needed
            if (scrollInfo && scrollInfo.canScrollUp) {
                const scrollUpIndicator = chalk.dim('↑ More tasks above');
                if (useDouble) {
                    lines.push(createDoubleVerticalLine(centerText(scrollUpIndicator, this.width - 4), this.width));
                } else {
                    lines.push(createVerticalLine(centerText(scrollUpIndicator, this.width - 4), this.width));
                }
                currentLine++;
            }

            for (let i = 0; i < tasksToShow.length && currentLine < contentHeight - 2; i++) {
                const task = tasksToShow[i];
                // Adjust selected index for scrolling
                const globalTaskIndex = startIndex + i;
                const isSelected = globalTaskIndex === this.selectedTaskIndex;
                const taskLines = this.renderTaskCard(task, isSelected);

                // Add task card lines
                for (const taskLine of taskLines) {
                    if (currentLine >= contentHeight - 2) break;
                    if (useDouble) {
                        lines.push(createDoubleVerticalLine(taskLine, this.width));
                    } else {
                        lines.push(createVerticalLine(taskLine, this.width));
                    }
                    currentLine++;
                }

                // Add separator between tasks (if not the last task and space available)
                if (i < tasksToShow.length - 1 && currentLine < contentHeight - 2) {
                    if (useDouble) {
                        lines.push(createDoubleVerticalLine('', this.width));
                    } else {
                        lines.push(createVerticalLine('', this.width));
                    }
                    currentLine++;
                }
            }

            // Add scroll down indicator if needed
            if (scrollInfo && scrollInfo.canScrollDown) {
                const scrollDownIndicator = chalk.dim('↓ More tasks below');
                if (useDouble) {
                    lines.push(createDoubleVerticalLine(centerText(scrollDownIndicator, this.width - 4), this.width));
                } else {
                    lines.push(createVerticalLine(centerText(scrollDownIndicator, this.width - 4), this.width));
                }
                currentLine++;
            }

            // Fill remaining space
            while (currentLine < contentHeight) {
                if (useDouble) {
                    lines.push(createDoubleVerticalLine('', this.width));
                } else {
                    lines.push(createVerticalLine('', this.width));
                }
                currentLine++;
            }
        }

        // Bottom border
        if (useDouble) {
            lines.push(createDoubleHorizontalLine(this.width, false));
        } else if (useRounded) {
            lines.push(createRoundedHorizontalLine(this.width, false, false));
        } else {
            lines.push(createHorizontalLine(this.width, BOX_CHARS.bottomLeft, BOX_CHARS.bottomRight));
        }

        return lines;
    }

    /**
     * Render a task card within the column
     * @param {Object} task - Task object
     * @param {boolean} isSelected - Whether this task is selected
     */
    renderTaskCard(task, isSelected = false) {
        const cardLines = [];
        const contentWidth = this.width - 6; // Account for column borders and card borders

        if (isSelected) {
            // Create bordered task card for selected task
            const cardWidth = this.width - 4; // Width for the task card

            // Top border of task card
            cardLines.push(createRoundedHorizontalLine(cardWidth, true, false));

            // Task content
            if (this.width < 30) {
                // Compact mode for narrow columns
                const compactLine = createCompactSummary(task, cardWidth - 2);
                cardLines.push(createVerticalLine(chalk.bgBlue.white(compactLine), cardWidth));
            } else {
                // Standard mode with title and metadata lines
                const titleLine = formatTaskTitle(task.title, cardWidth - 2, task.id);
                const metadataLine = createMetadataLine(task, cardWidth - 2, this.width < 40);

                cardLines.push(createVerticalLine(chalk.bgBlue.white(titleLine), cardWidth));
                if (metadataLine) {
                    cardLines.push(createVerticalLine(chalk.bgBlue.white(metadataLine), cardWidth));
                }
            }

            // Bottom border of task card
            cardLines.push(createRoundedHorizontalLine(cardWidth, false, false));

        } else {
            // Regular task card without borders
            if (this.width < 30) {
                // Compact mode for narrow columns
                const compactLine = createCompactSummary(task, contentWidth);
                cardLines.push(this.padToWidth(compactLine, contentWidth));
            } else {
                // Standard mode with title and metadata lines
                const titleLine = formatTaskTitle(task.title, contentWidth, task.id);
                const metadataLine = createMetadataLine(task, contentWidth, this.width < 40);

                cardLines.push(this.padToWidth(titleLine, contentWidth));
                if (metadataLine) {
                    cardLines.push(this.padToWidth(metadataLine, contentWidth));
                }
            }
        }

        return cardLines;
    }



    /**
     * Pad text to specified width
     * @param {string} text - Text to pad
     * @param {number} width - Target width
     */
    padToWidth(text, width) {
        const textLength = stripAnsi(text).length;
        if (textLength >= width) {
            return text;
        }
        return text + ' '.repeat(width - textLength);
    }

    /**
     * Get task at index
     * @param {number} index - Task index
     */
    getTask(index) {
        return this.tasks[index] || null;
    }

    /**
     * Get selected task
     */
    getSelectedTask() {
        return this.getTask(this.selectedTaskIndex);
    }

    /**
     * Move selection up
     */
    moveSelectionUp() {
        if (this.tasks.length === 0) return false;
        
        if (this.selectedTaskIndex <= 0) {
            this.selectedTaskIndex = this.tasks.length - 1;
        } else {
            this.selectedTaskIndex--;
        }
        return true;
    }

    /**
     * Move selection down
     */
    moveSelectionDown() {
        if (this.tasks.length === 0) return false;
        
        if (this.selectedTaskIndex >= this.tasks.length - 1) {
            this.selectedTaskIndex = 0;
        } else {
            this.selectedTaskIndex++;
        }
        return true;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedTaskIndex = -1;
    }

    /**
     * Check if column has tasks
     */
    hasTasks() {
        return this.tasks.length > 0;
    }

    /**
     * Get task count
     */
    getTaskCount() {
        return this.tasks.length;
    }
}
