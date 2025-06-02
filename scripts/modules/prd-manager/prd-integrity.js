import fs from 'fs';
import path from 'path';
import {
    readPrdsMetadata,
    writePrdsMetadata,
    calculateFileHash,
    getFileSize,
    getPRDsJsonPath,
    getPRDStatusDirectory,
    getTasksJsonPath
} from './prd-utils.js';
import { readJSON, log } from '../utils.js';

/**
 * Check if PRD file exists and matches metadata
 * @param {Object} prd - PRD metadata object
 * @returns {Object} Integrity check result
 */
function checkPrdFileIntegrity(prd) {
    const issues = [];

    try {
        // Try to resolve the correct file path
        let actualFilePath = prd.filePath;

        // If the file doesn't exist at the recorded path, try to find it in the new structure
        if (!fs.existsSync(prd.filePath)) {
            // Extract status and filename from the old path
            const pathParts = prd.filePath.split(/[\/\\]/);
            const fileName = pathParts[pathParts.length - 1];
            const status = pathParts[pathParts.length - 2];

            // Try the new directory structure
            const newPath = path.join(getPRDStatusDirectory(status), fileName);
            if (fs.existsSync(newPath)) {
                actualFilePath = newPath;
            } else {
                issues.push({
                    type: 'missing_file',
                    message: `PRD file not found: ${prd.filePath}`,
                    severity: 'error'
                });
                return { valid: false, issues };
            }
        }

        // Check file hash
        const currentHash = calculateFileHash(actualFilePath);
        if (currentHash !== prd.fileHash) {
            issues.push({
                type: 'hash_mismatch',
                message: `File hash mismatch for ${prd.fileName}. File may have been modified.`,
                severity: 'warning',
                expected: prd.fileHash,
                actual: currentHash
            });
        }

        // Check file size
        const currentSize = getFileSize(actualFilePath);
        if (currentSize !== prd.fileSize) {
            issues.push({
                type: 'size_mismatch',
                message: `File size mismatch for ${prd.fileName}`,
                severity: 'warning',
                expected: prd.fileSize,
                actual: currentSize
            });
        }

        // Check if file is in correct status directory
        const expectedDir = getStatusDirectory(prd.status);
        const actualDir = path.dirname(prd.filePath);
        if (actualDir !== expectedDir) {
            issues.push({
                type: 'wrong_directory',
                message: `PRD ${prd.fileName} is in wrong directory for status ${prd.status}`,
                severity: 'error',
                expected: expectedDir,
                actual: actualDir
            });
        }

    } catch (error) {
        issues.push({
            type: 'check_error',
            message: `Error checking file integrity: ${error.message}`,
            severity: 'error'
        });
    }

    return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues
    };
}

/**
 * Get expected directory for PRD status
 * @param {string} status - PRD status
 * @returns {string} Expected directory path
 */
function getStatusDirectory(status) {
    return getPRDStatusDirectory(status);
}

/**
 * Check task-to-PRD linking consistency
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Consistency check result
 */
function checkTaskPrdLinkingConsistency(tasksPath = null, prdsPath = null) {
    const issues = [];
    
    try {
        // Read tasks and PRDs data
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();

        const tasksData = readJSON(resolvedTasksPath);
        const prdsData = readPrdsMetadata(resolvedPrdsPath);
        
        if (!tasksData || !tasksData.tasks) {
            issues.push({
                type: 'missing_tasks',
                message: 'Tasks data not found or invalid',
                severity: 'error'
            });
            return { valid: false, issues };
        }

        // Check each PRD's linked tasks
        for (const prd of prdsData.prds) {
            // Use linkedTasks if it exists and has data, otherwise use linkedTaskIds
            const linkedTaskIds = (prd.linkedTasks && prd.linkedTasks.length > 0) ?
                                  prd.linkedTasks : prd.linkedTaskIds || [];

            for (const taskId of linkedTaskIds) {
                const task = tasksData.tasks.find(t => t.id === taskId || t.id === Number(taskId));

                if (!task) {
                    issues.push({
                        type: 'orphaned_task_link',
                        message: `PRD ${prd.id} references non-existent task ${taskId}`,
                        severity: 'error',
                        prdId: prd.id,
                        taskId: taskId
                    });
                } else {
                    // Check if task has correct PRD source reference
                    if (task.prdSource && task.prdSource.fileName !== prd.fileName) {
                        issues.push({
                            type: 'prd_source_mismatch',
                            message: `Task ${taskId} has mismatched PRD source reference`,
                            severity: 'warning',
                            taskId: taskId,
                            taskPrdSource: task.prdSource.fileName,
                            expectedPrdSource: prd.fileName
                        });
                    }
                }
            }
        }

        // Check each task's PRD source reference
        for (const task of tasksData.tasks) {
            if (task.prdSource && task.prdSource.fileName) {
                const prd = prdsData.prds.find(p => p.fileName === task.prdSource.fileName);
                
                if (!prd) {
                    issues.push({
                        type: 'missing_prd_reference',
                        message: `Task ${task.id} references non-existent PRD ${task.prdSource.fileName}`,
                        severity: 'warning',
                        taskId: task.id,
                        prdFileName: task.prdSource.fileName
                    });
                } else {
                    // Use linkedTasks if it exists and has data, otherwise use linkedTaskIds
                    const linkedTaskIds = (prd.linkedTasks && prd.linkedTasks.length > 0) ?
                                          prd.linkedTasks : prd.linkedTaskIds || [];

                    if (!linkedTaskIds.includes(task.id) &&
                        !linkedTaskIds.includes(String(task.id))) {
                        issues.push({
                            type: 'missing_task_link',
                            message: `PRD ${prd.id} missing link to task ${task.id}`,
                            severity: 'warning',
                            prdId: prd.id,
                            taskId: task.id
                        });
                    }
                }
            }
        }

    } catch (error) {
        issues.push({
            type: 'consistency_check_error',
            message: `Error checking task-PRD consistency: ${error.message}`,
            severity: 'error'
        });
    }

    return {
        valid: issues.filter(i => i.severity === 'error').length === 0,
        issues
    };
}

/**
 * Update PRD task statistics based on linked tasks
 * @param {string} prdId - PRD ID to update
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Update result
 */
function updatePrdTaskStatistics(prdId, tasksPath = null, prdsPath = null) {
    try {
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();

        const tasksData = readJSON(resolvedTasksPath);
        const prdsData = readPrdsMetadata(resolvedPrdsPath);
        
        const prd = prdsData.prds.find(p => p.id === prdId);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID '${prdId}' not found`
            };
        }

        // Get linked tasks - use linkedTasks if it exists and has data, otherwise use linkedTaskIds
        const linkedTaskIds = (prd.linkedTasks && prd.linkedTasks.length > 0) ?
                              prd.linkedTasks : prd.linkedTaskIds || [];

        const linkedTasks = tasksData.tasks.filter(task =>
            linkedTaskIds.includes(task.id) ||
            linkedTaskIds.includes(String(task.id))
        );

        // Calculate statistics
        const stats = {
            totalTasks: linkedTasks.length,
            completedTasks: linkedTasks.filter(t => t.status === 'done').length,
            pendingTasks: linkedTasks.filter(t => t.status === 'pending').length,
            inProgressTasks: linkedTasks.filter(t => t.status === 'in-progress').length,
            blockedTasks: linkedTasks.filter(t => t.status === 'blocked').length,
            deferredTasks: linkedTasks.filter(t => t.status === 'deferred').length,
            cancelledTasks: linkedTasks.filter(t => t.status === 'cancelled').length,
            completionPercentage: linkedTasks.length > 0 ? 
                Math.round((linkedTasks.filter(t => t.status === 'done').length / linkedTasks.length) * 100) : 0
        };

        // Update PRD with new statistics
        const prdIndex = prdsData.prds.findIndex(p => p.id === prdId);
        prdsData.prds[prdIndex].taskStats = stats;
        prdsData.prds[prdIndex].lastModified = new Date().toISOString();

        // Write back to file
        writePrdsMetadata(prdsData, resolvedPrdsPath);

        log('info', `Updated task statistics for PRD ${prdId}: ${stats.completionPercentage}% complete`);
        return {
            success: true,
            data: stats
        };

    } catch (error) {
        log('error', `Error updating PRD task statistics for ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Auto-fix file integrity issues for PRDs
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Fix result with statistics
 */
function autoFixFileIntegrityIssues(prdsPath = null) {
    const fixResults = {
        success: false,
        filesFixed: 0,
        errors: [],
        details: []
    };

    try {
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();
        const prdsData = readPrdsMetadata(resolvedPrdsPath);
        let hasChanges = false;

        for (const prd of prdsData.prds) {
            const fileCheck = checkPrdFileIntegrity(prd);

            if (fileCheck.issues.length > 0) {
                let prdFixed = false;

                for (const issue of fileCheck.issues) {
                    try {
                        if (issue.type === 'hash_mismatch' || issue.type === 'size_mismatch') {
                            // Update hash and size from actual file
                            if (fs.existsSync(prd.filePath)) {
                                const newHash = calculateFileHash(prd.filePath);
                                const newSize = getFileSize(prd.filePath);

                                prd.fileHash = newHash;
                                prd.fileSize = newSize;
                                prd.lastModified = new Date().toISOString();

                                fixResults.details.push(`Updated hash and size for PRD ${prd.id} (${prd.fileName})`);
                                prdFixed = true;
                            }
                        } else if (issue.type === 'wrong_directory') {
                            // Update file path to correct directory
                            const expectedDir = getStatusDirectory(prd.status);
                            const newFilePath = path.join(expectedDir, prd.fileName);

                            // Check if file exists in the expected location
                            if (fs.existsSync(newFilePath)) {
                                prd.filePath = newFilePath;
                                prd.lastModified = new Date().toISOString();

                                fixResults.details.push(`Updated file path for PRD ${prd.id} to correct status directory`);
                                prdFixed = true;
                            } else {
                                // Try to move the file to the correct directory
                                if (fs.existsSync(prd.filePath)) {
                                    // Ensure target directory exists
                                    if (!fs.existsSync(expectedDir)) {
                                        fs.mkdirSync(expectedDir, { recursive: true });
                                    }

                                    // Move the file
                                    fs.renameSync(prd.filePath, newFilePath);
                                    prd.filePath = newFilePath;
                                    prd.lastModified = new Date().toISOString();

                                    fixResults.details.push(`Moved PRD ${prd.id} file to correct status directory`);
                                    prdFixed = true;
                                }
                            }
                        }
                    } catch (error) {
                        fixResults.errors.push(`Failed to fix ${issue.type} for PRD ${prd.id}: ${error.message}`);
                    }
                }

                if (prdFixed) {
                    fixResults.filesFixed++;
                    hasChanges = true;
                }
            }
        }

        // Write updated PRDs data if any fixes were made
        if (hasChanges) {
            writePrdsMetadata(prdsData, resolvedPrdsPath);
        }

        fixResults.success = true;
        return fixResults;

    } catch (error) {
        fixResults.errors.push(`Error during file integrity auto-fix: ${error.message}`);
        return fixResults;
    }
}

/**
 * Auto-fix missing task links in PRDs
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Fix result with statistics
 */
function autoFixMissingTaskLinks(tasksPath = null, prdsPath = null) {
    const fixResults = {
        success: false,
        linksFixed: 0,
        errors: [],
        details: []
    };

    try {
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();

        const tasksData = readJSON(resolvedTasksPath);
        const prdsData = readPrdsMetadata(resolvedPrdsPath);

        if (!tasksData || !tasksData.tasks) {
            fixResults.errors.push('Tasks data not found or invalid');
            return fixResults;
        }

        // Find tasks with PRD sources that are missing from PRD's linkedTaskIds
        for (const task of tasksData.tasks) {
            if (task.prdSource && task.prdSource.fileName) {
                const prd = prdsData.prds.find(p => p.fileName === task.prdSource.fileName);

                if (prd) {
                    const linkedTaskIds = prd.linkedTaskIds || [];

                    if (!linkedTaskIds.includes(task.id) && !linkedTaskIds.includes(String(task.id))) {
                        // Add missing task link
                        prd.linkedTaskIds = prd.linkedTaskIds || [];
                        prd.linkedTaskIds.push(task.id);
                        prd.lastModified = new Date().toISOString();

                        fixResults.linksFixed++;
                        fixResults.details.push(`Added task ${task.id} to PRD ${prd.id} linkedTaskIds`);
                    }
                }
            }
        }

        // Write updated PRDs data if any fixes were made
        if (fixResults.linksFixed > 0) {
            writePrdsMetadata(prdsData, resolvedPrdsPath);

            // Update task statistics for affected PRDs
            const affectedPrds = new Set();
            for (const task of tasksData.tasks) {
                if (task.prdSource && task.prdSource.fileName) {
                    const prd = prdsData.prds.find(p => p.fileName === task.prdSource.fileName);
                    if (prd) {
                        affectedPrds.add(prd.id);
                    }
                }
            }

            for (const prdId of affectedPrds) {
                updatePrdTaskStatistics(prdId, resolvedTasksPath, resolvedPrdsPath);
            }
        }

        fixResults.success = true;
        return fixResults;

    } catch (error) {
        fixResults.errors.push(`Error during auto-fix: ${error.message}`);
        return fixResults;
    }
}

/**
 * Perform comprehensive integrity check on all PRDs
 * @param {string} tasksPath - Path to tasks.json
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Options for the integrity check
 * @param {boolean} options.autoFix - Whether to automatically fix issues
 * @returns {Object} Comprehensive integrity report
 */
function performIntegrityCheck(tasksPath = null, prdsPath = null, options = {}) {
    const report = {
        timestamp: new Date().toISOString(),
        overall: { valid: true, errorCount: 0, warningCount: 0 },
        fileIntegrity: [],
        linkingConsistency: null,
        autoFixResults: null,
        recommendations: []
    };

    try {
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();

        const prdsData = readPrdsMetadata(resolvedPrdsPath);

        // Perform auto-fix if requested
        if (options.autoFix) {
            // Fix file integrity issues first
            const fileIntegrityFixResults = autoFixFileIntegrityIssues(resolvedPrdsPath);

            // Fix missing task links
            const taskLinkFixResults = autoFixMissingTaskLinks(resolvedTasksPath, resolvedPrdsPath);

            // Combine results
            report.autoFixResults = {
                fileIntegrity: fileIntegrityFixResults,
                taskLinks: taskLinkFixResults,
                totalFixed: (fileIntegrityFixResults.filesFixed || 0) + (taskLinkFixResults.linksFixed || 0)
            };

            // Add recommendations based on fixes
            if (fileIntegrityFixResults.success && fileIntegrityFixResults.filesFixed > 0) {
                report.recommendations.push(`Auto-fixed ${fileIntegrityFixResults.filesFixed} file integrity issues`);
            }
            if (taskLinkFixResults.success && taskLinkFixResults.linksFixed > 0) {
                report.recommendations.push(`Auto-fixed ${taskLinkFixResults.linksFixed} missing task links`);
            }
        }

        // Check file integrity for each PRD
        for (const prd of prdsData.prds) {
            const fileCheck = checkPrdFileIntegrity(prd);
            report.fileIntegrity.push({
                prdId: prd.id,
                fileName: prd.fileName,
                ...fileCheck
            });

            // Count issues
            const errors = fileCheck.issues.filter(i => i.severity === 'error').length;
            const warnings = fileCheck.issues.filter(i => i.severity === 'warning').length;
            report.overall.errorCount += errors;
            report.overall.warningCount += warnings;
        }

        // Check task-PRD linking consistency
        const linkingCheck = checkTaskPrdLinkingConsistency(resolvedTasksPath, resolvedPrdsPath);
        report.linkingConsistency = linkingCheck;

        const linkingErrors = linkingCheck.issues.filter(i => i.severity === 'error').length;
        const linkingWarnings = linkingCheck.issues.filter(i => i.severity === 'warning').length;
        report.overall.errorCount += linkingErrors;
        report.overall.warningCount += linkingWarnings;

        // Set overall validity
        report.overall.valid = report.overall.errorCount === 0;

        // Generate recommendations
        if (report.overall.errorCount > 0) {
            report.recommendations.push('Fix critical errors before proceeding with PRD operations');
        }
        if (report.overall.warningCount > 0) {
            report.recommendations.push('Review warnings to ensure data consistency');
        }
        if (report.overall.valid) {
            report.recommendations.push('All integrity checks passed successfully');
        }

        // Add auto-fix recommendation if there are warnings that could be fixed
        if (!options.autoFix && report.overall.warningCount > 0) {
            const missingLinkWarnings = linkingCheck.issues.filter(i =>
                i.type === 'missing_task_link' && i.severity === 'warning'
            ).length;

            if (missingLinkWarnings > 0) {
                report.recommendations.push(`Run integrity check with --auto-fix to automatically fix ${missingLinkWarnings} missing task links`);
            }
        }

    } catch (error) {
        report.overall.valid = false;
        report.overall.errorCount += 1;
        report.recommendations.push(`Critical error during integrity check: ${error.message}`);
        log('error', 'Error performing integrity check:', error.message);
    }

    return report;
}

export {
    checkPrdFileIntegrity,
    checkTaskPrdLinkingConsistency,
    updatePrdTaskStatistics,
    performIntegrityCheck,
    autoFixMissingTaskLinks,
    autoFixFileIntegrityIssues,
    getStatusDirectory
};
