import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import {
    readPrdsMetadata,
    writePrdsMetadata,
    findPrdById,
    findPrdsByStatus,
    getPRDsJsonPath,
    getPRDStatusDirectory,
    getTasksJsonPath
} from './prd-utils.js';
import { 
    getTasksLinkedToPrd 
} from './task-prd-linking.js';
import { readJSON, writeJSON, log } from '../utils.js';
import { atomicFileOperation } from './prd-thread-safety.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Create a ZIP archive containing PRD and associated task files
 * @param {string} prdId - PRD ID to archive
 * @param {Object} prd - PRD metadata object
 * @param {Array} linkedTasks - Array of linked task objects
 * @param {string} archiveDir - Directory to store the archive
 * @returns {Promise<Object>} Archive creation result
 */
async function createPrdArchive(prdId, prd, linkedTasks, archiveDir = null) {
    try {
        // Resolve archive directory path
        const resolvedArchiveDir = archiveDir || getPRDStatusDirectory('archived');

        // Ensure archive directory exists
        if (!fs.existsSync(resolvedArchiveDir)) {
            fs.mkdirSync(resolvedArchiveDir, { recursive: true });
        }

        // Create timestamped archive filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFileName = `${prdId}_${timestamp}.zip`;
        const archivePath = path.join(resolvedArchiveDir, archiveFileName);

        // Create archive metadata
        const archiveMetadata = {
            prdId: prd.id,
            prdTitle: prd.title,
            archivedDate: new Date().toISOString(),
            originalPrdPath: prd.filePath,
            linkedTaskIds: linkedTasks.map(task => task.id),
            taskCount: linkedTasks.length,
            archiveVersion: '1.0.0'
        };

        // Create a proper ZIP archive
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', () => {
                log('info', `Created ZIP archive: ${archivePath} (${archive.pointer()} bytes)`);
                resolve({
                    success: true,
                    data: {
                        archivePath: archivePath,
                        archiveFileName: archiveFileName,
                        metadata: archiveMetadata,
                        size: archive.pointer()
                    }
                });
            });

            archive.on('error', (err) => {
                log('error', `Error creating ZIP archive: ${err.message}`);
                reject(err);
            });

            archive.pipe(output);

            // Add metadata file
            archive.append(JSON.stringify(archiveMetadata, null, 2), { name: 'metadata.json' });

            // Add PRD file
            if (fs.existsSync(prd.filePath)) {
                archive.file(prd.filePath, { name: path.basename(prd.filePath) });
            }

            // Add task files
            const tasksDir = path.dirname(getTasksJsonPath());
            for (const task of linkedTasks) {
                const taskFileName = `task_${task.id.toString().padStart(3, '0')}.txt`;
                const taskFilePath = path.join(tasksDir, taskFileName);

                if (fs.existsSync(taskFilePath)) {
                    archive.file(taskFilePath, { name: `tasks/${taskFileName}` });
                }
            }

            // Finalize the archive
            archive.finalize();
        });

    } catch (error) {
        log('error', `Error creating archive for PRD ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Read metadata from a PRD ZIP archive
 * @param {string} archivePath - Path to the archive file
 * @returns {Promise<Object>} Archive metadata
 */
async function readPrdArchive(archivePath) {
    try {
        if (!fs.existsSync(archivePath)) {
            throw new Error(`Archive file not found: ${archivePath}`);
        }

        // Create a temporary directory to extract metadata
        const tempDir = path.join(path.dirname(archivePath), `temp_${Date.now()}`);

        try {
            // Extract the ZIP file
            await extractZip(archivePath, { dir: tempDir });

            // Read metadata.json
            const metadataPath = path.join(tempDir, 'metadata.json');
            if (!fs.existsSync(metadataPath)) {
                throw new Error('metadata.json not found in archive');
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });

            return {
                success: true,
                data: metadata
            };

        } catch (extractError) {
            // Clean up temp directory on error
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            throw extractError;
        }

    } catch (error) {
        log('error', `Error reading archive ${archivePath}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extract files from a PRD ZIP archive to a specified directory
 * @param {string} archivePath - Path to the archive file
 * @param {string} extractDir - Directory to extract files to
 * @returns {Promise<Object>} Extraction result
 */
async function extractPrdArchive(archivePath, extractDir) {
    try {
        if (!fs.existsSync(archivePath)) {
            throw new Error(`Archive file not found: ${archivePath}`);
        }

        // Ensure extract directory exists
        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        // Extract the ZIP file
        await extractZip(archivePath, { dir: extractDir });

        // Get list of extracted files
        const extractedFiles = [];

        function getFilesRecursively(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    getFilesRecursively(fullPath);
                } else {
                    extractedFiles.push(fullPath);
                }
            }
        }

        getFilesRecursively(extractDir);

        // Read metadata if available
        let metadata = null;
        const metadataPath = path.join(extractDir, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        log('info', `Extracted ${extractedFiles.length} files from ${archivePath} to ${extractDir}`);

        return {
            success: true,
            data: {
                extractedFiles: extractedFiles,
                metadata: metadata,
                extractDir: extractDir
            }
        };

    } catch (error) {
        log('error', `Error extracting archive ${archivePath}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all PRDs with "done" status that can be archived
 * @param {string} prdsPath - Path to prds.json
 * @returns {Array} Array of PRDs ready for archiving
 */
function getArchivablePrds(prdsPath = null) {
    try {
        const donePrds = findPrdsByStatus('done', prdsPath);
        return donePrds.filter(prd => {
            // Additional validation can be added here
            return prd && prd.id && prd.filePath;
        });
    } catch (error) {
        log('error', 'Error getting archivable PRDs:', error.message);
        return [];
    }
}

/**
 * Validate that all linked tasks are in "done" status
 * @param {Array} linkedTasks - Array of linked task objects
 * @returns {Object} Validation result
 */
function validateTasksForArchiving(linkedTasks) {
    const incompleteTasks = linkedTasks.filter(task => task.status !== 'done');
    
    return {
        isValid: incompleteTasks.length === 0,
        incompleteTasks: incompleteTasks,
        totalTasks: linkedTasks.length,
        completedTasks: linkedTasks.length - incompleteTasks.length
    };
}

/**
 * Remove PRD from active tracking (prds.json)
 * @param {string} prdId - PRD ID to remove
 * @param {string} prdsPath - Path to prds.json
 * @returns {Object} Removal result
 */
function removePrdFromTracking(prdId, prdsPath = null) {
    try {
        const prdsData = readPrdsMetadata(prdsPath);
        const prdIndex = prdsData.prds.findIndex(p => p.id === prdId);
        
        if (prdIndex === -1) {
            return {
                success: false,
                error: `PRD ${prdId} not found in tracking`
            };
        }

        // Remove the PRD from the array
        const removedPrd = prdsData.prds.splice(prdIndex, 1)[0];
        
        // Update metadata
        prdsData.metadata.totalPrds = prdsData.prds.length;
        prdsData.metadata.lastUpdated = new Date().toISOString();

        // Write updated data
        writePrdsMetadata(prdsData, prdsPath);

        log('info', `Removed PRD ${prdId} from active tracking`);
        return {
            success: true,
            data: {
                removedPrd: removedPrd,
                remainingPrds: prdsData.prds.length
            }
        };

    } catch (error) {
        log('error', `Error removing PRD ${prdId} from tracking:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Remove archived tasks from tasks.json
 * @param {Array} taskIds - Array of task IDs to remove
 * @param {string} tasksPath - Path to tasks.json
 * @returns {Object} Removal result
 */
function removeTasksFromTracking(taskIds, tasksPath = null) {
    try {
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const tasksData = readJSON(resolvedTasksPath);
        const originalCount = tasksData.tasks.length;
        
        // Remove tasks with matching IDs
        tasksData.tasks = tasksData.tasks.filter(task => !taskIds.includes(task.id));
        
        const removedCount = originalCount - tasksData.tasks.length;
        
        // Write updated data
        writeJSON(resolvedTasksPath, tasksData);

        log('info', `Removed ${removedCount} tasks from active tracking`);
        return {
            success: true,
            data: {
                removedCount: removedCount,
                remainingTasks: tasksData.tasks.length
            }
        };

    } catch (error) {
        log('error', `Error removing tasks from tracking:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete individual task files
 * @param {Array} taskIds - Array of task IDs
 * @returns {Object} Deletion result
 */
function deleteTaskFiles(taskIds) {
    const results = {
        success: true,
        deletedFiles: [],
        errors: []
    };

    for (const taskId of taskIds) {
        try {
            const taskFileName = `task_${taskId.toString().padStart(3, '0')}.txt`;
            const tasksDir = path.dirname(getTasksJsonPath());
            const taskFilePath = path.join(tasksDir, taskFileName);
            
            if (fs.existsSync(taskFilePath)) {
                fs.unlinkSync(taskFilePath);
                results.deletedFiles.push(taskFileName);
                log('info', `Deleted task file: ${taskFileName}`);
            }
        } catch (error) {
            results.errors.push({
                taskId: taskId,
                error: error.message
            });
            results.success = false;
            log('error', `Error deleting task file for task ${taskId}:`, error.message);
        }
    }

    return results;
}

/**
 * Archive a PRD and all its associated tasks
 * @param {string} prdId - PRD ID to archive
 * @param {Object} options - Archive options
 * @returns {Promise<Object>} Archive result
 */
async function archivePrd(prdId, options = {}) {
    const {
        prdsPath = null,
        tasksPath = null,
        archiveDir = null,
        force = false,
        dryRun = false
    } = options;

    try {
        // Resolve paths
        const resolvedPrdsPath = prdsPath || getPRDsJsonPath();
        const resolvedTasksPath = tasksPath || getTasksJsonPath();
        const resolvedArchiveDir = archiveDir || getPRDStatusDirectory('archived');

        // Find the PRD
        const prd = findPrdById(prdId, resolvedPrdsPath);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID ${prdId} not found`
            };
        }

        // Validate PRD status
        if (prd.status !== 'done' && !force) {
            return {
                success: false,
                error: `PRD ${prdId} status is '${prd.status}', not 'done'. Use --force to override.`
            };
        }

        // Get linked tasks
        const linkedTasks = getTasksLinkedToPrd(prdId, resolvedTasksPath, resolvedPrdsPath);

        // Validate tasks are ready for archiving
        const taskValidation = validateTasksForArchiving(linkedTasks);
        if (!taskValidation.isValid && !force) {
            return {
                success: false,
                error: `${taskValidation.incompleteTasks.length} tasks are not completed. Use --force to override.`,
                data: {
                    incompleteTasks: taskValidation.incompleteTasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status
                    }))
                }
            };
        }

        if (dryRun) {
            return {
                success: true,
                dryRun: true,
                data: {
                    prd: {
                        id: prd.id,
                        title: prd.title,
                        status: prd.status
                    },
                    linkedTasks: linkedTasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status
                    })),
                    taskValidation: taskValidation
                }
            };
        }

        // Create backup before starting
        const backupSuffix = `.backup.${Date.now()}`;
        const prdsBackup = `${resolvedPrdsPath}${backupSuffix}`;
        const tasksBackup = `${resolvedTasksPath}${backupSuffix}`;

        fs.copyFileSync(resolvedPrdsPath, prdsBackup);
        fs.copyFileSync(resolvedTasksPath, tasksBackup);

        try {
            // Step 1: Create archive
            const archiveResult = await createPrdArchive(prdId, prd, linkedTasks, resolvedArchiveDir);
            if (!archiveResult.success) {
                throw new Error(`Archive creation failed: ${archiveResult.error}`);
            }

            // Step 2: Remove PRD from tracking
            const prdRemovalResult = removePrdFromTracking(prdId, resolvedPrdsPath);
            if (!prdRemovalResult.success) {
                throw new Error(`PRD removal failed: ${prdRemovalResult.error}`);
            }

            // Step 3: Remove tasks from tracking
            const taskIds = linkedTasks.map(t => t.id);
            const taskRemovalResult = removeTasksFromTracking(taskIds, resolvedTasksPath);
            if (!taskRemovalResult.success) {
                throw new Error(`Task removal failed: ${taskRemovalResult.error}`);
            }

            // Step 4: Delete PRD file
            if (fs.existsSync(prd.filePath)) {
                fs.unlinkSync(prd.filePath);
                log('info', `Deleted PRD file: ${prd.filePath}`);
            }

            // Step 5: Delete task files
            const fileDeleteResult = deleteTaskFiles(taskIds);

            // Clean up backups on success
            fs.unlinkSync(prdsBackup);
            fs.unlinkSync(tasksBackup);

            return {
                success: true,
                data: {
                    prdId: prdId,
                    archivePath: archiveResult.data.archivePath,
                    archivedTaskCount: linkedTasks.length,
                    deletedFiles: fileDeleteResult.deletedFiles,
                    metadata: archiveResult.data.metadata
                }
            };

        } catch (error) {
            // Rollback on error
            log('error', `Archive process failed, rolling back: ${error.message}`);

            try {
                fs.copyFileSync(prdsBackup, resolvedPrdsPath);
                fs.copyFileSync(tasksBackup, resolvedTasksPath);
                fs.unlinkSync(prdsBackup);
                fs.unlinkSync(tasksBackup);
                log('info', 'Successfully rolled back changes');
            } catch (rollbackError) {
                log('error', `Rollback failed: ${rollbackError.message}`);
            }

            throw error;
        }

    } catch (error) {
        log('error', `Error archiving PRD ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Interactive PRD archive selection and confirmation
 * @param {Object} options - Archive options
 * @returns {Promise<Object>} Archive result
 */
async function interactivePrdArchive(options = {}) {
    try {
        // Get archivable PRDs
        const archivablePrds = getArchivablePrds(options.prdsPath);

        if (archivablePrds.length === 0) {
            console.log(chalk.yellow('📦 No PRDs with "done" status found for archiving.'));
            return {
                success: true,
                message: 'No PRDs available for archiving'
            };
        }

        // Display available PRDs for archiving
        console.log(chalk.cyan('\n📦 PRD Archive Selection'));
        console.log(chalk.gray('Select a completed PRD to archive:\n'));

        const prdChoices = archivablePrds.map(prd => ({
            name: `${chalk.blue(prd.id)} - ${chalk.white(prd.title)} ${chalk.gray(`(${prd.complexity || 'unknown'} complexity)`)}`,
            value: prd.id,
            short: prd.id
        }));

        prdChoices.push(new inquirer.Separator());
        prdChoices.push({
            name: chalk.gray('← Back to PRD Management'),
            value: 'back'
        });

        const { selectedPrdId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedPrdId',
                message: 'Select PRD to archive:',
                choices: prdChoices,
                pageSize: 10
            }
        ]);

        if (selectedPrdId === 'back') {
            return {
                success: true,
                cancelled: true,
                message: 'Archive cancelled by user'
            };
        }

        // Get PRD details and linked tasks
        const prd = findPrdById(selectedPrdId, options.prdsPath);
        const linkedTasks = getTasksLinkedToPrd(selectedPrdId, options.tasksPath, options.prdsPath);
        const taskValidation = validateTasksForArchiving(linkedTasks);

        // Display confirmation dialog
        console.log(chalk.cyan('\n📋 Archive Confirmation'));

        const confirmationBox = boxen(
            `${chalk.bold('PRD Details:')}\n` +
            `ID: ${chalk.blue(prd.id)}\n` +
            `Title: ${chalk.white(prd.title)}\n` +
            `File: ${chalk.gray(prd.filePath)}\n` +
            `Status: ${chalk.green(prd.status)}\n\n` +
            `${chalk.bold('Associated Tasks:')} ${linkedTasks.length} total\n` +
            `${chalk.green('✅ Completed:')} ${taskValidation.completedTasks}\n` +
            `${taskValidation.incompleteTasks.length > 0 ? chalk.red('❌ Incomplete:') + ' ' + taskValidation.incompleteTasks.length : ''}\n\n` +
            `${taskValidation.incompleteTasks.length > 0 ?
                chalk.yellow('⚠️  Warning: Some tasks are not completed!\n') +
                taskValidation.incompleteTasks.slice(0, 3).map(t =>
                    `   • Task ${t.id}: ${t.title} (${t.status})`
                ).join('\n') +
                (taskValidation.incompleteTasks.length > 3 ? `\n   • ... and ${taskValidation.incompleteTasks.length - 3} more` : '') +
                '\n\n' : ''
            }` +
            `${chalk.red.bold('⚠️  This will permanently archive the PRD and all associated tasks!')}\n` +
            `${chalk.gray('Files will be moved to a compressed archive and removed from active tracking.')}`,
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: taskValidation.isValid ? 'green' : 'yellow'
            }
        );

        console.log(confirmationBox);

        // Show task list if requested
        if (linkedTasks.length > 0) {
            const { showTasks } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'showTasks',
                    message: 'Show detailed task list?',
                    default: false
                }
            ]);

            if (showTasks) {
                console.log(chalk.cyan('\n📋 Task Details:'));
                linkedTasks.forEach(task => {
                    const statusColor = task.status === 'done' ? chalk.green :
                                      task.status === 'in-progress' ? chalk.blue :
                                      task.status === 'pending' ? chalk.yellow : chalk.gray;
                    console.log(`  ${statusColor('●')} Task ${task.id}: ${task.title} (${statusColor(task.status)})`);
                });
                console.log('');
            }
        }

        // Final confirmation
        const { confirmArchive } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmArchive',
                message: taskValidation.isValid ?
                    chalk.red('Are you sure you want to archive this PRD and all associated tasks?') :
                    chalk.red('Archive anyway? (Some tasks are incomplete)'),
                default: false
            }
        ]);

        if (!confirmArchive) {
            console.log(chalk.yellow('📦 Archive cancelled by user.'));
            return {
                success: true,
                cancelled: true,
                message: 'Archive cancelled by user'
            };
        }

        // Perform the archive
        console.log(chalk.blue('\n📦 Creating archive...'));
        const archiveResult = await archivePrd(selectedPrdId, {
            ...options,
            force: !taskValidation.isValid // Force if tasks are incomplete but user confirmed
        });

        if (archiveResult.success) {
            console.log(chalk.green('\n✅ Archive completed successfully!'));

            const successBox = boxen(
                `${chalk.bold('Archive Summary:')}\n` +
                `PRD: ${chalk.blue(selectedPrdId)}\n` +
                `Tasks Archived: ${chalk.green(archiveResult.data.archivedTaskCount)}\n` +
                `Archive Location: ${chalk.gray(archiveResult.data.archivePath)}\n` +
                `Files Deleted: ${chalk.gray(archiveResult.data.deletedFiles.length)} task files`,
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'round',
                    borderColor: 'green'
                }
            );

            console.log(successBox);
        } else {
            console.log(chalk.red('\n❌ Archive failed:'), archiveResult.error);
        }

        return archiveResult;

    } catch (error) {
        log('error', 'Error in interactive PRD archive:', error.message);
        console.log(chalk.red('\n❌ Archive failed:'), error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

export {
    createPrdArchive,
    readPrdArchive,
    extractPrdArchive,
    getArchivablePrds,
    validateTasksForArchiving,
    removePrdFromTracking,
    removeTasksFromTracking,
    deleteTaskFiles,
    archivePrd,
    interactivePrdArchive
};
