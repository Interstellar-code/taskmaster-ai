import { 
    readPrdsMetadata, 
    writePrdsMetadata,
    findPrdById
} from './prd-utils.js';
import { updatePrd } from './prd-write-operations.js';
import { updatePrdTaskStatistics } from './prd-integrity.js';
import { getTasksLinkedToPrd } from './task-prd-linking.js';
import { readJSON, log } from '../utils.js';

/**
 * Status transition rules for PRDs
 */
const STATUS_TRANSITION_RULES = {
    // From pending
    'pending': {
        'in-progress': {
            condition: 'hasInProgressTasks',
            description: 'When first linked task changes to in-progress'
        }
    },
    // From in-progress
    'in-progress': {
        'done': {
            condition: 'allTasksCompleted',
            description: 'When ALL linked tasks reach done status (100% completion)'
        },
        'pending': {
            condition: 'noInProgressTasks',
            description: 'When all in-progress tasks are moved back to pending'
        }
    },
    // From done
    'done': {
        'in-progress': {
            condition: 'hasIncompleteTasks',
            description: 'When any linked task is moved from done to incomplete status'
        },
        'archived': {
            condition: 'manualArchive',
            description: 'Manual archiving of completed PRD'
        }
    },
    // From archived
    'archived': {
        'done': {
            condition: 'manualRestore',
            description: 'Manual restoration from archive'
        }
    }
};

/**
 * Check if PRD should transition to in-progress status
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked tasks
 * @returns {boolean} True if should transition
 */
function shouldTransitionToInProgress(prd, linkedTasks) {
    if (prd.status !== 'pending') return false;
    
    // Check if any linked task is in-progress
    return linkedTasks.some(task => task.status === 'in-progress');
}

/**
 * Check if PRD should transition to done status
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked tasks
 * @returns {boolean} True if should transition
 */
function shouldTransitionToDone(prd, linkedTasks) {
    if (prd.status !== 'in-progress') return false;
    
    // Must have at least one linked task
    if (linkedTasks.length === 0) return false;
    
    // All linked tasks must be completed
    return linkedTasks.every(task => task.status === 'done');
}

/**
 * Check if PRD should transition back to in-progress from done
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked tasks
 * @returns {boolean} True if should transition
 */
function shouldTransitionBackToInProgress(prd, linkedTasks) {
    if (prd.status !== 'done') return false;
    
    // Check if any linked task is not completed
    return linkedTasks.some(task => task.status !== 'done');
}

/**
 * Check if PRD should transition back to pending
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked tasks
 * @returns {boolean} True if should transition
 */
function shouldTransitionToPending(prd, linkedTasks) {
    if (prd.status !== 'in-progress') return false;
    
    // Check if no tasks are in-progress and all are pending
    return linkedTasks.length > 0 && 
           linkedTasks.every(task => task.status === 'pending');
}

/**
 * Determine the appropriate status for a PRD based on its linked tasks
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked tasks
 * @returns {string} Recommended status
 */
function determineAppropriateStatus(prd, linkedTasks) {
    if (linkedTasks.length === 0) {
        return 'pending';
    }

    const taskStatuses = linkedTasks.map(task => task.status);
    const statusCounts = {
        pending: taskStatuses.filter(s => s === 'pending').length,
        'in-progress': taskStatuses.filter(s => s === 'in-progress').length,
        done: taskStatuses.filter(s => s === 'done').length,
        blocked: taskStatuses.filter(s => s === 'blocked').length,
        deferred: taskStatuses.filter(s => s === 'deferred').length,
        cancelled: taskStatuses.filter(s => s === 'cancelled').length
    };

    // If all tasks are done, PRD should be done
    if (statusCounts.done === linkedTasks.length) {
        return 'done';
    }

    // If any task is in-progress, PRD should be in-progress
    if (statusCounts['in-progress'] > 0) {
        return 'in-progress';
    }

    // If all tasks are pending, PRD should be pending
    if (statusCounts.pending === linkedTasks.length) {
        return 'pending';
    }

    // Mixed states with no in-progress tasks - keep current status or set to in-progress
    return prd.status === 'done' ? 'in-progress' : prd.status;
}

/**
 * Update PRD status based on linked task completion
 * @param {string} prdId - PRD ID to update
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Update options
 * @returns {Object} Update result
 */
function updatePrdStatusBasedOnTasks(prdId, tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json', options = {}) {
    const { 
        force = false, 
        dryRun = false,
        allowManualOverride = true 
    } = options;

    try {
        // Get PRD and linked tasks
        const prd = findPrdById(prdId, prdsPath);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID ${prdId} not found`
            };
        }

        const linkedTasks = getTasksLinkedToPrd(prdId, tasksPath, prdsPath);
        const currentStatus = prd.status;
        const recommendedStatus = determineAppropriateStatus(prd, linkedTasks);

        // Check if status change is needed
        if (currentStatus === recommendedStatus && !force) {
            return {
                success: true,
                data: {
                    prdId: prdId,
                    currentStatus: currentStatus,
                    recommendedStatus: recommendedStatus,
                    changed: false,
                    message: 'PRD status is already appropriate'
                }
            };
        }

        // Check if manual override protection is enabled
        if (!allowManualOverride && prd.manualStatusOverride) {
            return {
                success: false,
                error: 'PRD has manual status override protection enabled',
                data: {
                    prdId: prdId,
                    currentStatus: currentStatus,
                    recommendedStatus: recommendedStatus,
                    changed: false
                }
            };
        }

        // Dry run - just return what would happen
        if (dryRun) {
            return {
                success: true,
                data: {
                    prdId: prdId,
                    currentStatus: currentStatus,
                    recommendedStatus: recommendedStatus,
                    changed: currentStatus !== recommendedStatus,
                    dryRun: true,
                    linkedTasksCount: linkedTasks.length,
                    taskStatusBreakdown: getTaskStatusBreakdown(linkedTasks)
                }
            };
        }

        // Update the PRD status
        const updateResult = updatePrd(prdId, { 
            status: recommendedStatus,
            statusUpdatedAt: new Date().toISOString(),
            statusUpdateReason: 'Automated update based on linked task completion'
        }, prdsPath);

        if (!updateResult.success) {
            return updateResult;
        }

        // Update task statistics
        updatePrdTaskStatistics(prdId, tasksPath, prdsPath);

        log('info', `Updated PRD ${prdId} status from ${currentStatus} to ${recommendedStatus}`);
        return {
            success: true,
            data: {
                prdId: prdId,
                previousStatus: currentStatus,
                newStatus: recommendedStatus,
                changed: true,
                linkedTasksCount: linkedTasks.length,
                taskStatusBreakdown: getTaskStatusBreakdown(linkedTasks)
            }
        };

    } catch (error) {
        log('error', `Error updating PRD status for ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get task status breakdown
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Status breakdown
 */
function getTaskStatusBreakdown(tasks) {
    const breakdown = {
        total: tasks.length,
        pending: 0,
        'in-progress': 0,
        done: 0,
        blocked: 0,
        deferred: 0,
        cancelled: 0
    };

    for (const task of tasks) {
        if (breakdown.hasOwnProperty(task.status)) {
            breakdown[task.status]++;
        }
    }

    return breakdown;
}

/**
 * Update all PRD statuses based on their linked tasks
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Update options
 * @returns {Object} Batch update result
 */
function updateAllPrdStatuses(tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json', options = {}) {
    const results = {
        processed: 0,
        updated: 0,
        unchanged: 0,
        errors: 0,
        details: []
    };

    try {
        const prdsData = readPrdsMetadata(prdsPath);
        
        for (const prd of prdsData.prds) {
            results.processed++;
            
            const updateResult = updatePrdStatusBasedOnTasks(prd.id, tasksPath, prdsPath, options);
            
            if (updateResult.success) {
                if (updateResult.data.changed) {
                    results.updated++;
                } else {
                    results.unchanged++;
                }
            } else {
                results.errors++;
            }
            
            results.details.push({
                prdId: prd.id,
                result: updateResult
            });
        }

        log('info', `Batch PRD status update completed: ${results.updated} updated, ${results.unchanged} unchanged, ${results.errors} errors`);
        return {
            success: true,
            data: results
        };

    } catch (error) {
        log('error', 'Error in batch PRD status update:', error.message);
        return {
            success: false,
            error: error.message,
            data: results
        };
    }
}

/**
 * Set up automated PRD status monitoring
 * @param {Object} options - Monitoring options
 * @returns {Object} Monitoring setup result
 */
function setupAutomatedStatusMonitoring(options = {}) {
    const {
        interval = 60000, // 1 minute default
        tasksPath = 'tasks/tasks.json',
        prdsPath = 'prd/prds.json',
        enableLogging = true
    } = options;

    let monitoringInterval;

    const startMonitoring = () => {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
        }

        monitoringInterval = setInterval(() => {
            if (enableLogging) {
                log('debug', 'Running automated PRD status check...');
            }
            
            updateAllPrdStatuses(tasksPath, prdsPath, { 
                allowManualOverride: false // Don't override manual status changes
            });
        }, interval);

        log('info', `Started automated PRD status monitoring (interval: ${interval}ms)`);
        return { success: true, intervalId: monitoringInterval };
    };

    const stopMonitoring = () => {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
            log('info', 'Stopped automated PRD status monitoring');
            return { success: true };
        }
        return { success: false, error: 'Monitoring was not running' };
    };

    return {
        start: startMonitoring,
        stop: stopMonitoring,
        isRunning: () => !!monitoringInterval
    };
}

export {
    STATUS_TRANSITION_RULES,
    shouldTransitionToInProgress,
    shouldTransitionToDone,
    shouldTransitionBackToInProgress,
    shouldTransitionToPending,
    determineAppropriateStatus,
    updatePrdStatusBasedOnTasks,
    updateAllPrdStatuses,
    setupAutomatedStatusMonitoring,
    getTaskStatusBreakdown
};
