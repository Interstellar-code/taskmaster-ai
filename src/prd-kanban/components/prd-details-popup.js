/**
 * PRD Details Popup Component
 * Following the exact same pattern as task details popup
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import {
    getTerminalSize,
    createRoundedHorizontalLine,
    createVerticalLine,
    centerText,
    stripAnsi
} from '../../kanban/utils/terminal-utils.js';

/**
 * Truncate text to specified width
 * @param {string} text - Text to truncate
 * @param {number} width - Maximum width
 */
function truncateText(text, width) {
    if (!text) return '';
    const cleanText = stripAnsi(text);
    if (cleanText.length <= width) return text;
    return text.substring(0, width - 3) + '...';
}

/**
 * PRD Details Popup class - Following Task Details Popup Architecture
 */
export class PRDDetailsPopup {
    constructor() {
        this.isVisible = false;
        this.prd = null;
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.contentLines = [];
        this.popupWidth = 0;
        this.popupHeight = 0;

        this.updateDimensions();
    }

    /**
     * Update popup dimensions based on terminal size
     */
    updateDimensions() {
        const { width, height } = getTerminalSize();

        // Use 75% of terminal viewport
        this.popupWidth = Math.floor(width * 0.75);
        this.popupHeight = Math.floor(height * 0.75);

        // Ensure minimum dimensions
        this.popupWidth = Math.max(60, this.popupWidth);
        this.popupHeight = Math.max(20, this.popupHeight);
    }

    /**
     * Show popup with PRD details
     * @param {Object} prd - PRD to display
     */
    async show(prd) {
        if (!prd) return false;

        // Update dimensions for current terminal size
        this.updateDimensions();

        this.prd = prd;
        this.isVisible = true;
        this.scrollOffset = 0;
        await this.generateContent();
        this.calculateScrollLimits();

        return true;
    }

    /**
     * Hide the popup
     */
    hide() {
        this.isVisible = false;
        this.prd = null;
        this.scrollOffset = 0;
        this.contentLines = [];
    }

    /**
     * Check if popup is open
     */
    isOpen() {
        return this.isVisible;
    }

    /**
     * Generate content lines for the popup
     */
    async generateContent() {
        this.contentLines = [];
        const contentWidth = this.popupWidth - 6; // Account for borders and padding

        if (!this.prd) return;

        // Header with PRD ID and title in larger format
        this.contentLines.push(chalk.blue.bold(`╭─ PRD #${this.prd.id} ─╮`));
        this.contentLines.push('');

        // Title (larger, more prominent)
        this.contentLines.push(chalk.white.bold('📋 TITLE:'));
        const titleLines = this.wrapText(this.prd.title || 'Untitled PRD', contentWidth - 2);
        titleLines.forEach(line => this.contentLines.push(`   ${chalk.cyan(line)}`));
        this.contentLines.push('');

        // Two-column layout for status/priority and metadata
        this.contentLines.push(chalk.white.bold('📊 STATUS & METADATA:'));
        this.contentLines.push('');

        // Status and Priority side by side
        const statusDisplay = this.getStatusDisplay(this.prd.status);
        const priorityDisplay = this.getPriorityDisplay(this.prd.priority);
        this.contentLines.push(`   Status: ${statusDisplay}     Priority: ${priorityDisplay}`);
        this.contentLines.push('');

        // Additional metadata in organized sections
        const metadataItems = [];

        if (this.prd.complexity) {
            metadataItems.push(`   🔧 Complexity: ${this.getComplexityDisplay(this.prd.complexity)}`);
        }

        if (this.prd.completion !== undefined) {
            metadataItems.push(`   📈 Completion: ${chalk.cyan(this.prd.completion + '%')}`);
        }

        if (this.prd.linkedTasks && this.prd.linkedTasks.length > 0) {
            metadataItems.push(`   🔗 Linked Tasks: ${chalk.yellow(this.prd.linkedTasks.length + ' tasks')}`);
        }

        if (this.prd.filePath) {
            metadataItems.push(`   📁 File: ${chalk.dim(this.prd.filePath)}`);
        }

        if (this.prd.parsedDate) {
            metadataItems.push(`   📅 Parsed: ${chalk.dim(this.prd.parsedDate)}`);
        }

        metadataItems.forEach(item => this.contentLines.push(item));
        this.contentLines.push('');

        // Description section
        if (this.prd.description) {
            this.contentLines.push(chalk.white.bold('📝 DESCRIPTION:'));
            this.contentLines.push('');
            const descLines = this.wrapText(this.prd.description, contentWidth - 4);
            descLines.forEach(line => this.contentLines.push(`   ${chalk.white(line)}`));
            this.contentLines.push('');
            this.contentLines.push(''); // Extra spacing
        }

        // Add linked tasks section (async)
        await this.addLinkedTasksSection(contentWidth);
    }

    /**
     * Add linked tasks section to content
     * @param {number} contentWidth - Available content width
     */
    async addLinkedTasksSection(contentWidth) {
        this.contentLines.push(chalk.white.bold('🔗 LINKED TASKS:'));
        this.contentLines.push('');

        try {
            // Load tasks from tasks.json using proper path resolution
            const projectRoot = process.cwd();
            let tasksPath;

            // Try new structure first
            const newTasksPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
            if (await fs.access(newTasksPath).then(() => true).catch(() => false)) {
                tasksPath = newTasksPath;
            } else {
                // Fall back to old structure
                tasksPath = path.join(projectRoot, 'tasks', 'tasks.json');
            }

            const tasksData = await fs.readFile(tasksPath, 'utf8');
            const tasksJson = JSON.parse(tasksData);
            const allTasks = tasksJson.tasks || [];

            // Find tasks linked to this PRD
            const linkedTasks = allTasks.filter(task => {
                // Check if task has prdSource that matches this PRD
                return task.prdSource && task.prdSource.prdId === this.prd.id;
            });

            if (linkedTasks.length > 0) {
                linkedTasks.forEach((task, index) => {
                    const statusIcon = this.getTaskStatusIcon(task.status);
                    const statusLabel = this.getTaskStatusLabel(task.status);

                    // Task line with ID and title
                    const taskLine = `${statusIcon} Task ${task.id}: ${task.title || 'Untitled Task'}`;
                    this.contentLines.push(chalk.white(`   ${taskLine}`));

                    // Status line
                    const statusLine = `Status: ${statusLabel}`;
                    this.contentLines.push(chalk.dim(`      ${statusLine}`));

                    // Dependencies if any
                    if (task.dependencies && task.dependencies.length > 0) {
                        const depLine = `Dependencies: ${task.dependencies.join(', ')}`;
                        this.contentLines.push(chalk.dim(`      ${depLine}`));
                    }

                    // Add spacing between tasks (except for the last one)
                    if (index < linkedTasks.length - 1) {
                        this.contentLines.push('');
                    }
                });

                this.contentLines.push('');
                this.contentLines.push(''); // Extra spacing after section
            } else {
                this.contentLines.push(chalk.dim('   No tasks found linked to this PRD'));
                this.contentLines.push('');
                this.contentLines.push(''); // Extra spacing
            }
        } catch (error) {
            this.contentLines.push(chalk.red('   Error loading linked tasks: ' + error.message));
            this.contentLines.push('');
            this.contentLines.push(''); // Extra spacing
        }
    }

    /**
     * Get task status icon
     * @param {string} status - Task status
     */
    getTaskStatusIcon(status) {
        const statusIcons = {
            'pending': '○',
            'in-progress': '●',
            'done': '✓',
            'blocked': '🚫',
            'deferred': '⏸️',
            'cancelled': '❌',
            'review': '👀'
        };

        return statusIcons[status] || '❓';
    }

    /**
     * Get task status label
     * @param {string} status - Task status
     */
    getTaskStatusLabel(status) {
        const statusLabels = {
            'pending': chalk.yellow('Pending'),
            'in-progress': chalk.blue('In Progress'),
            'done': chalk.green('Done'),
            'review': chalk.cyan('Review'),
            'blocked': chalk.red('Blocked'),
            'deferred': chalk.gray('Deferred'),
            'cancelled': chalk.red('Cancelled')
        };
        return statusLabels[status] || chalk.gray('Unknown');
    }

    /**
     * Get status display with colors
     */
    getStatusDisplay(status) {
        const statusMap = {
            'pending': chalk.yellow('📋 Pending'),
            'in-progress': chalk.blue('🔄 In Progress'),
            'done': chalk.green('✅ Done'),
            'archived': chalk.gray('📦 Archived')
        };

        return statusMap[status] || chalk.gray(`❓ ${status}`);
    }

    /**
     * Get priority display with colors
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
     * Get complexity display with colors
     */
    getComplexityDisplay(complexity) {
        const complexityMap = {
            'high': chalk.red('🔺 High'),
            'medium': chalk.yellow('🔸 Medium'),
            'low': chalk.green('🔹 Low')
        };

        return complexityMap[complexity] || chalk.gray(`⚪ ${complexity || 'None'}`);
    }

    /**
     * Calculate scroll limits
     */
    calculateScrollLimits() {
        const visibleLines = this.popupHeight - 4; // Account for borders and controls
        this.maxScrollOffset = Math.max(0, this.contentLines.length - visibleLines);
    }

    /**
     * Scroll up
     */
    scrollUp() {
        if (this.scrollOffset > 0) {
            this.scrollOffset--;
            return true;
        }
        return false;
    }

    /**
     * Scroll down
     */
    scrollDown() {
        if (this.scrollOffset < this.maxScrollOffset) {
            this.scrollOffset++;
            return true;
        }
        return false;
    }

    /**
     * Wrap text to specified width
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
     * Render the popup
     */
    render() {
        if (!this.isVisible || !this.prd) return null;

        const { width: termWidth, height: termHeight } = getTerminalSize();

        // Calculate popup position (centered)
        const startX = Math.floor((termWidth - this.popupWidth) / 2);
        const startY = Math.floor((termHeight - this.popupHeight) / 2);

        const lines = [];

        // Top border
        lines.push(createRoundedHorizontalLine(this.popupWidth, true, false));

        // Title bar
        const titleBar = centerText(chalk.blue.bold(` PRD Details `), this.popupWidth - 2);
        lines.push(createVerticalLine(titleBar, this.popupWidth));

        // Separator
        lines.push(createRoundedHorizontalLine(this.popupWidth, true, false).replace(/╭/g, '├').replace(/╮/g, '┤'));

        // Content area
        const visibleLines = this.popupHeight - 4; // Account for borders and controls
        const visibleContent = this.contentLines.slice(this.scrollOffset, this.scrollOffset + visibleLines);

        for (let i = 0; i < visibleLines; i++) {
            const line = visibleContent[i] || '';
            const truncatedLine = truncateText(line, this.popupWidth - 4);
            lines.push(createVerticalLine(truncatedLine, this.popupWidth));
        }

        // Bottom border with controls
        const controlsText = 'V/Q/Esc: Close | ↑↓: Scroll';
        const scrollInfo = this.maxScrollOffset > 0 ?
            ` (${this.scrollOffset + 1}/${this.maxScrollOffset + 1})` : '';
        const bottomText = controlsText + scrollInfo;
        const centeredBottomText = centerText(chalk.dim(bottomText), this.popupWidth - 2);

        lines.push(createVerticalLine(centeredBottomText, this.popupWidth));
        lines.push(createRoundedHorizontalLine(this.popupWidth, false, false));

        return {
            lines,
            startX,
            startY,
            width: this.popupWidth,
            height: this.popupHeight
        };
    }

    /**
     * Handle keyboard input
     * @param {string} key - Pressed key
     */
    handleKeyPress(key) {
        if (!this.isVisible) return false;

        switch (key) {
            case 'v':
            case 'V':
            case 'q':
            case 'Q':
            case '\u001b': // Escape
                this.hide();
                return true;

            case '\u001b[A': // Up arrow
                return this.scrollUp();

            case '\u001b[B': // Down arrow
                return this.scrollDown();

            default:
                return false;
        }
    }

    /**
     * Get current PRD
     */
    getCurrentPRD() {
        return this.prd;
    }
}

/**
 * Create a PRD details popup instance
 */
export function createPRDDetailsPopup() {
    return new PRDDetailsPopup();
}
