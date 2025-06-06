/**
 * PRD File Metadata Management
 * Handles updating PRD file headers with metadata similar to task files
 */

import fs from 'fs';
import path from 'path';
import { calculateFileHash } from './prd-utils.js';
import { log } from '../utils.js';

/**
 * Generate PRD file metadata header
 * @param {Object} prdData - PRD metadata object
 * @param {Object} options - Additional options
 * @returns {string} Formatted metadata header
 */
function generatePrdMetadataHeader(prdData, options = {}) {
	const {
		includeTaskStats = true,
		includeFileInfo = true,
		includeTimestamps = true
	} = options;

	const lines = [];

	// Basic PRD information
	lines.push(`# PRD ID: ${prdData.id}`);
	lines.push(`# Title: ${prdData.title}`);
	lines.push(`# Status: ${prdData.status}`);
	lines.push(`# Priority: ${prdData.priority || 'medium'}`);
	lines.push(`# Complexity: ${prdData.complexity || 'medium'}`);

	// Task statistics
	if (includeTaskStats && prdData.taskStats) {
		lines.push(`# Total Tasks: ${prdData.taskStats.totalTasks || 0}`);
		lines.push(`# Completed Tasks: ${prdData.taskStats.completedTasks || 0}`);
		lines.push(`# Completion: ${prdData.taskStats.completionPercentage || 0}%`);
	}

	// File information
	if (includeFileInfo) {
		lines.push(`# PRD Path: ${prdData.filePath || ''}`);
		if (prdData.fileHash) {
			lines.push(`# File Hash: ${prdData.fileHash}`);
		}
		if (prdData.fileSize) {
			lines.push(`# File Size: ${prdData.fileSize} bytes`);
		}
	}

	// Timestamps
	if (includeTimestamps) {
		if (prdData.createdDate) {
			lines.push(`# Created Date: ${prdData.createdDate}`);
		}
		if (prdData.lastModified) {
			lines.push(`# Last Modified: ${prdData.lastModified}`);
		}
		if (prdData.lastParsed) {
			lines.push(`# Last Parsed: ${prdData.lastParsed}`);
		}
	}

	// Tags and additional metadata
	if (prdData.tags && prdData.tags.length > 0) {
		lines.push(`# Tags: ${prdData.tags.join(', ')}`);
	}

	if (prdData.estimatedEffort) {
		lines.push(`# Estimated Effort: ${prdData.estimatedEffort}`);
	}

	if (prdData.description) {
		lines.push(`# Description: ${prdData.description}`);
	}

	// Add separator
	lines.push('');

	return lines.join('\n');
}

/**
 * Extract existing metadata from PRD file
 * @param {string} filePath - Path to PRD file
 * @returns {Object} Extracted metadata
 */
function extractPrdMetadata(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');
		const metadata = {};

		for (const line of lines) {
			if (!line.startsWith('#')) {
				break; // Stop at first non-comment line
			}

			const match = line.match(/^#\s*([^:]+):\s*(.+)$/);
			if (match) {
				const key = match[1].trim();
				const value = match[2].trim();

				// Map header keys to metadata properties
				switch (key) {
					case 'PRD ID':
						metadata.id = value;
						break;
					case 'Title':
						metadata.title = value;
						break;
					case 'Status':
						metadata.status = value;
						break;
					case 'Priority':
						metadata.priority = value;
						break;
					case 'Complexity':
						metadata.complexity = value;
						break;
					case 'Total Tasks':
						metadata.totalTasks = parseInt(value) || 0;
						break;
					case 'Completed Tasks':
						metadata.completedTasks = parseInt(value) || 0;
						break;
					case 'Completion':
						metadata.completionPercentage =
							parseInt(value.replace('%', '')) || 0;
						break;
					case 'PRD Path':
						metadata.filePath = value;
						break;
					case 'File Hash':
						metadata.fileHash = value;
						break;
					case 'File Size':
						metadata.fileSize = parseInt(value.replace(' bytes', '')) || 0;
						break;
					case 'Created Date':
						metadata.createdDate = value;
						break;
					case 'Last Modified':
						metadata.lastModified = value;
						break;
					case 'Last Parsed':
						metadata.lastParsed = value;
						break;
					case 'Tags':
						metadata.tags = value.split(',').map((tag) => tag.trim());
						break;
					case 'Estimated Effort':
						metadata.estimatedEffort = value;
						break;
					case 'Description':
						metadata.description = value;
						break;
				}
			}
		}

		return metadata;
	} catch (error) {
		log(
			'error',
			`Error extracting PRD metadata from ${filePath}:`,
			error.message
		);
		return {};
	}
}

/**
 * Update PRD file with new metadata header
 * @param {string} filePath - Path to PRD file
 * @param {Object} prdData - PRD metadata object
 * @param {Object} options - Update options
 * @returns {boolean} Success status
 */
function updatePrdFileMetadata(filePath, prdData, options = {}) {
	try {
		if (!fs.existsSync(filePath)) {
			log('error', `PRD file not found: ${filePath}`);
			return false;
		}

		// Read current file content
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');

		// Check if file already has TaskMaster-style metadata header
		const hasTaskMasterMetadata = lines.some(
			(line) =>
				line.startsWith('# PRD ID:') ||
				line.startsWith('# Status:') ||
				line.startsWith('# Total Tasks:')
		);

		if (hasTaskMasterMetadata) {
			// File already has our metadata format, update it
			let metadataEndIndex = 0;
			for (let i = 0; i < lines.length; i++) {
				if (!lines[i].startsWith('#') && lines[i].trim() !== '') {
					metadataEndIndex = i;
					break;
				}
			}

			// Get content after metadata
			const actualContent = lines.slice(metadataEndIndex).join('\n');

			// Generate new metadata header
			const newHeader = generatePrdMetadataHeader(prdData, options);

			// Combine new header with existing content
			const updatedContent = newHeader + actualContent;

			// Create backup if requested
			if (options.createBackup) {
				const backupPath = `${filePath}.backup.${Date.now()}`;
				fs.writeFileSync(backupPath, content);
				log('info', `Created backup: ${backupPath}`);
			}

			// Write updated content
			fs.writeFileSync(filePath, updatedContent);
		} else {
			// File doesn't have our metadata format, prepend it
			const newHeader = generatePrdMetadataHeader(prdData, options);
			const updatedContent = newHeader + content;

			// Create backup if requested
			if (options.createBackup) {
				const backupPath = `${filePath}.backup.${Date.now()}`;
				fs.writeFileSync(backupPath, content);
				log('info', `Created backup: ${backupPath}`);
			}

			// Write updated content
			fs.writeFileSync(filePath, updatedContent);
		}

		log('info', `Updated PRD file metadata: ${filePath}`);
		return true;
	} catch (error) {
		log(
			'error',
			`Error updating PRD file metadata for ${filePath}:`,
			error.message
		);
		return false;
	}
}

/**
 * Update PRD file metadata when parsed
 * @param {string} filePath - Path to PRD file
 * @param {Object} parseInfo - Information about the parsing operation
 * @returns {boolean} Success status
 */
function updatePrdFileOnParse(filePath, parseInfo = {}) {
	try {
		// Extract current metadata from file
		const currentMetadata = extractPrdMetadata(filePath);

		// Calculate file hash and size
		const fileHash = calculateFileHash(filePath);
		const fileStats = fs.statSync(filePath);

		// Update metadata with parse information
		const updatedMetadata = {
			...currentMetadata,
			lastParsed: new Date().toISOString(),
			lastModified: new Date().toISOString(),
			fileHash: fileHash,
			fileSize: fileStats.size,
			filePath: filePath,
			...parseInfo // Include any additional parse info
		};

		// Update the file
		return updatePrdFileMetadata(filePath, updatedMetadata, {
			createBackup: true,
			includeTaskStats: true,
			includeFileInfo: true,
			includeTimestamps: true
		});
	} catch (error) {
		log(
			'error',
			`Error updating PRD file on parse for ${filePath}:`,
			error.message
		);
		return false;
	}
}

/**
 * Sync PRD file metadata with prds.json data
 * @param {string} filePath - Path to PRD file
 * @param {Object} prdData - PRD data from prds.json
 * @returns {boolean} Success status
 */
function syncPrdFileMetadata(filePath, prdData) {
	try {
		// Calculate current file hash and size
		const fileHash = calculateFileHash(filePath);
		const fileStats = fs.statSync(filePath);

		// Merge with current file hash/size
		const updatedPrdData = {
			...prdData,
			fileHash: fileHash,
			fileSize: fileStats.size,
			filePath: filePath,
			lastModified: new Date().toISOString()
		};

		// Update the file
		return updatePrdFileMetadata(filePath, updatedPrdData, {
			includeTaskStats: true,
			includeFileInfo: true,
			includeTimestamps: true
		});
	} catch (error) {
		log(
			'error',
			`Error syncing PRD file metadata for ${filePath}:`,
			error.message
		);
		return false;
	}
}

export {
	generatePrdMetadataHeader,
	extractPrdMetadata,
	updatePrdFileMetadata,
	updatePrdFileOnParse,
	syncPrdFileMetadata
};
