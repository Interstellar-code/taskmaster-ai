import fs from 'fs';
import path from 'path';
import { 
    readPrdsMetadata, 
    writePrdsMetadata,
    findPrdById,
    calculateFileHash,
    getFileSize
} from './prd-utils.js';
import { updatePrd } from './prd-write-operations.js';
import { atomicFileOperation } from './prd-thread-safety.js';
import { log } from '../utils.js';

/**
 * Get directory path for PRD status
 * @param {string} status - PRD status
 * @returns {string} Directory path
 */
function getStatusDirectory(status) {
    const statusDirs = {
        'pending': 'prd/pending',
        'in-progress': 'prd/in-progress',
        'done': 'prd/done',
        'archived': 'prd/archived'
    };
    return statusDirs[status] || 'prd/pending';
}

/**
 * Ensure status directory exists
 * @param {string} status - PRD status
 * @returns {string} Directory path
 */
function ensureStatusDirectory(status) {
    const dirPath = getStatusDirectory(status);
    
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log('info', `Created status directory: ${dirPath}`);
    }
    
    return dirPath;
}

/**
 * Move PRD file to appropriate status directory
 * @param {string} prdId - PRD ID
 * @param {string} newStatus - New status to move to
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Movement options
 * @returns {Object} Movement result
 */
function movePrdFileToStatusDirectory(prdId, newStatus, prdsPath = 'prd/prds.json', options = {}) {
    const {
        createBackup = true,
        updateMetadata = true,
        dryRun = false
    } = options;

    try {
        // Get PRD metadata
        const prd = findPrdById(prdId, prdsPath);
        if (!prd) {
            return {
                success: false,
                error: `PRD with ID ${prdId} not found`
            };
        }

        const currentPath = prd.filePath;
        const targetDir = ensureStatusDirectory(newStatus);
        const targetPath = path.join(targetDir, prd.fileName);

        // Check if file is already in the correct location
        if (path.resolve(currentPath) === path.resolve(targetPath)) {
            return {
                success: true,
                data: {
                    prdId: prdId,
                    moved: false,
                    message: 'File is already in the correct location',
                    currentPath: currentPath,
                    targetPath: targetPath
                }
            };
        }

        // Check if source file exists
        if (!fs.existsSync(currentPath)) {
            return {
                success: false,
                error: `Source PRD file not found: ${currentPath}`
            };
        }

        // Check if target file already exists
        if (fs.existsSync(targetPath) && path.resolve(currentPath) !== path.resolve(targetPath)) {
            return {
                success: false,
                error: `Target file already exists: ${targetPath}`
            };
        }

        // Dry run - just return what would happen
        if (dryRun) {
            return {
                success: true,
                data: {
                    prdId: prdId,
                    moved: false,
                    dryRun: true,
                    currentPath: currentPath,
                    targetPath: targetPath,
                    newStatus: newStatus
                }
            };
        }

        // Perform atomic file movement
        return atomicFileOperation(currentPath, async () => {
            // Move the file
            fs.renameSync(currentPath, targetPath);
            log('info', `Moved PRD file from ${currentPath} to ${targetPath}`);

            // Update metadata if requested
            if (updateMetadata) {
                const updateResult = updatePrd(prdId, {
                    filePath: targetPath,
                    status: newStatus,
                    lastModified: new Date().toISOString(),
                    fileHash: calculateFileHash(targetPath),
                    fileSize: getFileSize(targetPath)
                }, prdsPath);

                if (!updateResult.success) {
                    // Revert file movement if metadata update fails
                    fs.renameSync(targetPath, currentPath);
                    throw new Error(`Failed to update metadata: ${updateResult.error}`);
                }
            }

            return {
                success: true,
                data: {
                    prdId: prdId,
                    moved: true,
                    previousPath: currentPath,
                    newPath: targetPath,
                    newStatus: newStatus
                }
            };
        }, { createBackup });

    } catch (error) {
        log('error', `Error moving PRD file for ${prdId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Move PRD file and update status atomically
 * @param {string} prdId - PRD ID
 * @param {string} newStatus - New status
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Options
 * @returns {Object} Result
 */
function movePrdAndUpdateStatus(prdId, newStatus, prdsPath = 'prd/prds.json', options = {}) {
    return movePrdFileToStatusDirectory(prdId, newStatus, prdsPath, {
        ...options,
        updateMetadata: true
    });
}

/**
 * Organize all PRD files into correct status directories
 * @param {string} prdsPath - Path to prds.json
 * @param {Object} options - Organization options
 * @returns {Object} Organization result
 */
function organizeAllPrdFiles(prdsPath = 'prd/prds.json', options = {}) {
    const {
        dryRun = false,
        createBackup = true
    } = options;

    const results = {
        processed: 0,
        moved: 0,
        alreadyCorrect: 0,
        errors: 0,
        details: []
    };

    try {
        const prdsData = readPrdsMetadata(prdsPath);
        
        for (const prd of prdsData.prds) {
            results.processed++;
            
            const moveResult = movePrdFileToStatusDirectory(prd.id, prd.status, prdsPath, {
                dryRun,
                createBackup,
                updateMetadata: !dryRun
            });
            
            if (moveResult.success) {
                if (moveResult.data.moved) {
                    results.moved++;
                } else {
                    results.alreadyCorrect++;
                }
            } else {
                results.errors++;
            }
            
            results.details.push({
                prdId: prd.id,
                fileName: prd.fileName,
                status: prd.status,
                result: moveResult
            });
        }

        const action = dryRun ? 'analyzed' : 'organized';
        log('info', `PRD file organization ${action}: ${results.moved} moved, ${results.alreadyCorrect} already correct, ${results.errors} errors`);
        
        return {
            success: true,
            data: results
        };

    } catch (error) {
        log('error', 'Error organizing PRD files:', error.message);
        return {
            success: false,
            error: error.message,
            data: results
        };
    }
}

/**
 * Create backup of PRD file
 * @param {string} filePath - File to backup
 * @param {string} backupSuffix - Backup suffix
 * @returns {Object} Backup result
 */
function createPrdBackup(filePath, backupSuffix = '.backup') {
    try {
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                error: `File not found: ${filePath}`
            };
        }

        const backupPath = `${filePath}${backupSuffix}`;
        fs.copyFileSync(filePath, backupPath);
        
        log('info', `Created backup: ${backupPath}`);
        return {
            success: true,
            data: {
                originalPath: filePath,
                backupPath: backupPath
            }
        };

    } catch (error) {
        log('error', `Error creating backup for ${filePath}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Restore PRD file from backup
 * @param {string} filePath - Original file path
 * @param {string} backupSuffix - Backup suffix
 * @returns {Object} Restore result
 */
function restorePrdFromBackup(filePath, backupSuffix = '.backup') {
    try {
        const backupPath = `${filePath}${backupSuffix}`;
        
        if (!fs.existsSync(backupPath)) {
            return {
                success: false,
                error: `Backup file not found: ${backupPath}`
            };
        }

        fs.copyFileSync(backupPath, filePath);
        fs.unlinkSync(backupPath);
        
        log('info', `Restored from backup: ${backupPath} -> ${filePath}`);
        return {
            success: true,
            data: {
                restoredPath: filePath,
                backupPath: backupPath
            }
        };

    } catch (error) {
        log('error', `Error restoring from backup ${backupPath}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Clean up old backup files
 * @param {string} directory - Directory to clean
 * @param {number} maxAge - Maximum age in milliseconds
 * @param {string} backupPattern - Backup file pattern
 * @returns {Object} Cleanup result
 */
function cleanupOldBackups(directory = 'prd', maxAge = 7 * 24 * 60 * 60 * 1000, backupPattern = '.backup') {
    const results = {
        scanned: 0,
        removed: 0,
        errors: 0,
        details: []
    };

    try {
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    scanDirectory(itemPath);
                } else if (item.includes(backupPattern)) {
                    results.scanned++;
                    
                    const age = Date.now() - stats.mtime.getTime();
                    if (age > maxAge) {
                        try {
                            fs.unlinkSync(itemPath);
                            results.removed++;
                            results.details.push({
                                path: itemPath,
                                action: 'removed',
                                age: Math.round(age / (24 * 60 * 60 * 1000)) + ' days'
                            });
                        } catch (error) {
                            results.errors++;
                            results.details.push({
                                path: itemPath,
                                action: 'error',
                                error: error.message
                            });
                        }
                    }
                }
            }
        };

        if (fs.existsSync(directory)) {
            scanDirectory(directory);
        }

        log('info', `Backup cleanup completed: ${results.removed} removed, ${results.errors} errors`);
        return {
            success: true,
            data: results
        };

    } catch (error) {
        log('error', `Error cleaning up backups in ${directory}:`, error.message);
        return {
            success: false,
            error: error.message,
            data: results
        };
    }
}

export {
    getStatusDirectory,
    ensureStatusDirectory,
    movePrdFileToStatusDirectory,
    movePrdAndUpdateStatus,
    organizeAllPrdFiles,
    createPrdBackup,
    restorePrdFromBackup,
    cleanupOldBackups
};
