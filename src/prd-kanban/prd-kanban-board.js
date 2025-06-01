/**
 * PRD Kanban Board - Following Task Kanban Architecture
 * Reuses the proven terminal-based approach from task Kanban
 * NO blessed.js - using direct terminal output like task Kanban
 */

import chalk from 'chalk';
import path from 'path';
import { findProjectRoot, readJSON } from '../../scripts/modules/utils.js';
import { PRDBoardLayout } from './components/prd-board-layout.js';
import { createPRDKeyboardHandler } from './handlers/prd-keyboard-handler.js';
import { createPRDNavigationHandler } from './handlers/prd-navigation-handler.js';
import { createPRDStatusHandler } from './handlers/prd-status-handler.js';
import { createPRDOperationsHandler } from './handlers/prd-operations.js';
import { createPRDStatusBar } from './components/prd-status-bar.js';
import { createPRDDetailsPopup } from './components/prd-details-popup.js';
import { createPRDHelpPopup } from './components/prd-help-popup.js';

/**
 * PRD Kanban Board class - Following Task Kanban Architecture
 */
export class PRDKanbanBoard {
    constructor() {
        this.boardLayout = new PRDBoardLayout();
        this.prds = [];
        this.projectRoot = findProjectRoot();
        this.prdsPath = path.join(this.projectRoot, 'prd', 'prds.json');
        this.isRunning = false;
        this.onQuitCallback = null;

        // Initialize handlers - SAME PATTERN AS TASK KANBAN
        this.keyboardHandler = createPRDKeyboardHandler(this);
        this.navigationHandler = createPRDNavigationHandler(this.boardLayout);
        this.statusHandler = createPRDStatusHandler(this);
        this.operationsHandler = createPRDOperationsHandler(this);

        // Initialize UI components - SAME PATTERN AS TASK KANBAN
        this.statusBar = createPRDStatusBar();
        this.prdDetailsPopup = createPRDDetailsPopup();
        this.helpPopup = createPRDHelpPopup();
    }

    /**
     * Initialize and start the PRD Kanban board
     */
    async start() {
        try {
            console.log(chalk.blue('Loading PRD Kanban board...'));

            // Load PRDs from JSON
            await this.loadPRDs();

            // Start keyboard handler
            this.keyboardHandler.start();

            // Start the board
            this.isRunning = true;
            this.render();

            console.log(chalk.green('PRD Kanban board started. Press Q to quit.'));

            // Return a promise that resolves when the board is quit
            return new Promise((resolve) => {
                this.onQuitCallback = resolve;
            });

        } catch (error) {
            console.error(chalk.red('Error starting PRD Kanban board:'), error.message);
            this.cleanup();
            throw error;
        }
    }

    /**
     * Load PRDs from JSON file
     */
    async loadPRDs() {
        try {
            const prdsData = await readJSON(this.prdsPath);
            this.prds = prdsData.prds || [];
            console.log(chalk.green(`Loaded ${this.prds.length} PRDs`));

            // Load PRDs into board layout
            this.boardLayout.loadPRDs(this.prds);

        } catch (error) {
            console.error(chalk.red('Error loading PRDs:'), error.message);
            this.prds = [];
            this.boardLayout.loadPRDs([]);
        }
    }

    /**
     * Render the board
     */
    render() {
        // Get current board state for status bar
        const boardState = this.getBoardState();
        this.boardLayout.render(this.statusBar, this.prdDetailsPopup, this.helpPopup, boardState);
    }

    /**
     * Navigation methods (called by keyboard handler)
     */
    moveToNextColumn() {
        return this.navigationHandler.moveToNextColumn();
    }

    moveToPreviousColumn() {
        return this.navigationHandler.moveToPreviousColumn();
    }

    moveSelectionUp() {
        return this.navigationHandler.moveSelectionUp();
    }

    moveSelectionDown() {
        return this.navigationHandler.moveSelectionDown();
    }

    /**
     * PRD status update methods
     */
    movePRDToStatus(status) {
        return this.statusHandler.movePRDToStatus(status);
    }

    /**
     * PRD operations
     */
    async showPRDDetails() {
        return await this.operationsHandler.showPRDDetails();
    }

    showLinkedTasks() {
        return this.operationsHandler.showLinkedTasks();
    }

    showStatistics() {
        return this.operationsHandler.showStatistics();
    }

    showHelp() {
        this.helpPopup.open();
        this.render();
    }

    /**
     * Board control methods
     */
    async refreshBoard() {
        try {
            await this.loadPRDs();
            this.render();
            console.log(chalk.green('Board refreshed'));
        } catch (error) {
            console.error(chalk.red('Error refreshing board:'), error.message);
        }
    }

    /**
     * Quit the board
     */
    quit() {
        this.isRunning = false;
        this.cleanup();
        if (this.onQuitCallback) {
            this.onQuitCallback();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.keyboardHandler) {
            this.keyboardHandler.stop();
        }
        
        // Show cursor and clear screen
        process.stdout.write('\x1b[?25h'); // Show cursor
        console.clear();
    }

    /**
     * Get current selected PRD
     */
    getSelectedPRD() {
        const currentColumn = this.boardLayout.getCurrentColumn();
        if (currentColumn && currentColumn.hasPRDs()) {
            return currentColumn.getSelectedPRD();
        }
        return null;
    }

    /**
     * Get current board state for status bar
     */
    getBoardState() {
        const currentColumn = this.boardLayout.getCurrentColumn();
        const selectedPRD = this.getSelectedPRD();

        // Calculate PRD counts by status
        const statusCounts = {
            pending: 0,
            'in-progress': 0,
            done: 0
        };

        this.prds.forEach(prd => {
            const status = prd.status || 'pending';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });

        return {
            currentColumn: currentColumn ? currentColumn.getStatusTitle().toLowerCase() : null,
            selectedPRD: selectedPRD,
            statusCounts: statusCounts,
            totalPRDs: this.prds.length,
            mode: 'normal' // Can be extended for different modes
        };
    }

    /**
     * Get all PRDs
     */
    getAllPRDs() {
        return this.prds;
    }

    /**
     * Get PRDs by status
     */
    getPRDsByStatus(status) {
        return this.prds.filter(prd => prd.status === status);
    }
}

/**
 * Create and start a PRD Kanban board
 */
export async function createPRDKanbanBoard() {
    const board = new PRDKanbanBoard();
    return board;
}
