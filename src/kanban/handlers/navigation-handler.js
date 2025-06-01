/**
 * Navigation Handler for Kanban Board
 * Manages navigation between columns and tasks
 */

import chalk from 'chalk';

/**
 * NavigationHandler class for managing board navigation
 */
export class NavigationHandler {
    constructor(boardLayout) {
        this.boardLayout = boardLayout;
        this.statusOrder = ['pending', 'in-progress', 'done'];
        this.navigationHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * Move to the next column (right arrow)
     */
    moveToNextColumn() {
        // Use board layout's navigation
        this.boardLayout.moveToNextColumn();

        this.addToHistory('column', this.boardLayout.currentColumnIndex);

        return {
            success: true,
            currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex]
        };
    }

    /**
     * Move to the previous column (left arrow)
     */
    moveToPreviousColumn() {
        // Use board layout's navigation
        this.boardLayout.moveToPreviousColumn();

        this.addToHistory('column', this.boardLayout.currentColumnIndex);

        return {
            success: true,
            currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex]
        };
    }

    /**
     * Move selection up in current column (up arrow)
     */
    moveSelectionUp() {
        const currentColumn = this.getCurrentColumn();
        if (!currentColumn) return { success: false, reason: 'No current column' };

        const result = currentColumn.moveSelectionUp();
        
        if (result) {
            this.addToHistory('task', {
                column: this.currentColumnIndex,
                task: currentColumn.selectedTaskIndex
            });
        }

        return {
            success: result,
            column: this.statusOrder[this.currentColumnIndex],
            selectedTask: currentColumn.getSelectedTask()
        };
    }

    /**
     * Move selection down in current column (down arrow)
     */
    moveSelectionDown() {
        const currentColumn = this.getCurrentColumn();
        if (!currentColumn) return { success: false, reason: 'No current column' };

        const result = currentColumn.moveSelectionDown();
        
        if (result) {
            this.addToHistory('task', {
                column: this.currentColumnIndex,
                task: currentColumn.selectedTaskIndex
            });
        }

        return {
            success: result,
            column: this.statusOrder[this.currentColumnIndex],
            selectedTask: currentColumn.getSelectedTask()
        };
    }

    /**
     * Jump to a specific column by status
     * @param {string} status - Target status ('pending', 'in-progress', 'done')
     */
    jumpToColumn(status) {
        const targetIndex = this.statusOrder.indexOf(status);
        if (targetIndex === -1) {
            return { success: false, reason: `Invalid status: ${status}` };
        }

        const oldColumn = this.getCurrentColumn();
        if (oldColumn) {
            oldColumn.clearSelection();
            this.addToHistory('column', this.currentColumnIndex);
        }

        this.currentColumnIndex = targetIndex;
        
        const newColumn = this.getCurrentColumn();
        if (newColumn && newColumn.hasTasks()) {
            newColumn.setSelectedTask(0);
        }

        return {
            success: true,
            currentColumn: status,
            hasSelection: newColumn && newColumn.hasTasks()
        };
    }

    /**
     * Jump to a specific task by ID
     * @param {number} taskId - Target task ID
     */
    jumpToTask(taskId) {
        // Search through all columns for the task
        for (let colIndex = 0; colIndex < this.statusOrder.length; colIndex++) {
            const status = this.statusOrder[colIndex];
            const column = this.boardLayout.columns.get(status);
            
            if (column) {
                const taskIndex = column.tasks.findIndex(task => task.id === taskId);
                if (taskIndex !== -1) {
                    // Found the task, navigate to it
                    const oldColumn = this.getCurrentColumn();
                    if (oldColumn) {
                        oldColumn.clearSelection();
                    }

                    this.currentColumnIndex = colIndex;
                    column.setSelectedTask(taskIndex);

                    this.addToHistory('task', {
                        column: colIndex,
                        task: taskIndex
                    });

                    return {
                        success: true,
                        column: status,
                        task: column.tasks[taskIndex],
                        taskIndex
                    };
                }
            }
        }

        return { success: false, reason: `Task #${taskId} not found` };
    }

    /**
     * Get the current column
     */
    getCurrentColumn() {
        return this.boardLayout.getCurrentColumn();
    }

    /**
     * Get the current column status
     */
    getCurrentStatus() {
        return this.boardLayout.getCurrentStatus();
    }

    /**
     * Get the currently selected task
     */
    getSelectedTask() {
        const currentColumn = this.getCurrentColumn();
        return currentColumn ? currentColumn.getSelectedTask() : null;
    }

    /**
     * Get navigation state
     */
    getNavigationState() {
        const currentColumn = this.getCurrentColumn();
        const selectedTask = this.getSelectedTask();
        
        return {
            currentColumnIndex: this.currentColumnIndex,
            currentStatus: this.getCurrentStatus(),
            hasSelection: !!selectedTask,
            selectedTask,
            columnTaskCount: currentColumn ? currentColumn.getTaskCount() : 0,
            selectedTaskIndex: currentColumn ? currentColumn.selectedTaskIndex : -1
        };
    }

    /**
     * Add navigation action to history
     * @param {string} type - Type of navigation ('column' or 'task')
     * @param {*} data - Navigation data
     */
    addToHistory(type, data) {
        this.navigationHistory.push({
            type,
            data,
            timestamp: Date.now()
        });

        // Keep history size manageable
        if (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
    }

    /**
     * Get navigation history
     */
    getHistory() {
        return [...this.navigationHistory];
    }

    /**
     * Clear navigation history
     */
    clearHistory() {
        this.navigationHistory = [];
    }

    /**
     * Go back to previous navigation state (if possible)
     */
    goBack() {
        if (this.navigationHistory.length === 0) {
            return { success: false, reason: 'No navigation history' };
        }

        const lastAction = this.navigationHistory.pop();
        
        if (lastAction.type === 'column') {
            const oldColumn = this.getCurrentColumn();
            if (oldColumn) {
                oldColumn.clearSelection();
            }

            this.currentColumnIndex = lastAction.data;
            
            const newColumn = this.getCurrentColumn();
            if (newColumn && newColumn.hasTasks()) {
                newColumn.setSelectedTask(0);
            }

            return {
                success: true,
                type: 'column',
                currentColumn: this.statusOrder[this.currentColumnIndex]
            };
        } else if (lastAction.type === 'task') {
            const { column, task } = lastAction.data;
            this.currentColumnIndex = column;
            
            const currentColumn = this.getCurrentColumn();
            if (currentColumn && task < currentColumn.tasks.length) {
                currentColumn.setSelectedTask(task);
            }

            return {
                success: true,
                type: 'task',
                currentColumn: this.statusOrder[this.currentColumnIndex],
                selectedTask: currentColumn ? currentColumn.getSelectedTask() : null
            };
        }

        return { success: false, reason: 'Unknown navigation type' };
    }

    /**
     * Reset navigation to initial state
     */
    reset() {
        const oldColumn = this.getCurrentColumn();
        if (oldColumn) {
            oldColumn.clearSelection();
        }

        this.currentColumnIndex = 0;
        this.clearHistory();

        const newColumn = this.getCurrentColumn();
        if (newColumn && newColumn.hasTasks()) {
            newColumn.setSelectedTask(0);
        }

        return {
            success: true,
            currentColumn: this.statusOrder[0]
        };
    }
}

/**
 * Create a navigation handler instance
 */
export function createNavigationHandler(boardLayout) {
    return new NavigationHandler(boardLayout);
}
