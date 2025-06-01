import { 
    readPrdsMetadata, 
    writePrdsMetadata,
    findPrdById,
    findPrdsByFileName
} from './prd-utils.js';
import { 
    addTaskToPrd, 
    removeTaskFromPrd,
    updatePrd
} from './prd-write-operations.js';
import { updatePrdTaskStatistics } from './prd-integrity.js';
import { readJSON, writeJSON, log } from '../utils.js';

/**
 * Enhanced PRD source schema for tasks
 * @param {Object} prdData - PRD metadata object
 * @returns {Object} Enhanced PRD source object
 */
function createEnhancedPrdSource(prdData) {
    return {
        prdId: prdData.id,
        fileName: prdData.fileName,
        filePath: prdData.filePath,
        fileHash: prdData.fileHash,
        parsedDate: new Date().toISOString()
    };
}

/**
 * Link a task to a PRD (bidirectional)
 * @param {number|string} taskId - Task ID to link
 * @param {string} prdId - PRD ID to link to
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Result with success flag and data/error
 */
function linkTaskToPrd(taskId, prdId, tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json') {
    try {
        // Read tasks data
        const tasksData = readJSON(tasksPath);
        if (!tasksData || !tasksData.tasks) {
            return {
                success: false,
                error: 'Tasks data not found or invalid'
            };
        }

        // Find the task
        const task = tasksData.tasks.find(t => t.id === taskId || t.id === Number(taskId));
        if (!task) {
            return {
                success: false,
                error: `Task with ID ${taskId} not found`
            };
        }

        // Find the PRD
        const prd = findPrdById(prdId, prdsPath);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID ${prdId} not found`
            };
        }

        // Update task with enhanced PRD source
        task.prdSource = createEnhancedPrdSource(prd);

        // Write updated tasks data
        writeJSON(tasksPath, tasksData);

        // Add task to PRD's linked tasks
        const prdResult = addTaskToPrd(prdId, taskId, prdsPath);
        if (!prdResult.success) {
            // If PRD update fails, revert task update
            delete task.prdSource;
            writeJSON(tasksPath, tasksData);
            return prdResult;
        }

        // Update PRD task statistics
        updatePrdTaskStatistics(prdId, tasksPath, prdsPath);

        log('info', `Successfully linked task ${taskId} to PRD ${prdId}`);
        return {
            success: true,
            data: {
                taskId: taskId,
                prdId: prdId,
                prdSource: task.prdSource
            }
        };

    } catch (error) {
        log('error', `Error linking task ${taskId} to PRD ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Unlink a task from a PRD (bidirectional)
 * @param {number|string} taskId - Task ID to unlink
 * @param {string} prdId - PRD ID to unlink from
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Result with success flag and data/error
 */
function unlinkTaskFromPrd(taskId, prdId, tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json') {
    try {
        // Read tasks data
        const tasksData = readJSON(tasksPath);
        if (!tasksData || !tasksData.tasks) {
            return {
                success: false,
                error: 'Tasks data not found or invalid'
            };
        }

        // Find the task
        const task = tasksData.tasks.find(t => t.id === taskId || t.id === Number(taskId));
        if (!task) {
            return {
                success: false,
                error: `Task with ID ${taskId} not found`
            };
        }

        // Remove PRD source from task
        const oldPrdSource = task.prdSource;
        delete task.prdSource;

        // Write updated tasks data
        writeJSON(tasksPath, tasksData);

        // Remove task from PRD's linked tasks
        const prdResult = removeTaskFromPrd(prdId, taskId, prdsPath);
        if (!prdResult.success) {
            // If PRD update fails, revert task update
            task.prdSource = oldPrdSource;
            writeJSON(tasksPath, tasksData);
            return prdResult;
        }

        // Update PRD task statistics
        updatePrdTaskStatistics(prdId, tasksPath, prdsPath);

        log('info', `Successfully unlinked task ${taskId} from PRD ${prdId}`);
        return {
            success: true,
            data: {
                taskId: taskId,
                prdId: prdId,
                removedPrdSource: oldPrdSource
            }
        };

    } catch (error) {
        log('error', `Error unlinking task ${taskId} from PRD ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update task's PRD source information
 * @param {number|string} taskId - Task ID to update
 * @param {string} prdId - PRD ID to get updated info from
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Result with success flag and data/error
 */
function updateTaskPrdSource(taskId, prdId, tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json') {
    try {
        // Read tasks data
        const tasksData = readJSON(tasksPath);
        if (!tasksData || !tasksData.tasks) {
            return {
                success: false,
                error: 'Tasks data not found or invalid'
            };
        }

        // Find the task
        const task = tasksData.tasks.find(t => t.id === taskId || t.id === Number(taskId));
        if (!task) {
            return {
                success: false,
                error: `Task with ID ${taskId} not found`
            };
        }

        // Find the PRD
        const prd = findPrdById(prdId, prdsPath);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID ${prdId} not found`
            };
        }

        // Update task's PRD source with current PRD information
        const oldPrdSource = task.prdSource;
        task.prdSource = {
            ...createEnhancedPrdSource(prd),
            parsedDate: oldPrdSource?.parsedDate || new Date().toISOString()
        };

        // Write updated tasks data
        writeJSON(tasksPath, tasksData);

        log('info', `Successfully updated PRD source for task ${taskId}`);
        return {
            success: true,
            data: {
                taskId: taskId,
                prdId: prdId,
                updatedPrdSource: task.prdSource
            }
        };

    } catch (error) {
        log('error', `Error updating PRD source for task ${taskId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Sync all task-PRD links (repair inconsistencies)
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Sync result with statistics
 */
function syncTaskPrdLinks(tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json') {
    const syncResults = {
        tasksProcessed: 0,
        prdsProcessed: 0,
        linksCreated: 0,
        linksUpdated: 0,
        linksRemoved: 0,
        errors: []
    };

    try {
        const tasksData = readJSON(tasksPath);
        const prdsData = readPrdsMetadata(prdsPath);

        if (!tasksData || !tasksData.tasks) {
            syncResults.errors.push('Tasks data not found or invalid');
            return { success: false, data: syncResults };
        }

        // Process each task
        for (const task of tasksData.tasks) {
            syncResults.tasksProcessed++;

            if (task.prdSource && task.prdSource.fileName) {
                // Find corresponding PRD
                const prds = findPrdsByFileName(task.prdSource.fileName, prdsPath);
                
                if (prds.length === 0) {
                    // PRD not found, remove PRD source from task
                    delete task.prdSource;
                    syncResults.linksRemoved++;
                    log('warn', `Removed orphaned PRD source from task ${task.id}`);
                } else if (prds.length === 1) {
                    const prd = prds[0];
                    
                    // Ensure task is in PRD's linked tasks
                    if (!prd.linkedTaskIds.includes(task.id) && 
                        !prd.linkedTaskIds.includes(String(task.id))) {
                        prd.linkedTaskIds.push(task.id);
                        syncResults.linksCreated++;
                    }

                    // Update task's PRD source if needed
                    if (task.prdSource.prdId !== prd.id || 
                        task.prdSource.fileHash !== prd.fileHash) {
                        task.prdSource = {
                            ...createEnhancedPrdSource(prd),
                            parsedDate: task.prdSource.parsedDate
                        };
                        syncResults.linksUpdated++;
                    }
                } else {
                    syncResults.errors.push(`Multiple PRDs found for filename ${task.prdSource.fileName}`);
                }
            }
        }

        // Process each PRD
        for (const prd of prdsData.prds) {
            syncResults.prdsProcessed++;

            // Remove invalid task links
            const validTaskIds = [];
            for (const taskId of prd.linkedTaskIds) {
                const task = tasksData.tasks.find(t => t.id === taskId || t.id === Number(taskId));
                if (task) {
                    validTaskIds.push(taskId);
                } else {
                    syncResults.linksRemoved++;
                    log('warn', `Removed orphaned task link ${taskId} from PRD ${prd.id}`);
                }
            }
            prd.linkedTaskIds = validTaskIds;

            // Update PRD task statistics
            updatePrdTaskStatistics(prd.id, tasksPath, prdsPath);
        }

        // Write updated data
        writeJSON(tasksPath, tasksData);
        writePrdsMetadata(prdsData, prdsPath);

        log('info', `Sync completed: ${syncResults.linksCreated} created, ${syncResults.linksUpdated} updated, ${syncResults.linksRemoved} removed`);
        return {
            success: true,
            data: syncResults
        };

    } catch (error) {
        syncResults.errors.push(error.message);
        log('error', 'Error syncing task-PRD links:', error.message);
        return {
            success: false,
            data: syncResults
        };
    }
}

/**
 * Get tasks linked to a specific PRD
 * @param {string} prdId - PRD ID
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Array} Array of linked tasks
 */
function getTasksLinkedToPrd(prdId, tasksPath = 'tasks/tasks.json', prdsPath = 'prd/prds.json') {
    try {
        const tasksData = readJSON(tasksPath);
        const prd = findPrdById(prdId, prdsPath);

        if (!prd) {
            return [];
        }

        return tasksData.tasks.filter(task => 
            prd.linkedTaskIds.includes(task.id) || 
            prd.linkedTaskIds.includes(String(task.id))
        );

    } catch (error) {
        log('error', `Error getting tasks linked to PRD ${prdId}:`, error.message);
        return [];
    }
}

export {
    createEnhancedPrdSource,
    linkTaskToPrd,
    unlinkTaskFromPrd,
    updateTaskPrdSource,
    syncTaskPrdLinks,
    getTasksLinkedToPrd
};
