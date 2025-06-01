/**
 * PRD Status Bar Component
 * Following the exact same pattern as task Kanban status bar
 */

import chalk from 'chalk';
import { getTerminalSize } from '../../kanban/utils/terminal-utils.js';

/**
 * PRD Status Bar class
 */
export class PRDStatusBar {
    constructor() {
        this.content = '';
        this.isVisible = true;
    }

    /**
     * Set status bar content
     */
    setContent(content) {
        this.content = content || '';
    }

    /**
     * Render the status bar (Task Kanban compatible)
     * @param {Object} boardState - Current board state
     */
    render(boardState = {}) {
        if (!this.isVisible) {
            return '';
        }

        const { width } = getTerminalSize();
        const statusBarContent = this.buildStatusBarContent(boardState, width);

        // Create status bar with background color (Task Kanban style)
        const statusBar = chalk.bgBlue.white(' ' + statusBarContent.padEnd(width - 2) + ' ');

        return statusBar;
    }

    /**
     * Build status bar content based on current state
     * @param {Object} boardState - Current board state
     * @param {number} width - Available width
     */
    buildStatusBarContent(boardState, width) {
        const parts = [];

        // Current selection info
        if (boardState.currentColumn) {
            parts.push(`Column: ${boardState.currentColumn.toUpperCase()}`);
        }

        if (boardState.selectedPRD) {
            const prdInfo = `PRD: #${boardState.selectedPRD.id} - ${boardState.selectedPRD.title}`;
            const truncatedInfo = prdInfo.length > 40 ? prdInfo.substring(0, 37) + '...' : prdInfo;
            parts.push(truncatedInfo);
        }

        // PRD counts
        if (boardState.statusCounts) {
            const counts = boardState.statusCounts;
            parts.push(`P:${counts.pending || 0} | I:${counts['in-progress'] || 0} | D:${counts.done || 0}`);
        }

        // Navigation hints
        parts.push('←→: Columns | ↑↓: PRDs | V: Details | T: Tasks | H: Help | Q: Quit');

        // Join parts with separators
        let content = parts.join(' | ');

        // Add temporary message if present
        if (this.content) {
            content = `${this.content} | ${content}`;
        }

        // Truncate to fit width
        return content.length > width - 2 ? content.substring(0, width - 5) + '...' : content;
    }

    /**
     * Get status bar content (legacy method for compatibility)
     */
    getContent() {
        if (!this.isVisible) {
            return '';
        }

        const { width } = getTerminalSize();

        // Truncate content if it's too long
        let displayContent = this.content;
        if (displayContent.length > width - 2) {
            displayContent = displayContent.substring(0, width - 5) + '...';
        }

        // Pad content to fill the width
        const padding = Math.max(0, width - displayContent.length);
        const paddedContent = displayContent + ' '.repeat(padding);

        // Style the status bar
        return chalk.bgBlue.white(paddedContent);
    }

    /**
     * Update status bar with navigation info
     */
    updateNavigationInfo(navigationHandler) {
        if (!navigationHandler) {
            this.setContent('PRD Kanban Board - Use arrow keys to navigate, Q to quit');
            return;
        }

        const positionInfo = navigationHandler.getCurrentPositionInfo();
        const selectedPRD = navigationHandler.getSelectedPRD();

        if (selectedPRD) {
            const title = selectedPRD.title || 'Untitled PRD';
            const truncatedTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
            
            this.setContent(
                `${selectedPRD.id}: ${truncatedTitle} | ` +
                `Column: ${positionInfo.column} | PRD: ${positionInfo.prd} | ` +
                `←→:Columns ↑↓:PRDs 1-3:Move V:Details T:Tasks Q:Quit`
            );
        } else {
            this.setContent(
                `Column: ${positionInfo.column} | No PRDs | ` +
                `←→:Columns Q:Quit`
            );
        }
    }

    /**
     * Update status bar with operation result
     */
    updateOperationResult(result) {
        if (result.success) {
            this.setContent(chalk.green(`✓ ${result.message}`));
        } else {
            this.setContent(chalk.red(`✗ ${result.message}`));
        }

        // Auto-clear after 3 seconds
        setTimeout(() => {
            this.clearOperationResult();
        }, 3000);
    }

    /**
     * Clear operation result and restore navigation info
     */
    clearOperationResult() {
        // This will be called by the board to restore navigation info
        this.setContent('');
    }

    /**
     * Show help information
     */
    showHelp() {
        this.setContent(
            'Navigation: ←→ Columns, ↑↓ PRDs | Actions: 1-3 Move, V Details, T Tasks, R Refresh | Q Quit, H Help'
        );
    }

    /**
     * Show loading message
     */
    showLoading(message = 'Loading...') {
        this.setContent(chalk.yellow(`⏳ ${message}`));
    }

    /**
     * Show error message
     */
    showError(message) {
        this.setContent(chalk.red(`✗ Error: ${message}`));
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.setContent(chalk.green(`✓ ${message}`));
    }

    /**
     * Show warning message
     */
    showWarning(message) {
        this.setContent(chalk.yellow(`⚠ ${message}`));
    }

    /**
     * Show info message
     */
    showInfo(message) {
        this.setContent(chalk.blue(`ℹ ${message}`));
    }

    /**
     * Set visibility
     */
    setVisible(visible) {
        this.isVisible = visible;
    }

    /**
     * Check if visible
     */
    isStatusBarVisible() {
        return this.isVisible;
    }

    /**
     * Get status bar height (always 1 line)
     */
    getHeight() {
        return this.isVisible ? 1 : 0;
    }

    /**
     * Clear content
     */
    clear() {
        this.content = '';
    }

    /**
     * Format PRD statistics for status bar
     */
    formatPRDStats(stats) {
        const total = stats.total || 0;
        const done = stats.done || 0;
        const inProgress = stats['in-progress'] || 0;
        const pending = stats.pending || 0;
        
        const completion = total > 0 ? Math.round((done / total) * 100) : 0;
        
        return `PRDs: ${total} total, ${done} done, ${inProgress} in progress, ${pending} pending (${completion}% complete)`;
    }

    /**
     * Format task statistics for status bar
     */
    formatTaskStats(stats) {
        const total = stats.total || 0;
        const done = stats.done || 0;
        const completion = total > 0 ? Math.round((done / total) * 100) : 0;
        
        return `Tasks: ${total} total, ${done} done (${completion}% complete)`;
    }

    /**
     * Show statistics summary
     */
    showStatistics(prdStats, taskStats) {
        const prdSummary = this.formatPRDStats(prdStats);
        const taskSummary = this.formatTaskStats(taskStats);
        
        this.setContent(`${prdSummary} | ${taskSummary}`);
    }

    /**
     * Show keyboard shortcuts
     */
    showKeyboardShortcuts() {
        this.setContent(
            'Keys: ←→ Columns | ↑↓ PRDs | 1-3 Move Status | V Details | T Tasks | R Refresh | S Stats | H Help | Q Quit'
        );
    }

    /**
     * Show column information
     */
    showColumnInfo(columnName, prdCount, selectedIndex) {
        const position = selectedIndex >= 0 ? ` (${selectedIndex + 1}/${prdCount})` : '';
        this.setContent(`Column: ${columnName} | PRDs: ${prdCount}${position}`);
    }

    /**
     * Show PRD operation status
     */
    showPRDOperation(operation, prdId, status) {
        const statusText = status === 'success' ? chalk.green('✓') : 
                          status === 'error' ? chalk.red('✗') : 
                          chalk.yellow('⏳');
        
        this.setContent(`${statusText} ${operation} PRD ${prdId}`);
    }
}

/**
 * Create a PRD status bar instance
 */
export function createPRDStatusBar() {
    return new PRDStatusBar();
}
