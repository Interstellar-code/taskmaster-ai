/**
 * Task Details Popup Component
 * Displays task details in a popup overlay within the Kanban view
 */

import chalk from 'chalk';
import {
    BOX_CHARS,
    createRoundedHorizontalLine,
    createVerticalLine,
    centerText,
    truncateText,
    stripAnsi,
    getTerminalSize,
    moveCursor
} from '../utils/terminal-utils.js';

/**
 * TaskDetailsPopup class for displaying task details in a popup
 */
export class TaskDetailsPopup {
    constructor() {
        this.isVisible = false;
        this.task = null;
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.contentLines = [];
        this.updateDimensions();
    }

    /**
     * Update popup dimensions based on terminal size (75% of viewport)
     */
    updateDimensions() {
        const { width: termWidth, height: termHeight } = getTerminalSize();
        this.popupWidth = Math.floor(termWidth * 0.75);
        this.popupHeight = Math.floor(termHeight * 0.75);

        // Ensure minimum dimensions
        this.popupWidth = Math.max(this.popupWidth, 60);
        this.popupHeight = Math.max(this.popupHeight, 20);

        // Ensure popup fits within terminal
        this.popupWidth = Math.min(this.popupWidth, termWidth - 4);
        this.popupHeight = Math.min(this.popupHeight, termHeight - 4);
    }

    /**
     * Show popup with task details
     * @param {Object} task - Task to display
     */
    show(task) {
        if (!task) return false;

        // Update dimensions for current terminal size
        this.updateDimensions();

        this.task = task;
        this.isVisible = true;
        this.scrollOffset = 0;
        this.generateContent();
        this.calculateScrollLimits();

        return true;
    }

    /**
     * Hide the popup
     */
    hide() {
        this.isVisible = false;
        this.task = null;
        this.scrollOffset = 0;
        this.contentLines = [];
    }

    /**
     * Generate content lines for the popup
     */
    generateContent() {
        this.contentLines = [];
        const contentWidth = this.popupWidth - 6; // Account for borders and padding
        const halfWidth = Math.floor(contentWidth / 2) - 2;

        if (!this.task) return;

        // Header with task ID and title in larger format
        this.contentLines.push(chalk.blue.bold(`╭─ Task #${this.task.id} ─╮`));
        this.contentLines.push('');

        // Title (larger, more prominent)
        this.contentLines.push(chalk.white.bold('📋 TITLE:'));
        const titleLines = this.wrapText(this.task.title || 'Untitled Task', contentWidth - 2);
        titleLines.forEach(line => this.contentLines.push(`   ${chalk.cyan(line)}`));
        this.contentLines.push('');

        // Two-column layout for status/priority and metadata
        this.contentLines.push(chalk.white.bold('📊 STATUS & METADATA:'));
        this.contentLines.push('');

        // Status and Priority side by side
        const statusDisplay = this.getStatusDisplay(this.task.status);
        const priorityDisplay = this.getPriorityDisplay(this.task.priority);
        this.contentLines.push(`   Status: ${statusDisplay}     Priority: ${priorityDisplay}`);
        this.contentLines.push('');

        // Additional metadata in organized sections
        const metadataItems = [];

        if (this.task.dependencies && this.task.dependencies.length > 0) {
            metadataItems.push(`   🔗 Dependencies: ${chalk.yellow(this.task.dependencies.join(', '))}`);
        }

        if (this.task.prdSource) {
            metadataItems.push(`   📄 PRD Source: ${chalk.cyan(this.task.prdSource.fileName || 'Unknown')}`);
            if (this.task.prdSource.filePath) {
                metadataItems.push(`   📁 Path: ${chalk.gray(this.task.prdSource.filePath)}`);
            }
        }

        if (this.task.subtasks && this.task.subtasks.length > 0) {
            metadataItems.push(`   📝 Subtasks: ${chalk.magenta(`${this.task.subtasks.length} subtasks`)}`);
        }

        if (metadataItems.length > 0) {
            metadataItems.forEach(item => this.contentLines.push(item));
            this.contentLines.push('');
        }

        // Content sections with better formatting and spacing
        const sections = [
            {
                title: '📝 DESCRIPTION:',
                content: this.task.description,
                color: chalk.gray
            },
            {
                title: '🔧 IMPLEMENTATION DETAILS:',
                content: this.task.details,
                color: chalk.gray
            },
            {
                title: '🧪 TEST STRATEGY:',
                content: this.task.testStrategy,
                color: chalk.gray
            },
            {
                title: '✅ ACCEPTANCE CRITERIA:',
                content: this.task.acceptanceCriteria,
                color: chalk.gray
            }
        ];

        sections.forEach(section => {
            if (section.content) {
                this.contentLines.push(chalk.white.bold(section.title));
                this.contentLines.push('');
                const lines = this.wrapText(section.content, contentWidth - 4);
                lines.forEach(line => this.contentLines.push(`   ${section.color(line)}`));
                this.contentLines.push('');
                this.contentLines.push(''); // Extra spacing between sections
            }
        });
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
     * Render the popup
     */
    render() {
        if (!this.isVisible || !this.task) return null;

        const { width: termWidth, height: termHeight } = getTerminalSize();
        
        // Calculate popup position (centered)
        const startX = Math.floor((termWidth - this.popupWidth) / 2);
        const startY = Math.floor((termHeight - this.popupHeight) / 2);
        
        const lines = [];
        
        // Top border
        lines.push(createRoundedHorizontalLine(this.popupWidth, true, false));
        
        // Title bar
        const titleBar = centerText(chalk.blue.bold(` Task Details `), this.popupWidth - 2);
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
        const controlsText = 'C: Close | ↑↓: Scroll';
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
            case 'c':
            case 'C':
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
     * Get status display with colors
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
     * Check if popup is visible
     */
    isOpen() {
        return this.isVisible;
    }

    /**
     * Get current task
     */
    getCurrentTask() {
        return this.task;
    }
}

/**
 * Create a task details popup instance
 */
export function createTaskDetailsPopup() {
    return new TaskDetailsPopup();
}
