/**
 * PRD Operations Handler
 * Following the exact same pattern as task operations handler
 */

import chalk from 'chalk';
import { readJSON } from '../../../scripts/modules/utils.js';
import path from 'path';
import fs from 'fs';

/**
 * Get the correct tasks.json path based on the new directory structure
 * @param {string} projectRoot - Project root directory
 * @returns {string} - Path to tasks.json file
 */
function getTasksJsonPath(projectRoot) {
    // Try new structure first
    const newPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    if (fs.existsSync(newPath)) {
        return newPath;
    }

    // Fall back to old structure
    const oldPath = path.join(projectRoot, 'tasks', 'tasks.json');
    return oldPath;
}

/**
 * PRD Operations Handler class
 */
export class PRDOperationsHandler {
    constructor(board) {
        this.board = board;
        this.projectRoot = board.projectRoot;
        this.prdsPath = board.prdsPath;
        this.tasksPath = getTasksJsonPath(this.projectRoot);
    }

    /**
     * Show PRD details
     */
    async showPRDDetails() {
        const selectedPRD = this.board.getSelectedPRD();

        if (!selectedPRD) {
            return {
                success: false,
                message: 'No PRD selected'
            };
        }

        try {
            // Get full PRD details
            const fullPRD = await this.getFullPRDDetails(selectedPRD.id);

            // Show details popup
            if (this.board.prdDetailsPopup) {
                const result = await this.board.prdDetailsPopup.show(fullPRD);
                if (result) {
                    this.board.render();
                }
            }

            return {
                success: true,
                message: `Showing details for PRD ${selectedPRD.id}`,
                prd: fullPRD
            };

        } catch (error) {
            return {
                success: false,
                message: `Error loading PRD details: ${error.message}`,
                error
            };
        }
    }

    /**
     * Show linked tasks
     */
    async showLinkedTasks() {
        const selectedPRD = this.board.getSelectedPRD();
        if (!selectedPRD) {
            return {
                success: false,
                message: 'No PRD selected'
            };
        }

        try {
            // Get linked tasks
            const linkedTasks = await this.getLinkedTasks(selectedPRD.id);
            
            // Show tasks popup
            if (this.board.prdDetailsPopup) {
                this.board.prdDetailsPopup.show(selectedPRD, 'tasks', linkedTasks);
            }

            return {
                success: true,
                message: `Showing ${linkedTasks.length} linked tasks for PRD ${selectedPRD.id}`,
                tasks: linkedTasks
            };

        } catch (error) {
            return {
                success: false,
                message: `Error loading linked tasks: ${error.message}`,
                error
            };
        }
    }

    /**
     * Show statistics
     */
    async showStatistics() {
        try {
            // Calculate statistics
            const stats = await this.calculateStatistics();
            
            // Show statistics popup
            if (this.board.prdDetailsPopup) {
                this.board.prdDetailsPopup.show(null, 'statistics', stats);
            }

            return {
                success: true,
                message: 'Showing PRD statistics',
                statistics: stats
            };

        } catch (error) {
            return {
                success: false,
                message: `Error calculating statistics: ${error.message}`,
                error
            };
        }
    }

    /**
     * Get full PRD details
     */
    async getFullPRDDetails(prdId) {
        try {
            const prdsData = await readJSON(this.prdsPath);
            const prd = prdsData.prds.find(p => p.id === prdId);
            
            if (!prd) {
                throw new Error(`PRD ${prdId} not found`);
            }

            // Add additional computed fields
            const linkedTasks = await this.getLinkedTasks(prdId);
            const taskStats = this.calculateTaskStats(linkedTasks);

            return {
                ...prd,
                linkedTasksCount: linkedTasks.length,
                taskStats,
                linkedTasks: linkedTasks.slice(0, 5) // First 5 tasks for preview
            };

        } catch (error) {
            console.error(chalk.red('Error getting full PRD details:'), error.message);
            throw error;
        }
    }

    /**
     * Get linked tasks for a PRD
     */
    async getLinkedTasks(prdId) {
        try {
            const tasksData = await readJSON(this.tasksPath);
            const tasks = tasksData.tasks || [];

            // Find tasks linked to this PRD
            const linkedTasks = tasks.filter(task => {
                // Check if task has prdSource that matches this PRD
                return (task.prdSource && task.prdSource.prdId === prdId) ||
                       (task.linkedTasks && task.linkedTasks.includes(prdId)) ||
                       (task.metadata && task.metadata.prdSource === prdId);
            });

            return linkedTasks;

        } catch (error) {
            console.error(chalk.red('Error getting linked tasks:'), error.message);
            return [];
        }
    }

    /**
     * Calculate task statistics for a PRD
     */
    calculateTaskStats(tasks) {
        const stats = {
            total: tasks.length,
            pending: 0,
            'in-progress': 0,
            done: 0,
            blocked: 0,
            deferred: 0,
            cancelled: 0,
            completionPercentage: 0
        };

        tasks.forEach(task => {
            const status = task.status || 'pending';
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });

        if (stats.total > 0) {
            stats.completionPercentage = Math.round((stats.done / stats.total) * 100);
        }

        return stats;
    }

    /**
     * Calculate overall statistics
     */
    async calculateStatistics() {
        try {
            const allPRDs = this.board.getAllPRDs();
            const allTasks = await this.getAllTasks();

            const prdStats = {
                total: allPRDs.length,
                pending: 0,
                'in-progress': 0,
                done: 0,
                byPriority: { high: 0, medium: 0, low: 0 },
                byComplexity: { high: 0, medium: 0, low: 0 }
            };

            const taskStats = {
                total: allTasks.length,
                pending: 0,
                'in-progress': 0,
                done: 0,
                blocked: 0,
                deferred: 0,
                cancelled: 0,
                linkedToPRDs: 0
            };

            // Calculate PRD statistics
            allPRDs.forEach(prd => {
                const status = prd.status || 'pending';
                if (prdStats.hasOwnProperty(status)) {
                    prdStats[status]++;
                }

                const priority = prd.priority || 'medium';
                if (prdStats.byPriority.hasOwnProperty(priority)) {
                    prdStats.byPriority[priority]++;
                }

                const complexity = prd.complexity || 'medium';
                if (prdStats.byComplexity.hasOwnProperty(complexity)) {
                    prdStats.byComplexity[complexity]++;
                }
            });

            // Calculate task statistics
            allTasks.forEach(task => {
                const status = task.status || 'pending';
                if (taskStats.hasOwnProperty(status)) {
                    taskStats[status]++;
                }

                if (task.prdSource || (task.metadata && task.metadata.prdSource)) {
                    taskStats.linkedToPRDs++;
                }
            });

            // Calculate completion percentages
            prdStats.completionPercentage = prdStats.total > 0 ? 
                Math.round((prdStats.done / prdStats.total) * 100) : 0;
            
            taskStats.completionPercentage = taskStats.total > 0 ? 
                Math.round((taskStats.done / taskStats.total) * 100) : 0;

            return {
                prds: prdStats,
                tasks: taskStats,
                overview: {
                    totalPRDs: prdStats.total,
                    totalTasks: taskStats.total,
                    prdCompletionRate: prdStats.completionPercentage,
                    taskCompletionRate: taskStats.completionPercentage,
                    tasksPerPRD: prdStats.total > 0 ? Math.round(taskStats.linkedToPRDs / prdStats.total) : 0
                }
            };

        } catch (error) {
            console.error(chalk.red('Error calculating statistics:'), error.message);
            throw error;
        }
    }

    /**
     * Get all tasks
     */
    async getAllTasks() {
        try {
            const tasksData = await readJSON(this.tasksPath);
            return tasksData.tasks || [];
        } catch (error) {
            console.error(chalk.red('Error getting all tasks:'), error.message);
            return [];
        }
    }

    /**
     * Export PRD data
     */
    async exportPRDData(format = 'json') {
        const selectedPRD = this.board.getSelectedPRD();
        if (!selectedPRD) {
            return {
                success: false,
                message: 'No PRD selected'
            };
        }

        try {
            const fullPRD = await this.getFullPRDDetails(selectedPRD.id);
            const linkedTasks = await this.getLinkedTasks(selectedPRD.id);

            const exportData = {
                prd: fullPRD,
                linkedTasks,
                exportedAt: new Date().toISOString(),
                format
            };

            return {
                success: true,
                message: `PRD data exported in ${format} format`,
                data: exportData
            };

        } catch (error) {
            return {
                success: false,
                message: `Error exporting PRD data: ${error.message}`,
                error
            };
        }
    }
}

/**
 * Create a PRD operations handler instance
 */
export function createPRDOperationsHandler(board) {
    return new PRDOperationsHandler(board);
}
