#!/usr/bin/env node

/**
 * PRD Structure Migration Script
 * Migrates from status-based folders to simplified structure
 * Task: 92.2 - Migrate PRD Files and Update prd.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root (assuming script is in scripts/ folder)
const projectRoot = path.resolve(__dirname, '..');
const prdBaseDir = path.join(projectRoot, '.taskmaster', 'prd');
const prdsJsonPath = path.join(prdBaseDir, 'prds.json');

/**
 * Calculate SHA256 hash of file content
 */
function calculateFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        console.error(`Error calculating hash for ${filePath}:`, error.message);
        return '';
    }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        console.error(`Error getting file size for ${filePath}:`, error.message);
        return 0;
    }
}

/**
 * Extract PRD metadata from file header
 */
function extractPrdMetadata(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(0, 20); // Check first 20 lines
        
        const metadata = {
            id: null,
            title: null,
            priority: 'medium',
            complexity: 'medium'
        };
        
        for (const line of lines) {
            if (line.startsWith('# PRD ID:')) {
                metadata.id = line.replace('# PRD ID:', '').trim();
            } else if (line.startsWith('# Title:')) {
                metadata.title = line.replace('# Title:', '').trim();
            } else if (line.startsWith('# Priority:')) {
                metadata.priority = line.replace('# Priority:', '').trim();
            } else if (line.startsWith('# Complexity:')) {
                metadata.complexity = line.replace('# Complexity:', '').trim();
            }
        }
        
        return metadata;
    } catch (error) {
        console.error(`Error extracting metadata from ${filePath}:`, error.message);
        return { id: null, title: null, priority: 'medium', complexity: 'medium' };
    }
}

/**
 * Generate PRD ID from filename if not found in metadata
 */
function generatePrdIdFromFilename(filename) {
    // Extract ID from filename like prd_002_taskhero_ui_rebrand.md
    const match = filename.match(/^prd_(\d+)/);
    if (match) {
        return `prd_${match[1].padStart(3, '0')}`;
    }
    
    // Generate sequential ID
    const timestamp = Date.now().toString().slice(-3);
    return `prd_${timestamp}`;
}

/**
 * Create PRD metadata entry
 */
function createPrdMetadataEntry(filePath, status, targetFileName) {
    const stats = fs.statSync(filePath);
    const extractedMeta = extractPrdMetadata(filePath);
    
    const prdId = extractedMeta.id || generatePrdIdFromFilename(path.basename(filePath));
    const title = extractedMeta.title || path.basename(filePath, '.md').replace(/_/g, ' ');
    
    return {
        id: prdId,
        title: title === 'undefined' ? `PRD ${prdId}` : title,
        fileName: targetFileName,
        status: status,
        priority: extractedMeta.priority || 'medium',
        complexity: extractedMeta.complexity || 'medium',
        createdDate: stats.birthtime.toISOString(),
        lastModified: stats.mtime.toISOString(),
        filePath: targetFileName,
        fileHash: calculateFileHash(filePath),
        fileSize: getFileSize(filePath),
        description: `Migrated from ${status} folder`,
        tags: ['migrated'],
        linkedTasks: [],
        taskStats: {
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completionPercentage: 0
        },
        estimatedEffort: 'TBD'
    };
}

/**
 * Main migration function
 */
async function migratePrdStructure() {
    console.log('🚀 Starting PRD structure migration...');
    
    const statusDirs = ['pending', 'in-progress', 'done'];
    const migratedPrds = [];
    const migrationLog = [];
    
    // Ensure target directory exists
    if (!fs.existsSync(prdBaseDir)) {
        fs.mkdirSync(prdBaseDir, { recursive: true });
        console.log(`✅ Created PRD base directory: ${prdBaseDir}`);
    }
    
    // Create archive directory if it doesn't exist
    const archiveDir = path.join(prdBaseDir, 'archive');
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
        console.log(`✅ Created archive directory: ${archiveDir}`);
    }
    
    // Process each status directory
    for (const status of statusDirs) {
        const statusDir = path.join(prdBaseDir, status);
        
        if (!fs.existsSync(statusDir)) {
            console.log(`⚠️  Status directory not found: ${statusDir}`);
            continue;
        }
        
        const files = fs.readdirSync(statusDir).filter(file => 
            file.endsWith('.md') && !file.includes('.backup.')
        );
        
        console.log(`📁 Processing ${status} directory: ${files.length} files`);
        
        for (const file of files) {
            const sourcePath = path.join(statusDir, file);
            const targetPath = path.join(prdBaseDir, file);
            
            try {
                // Check if target file already exists
                if (fs.existsSync(targetPath)) {
                    const timestamp = Date.now();
                    const newFileName = `${path.basename(file, '.md')}_${timestamp}.md`;
                    const newTargetPath = path.join(prdBaseDir, newFileName);
                    
                    fs.copyFileSync(sourcePath, newTargetPath);
                    console.log(`📄 Moved (renamed): ${file} -> ${newFileName}`);
                    
                    const metadata = createPrdMetadataEntry(sourcePath, status, newFileName);
                    migratedPrds.push(metadata);
                    migrationLog.push({ action: 'moved_renamed', source: sourcePath, target: newTargetPath, status });
                } else {
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`📄 Moved: ${file}`);
                    
                    const metadata = createPrdMetadataEntry(sourcePath, status, file);
                    migratedPrds.push(metadata);
                    migrationLog.push({ action: 'moved', source: sourcePath, target: targetPath, status });
                }
                
            } catch (error) {
                console.error(`❌ Error moving ${file}:`, error.message);
                migrationLog.push({ action: 'error', source: sourcePath, error: error.message });
            }
        }
    }
    
    // Update prds.json
    const prdsData = {
        prds: migratedPrds,
        metadata: {
            version: '2.0.0',
            lastUpdated: new Date().toISOString(),
            totalPrds: migratedPrds.length,
            schema: {
                version: '2.0.0',
                description: 'TaskHero AI PRD Simplified Structure Schema'
            },
            folderStructure: {
                type: 'simplified',
                statusManagement: 'metadata',
                archiveLocation: 'archive/'
            },
            migration: {
                date: new Date().toISOString(),
                fromVersion: '1.0.0',
                toVersion: '2.0.0',
                migratedFiles: migratedPrds.length
            }
        }
    };
    
    fs.writeFileSync(prdsJsonPath, JSON.stringify(prdsData, null, 2));
    console.log(`✅ Updated prds.json with ${migratedPrds.length} PRD entries`);
    
    // Create migration log
    const logPath = path.join(prdBaseDir, 'migration-log.json');
    fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));
    console.log(`📋 Created migration log: ${logPath}`);
    
    // Remove empty status directories
    for (const status of statusDirs) {
        const statusDir = path.join(prdBaseDir, status);
        if (fs.existsSync(statusDir)) {
            const remainingFiles = fs.readdirSync(statusDir);
            if (remainingFiles.length === 0) {
                fs.rmdirSync(statusDir);
                console.log(`🗑️  Removed empty directory: ${status}`);
            } else {
                console.log(`⚠️  Directory ${status} still contains files: ${remainingFiles.join(', ')}`);
            }
        }
    }
    
    console.log('🎉 PRD structure migration completed successfully!');
    console.log(`📊 Summary: ${migratedPrds.length} PRDs migrated`);
    
    return {
        success: true,
        migratedCount: migratedPrds.length,
        migrationLog: migrationLog
    };
}

// Run migration if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migratePrdStructure()
        .then(result => {
            console.log('Migration result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export { migratePrdStructure };
