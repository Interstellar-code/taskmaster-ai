/**
 * Main Kanban Board Component
 * Entry point for the terminal-based Kanban board
 */

import { BoardLayout } from './components/board-layout.js';
import { createKeyboardHandler } from './handlers/keyboard-handler.js';
import { createNavigationHandler } from './handlers/navigation-handler.js';
import { createStatusHandler } from './handlers/status-handler.js';
import { createTaskOperationsHandler } from './handlers/task-operations.js';
import { createBoardControlsHandler } from './handlers/board-controls.js';
import { createHelpOverlay } from './components/help-overlay.js';
import { createHelpPopup } from './components/help-popup.js';
import { createStatusBar } from './components/status-bar.js';
import { createTaskDetailsPopup } from './components/task-details-popup.js';
import { readJSON } from '../../scripts/modules/utils.js';
import { findProjectRoot } from '../../scripts/modules/utils.js';
import chalk from 'chalk';
import path from 'path';

/**
 * Main Kanban Board class
 */
export class KanbanBoard {
    constructor() {
        this.boardLayout = new BoardLayout();
        this.tasks = [];
        this.projectRoot = findProjectRoot();
        this.tasksPath = path.join(this.projectRoot, 'tasks', 'tasks.json');
        this.isRunning = false;

        // Initialize handlers
        this.keyboardHandler = createKeyboardHandler(this);
        this.navigationHandler = createNavigationHandler(this.boardLayout);
        this.statusHandler = createStatusHandler(this);
        this.taskOperationsHandler = createTaskOperationsHandler(this);
        this.boardControlsHandler = createBoardControlsHandler(this);

        // Initialize UI components
        this.helpOverlay = createHelpOverlay();
        this.helpPopup = createHelpPopup();
        this.statusBar = createStatusBar();
        this.taskDetailsPopup = createTaskDetailsPopup();
    }

    /**
     * Initialize and start the Kanban board
     */
    async start() {
        try {
            console.log(chalk.blue('Loading Kanban board...'));

            // Load tasks from JSON
            await this.loadTasks();

            // Start keyboard handler
            this.keyboardHandler.start();

            // Start the board
            this.isRunning = true;
            this.render();

            console.log(chalk.green('Kanban board started. Press Q to quit.'));

        } catch (error) {
            console.error(chalk.red('Error starting Kanban board:'), error.message);
            this.cleanup();
        }
    }

    /**
     * Load tasks from tasks.json
     */
    async loadTasks() {
        try {
            const data = readJSON(this.tasksPath);
            this.tasks = data.tasks || [];
            
            // Load tasks into board layout
            this.boardLayout.loadTasks(this.tasks);
            
            console.log(chalk.green(`Loaded ${this.tasks.length} tasks`));
            
        } catch (error) {
            console.error(chalk.red('Error loading tasks:'), error.message);
            this.tasks = [];
            this.boardLayout.loadTasks([]);
        }
    }

    /**
     * Render the board
     */
    render() {
        this.boardLayout.render(this.statusBar, this.taskDetailsPopup, this.helpPopup);
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
     * Move selected task to a different status
     * @param {string} newStatus - Target status
     */
    async moveTaskToStatus(newStatus) {
        try {
            const result = await this.statusHandler.moveSelectedTaskToStatus(newStatus);

            if (result.success) {
                this.render();
                // Show brief success message
                setTimeout(() => {
                    console.log(chalk.green(`✓ ${result.message}`));
                }, 100);
            } else {
                console.error(chalk.red(`✗ ${result.reason}`));
            }

            return result;

        } catch (error) {
            console.error(chalk.red('Error updating task status:'), error.message);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Get currently selected task
     */
    getSelectedTask() {
        return this.navigationHandler.getSelectedTask();
    }

    /**
     * Refresh the board from tasks.json
     */
    async refreshBoard() {
        try {
            const result = await this.taskOperationsHandler.refreshBoard();
            if (result.success) {
                this.render();
            }
        } catch (error) {
            console.error(chalk.red('Error refreshing board:'), error.message);
        }
    }

    /**
     * Show board statistics
     */
    showStatistics() {
        const stats = this.boardLayout.getStatistics();
        
        console.log(chalk.blue('\n=== Board Statistics ==='));
        console.log(chalk.white(`Total Tasks: ${stats.totalTasks}`));
        console.log(chalk.white(`Completed: ${stats.completedTasks}`));
        console.log(chalk.white(`Completion: ${stats.completionPercentage}%`));
        console.log(chalk.white(`Pending: ${stats.statusCounts.pending || 0}`));
        console.log(chalk.white(`In Progress: ${stats.statusCounts['in-progress'] || 0}`));
        console.log(chalk.white(`Done: ${stats.statusCounts.done || 0}`));
        
        setTimeout(() => {
            this.boardLayout.render();
        }, 3000);
    }

    /**
     * Show help popup
     */
    showHelp() {
        this.helpPopup.open();
        this.render();
    }

    /**
     * Task operation methods (implemented for Task 37)
     */
    async viewTaskDetails() {
        const task = this.getSelectedTask();
        if (task) {
            // Show popup instead of full screen view
            this.taskDetailsPopup.show(task);
            this.render();
        }
    }

    async deleteTask() {
        const task = this.getSelectedTask();
        if (task) {
            const result = await this.taskOperationsHandler.deleteTask(task);
            if (result.requiresConfirmation) {
                setTimeout(() => this.render(), 3000);
            }
        }
    }

    async editTask() {
        const task = this.getSelectedTask();
        if (task) {
            const result = await this.taskOperationsHandler.editTaskTitle(task);
            if (result.requiresInput) {
                setTimeout(() => this.render(), 3000);
            }
        }
    }

    showTaskInfo() {
        const task = this.getSelectedTask();
        if (task) {
            const result = this.taskOperationsHandler.showTaskInfo(task);
            if (result.success) {
                setTimeout(() => this.render(), 2000);
            }
        }
    }

    /**
     * Board control methods (implemented for Task 38)
     */
    toggleFilter() {
        const result = this.boardControlsHandler.toggleFilter();
        this.statusBar.setMode(result.filterMode ? 'filter' : 'normal');
        if (result.success) {
            this.statusBar.showInfo(result.message);
        }
        return result;
    }

    async openSearch() {
        const result = await this.boardControlsHandler.openSearch();
        this.statusBar.setMode('normal');
        if (result.success) {
            this.statusBar.showInfo(result.message);
        }
        return result;
    }

    cycleFocus() {
        const result = this.boardControlsHandler.cycleFocus();
        if (result.success) {
            this.statusBar.showInfo(result.message);
        }
        return result;
    }

    /**
     * Scroll current column up (Page Up / Ctrl+Up)
     */
    scrollColumnUp() {
        const currentColumn = this.boardLayout.getCurrentColumn();
        if (currentColumn && currentColumn.scrollUp()) {
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Scroll current column down (Page Down / Ctrl+Down)
     */
    scrollColumnDown() {
        const currentColumn = this.boardLayout.getCurrentColumn();
        if (currentColumn && currentColumn.scrollDown()) {
            this.render();
            return true;
        }
        return false;
    }

    /**
     * Quit the Kanban board and return to main menu
     */
    quit() {
        this.isRunning = false;
        this.cleanup();
        console.log(chalk.blue('\n🔄 Returning to TaskMaster main menu...'));

        // Set a flag to indicate we should return to menu
        this.shouldReturnToMenu = true;

        // Don't exit the process, just stop the board
        return true;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.isRunning = false;

        // Stop keyboard handler
        this.keyboardHandler.stop();

        // Cleanup board layout
        this.boardLayout.cleanup();
    }
}

/**
 * Launch the Kanban board
 */
export async function launchKanbanBoard() {
    const board = new KanbanBoard();
    await board.start();

    // Check if we should return to menu instead of exiting
    if (board.shouldReturnToMenu) {
        try {
            // Import and launch the main menu
            const { initializeInteractiveMenu } = await import('../menu/index.js');
            await initializeInteractiveMenu();
        } catch (error) {
            console.error(chalk.red('Error returning to main menu:'), error.message);
            console.log(chalk.yellow('Please restart TaskMaster manually.'));
            process.exit(0);
        }
    }
}

/**
 * Default export for convenience
 */
export default KanbanBoard;
