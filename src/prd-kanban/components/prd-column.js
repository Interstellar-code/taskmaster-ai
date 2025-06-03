/**
 * PRD Kanban Column Component
 * Following the exact same pattern as task Kanban column
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
    stripAnsi
} from '../../kanban/utils/terminal-utils.js';

/**
 * PRD Column class for rendering Kanban columns
 * Following Task Kanban Architecture
 */
export class PRDKanbanColumn {
    constructor(status, width, height) {
        this.status = status;
        this.width = width;
        this.height = height;
        this.prds = [];
        this.selectedPRDIndex = -1;
        this.isActive = false;
        this.scrollOffset = 0;
        this.maxVisiblePRDs = 0;
        this.calculateMaxVisiblePRDs();
    }

    /**
     * Calculate maximum number of PRDs that can be visible in the column
     */
    calculateMaxVisiblePRDs() {
        // Reserve space for header (3 lines) and borders
        const availableHeight = this.height - 4;
        // Each PRD takes 3 lines (title + metadata + separator), but last PRD doesn't need separator
        this.maxVisiblePRDs = Math.floor((availableHeight + 1) / 3);
    }

    /**
     * Update column size
     */
    updateSize(width, height) {
        this.width = width;
        this.height = height;
        this.calculateMaxVisiblePRDs();
    }

    /**
     * Add PRD to column
     */
    addPRD(prd) {
        this.prds.push(prd);
    }

    /**
     * Clear all PRDs
     */
    clearPRDs() {
        this.prds = [];
        this.selectedPRDIndex = -1;
        this.scrollOffset = 0;
    }

    /**
     * Set active state
     */
    setActive(active) {
        this.isActive = active;
    }

    /**
     * Check if column has PRDs
     */
    hasPRDs() {
        return this.prds.length > 0;
    }

    /**
     * Get PRD count
     */
    getPRDCount() {
        return this.prds.length;
    }

    /**
     * Set selected PRD
     */
    setSelectedPRD(index) {
        if (index >= 0 && index < this.prds.length) {
            this.selectedPRDIndex = index;
            this.ensurePRDVisible(index);
        } else {
            this.selectedPRDIndex = -1;
        }
    }

    /**
     * Get selected PRD
     */
    getSelectedPRD() {
        if (this.selectedPRDIndex >= 0 && this.selectedPRDIndex < this.prds.length) {
            return this.prds[this.selectedPRDIndex];
        }
        return null;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedPRDIndex = -1;
    }

    /**
     * Move selection up
     */
    moveSelectionUp() {
        if (this.prds.length === 0) return false;
        
        if (this.selectedPRDIndex > 0) {
            this.selectedPRDIndex--;
            this.ensurePRDVisible(this.selectedPRDIndex);
            return true;
        }
        return false;
    }

    /**
     * Move selection down
     */
    moveSelectionDown() {
        if (this.prds.length === 0) return false;
        
        if (this.selectedPRDIndex < this.prds.length - 1) {
            this.selectedPRDIndex++;
            this.ensurePRDVisible(this.selectedPRDIndex);
            return true;
        }
        return false;
    }

    /**
     * Ensure PRD is visible (handle scrolling)
     */
    ensurePRDVisible(index) {
        if (index < this.scrollOffset) {
            this.scrollOffset = index;
        } else if (index >= this.scrollOffset + this.maxVisiblePRDs) {
            this.scrollOffset = index - this.maxVisiblePRDs + 1;
        }
    }

    /**
     * Get header text for the column
     */
    getHeader() {
        const count = this.prds.length;
        const title = this.getStatusTitle();
        return centerText(`${title} (${count})`, this.width - 2);
    }

    /**
     * Get status title
     */
    getStatusTitle() {
        const titles = {
            'pending': 'PENDING',
            'in-progress': 'IN PROGRESS',
            'done': 'DONE'
        };
        return titles[this.status] || this.status.toUpperCase();
    }

    /**
     * Render the column - Following exact task column pattern
     * @param {number} maxPRDsToShow - Maximum number of PRDs to show
     */
    render(maxPRDsToShow = 10) {
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

        // PRD content area with scrolling
        const contentHeight = Math.max(3, this.height - 4); // Reserve space for header and borders
        this.calculateMaxVisiblePRDs(); // Recalculate in case height changed

        // Get PRDs to show based on scroll offset
        const startIndex = this.scrollOffset;
        const endIndex = startIndex + this.maxVisiblePRDs;
        const prdsToShow = this.prds.slice(startIndex, endIndex);

        // Add scroll indicators if needed
        const scrollInfo = this.getScrollInfo();

        if (prdsToShow.length === 0) {
            // Show "No PRDs" message
            const noPRDsMessage = chalk.gray('No PRDs');
            const centeredMessage = centerText(noPRDsMessage, this.width - 2);

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
            // Show PRDs
            let currentLine = 0;

            // Add scroll up indicator if needed
            if (scrollInfo && scrollInfo.canScrollUp) {
                const scrollUpIndicator = chalk.dim('↑ More PRDs above');
                if (useDouble) {
                    lines.push(createDoubleVerticalLine(centerText(scrollUpIndicator, this.width - 4), this.width));
                } else {
                    lines.push(createVerticalLine(centerText(scrollUpIndicator, this.width - 4), this.width));
                }
                currentLine++;
            }

            for (let i = 0; i < prdsToShow.length && currentLine < contentHeight - 2; i++) {
                const prd = prdsToShow[i];
                // Adjust selected index for scrolling
                const globalPRDIndex = startIndex + i;
                const isSelected = globalPRDIndex === this.selectedPRDIndex;
                const prdLines = this.renderPRDCard(prd, isSelected);

                // Add PRD card lines
                for (const prdLine of prdLines) {
                    if (currentLine >= contentHeight - 2) break;
                    if (useDouble) {
                        lines.push(createDoubleVerticalLine(prdLine, this.width));
                    } else {
                        lines.push(createVerticalLine(prdLine, this.width));
                    }
                    currentLine++;
                }

                // Add separator between PRDs (if not the last PRD and space available)
                if (i < prdsToShow.length - 1 && currentLine < contentHeight - 2) {
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
                const scrollDownIndicator = chalk.dim('↓ More PRDs below');
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
     * Render a PRD card within the column - Enhanced with user-friendly verbiage
     * @param {Object} prd - PRD object
     * @param {boolean} isSelected - Whether this PRD is selected
     */
    renderPRDCard(prd, isSelected = false) {
        const cardLines = [];
        const contentWidth = this.width - 6; // Account for column borders and card borders

        if (isSelected) {
            // Create bordered PRD card for selected PRD
            const cardWidth = this.width - 4; // Width for the PRD card

            // Top border of PRD card
            cardLines.push(createRoundedHorizontalLine(cardWidth, true, false));

            // PRD content with enhanced user-friendly format
            if (this.width < 30) {
                // Compact mode for narrow columns
                const compactLine = this.createCompactPRDSummary(prd, cardWidth - 2);
                cardLines.push(createVerticalLine(chalk.bgBlue.white(compactLine), cardWidth));
            } else {
                // Enhanced mode with detailed user-friendly information
                const lines = this.createEnhancedPRDContent(prd, cardWidth - 2);
                lines.forEach(line => {
                    cardLines.push(createVerticalLine(chalk.bgBlue.white(line), cardWidth));
                });
            }

            // Bottom border of PRD card
            cardLines.push(createRoundedHorizontalLine(cardWidth, false, false));

        } else {
            // Regular PRD card without borders - also enhanced
            if (this.width < 30) {
                // Compact mode for narrow columns
                const compactLine = this.createCompactPRDSummary(prd, contentWidth);
                cardLines.push(this.padToWidth(compactLine, contentWidth));
            } else {
                // Enhanced mode with detailed information
                const lines = this.createEnhancedPRDContent(prd, contentWidth);
                lines.forEach(line => {
                    cardLines.push(this.padToWidth(line, contentWidth));
                });
            }
        }

        return cardLines;
    }

    /**
     * Create enhanced PRD content with user-friendly verbiage
     */
    createEnhancedPRDContent(prd, maxWidth) {
        const lines = [];

        // Header line with PRD card indicator
        const cardHeader = `📄 PRD Card ${prd.id}:`;
        lines.push(chalk.bold(cardHeader));

        // Title line
        const title = prd.title || 'Untitled PRD';
        const titleLine = `  Title: ${title}`;
        if (titleLine.length > maxWidth) {
            lines.push(`  Title: ${title.substring(0, maxWidth - 11)}...`);
        } else {
            lines.push(titleLine);
        }

        // Get data for display
        const completion = prd.taskStats ? prd.taskStats.completionPercentage || 0 : (prd.completion || 0);
        const taskCount = prd.taskStats ? prd.taskStats.totalTasks || 0 : (prd.linkedTaskIds ? prd.linkedTaskIds.length : 0);

        // Standard metadata line only
        const statusIcon = this.getStatusIcon(prd.status);
        const priorityIcon = this.getPriorityIcon(prd.priority);
        const complexityIcon = this.getComplexityIcon(prd.complexity);
        const standardLine = `  Status: ${statusIcon} ${priorityIcon} ${complexityIcon} 📋${taskCount} ${completion}%`;
        lines.push(standardLine);

        // Tasks summary line
        const tasksLine = `  Tasks: ${taskCount}, Completion: ${completion}%`;
        lines.push(tasksLine);

        return lines;
    }

    /**
     * Format PRD title - Following task title formatting
     */
    formatPRDTitle(title, maxWidth, prdId) {
        const id = prdId || 'Unknown';
        const displayTitle = title || 'Untitled PRD';
        const idPrefix = `${id} - `;
        const maxTitleLength = maxWidth - idPrefix.length;

        let truncatedTitle = displayTitle;
        if (displayTitle.length > maxTitleLength) {
            truncatedTitle = displayTitle.substring(0, maxTitleLength - 3) + '...';
        }

        return chalk.bold(`${idPrefix}${truncatedTitle}`);
    }

    /**
     * Create PRD metadata line - Following task metadata pattern
     */
    createPRDMetadataLine(prd, maxWidth, isCompact) {
        const priority = prd.priority || 'medium';
        const complexity = prd.complexity || 'medium';

        // Get completion percentage from task statistics
        const completion = prd.taskStats ? prd.taskStats.completionPercentage || 0 : (prd.completion || 0);

        // Get task count from task statistics
        const taskCount = prd.taskStats ? prd.taskStats.totalTasks || 0 : (prd.linkedTaskIds ? prd.linkedTaskIds.length : 0);

        const statusIcon = this.getStatusIcon(prd.status);
        const priorityIcon = this.getPriorityIcon(priority);
        const complexityIcon = this.getComplexityIcon(complexity);
        const taskCountText = `📋${taskCount}`;
        const completionText = `${completion}%`;

        if (isCompact) {
            return chalk.dim(`${statusIcon}${priorityIcon}${complexityIcon} ${taskCountText} ${completionText}`);
        } else {
            return chalk.dim(`${statusIcon} ${priorityIcon} ${complexityIcon} ${taskCountText} ${completionText}`);
        }
    }

    /**
     * Create compact PRD summary for narrow columns
     */
    createCompactPRDSummary(prd, maxWidth) {
        const id = prd.id || '???';

        // Get completion percentage from task statistics
        const completion = prd.taskStats ? prd.taskStats.completionPercentage || 0 : (prd.completion || 0);

        // Get task count from task statistics
        const taskCount = prd.taskStats ? prd.taskStats.totalTasks || 0 : (prd.linkedTaskIds ? prd.linkedTaskIds.length : 0);

        const statusIcon = this.getStatusIcon(prd.status);
        const priorityIcon = this.getPriorityIcon(prd.priority);
        const complexityIcon = this.getComplexityIcon(prd.complexity);

        const summary = `${id} ${statusIcon}${priorityIcon}${complexityIcon} 📋${taskCount} ${completion}%`;

        if (summary.length > maxWidth) {
            return summary.substring(0, maxWidth - 3) + '...';
        }

        return summary;
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
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'pending': '📋',
            'in-progress': '🔄',
            'done': '✅',
            'blocked': '🚫',
            'deferred': '⏸️',
            'cancelled': '❌',
            'review': '👀',
            'archived': '📦'
        };
        return icons[status] || '❓';
    }

    /**
     * Get priority icon
     */
    getPriorityIcon(priority) {
        const icons = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        };
        return icons[priority] || '⚪';
    }

    /**
     * Get complexity icon
     */
    getComplexityIcon(complexity) {
        const icons = {
            'high': '🔺',
            'medium': '🔸',
            'low': '🔹'
        };
        return icons[complexity] || '⚪';
    }

    /**
     * Remove PRD from column
     */
    removePRD(prdId) {
        const index = this.prds.findIndex(prd => prd.id === prdId);
        if (index !== -1) {
            this.prds.splice(index, 1);
            
            // Adjust selection if necessary
            if (this.selectedPRDIndex >= this.prds.length) {
                this.selectedPRDIndex = Math.max(0, this.prds.length - 1);
            }
            if (this.prds.length === 0) {
                this.selectedPRDIndex = -1;
            }
            
            return true;
        }
        return false;
    }

    /**
     * Get all PRDs in column
     */
    getAllPRDs() {
        return [...this.prds];
    }

    /**
     * Find PRD by ID
     */
    findPRD(prdId) {
        return this.prds.find(prd => prd.id === prdId);
    }

    /**
     * Get scroll information
     */
    getScrollInfo() {
        return {
            offset: this.scrollOffset,
            maxVisible: this.maxVisiblePRDs,
            total: this.prds.length,
            canScrollUp: this.scrollOffset > 0,
            canScrollDown: this.scrollOffset + this.maxVisiblePRDs < this.prds.length
        };
    }
}
