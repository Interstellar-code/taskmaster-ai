/**
 * Kanban Board Layout Component
 * Manages the overall layout and rendering of the Kanban board
 */

import chalk from 'chalk';
import { KanbanColumn } from './column.js';
import {
    getTerminalSize,
    calculateColumnWidths,
    clearScreen,
    hideCursor,
    showCursor,
    moveCursor
} from '../utils/terminal-utils.js';

/**
 * Board Layout class for managing the Kanban board display
 */
export class BoardLayout {
    constructor() {
        this.columns = new Map();
        this.currentColumnIndex = 0;
        this.statusOrder = ['pending', 'in-progress', 'done'];
        this.terminalSize = getTerminalSize();
        this.isInitialized = false;
        
        // Initialize columns
        this.initializeColumns();
        
        // Listen for terminal resize
        this.setupResizeHandler();
    }

    /**
     * Initialize the three status columns
     */
    initializeColumns() {
        const { width, height } = this.terminalSize;
        const { columnWidth } = calculateColumnWidths(width);
        const columnHeight = height - 4; // Reserve space for header and status bar

        this.statusOrder.forEach((status, index) => {
            const column = new KanbanColumn(status, columnWidth, columnHeight);
            // Set first column as active by default
            if (index === this.currentColumnIndex) {
                column.setActive(true);
            }
            this.columns.set(status, column);
        });

        this.isInitialized = true;
    }

    /**
     * Setup terminal resize handler
     */
    setupResizeHandler() {
        process.stdout.on('resize', () => {
            this.terminalSize = getTerminalSize();
            this.updateColumnSizes();
        });
    }

    /**
     * Update column sizes after terminal resize
     */
    updateColumnSizes() {
        const { width, height } = this.terminalSize;
        const { columnWidth } = calculateColumnWidths(width);
        const columnHeight = height - 4;

        this.columns.forEach(column => {
            column.width = columnWidth;
            column.height = columnHeight;
        });
    }

    /**
     * Load tasks into appropriate columns
     * @param {Array} tasks - Array of all tasks
     */
    loadTasks(tasks) {
        // Clear existing tasks
        this.columns.forEach(column => column.setTasks([]));

        // Group tasks by status
        const tasksByStatus = {
            'pending': [],
            'in-progress': [],
            'done': []
        };

        tasks.forEach(task => {
            const status = task.status || 'pending';
            if (tasksByStatus[status]) {
                tasksByStatus[status].push(task);
            } else {
                // Handle unknown statuses by putting them in pending
                tasksByStatus['pending'].push(task);
            }
        });

        // Set tasks for each column
        this.statusOrder.forEach(status => {
            const column = this.columns.get(status);
            if (column) {
                column.setTasks(tasksByStatus[status]);
            }
        });
    }

    /**
     * Render the entire board
     * @param {Object} statusBar - Optional status bar component
     * @param {Object} taskDetailsPopup - Optional task details popup component
     * @param {Object} helpPopup - Optional help popup component
     */
    render(statusBar = null, taskDetailsPopup = null, helpPopup = null) {
        if (!this.isInitialized) {
            this.initializeColumns();
        }

        clearScreen();
        hideCursor();

        try {
            const lines = this.generateBoardLines();

            // Print each line
            lines.forEach((line, index) => {
                moveCursor(index + 1, 1);
                process.stdout.write(line);
            });

            // Render status bar at bottom
            this.renderStatusBar(statusBar);

            // Render popups overlay if present (task details popup first, then help popup on top)
            if (taskDetailsPopup && taskDetailsPopup.isOpen && taskDetailsPopup.isOpen()) {
                this.renderPopupOverlay(taskDetailsPopup);
            }

            if (helpPopup && helpPopup.isPopupOpen && helpPopup.isPopupOpen()) {
                this.renderHelpPopupOverlay(helpPopup);
            }

        } catch (error) {
            console.error('Error rendering board:', error);
        }
    }

    /**
     * Render popup overlay on top of the board
     * @param {Object} popup - Popup component to render
     */
    renderPopupOverlay(popup) {
        const popupData = popup.render();
        if (!popupData) return;

        const { lines, startX, startY } = popupData;

        // Render each line of the popup at the calculated position
        lines.forEach((line, index) => {
            moveCursor(startY + index, startX);
            process.stdout.write(line);
        });
    }

    /**
     * Render help popup overlay on top of the board
     * @param {Object} helpPopup - Help popup component to render
     */
    renderHelpPopupOverlay(helpPopup) {
        const popupLines = helpPopup.render();
        if (!popupLines || popupLines.length === 0) return;

        const position = helpPopup.getPosition();

        // Render each line of the help popup at the calculated position
        popupLines.forEach((line, index) => {
            moveCursor(position.y + index, position.x);
            process.stdout.write(line);
        });
    }

    /**
     * Generate all lines for the board display
     */
    generateBoardLines() {
        const { width } = this.terminalSize;
        const { columnWidth } = calculateColumnWidths(width);
        const padding = 2;

        // Get rendered columns
        const renderedColumns = this.statusOrder.map(status => {
            const column = this.columns.get(status);
            return column ? column.render() : [];
        });

        // Find the maximum height among all columns
        const maxHeight = Math.max(...renderedColumns.map(col => col.length));

        // Combine columns side by side
        const boardLines = [];
        
        for (let lineIndex = 0; lineIndex < maxHeight; lineIndex++) {
            let line = '';
            
            for (let colIndex = 0; colIndex < this.statusOrder.length; colIndex++) {
                const columnLines = renderedColumns[colIndex];
                const columnLine = lineIndex < columnLines.length ? columnLines[lineIndex] : ' '.repeat(columnWidth);
                
                line += columnLine;
                
                // Add padding between columns (except after the last column)
                if (colIndex < this.statusOrder.length - 1) {
                    line += ' '.repeat(padding);
                }
            }
            
            boardLines.push(line);
        }

        return boardLines;
    }

    /**
     * Render status bar at the bottom of the screen
     * @param {Object} statusBar - Status bar component (optional)
     */
    renderStatusBar(statusBar = null) {
        const { height, width } = this.terminalSize;
        const statusBarRow = height - 1;

        let statusBarContent;

        if (statusBar) {
            // Use enhanced status bar component
            const boardState = {
                currentColumn: this.statusOrder[this.currentColumnIndex],
                selectedTask: this.getSelectedTask(),
                statusCounts: this.getStatistics().statusCounts
            };
            statusBarContent = statusBar.render(boardState);
        } else {
            // Fallback to simple status bar
            const currentColumn = this.getCurrentColumn();
            const currentStatus = this.statusOrder[this.currentColumnIndex];
            const selectedTask = currentColumn ? currentColumn.getSelectedTask() : null;

            let statusText = `Column: ${currentStatus.toUpperCase()}`;

            if (selectedTask) {
                statusText += ` | Task: #${selectedTask.id} - ${selectedTask.title}`;
            }

            statusText += ' | Navigation: ←→ Columns, ↑↓ Tasks, 1-3 Move, Q Quit';

            // Truncate if too long
            if (statusText.length > width - 2) {
                statusText = statusText.substring(0, width - 5) + '...';
            }

            statusBarContent = chalk.bgBlue.white(' ' + statusText.padEnd(width - 2) + ' ');
        }

        // Render status bar
        moveCursor(statusBarRow, 1);
        process.stdout.write(statusBarContent);
    }

    /**
     * Get current column
     */
    getCurrentColumn() {
        const status = this.statusOrder[this.currentColumnIndex];
        return this.columns.get(status);
    }

    /**
     * Move to next column
     */
    moveToNextColumn() {
        // Clear current column selection and deactivate
        const currentColumn = this.getCurrentColumn();
        if (currentColumn) {
            currentColumn.clearSelection();
            currentColumn.setActive(false);
        }

        this.currentColumnIndex = (this.currentColumnIndex + 1) % this.statusOrder.length;

        // Set selection to first task in new column and activate
        const newColumn = this.getCurrentColumn();
        if (newColumn) {
            newColumn.setActive(true);
            if (newColumn.hasTasks()) {
                newColumn.setSelectedTask(0);
            }
        }
    }

    /**
     * Move to previous column
     */
    moveToPreviousColumn() {
        // Clear current column selection and deactivate
        const currentColumn = this.getCurrentColumn();
        if (currentColumn) {
            currentColumn.clearSelection();
            currentColumn.setActive(false);
        }

        this.currentColumnIndex = this.currentColumnIndex === 0
            ? this.statusOrder.length - 1
            : this.currentColumnIndex - 1;

        // Set selection to first task in new column and activate
        const newColumn = this.getCurrentColumn();
        if (newColumn) {
            newColumn.setActive(true);
            if (newColumn.hasTasks()) {
                newColumn.setSelectedTask(0);
            }
        }
    }

    /**
     * Move selection up in current column
     */
    moveSelectionUp() {
        const currentColumn = this.getCurrentColumn();
        return currentColumn ? currentColumn.moveSelectionUp() : false;
    }

    /**
     * Move selection down in current column
     */
    moveSelectionDown() {
        const currentColumn = this.getCurrentColumn();
        return currentColumn ? currentColumn.moveSelectionDown() : false;
    }

    /**
     * Get currently selected task
     */
    getSelectedTask() {
        const currentColumn = this.getCurrentColumn();
        return currentColumn ? currentColumn.getSelectedTask() : null;
    }

    /**
     * Get current column status
     */
    getCurrentStatus() {
        return this.statusOrder[this.currentColumnIndex];
    }

    /**
     * Get board statistics
     */
    getStatistics() {
        let totalTasks = 0;
        let completedTasks = 0;
        const statusCounts = {};

        this.statusOrder.forEach(status => {
            const column = this.columns.get(status);
            const count = column ? column.getTaskCount() : 0;
            statusCounts[status] = count;
            totalTasks += count;
            
            if (status === 'done') {
                completedTasks = count;
            }
        });

        const completionPercentage = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0;

        return {
            totalTasks,
            completedTasks,
            completionPercentage,
            statusCounts
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        showCursor();
        clearScreen();
    }

    /**
     * Force refresh of the board
     */
    refresh() {
        this.render();
    }
}
