/**
 * PRD Management Commands
 * CLI commands for PRD lifecycle tracking and management
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { 
    readPrdsMetadata,
    findPrdById,
    findPrdsByStatus,
    getAllPrds,
    getPrdStatistics
} from './prd-manager/prd-utils.js';
import { 
    addPrd,
    updatePrd,
    removePrd,
    updatePrdStatus,
    createPrdFromFile
} from './prd-manager/prd-write-operations.js';
import { 
    linkTaskToPrd,
    unlinkTaskFromPrd,
    syncTaskPrdLinks
} from './prd-manager/task-prd-linking.js';
import { 
    updatePrdStatusBasedOnTasks,
    updateAllPrdStatuses
} from './prd-manager/prd-status-automation.js';
import { 
    movePrdAndUpdateStatus,
    organizeAllPrdFiles
} from './prd-manager/prd-file-movement.js';
import { performIntegrityCheck } from './prd-manager/prd-integrity.js';
import {
    discoverAndMigratePrds,
    generateMigrationReport
} from './prd-manager/prd-migration.js';
import {
    trackFileChanges,
    getVersionHistory,
    compareVersions,
    addVersionEntry
} from './prd-manager/prd-version-control.js';
import { log } from './utils.js';

/**
 * List PRDs with optional filtering
 * @param {Object} options - Command options
 */
function listPrds(options = {}) {
    try {
        const {
            status,
            priority,
            complexity,
            format = 'table',
            includeTasks = false
        } = options;

        const filters = {};
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (complexity) filters.complexity = complexity;

        const prds = getAllPrds(filters);
        
        if (format === 'json') {
            console.log(JSON.stringify(prds, null, 2));
            return;
        }

        if (prds.length === 0) {
            console.log(chalk.yellow('No PRDs found matching the criteria.'));
            return;
        }

        // Display as table
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Title'),
                chalk.cyan('Status'),
                chalk.cyan('Priority'),
                chalk.cyan('Complexity'),
                chalk.cyan('Tasks'),
                chalk.cyan('Completion'),
                chalk.cyan('Last Modified')
            ],
            colWidths: [25, 30, 12, 10, 10, 8, 12, 15]
        });

        for (const prd of prds) {
            const statusColor = getStatusColor(prd.status);
            const priorityColor = getPriorityColor(prd.priority);
            const complexityColor = getComplexityColor(prd.complexity);
            
            // Use new structure fields if available, fallback to old structure
            const taskCount = prd.totalTasks !== undefined ? prd.totalTasks : (prd.linkedTaskIds ? prd.linkedTaskIds.length : 0);
            const completion = prd.completion !== undefined ? prd.completion : (prd.taskStats ? prd.taskStats.completionPercentage || 0 : 0);

            table.push([
                prd.id,
                prd.title.length > 27 ? prd.title.substring(0, 24) + '...' : prd.title,
                statusColor(prd.status),
                priorityColor(prd.priority || 'medium'),
                complexityColor(prd.complexity || 'medium'),
                taskCount.toString(),
                `${completion}%`,
                new Date(prd.lastModified).toLocaleDateString()
            ]);
        }

        console.log(table.toString());
        
        // Show statistics
        const stats = getPrdStatistics();
        console.log(chalk.gray(`\nTotal: ${stats.total} PRDs`));
        console.log(chalk.gray(`Status: ${stats.byStatus.pending} pending, ${stats.byStatus['in-progress']} in-progress, ${stats.byStatus.done} done, ${stats.byStatus.archived} archived`));

    } catch (error) {
        console.error(chalk.red('Error listing PRDs:'), error.message);
        process.exit(1);
    }
}

/**
 * Show detailed PRD information
 * @param {string} prdId - PRD ID to show
 * @param {Object} options - Command options
 */
function showPrd(prdId, options = {}) {
    try {
        const { includeTasks = false, includeHistory = false } = options;

        const prd = findPrdById(prdId);
        if (!prd) {
            console.error(chalk.red(`PRD with ID '${prdId}' not found.`));
            process.exit(1);
        }

        console.log(chalk.cyan.bold(`\n📄 PRD: ${prd.title}`));
        console.log(chalk.gray('─'.repeat(60)));
        
        console.log(`${chalk.bold('ID:')} ${prd.id}`);
        console.log(`${chalk.bold('File:')} ${prd.fileName}`);
        console.log(`${chalk.bold('Path:')} ${prd.filePath}`);
        console.log(`${chalk.bold('Status:')} ${getStatusColor(prd.status)(prd.status)}`);
        console.log(`${chalk.bold('Priority:')} ${getPriorityColor(prd.priority)(prd.priority || 'medium')}`);
        console.log(`${chalk.bold('Complexity:')} ${getComplexityColor(prd.complexity)(prd.complexity || 'medium')}`);
        console.log(`${chalk.bold('Created:')} ${new Date(prd.createdDate).toLocaleString()}`);
        console.log(`${chalk.bold('Modified:')} ${new Date(prd.lastModified).toLocaleString()}`);
        
        if (prd.description) {
            console.log(`${chalk.bold('Description:')} ${prd.description}`);
        }
        
        if (prd.tags && prd.tags.length > 0) {
            console.log(`${chalk.bold('Tags:')} ${prd.tags.join(', ')}`);
        }
        
        if (prd.estimatedEffort) {
            console.log(`${chalk.bold('Estimated Effort:')} ${prd.estimatedEffort}`);
        }

        // Task statistics
        console.log(chalk.cyan.bold('\n📊 Task Statistics:'));
        console.log(`${chalk.bold('Total Tasks:')} ${prd.taskStats.totalTasks}`);
        console.log(`${chalk.bold('Completed:')} ${prd.taskStats.completedTasks}`);
        console.log(`${chalk.bold('In Progress:')} ${prd.taskStats.inProgressTasks}`);
        console.log(`${chalk.bold('Pending:')} ${prd.taskStats.pendingTasks}`);
        console.log(`${chalk.bold('Completion:')} ${prd.taskStats.completionPercentage}%`);

        // Linked tasks
        if (includeTasks && prd.linkedTaskIds.length > 0) {
            console.log(chalk.cyan.bold('\n🔗 Linked Tasks:'));
            console.log(prd.linkedTaskIds.join(', '));
        }

        // File information
        console.log(chalk.cyan.bold('\n📁 File Information:'));
        console.log(`${chalk.bold('Size:')} ${prd.fileSize} bytes`);
        console.log(`${chalk.bold('Hash:')} ${prd.fileHash.substring(0, 16)}...`);

    } catch (error) {
        console.error(chalk.red('Error showing PRD:'), error.message);
        process.exit(1);
    }
}

/**
 * Update PRD status
 * @param {string} prdId - PRD ID
 * @param {string} newStatus - New status
 * @param {Object} options - Command options
 */
function updatePrdStatusCommand(prdId, newStatus, options = {}) {
    try {
        const { force = false } = options;
        
        const validStatuses = ['pending', 'in-progress', 'done', 'archived'];
        if (!validStatuses.includes(newStatus)) {
            console.error(chalk.red(`Invalid status '${newStatus}'. Valid statuses: ${validStatuses.join(', ')}`));
            process.exit(1);
        }

        const result = updatePrdStatus(prdId, newStatus);
        
        if (result.success) {
            console.log(chalk.green(`✓ Updated PRD ${prdId} status to '${newStatus}'`));
        } else {
            console.error(chalk.red(`Error updating PRD status: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error updating PRD status:'), error.message);
        process.exit(1);
    }
}

/**
 * Sync PRD status with linked tasks
 * @param {string} prdId - PRD ID (optional, sync all if not provided)
 * @param {Object} options - Command options
 */
function syncPrdStatus(prdId, options = {}) {
    try {
        const { force = false, dryRun = false } = options;

        if (prdId) {
            // Sync specific PRD
            const result = updatePrdStatusBasedOnTasks(prdId, 'tasks/tasks.json', 'prd/prds.json', {
                force,
                dryRun
            });

            if (result.success) {
                if (result.data.changed) {
                    console.log(chalk.green(`✓ Updated PRD ${prdId} status from '${result.data.previousStatus}' to '${result.data.newStatus}'`));
                } else {
                    console.log(chalk.blue(`ℹ PRD ${prdId} status is already appropriate (${result.data.currentStatus})`));
                }
            } else {
                console.error(chalk.red(`Error syncing PRD status: ${result.error}`));
                process.exit(1);
            }
        } else {
            // Sync all PRDs
            const result = updateAllPrdStatuses('tasks/tasks.json', 'prd/prds.json', {
                force,
                dryRun
            });

            if (result.success) {
                console.log(chalk.green(`✓ Synced all PRD statuses: ${result.data.updated} updated, ${result.data.unchanged} unchanged, ${result.data.errors} errors`));
            } else {
                console.error(chalk.red(`Error syncing PRD statuses: ${result.error}`));
                process.exit(1);
            }
        }

    } catch (error) {
        console.error(chalk.red('Error syncing PRD status:'), error.message);
        process.exit(1);
    }
}

/**
 * Organize PRD files into status directories
 * @param {Object} options - Command options
 */
function organizePrds(options = {}) {
    try {
        const { dryRun = false } = options;

        const result = organizeAllPrdFiles('prd/prds.json', { dryRun });

        if (result.success) {
            const action = dryRun ? 'Would organize' : 'Organized';
            console.log(chalk.green(`✓ ${action} PRD files: ${result.data.moved} moved, ${result.data.alreadyCorrect} already correct, ${result.data.errors} errors`));
            
            if (result.data.errors > 0) {
                console.log(chalk.yellow('\nErrors encountered:'));
                result.data.details
                    .filter(d => !d.result.success)
                    .forEach(d => {
                        console.log(chalk.red(`  - ${d.fileName}: ${d.result.error}`));
                    });
            }
        } else {
            console.error(chalk.red(`Error organizing PRDs: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error organizing PRDs:'), error.message);
        process.exit(1);
    }
}

/**
 * Check PRD integrity
 * @param {Object} options - Command options
 */
function checkPrdIntegrity(options = {}) {
    try {
        const result = performIntegrityCheck();

        console.log(chalk.cyan.bold('\n🔍 PRD Integrity Check Report'));
        console.log(chalk.gray('─'.repeat(50)));
        
        if (result.overall.valid) {
            console.log(chalk.green('✓ All integrity checks passed'));
        } else {
            console.log(chalk.red(`✗ Found ${result.overall.errorCount} errors and ${result.overall.warningCount} warnings`));
        }

        // Show file integrity issues
        const fileIssues = result.fileIntegrity.filter(f => f.issues.length > 0);
        if (fileIssues.length > 0) {
            console.log(chalk.yellow('\n⚠ File Integrity Issues:'));
            fileIssues.forEach(file => {
                console.log(chalk.yellow(`  ${file.fileName}:`));
                file.issues.forEach(issue => {
                    const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
                    console.log(color(`    - ${issue.message}`));
                });
            });
        }

        // Show linking issues
        if (result.linkingConsistency.issues.length > 0) {
            console.log(chalk.yellow('\n🔗 Task-PRD Linking Issues:'));
            result.linkingConsistency.issues.forEach(issue => {
                const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
                console.log(color(`  - ${issue.message}`));
            });
        }

        // Show recommendations
        if (result.recommendations.length > 0) {
            console.log(chalk.cyan('\n💡 Recommendations:'));
            result.recommendations.forEach(rec => {
                console.log(chalk.cyan(`  - ${rec}`));
            });
        }

    } catch (error) {
        console.error(chalk.red('Error checking PRD integrity:'), error.message);
        process.exit(1);
    }
}

// Helper functions for colors
function getStatusColor(status) {
    const colors = {
        'pending': chalk.yellow,
        'in-progress': chalk.blue,
        'done': chalk.green,
        'archived': chalk.gray
    };
    return colors[status] || chalk.white;
}

function getPriorityColor(priority) {
    const colors = {
        'low': chalk.green,
        'medium': chalk.yellow,
        'high': chalk.red
    };
    return colors[priority] || chalk.white;
}

function getComplexityColor(complexity) {
    const colors = {
        'low': chalk.green,
        'medium': chalk.yellow,
        'high': chalk.red
    };
    return colors[complexity] || chalk.white;
}

/**
 * Migrate PRD files into tracking system
 * @param {Object} options - Command options
 */
function migratePrds(options = {}) {
    try {
        const {
            directory = '.',
            dryRun = false,
            extensions = ['.txt', '.md'],
            targetStatus = 'pending',
            moveFiles = true,
            linkTasks = true
        } = options;

        console.log(chalk.cyan.bold('\n🔄 PRD Migration System'));
        console.log(chalk.gray('─'.repeat(50)));

        const migrationOptions = {
            extensions: extensions,
            dryRun: dryRun,
            targetStatus: targetStatus,
            moveToStatusDirectory: moveFiles,
            linkExistingTasks: linkTasks
        };

        const result = discoverAndMigratePrds(directory, migrationOptions);

        if (result.success) {
            if (dryRun) {
                console.log(chalk.blue('🔍 Dry Run Results:'));
                console.log(chalk.gray(`Found ${result.data.discovered} potential PRD files`));

                if (result.data.files && result.data.files.length > 0) {
                    console.log(chalk.yellow('\n📁 Files that would be migrated:'));
                    result.data.files.forEach(file => {
                        console.log(chalk.gray(`  - ${file.fileName} (${file.filePath})`));
                    });
                }
            } else {
                const report = generateMigrationReport(result);
                console.log(report);

                if (result.data.migrated > 0) {
                    console.log(chalk.green(`✅ Successfully migrated ${result.data.migrated} PRD files`));
                }
                if (result.data.skipped > 0) {
                    console.log(chalk.yellow(`⏭️ Skipped ${result.data.skipped} files (already exist)`));
                }
                if (result.data.errors > 0) {
                    console.log(chalk.red(`❌ ${result.data.errors} files failed to migrate`));
                }
            }
        } else {
            console.error(chalk.red(`Error during migration: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error migrating PRDs:'), error.message);
        process.exit(1);
    }
}

/**
 * Show PRD version history
 * @param {string} prdId - PRD ID
 * @param {Object} options - Command options
 */
function showPrdHistory(prdId, options = {}) {
    try {
        const { limit = 10, changeType, author } = options;

        const result = getVersionHistory(prdId, { limit, changeType, author });

        if (result.success) {
            console.log(chalk.cyan.bold(`\n📚 Version History: ${prdId}`));
            console.log(chalk.gray('─'.repeat(60)));

            console.log(`${chalk.bold('Current Version:')} ${result.data.currentVersion}`);
            console.log(`${chalk.bold('Total Versions:')} ${result.data.totalVersions}`);

            if (result.data.history.length === 0) {
                console.log(chalk.yellow('\nNo version history found.'));
                return;
            }

            console.log(chalk.cyan.bold('\n📋 Version History:'));
            result.data.history.reverse().forEach(entry => {
                console.log(`\n${chalk.bold('Version:')} ${entry.version}`);
                console.log(`${chalk.bold('Date:')} ${new Date(entry.timestamp).toLocaleString()}`);
                console.log(`${chalk.bold('Change:')} ${entry.changeType}`);
                console.log(`${chalk.bold('Author:')} ${entry.author}`);

                if (entry.changeDetails && Object.keys(entry.changeDetails).length > 0) {
                    console.log(`${chalk.bold('Details:')} ${JSON.stringify(entry.changeDetails, null, 2)}`);
                }

                if (entry.snapshot) {
                    console.log(`${chalk.bold('Status:')} ${getStatusColor(entry.snapshot.status)(entry.snapshot.status)}`);
                    console.log(`${chalk.bold('Priority:')} ${getPriorityColor(entry.snapshot.priority)(entry.snapshot.priority)}`);
                    console.log(`${chalk.bold('Linked Tasks:')} ${entry.snapshot.linkedTaskIds.length}`);
                }
            });
        } else {
            console.error(chalk.red(`Error getting version history: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error showing PRD history:'), error.message);
        process.exit(1);
    }
}

/**
 * Track PRD file changes
 * @param {string} prdId - PRD ID
 * @param {Object} options - Command options
 */
function trackPrdChanges(prdId, options = {}) {
    try {
        const { author = 'user' } = options;

        const result = trackFileChanges(prdId, { author });

        if (result.success) {
            if (result.data.changed) {
                console.log(chalk.green(`✅ Tracked changes for PRD ${prdId}`));
                console.log(chalk.blue(`📝 New version: ${result.data.version}`));

                if (result.data.changeDetails) {
                    const details = result.data.changeDetails;
                    console.log(`📊 Size change: ${details.previousSize} → ${details.newSize} bytes (${details.sizeChange > 0 ? '+' : ''}${details.sizeChange})`);
                    console.log(`🔍 Hash: ${details.previousHash.substring(0, 8)}... → ${details.newHash.substring(0, 8)}...`);
                }
            } else {
                console.log(chalk.blue(`ℹ No changes detected for PRD ${prdId}`));
            }
        } else {
            console.error(chalk.red(`Error tracking changes: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error tracking PRD changes:'), error.message);
        process.exit(1);
    }
}

/**
 * Compare PRD versions
 * @param {string} prdId - PRD ID
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @param {Object} options - Command options
 */
function comparePrdVersions(prdId, version1, version2, options = {}) {
    try {
        const result = compareVersions(prdId, version1, version2);

        if (result.success) {
            console.log(chalk.cyan.bold(`\n🔍 Version Comparison: ${prdId}`));
            console.log(chalk.gray('─'.repeat(60)));

            console.log(`${chalk.bold('Version 1:')} ${version1} (${new Date(result.data.version1.timestamp).toLocaleString()})`);
            console.log(`${chalk.bold('Version 2:')} ${version2} (${new Date(result.data.version2.timestamp).toLocaleString()})`);

            if (!result.data.hasChanges) {
                console.log(chalk.green('\n✅ No differences found between versions'));
                return;
            }

            console.log(chalk.yellow.bold('\n📋 Differences:'));
            const diffs = result.data.differences;

            if (diffs.status) {
                console.log(`${chalk.bold('Status:')} ${result.data.version1.snapshot.status} → ${result.data.version2.snapshot.status}`);
            }
            if (diffs.priority) {
                console.log(`${chalk.bold('Priority:')} ${result.data.version1.snapshot.priority} → ${result.data.version2.snapshot.priority}`);
            }
            if (diffs.complexity) {
                console.log(`${chalk.bold('Complexity:')} ${result.data.version1.snapshot.complexity} → ${result.data.version2.snapshot.complexity}`);
            }
            if (diffs.linkedTasks) {
                console.log(`${chalk.bold('Linked Tasks:')} ${result.data.version1.snapshot.linkedTaskIds.length} → ${result.data.version2.snapshot.linkedTaskIds.length}`);
            }
            if (diffs.fileSize) {
                console.log(`${chalk.bold('File Size:')} ${result.data.version1.fileSize} → ${result.data.version2.fileSize} bytes`);
            }
            if (diffs.fileHash) {
                console.log(`${chalk.bold('File Hash:')} ${result.data.version1.fileHash.substring(0, 16)}... → ${result.data.version2.fileHash.substring(0, 16)}...`);
            }
        } else {
            console.error(chalk.red(`Error comparing versions: ${result.error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('Error comparing PRD versions:'), error.message);
        process.exit(1);
    }
}

/**
 * Sync PRD file metadata headers with prds.json data
 * @param {string} prdId - Optional specific PRD ID to sync
 * @param {Object} options - Command options
 */
async function syncPrdFileMetadataCommand(prdId, options = {}) {
    try {
        const { syncPrdFileMetadata } = await import('./prd-manager/prd-file-metadata.js');
        const { readPrdsMetadata, findPrdById } = await import('./prd-manager/prd-utils.js');

        console.log(chalk.blue('🔄 Syncing PRD file metadata headers...'));

        // Read PRDs metadata
        const prdsData = readPrdsMetadata('prd/prds.json');
        if (!prdsData || !prdsData.prds) {
            console.error(chalk.red('❌ Failed to read PRDs metadata'));
            return;
        }

        let prdsToSync = [];

        if (prdId) {
            // Sync specific PRD
            const prd = findPrdById(prdId, 'prd/prds.json');
            if (!prd) {
                console.error(chalk.red(`❌ PRD not found: ${prdId}`));
                return;
            }
            prdsToSync = [prd];
        } else {
            // Sync all PRDs
            prdsToSync = prdsData.prds;
        }

        let successCount = 0;
        let errorCount = 0;

        // Process each PRD
        for (const prd of prdsToSync) {
            console.log(chalk.cyan(`📄 Processing PRD ${prd.id}: ${prd.title}`));

            // Determine file path
            let filePath = prd.filePath;
            if (!filePath || !fs.existsSync(filePath)) {
                // Try to find the file in status directories
                const statusDirs = ['pending', 'in-progress', 'done', 'archived'];
                let found = false;

                for (const statusDir of statusDirs) {
                    const possiblePath = path.join('prd', statusDir, prd.fileName);
                    if (fs.existsSync(possiblePath)) {
                        filePath = possiblePath;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    console.error(chalk.red(`   ❌ File not found for PRD ${prd.id}: ${prd.fileName}`));
                    errorCount++;
                    continue;
                }
            }

            try {
                // Sync the file metadata
                const success = syncPrdFileMetadata(filePath, prd);
                if (success) {
                    console.log(chalk.green(`   ✅ Updated metadata for ${prd.id}`));
                    successCount++;
                } else {
                    console.error(chalk.red(`   ❌ Failed to update metadata for ${prd.id}`));
                    errorCount++;
                }
            } catch (error) {
                console.error(chalk.red(`   ❌ Error processing ${prd.id}: ${error.message}`));
                errorCount++;
            }
        }

        // Summary
        console.log(chalk.blue('\n📊 Sync Summary:'));
        console.log(chalk.green(`   ✅ Successfully updated: ${successCount} PRDs`));
        if (errorCount > 0) {
            console.log(chalk.red(`   ❌ Failed to update: ${errorCount} PRDs`));
        }
        console.log(chalk.cyan(`   📄 Total processed: ${successCount + errorCount} PRDs`));

        if (successCount > 0) {
            console.log(chalk.green('\n🎉 PRD file metadata sync completed!'));
            console.log(chalk.blue('📋 PRD files now have updated metadata headers similar to task files'));
        }

    } catch (error) {
        console.error(chalk.red('❌ Error syncing PRD file metadata:'), error.message);
        process.exit(1);
    }
}

export {
    listPrds,
    showPrd,
    updatePrdStatusCommand,
    syncPrdStatus,
    organizePrds,
    checkPrdIntegrity,
    migratePrds,
    showPrdHistory,
    trackPrdChanges,
    comparePrdVersions,
    syncPrdFileMetadataCommand
};
