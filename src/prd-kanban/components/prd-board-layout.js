/**
 * PRD Kanban Board Layout Component
 * Following the exact same pattern as task Kanban board layout
 * Uses terminal output instead of blessed.js
 */

import chalk from 'chalk';
import { PRDKanbanColumn } from './prd-column.js';
import {
    getTerminalSize,
    calculateColumnWidths,
    clearScreen,
    hideCursor,
    showCursor,
    moveCursor
} from '../../kanban/utils/terminal-utils.js';

/**
 * PRD Board Layout class - Following Task Kanban Architecture
 */
export class PRDBoardLayout {
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
            const column = new PRDKanbanColumn(status, columnWidth, columnHeight);
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
            column.updateSize(columnWidth, columnHeight);
        });
    }

    /**
     * Load PRDs into columns
     */
    loadPRDs(prds) {
        // Clear existing PRDs
        this.columns.forEach(column => {
            column.clearPRDs();
        });

        // Distribute PRDs by status
        prds.forEach(prd => {
            const status = prd.status || 'pending';
            const column = this.columns.get(status);
            if (column) {
                column.addPRD(prd);
            }
        });

        // Set initial selection
        this.setInitialSelection();
    }

    /**
     * Set initial selection to first column with PRDs
     */
    setInitialSelection() {
        // Clear all selections first
        this.columns.forEach(column => {
            column.clearSelection();
            column.setActive(false);
        });

        // Find first column with PRDs and set it as active
        for (let i = 0; i < this.statusOrder.length; i++) {
            const status = this.statusOrder[i];
            const column = this.columns.get(status);
            if (column && column.hasPRDs()) {
                this.currentColumnIndex = i;
                column.setActive(true);
                column.setSelectedPRD(0);
                break;
            }
        }

        // If no column has PRDs, just set first column as active
        if (!this.getCurrentColumn()?.isActive) {
            this.currentColumnIndex = 0;
            const firstColumn = this.columns.get(this.statusOrder[0]);
            if (firstColumn) {
                firstColumn.setActive(true);
            }
        }
    }

    /**
     * Render the entire board
     */
    render(statusBar, prdDetailsPopup, helpPopup, boardState = {}) {
        if (!this.isInitialized) {
            return;
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
            this.renderStatusBar(statusBar, boardState);

            // Render popups overlay if present
            if (prdDetailsPopup && prdDetailsPopup.isOpen && prdDetailsPopup.isOpen()) {
                this.renderPopupOverlay(prdDetailsPopup);
            }

            if (helpPopup && helpPopup.isPopupOpen && helpPopup.isPopupOpen()) {
                this.renderHelpPopupOverlay(helpPopup);
            }

        } catch (error) {
            console.error('Error rendering PRD board:', error);
        }
    }

    /**
     * Generate all board lines for rendering - Following task board pattern
     */
    generateBoardLines() {
        const { width, height } = this.terminalSize;
        const { columnWidth, padding } = calculateColumnWidths(width);
        const boardHeight = height - 4;

        const lines = [];

        // Header line
        lines.push(this.generateHeaderLine());

        // Column content lines (columns now handle their own headers and borders)
        const contentLines = this.generateColumnContent(columnWidth, padding, boardHeight - 1);
        lines.push(...contentLines);

        return lines;
    }

    /**
     * Generate header line
     */
    generateHeaderLine() {
        const title = chalk.bold.cyan('PRD Kanban Board');
        const { width } = this.terminalSize;
        const padding = Math.max(0, Math.floor((width - title.length) / 2));
        return ' '.repeat(padding) + title;
    }

    /**
     * Generate column headers
     */
    generateColumnHeaders(columnWidth, padding) {
        const headers = this.statusOrder.map((status, index) => {
            const column = this.columns.get(status);
            const count = column ? column.getPRDCount() : 0;
            const title = this.getStatusTitle(status);
            const header = `${title} (${count})`;

            // Center the header in the column
            const headerPadding = Math.max(0, Math.floor((columnWidth - header.length) / 2));
            const paddedHeader = ' '.repeat(headerPadding) + header + ' '.repeat(columnWidth - headerPadding - header.length);

            // Color based on status and activity
            if (column && column.isActive) {
                return chalk.bgCyan.black(paddedHeader);
            } else {
                return chalk.bold(this.getStatusColor(status)(paddedHeader));
            }
        });

        return headers.join(' '.repeat(padding));
    }

    /**
     * Generate separator line
     */
    generateSeparatorLine(columnWidth, padding) {
        const separator = '─'.repeat(columnWidth);
        const separators = this.statusOrder.map((status) => {
            const column = this.columns.get(status);
            if (column && column.isActive) {
                return chalk.cyan(separator);
            } else {
                return chalk.gray(separator);
            }
        });

        return separators.join(' '.repeat(padding));
    }

    /**
     * Generate column content lines - Following task board pattern
     */
    generateColumnContent(columnWidth, padding, maxLines) {
        const { width, height } = this.terminalSize;
        const { columnWidth: calcColumnWidth } = calculateColumnWidths(width);
        const boardHeight = height - 4;

        const lines = [];

        // Render each column separately
        const renderedColumns = this.statusOrder.map(status => {
            const column = this.columns.get(status);
            if (column) {
                return column.render();
            } else {
                return [];
            }
        });

        // Find the maximum height among all columns
        const maxHeight = Math.max(...renderedColumns.map(col => col.length));

        // Combine columns side by side
        const boardLines = [];

        for (let lineIndex = 0; lineIndex < maxHeight; lineIndex++) {
            let line = '';

            for (let colIndex = 0; colIndex < this.statusOrder.length; colIndex++) {
                const columnLines = renderedColumns[colIndex];
                const columnLine = lineIndex < columnLines.length ? columnLines[lineIndex] : ' '.repeat(calcColumnWidth);

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
     * Get status title
     */
    getStatusTitle(status) {
        const titles = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'done': 'Done'
        };
        return titles[status] || status;
    }

    /**
     * Get status color function
     */
    getStatusColor(status) {
        const colors = {
            'pending': chalk.yellow,
            'in-progress': chalk.blue,
            'done': chalk.green
        };
        return colors[status] || chalk.white;
    }

    /**
     * Render status bar
     */
    renderStatusBar(statusBar, boardState = {}) {
        if (statusBar) {
            const { height } = this.terminalSize;
            moveCursor(height, 1);

            // Use the task Kanban status bar pattern
            if (statusBar.render && typeof statusBar.render === 'function') {
                // Task Kanban style status bar
                const statusBarContent = statusBar.render(boardState);
                process.stdout.write(statusBarContent);
            } else {
                // PRD Kanban style status bar (fallback)
                process.stdout.write(statusBar.getContent());
            }
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
     * Navigation methods
     */
    moveToNextColumn() {
        const oldColumn = this.getCurrentColumn();
        if (oldColumn) {
            oldColumn.setActive(false);
            oldColumn.clearSelection(); // Clear selection from old column
        }

        this.currentColumnIndex = (this.currentColumnIndex + 1) % this.statusOrder.length;

        const newColumn = this.getCurrentColumn();
        if (newColumn) {
            newColumn.setActive(true);
            if (newColumn.hasPRDs()) {
                newColumn.setSelectedPRD(0);
            }
        }

        return true;
    }

    moveToPreviousColumn() {
        const oldColumn = this.getCurrentColumn();
        if (oldColumn) {
            oldColumn.setActive(false);
            oldColumn.clearSelection(); // Clear selection from old column
        }

        this.currentColumnIndex = (this.currentColumnIndex - 1 + this.statusOrder.length) % this.statusOrder.length;

        const newColumn = this.getCurrentColumn();
        if (newColumn) {
            newColumn.setActive(true);
            if (newColumn.hasPRDs()) {
                newColumn.setSelectedPRD(0);
            }
        }

        return true;
    }

    /**
     * Get current active column
     */
    getCurrentColumn() {
        const status = this.statusOrder[this.currentColumnIndex];
        return this.columns.get(status);
    }

    /**
     * Get current column status
     */
    getCurrentStatus() {
        return this.statusOrder[this.currentColumnIndex];
    }

    /**
     * Move selection up in current column
     */
    moveSelectionUp() {
        const currentColumn = this.getCurrentColumn();
        if (currentColumn && currentColumn.hasPRDs()) {
            return currentColumn.moveSelectionUp();
        }
        return false;
    }

    /**
     * Move selection down in current column
     */
    moveSelectionDown() {
        const currentColumn = this.getCurrentColumn();
        if (currentColumn && currentColumn.hasPRDs()) {
            return currentColumn.moveSelectionDown();
        }
        return false;
    }

    /**
     * Get selected PRD
     */
    getSelectedPRD() {
        const currentColumn = this.getCurrentColumn();
        if (currentColumn) {
            return currentColumn.getSelectedPRD();
        }
        return null;
    }

    /**
     * Get selected PRD index
     */
    getSelectedPRDIndex() {
        const currentColumn = this.getCurrentColumn();
        if (currentColumn) {
            return currentColumn.selectedPRDIndex;
        }
        return -1;
    }
}