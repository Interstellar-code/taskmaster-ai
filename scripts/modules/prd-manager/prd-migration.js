/**
 * PRD Migration System
 * Handles migrating existing PRD files into the new tracking system
 */

import fs from 'fs';
import path from 'path';
import { 
    readPrdsMetadata, 
    writePrdsMetadata,
    findPrdsByFileName
} from './prd-utils.js';
import { createPrdFromFile } from './prd-write-operations.js';
import { movePrdAndUpdateStatus } from './prd-file-movement.js';
import { linkTaskToPrd } from './task-prd-linking.js';
import { readJSON, log } from '../utils.js';

/**
 * Scan directory for PRD files
 * @param {string} directory - Directory to scan
 * @param {Array} extensions - File extensions to look for
 * @returns {Array} Array of found PRD files
 */
function scanForPrdFiles(directory, extensions = ['.txt', '.md', '.pdf', '.docx']) {
    const foundFiles = [];
    
    try {
        if (!fs.existsSync(directory)) {
            return foundFiles;
        }

        const scanRecursive = (dir, depth = 0) => {
            if (depth > 3) return; // Limit recursion depth
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Skip node_modules, .git, and other system directories
                    if (!item.startsWith('.') && item !== 'node_modules' && item !== 'tasks') {
                        scanRecursive(itemPath, depth + 1);
                    }
                } else if (stats.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (extensions.includes(ext)) {
                        // Check if filename suggests it's a PRD
                        const fileName = item.toLowerCase();
                        if (fileName.includes('prd') || 
                            fileName.includes('requirement') || 
                            fileName.includes('spec') ||
                            fileName.includes('design') ||
                            dir.toLowerCase().includes('prd') ||
                            dir.toLowerCase().includes('docs')) {
                            
                            foundFiles.push({
                                filePath: itemPath,
                                fileName: item,
                                directory: dir,
                                size: stats.size,
                                modified: stats.mtime,
                                created: stats.birthtime || stats.mtime
                            });
                        }
                    }
                }
            }
        };

        scanRecursive(directory);
        return foundFiles;
    } catch (error) {
        log('error', `Error scanning directory ${directory}:`, error.message);
        return foundFiles;
    }
}

/**
 * Analyze PRD file to extract metadata
 * @param {string} filePath - Path to PRD file
 * @returns {Object} Extracted metadata
 */
function analyzePrdFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        // Extract title from content
        let title = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
        const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^Title:\s*(.+)$/mi);
        if (titleMatch) {
            title = titleMatch[1].trim();
        }

        // Extract description
        let description = '';
        const descMatch = content.match(/(?:Description|Summary|Overview):\s*(.+?)(?:\n\n|\n#|$)/si);
        if (descMatch) {
            description = descMatch[1].trim().substring(0, 200);
        }

        // Estimate complexity based on content length and keywords
        let complexity = 'medium';
        const wordCount = content.split(/\s+/).length;
        const complexKeywords = ['integration', 'api', 'database', 'authentication', 'security', 'performance'];
        const hasComplexKeywords = complexKeywords.some(keyword => 
            content.toLowerCase().includes(keyword)
        );

        if (wordCount < 500) {
            complexity = 'low';
        } else if (wordCount > 2000 || hasComplexKeywords) {
            complexity = 'high';
        }

        // Estimate priority based on keywords
        let priority = 'medium';
        const highPriorityKeywords = ['urgent', 'critical', 'asap', 'high priority', 'important'];
        const lowPriorityKeywords = ['nice to have', 'future', 'optional', 'low priority'];
        
        const contentLower = content.toLowerCase();
        if (highPriorityKeywords.some(keyword => contentLower.includes(keyword))) {
            priority = 'high';
        } else if (lowPriorityKeywords.some(keyword => contentLower.includes(keyword))) {
            priority = 'low';
        }

        // Extract tags from content
        const tags = [];
        const tagPatterns = [
            /tags?:\s*([^\n]+)/i,
            /categories?:\s*([^\n]+)/i,
            /keywords?:\s*([^\n]+)/i
        ];
        
        for (const pattern of tagPatterns) {
            const match = content.match(pattern);
            if (match) {
                const extractedTags = match[1].split(/[,;]/).map(tag => tag.trim()).filter(tag => tag);
                tags.push(...extractedTags);
                break;
            }
        }

        return {
            title,
            description,
            complexity,
            priority,
            tags: [...new Set(tags)], // Remove duplicates
            wordCount,
            hasComplexKeywords
        };
    } catch (error) {
        log('error', `Error analyzing PRD file ${filePath}:`, error.message);
        return {
            title: path.basename(filePath, path.extname(filePath)),
            description: '',
            complexity: 'medium',
            priority: 'medium',
            tags: [],
            wordCount: 0,
            hasComplexKeywords: false
        };
    }
}

/**
 * Find tasks that reference a PRD file
 * @param {string} prdFileName - PRD filename to search for
 * @param {string} tasksPath - Path to tasks.json
 * @returns {Array} Array of task IDs that reference this PRD
 */
function findTasksReferencingPrd(prdFileName, tasksPath = 'tasks/tasks.json') {
    try {
        const tasksData = readJSON(tasksPath);
        if (!tasksData || !tasksData.tasks) {
            return [];
        }

        return tasksData.tasks
            .filter(task => 
                task.prdSource && 
                task.prdSource.fileName === prdFileName
            )
            .map(task => task.id);
    } catch (error) {
        log('error', `Error finding tasks referencing PRD ${prdFileName}:`, error.message);
        return [];
    }
}

/**
 * Migrate a single PRD file into the tracking system
 * @param {Object} fileInfo - File information from scan
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
function migrateSinglePrd(fileInfo, options = {}) {
    const {
        targetStatus = 'pending',
        moveToStatusDirectory = true,
        linkExistingTasks = true,
        overwriteExisting = false
    } = options;

    try {
        // Check if PRD already exists in tracking system
        const existingPrds = findPrdsByFileName(fileInfo.fileName);
        if (existingPrds.length > 0 && !overwriteExisting) {
            return {
                success: false,
                error: `PRD ${fileInfo.fileName} already exists in tracking system`,
                skipped: true
            };
        }

        // Analyze the PRD file
        const metadata = analyzePrdFile(fileInfo.filePath);
        
        // Create PRD entry in tracking system
        const prdData = {
            title: metadata.title,
            description: metadata.description,
            complexity: metadata.complexity,
            priority: metadata.priority,
            tags: metadata.tags
        };

        const createResult = createPrdFromFile(fileInfo.filePath, prdData);
        if (!createResult.success) {
            return createResult;
        }

        const prdId = createResult.data.id;

        // Link existing tasks if requested
        let linkedTasksCount = 0;
        if (linkExistingTasks) {
            const referencingTasks = findTasksReferencingPrd(fileInfo.fileName);
            for (const taskId of referencingTasks) {
                const linkResult = linkTaskToPrd(taskId, prdId);
                if (linkResult.success) {
                    linkedTasksCount++;
                }
            }
        }

        // Move to status directory if requested
        if (moveToStatusDirectory) {
            const moveResult = movePrdAndUpdateStatus(prdId, targetStatus);
            if (!moveResult.success) {
                log('warn', `Failed to move PRD ${prdId} to status directory: ${moveResult.error}`);
            }
        }

        log('info', `Successfully migrated PRD: ${fileInfo.fileName} (${linkedTasksCount} tasks linked)`);
        return {
            success: true,
            data: {
                prdId: prdId,
                fileName: fileInfo.fileName,
                linkedTasksCount: linkedTasksCount,
                metadata: metadata
            }
        };

    } catch (error) {
        log('error', `Error migrating PRD ${fileInfo.fileName}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Migrate multiple PRD files
 * @param {Array} fileList - Array of file information objects
 * @param {Object} options - Migration options
 * @returns {Object} Migration results
 */
function migratePrdFiles(fileList, options = {}) {
    const results = {
        total: fileList.length,
        migrated: 0,
        skipped: 0,
        errors: 0,
        details: []
    };

    for (const fileInfo of fileList) {
        const result = migrateSinglePrd(fileInfo, options);
        
        if (result.success) {
            results.migrated++;
        } else if (result.skipped) {
            results.skipped++;
        } else {
            results.errors++;
        }
        
        results.details.push({
            fileName: fileInfo.fileName,
            filePath: fileInfo.filePath,
            result: result
        });
    }

    return {
        success: true,
        data: results
    };
}

/**
 * Discover and migrate PRD files from a directory
 * @param {string} directory - Directory to scan
 * @param {Object} options - Migration options
 * @returns {Object} Discovery and migration results
 */
function discoverAndMigratePrds(directory = '.', options = {}) {
    const {
        extensions = ['.txt', '.md'],
        dryRun = false,
        interactive = false
    } = options;

    try {
        // Scan for PRD files
        log('info', `Scanning ${directory} for PRD files...`);
        const foundFiles = scanForPrdFiles(directory, extensions);
        
        if (foundFiles.length === 0) {
            return {
                success: true,
                data: {
                    discovered: 0,
                    migrated: 0,
                    message: 'No PRD files found'
                }
            };
        }

        log('info', `Found ${foundFiles.length} potential PRD files`);

        // Dry run - just return what would be migrated
        if (dryRun) {
            return {
                success: true,
                data: {
                    discovered: foundFiles.length,
                    files: foundFiles.map(f => ({
                        fileName: f.fileName,
                        filePath: f.filePath,
                        size: f.size,
                        modified: f.modified
                    })),
                    dryRun: true
                }
            };
        }

        // Perform migration
        const migrationResults = migratePrdFiles(foundFiles, options);
        
        return {
            success: true,
            data: {
                discovered: foundFiles.length,
                ...migrationResults.data
            }
        };

    } catch (error) {
        log('error', `Error in PRD discovery and migration:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate migration report
 * @param {Object} migrationResults - Results from migration
 * @returns {string} Formatted report
 */
function generateMigrationReport(migrationResults) {
    const { data } = migrationResults;
    
    let report = `\n📊 PRD Migration Report\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Total Files Discovered: ${data.discovered}\n`;
    report += `Successfully Migrated: ${data.migrated}\n`;
    report += `Skipped (Already Exist): ${data.skipped}\n`;
    report += `Errors: ${data.errors}\n\n`;

    if (data.details && data.details.length > 0) {
        report += `📋 Migration Details:\n`;
        report += `${'-'.repeat(30)}\n`;
        
        for (const detail of data.details) {
            const status = detail.result.success ? '✅' : 
                          detail.result.skipped ? '⏭️' : '❌';
            report += `${status} ${detail.fileName}\n`;
            
            if (detail.result.success && detail.result.data) {
                report += `   PRD ID: ${detail.result.data.prdId}\n`;
                report += `   Linked Tasks: ${detail.result.data.linkedTasksCount}\n`;
            } else if (!detail.result.success && !detail.result.skipped) {
                report += `   Error: ${detail.result.error}\n`;
            }
            report += '\n';
        }
    }

    return report;
}

export {
    scanForPrdFiles,
    analyzePrdFile,
    findTasksReferencingPrd,
    migrateSinglePrd,
    migratePrdFiles,
    discoverAndMigratePrds,
    generateMigrationReport
};
