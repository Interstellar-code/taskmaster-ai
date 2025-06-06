/**
 * PRD Version Control and History
 * Tracks changes to PRD files and maintains version history
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
	readPrdsMetadata,
	writePrdsMetadata,
	findPrdById,
	calculateFileHash
} from './prd-utils.js';
import { updatePrd } from './prd-write-operations.js';
import { atomicFileOperation } from './prd-thread-safety.js';
import { log } from '../utils.js';

/**
 * Create a version entry for PRD history
 * @param {Object} prd - PRD metadata object
 * @param {string} changeType - Type of change (created, modified, status_changed, etc.)
 * @param {Object} changeDetails - Details about the change
 * @param {string} author - Author of the change
 * @returns {Object} Version entry
 */
function createVersionEntry(
	prd,
	changeType,
	changeDetails = {},
	author = 'system'
) {
	return {
		version: generateVersionNumber(prd),
		timestamp: new Date().toISOString(),
		changeType: changeType,
		author: author,
		fileHash: prd.fileHash,
		fileSize: prd.fileSize,
		changeDetails: changeDetails,
		snapshot: {
			status: prd.status,
			priority: prd.priority,
			complexity: prd.complexity,
			tags: [...(prd.tags || [])],
			linkedTaskIds: [...prd.linkedTaskIds],
			taskStats: { ...prd.taskStats }
		}
	};
}

/**
 * Generate version number for PRD
 * @param {Object} prd - PRD metadata object
 * @returns {string} Version number (e.g., "1.0.0", "1.0.1", "1.1.0")
 */
function generateVersionNumber(prd) {
	if (!prd.versionHistory || prd.versionHistory.length === 0) {
		return '1.0.0';
	}

	const lastVersion = prd.versionHistory[prd.versionHistory.length - 1].version;
	const [major, minor, patch] = lastVersion.split('.').map(Number);

	// Increment patch version by default
	return `${major}.${minor}.${patch + 1}`;
}

/**
 * Generate major version number (for significant changes)
 * @param {Object} prd - PRD metadata object
 * @returns {string} Major version number
 */
function generateMajorVersion(prd) {
	if (!prd.versionHistory || prd.versionHistory.length === 0) {
		return '1.0.0';
	}

	const lastVersion = prd.versionHistory[prd.versionHistory.length - 1].version;
	const [major] = lastVersion.split('.').map(Number);

	return `${major + 1}.0.0`;
}

/**
 * Generate minor version number (for moderate changes)
 * @param {Object} prd - PRD metadata object
 * @returns {string} Minor version number
 */
function generateMinorVersion(prd) {
	if (!prd.versionHistory || prd.versionHistory.length === 0) {
		return '1.0.0';
	}

	const lastVersion = prd.versionHistory[prd.versionHistory.length - 1].version;
	const [major, minor] = lastVersion.split('.').map(Number);

	return `${major}.${minor + 1}.0`;
}

/**
 * Add version entry to PRD history
 * @param {string} prdId - PRD ID
 * @param {string} changeType - Type of change
 * @param {Object} changeDetails - Details about the change
 * @param {Object} options - Version options
 * @returns {Object} Result with success flag and data/error
 */
function addVersionEntry(prdId, changeType, changeDetails = {}, options = {}) {
	const {
		author = 'system',
		versionType = 'patch', // patch, minor, major
		prdsPath = 'prd/prds.json'
	} = options;

	try {
		const prdsData = readPrdsMetadata(prdsPath);
		const prdIndex = prdsData.prds.findIndex((p) => p.id === prdId);

		if (prdIndex === -1) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		const prd = prdsData.prds[prdIndex];

		// Initialize version history if it doesn't exist
		if (!prd.versionHistory) {
			prd.versionHistory = [];
		}

		// Generate version number based on type
		let version;
		switch (versionType) {
			case 'major':
				version = generateMajorVersion(prd);
				break;
			case 'minor':
				version = generateMinorVersion(prd);
				break;
			default:
				version = generateVersionNumber(prd);
		}

		// Create version entry
		const versionEntry = {
			...createVersionEntry(prd, changeType, changeDetails, author),
			version: version
		};

		// Add to history
		prd.versionHistory.push(versionEntry);
		prd.currentVersion = version;
		prd.lastModified = new Date().toISOString();

		// Update PRDs data
		prdsData.prds[prdIndex] = prd;
		writePrdsMetadata(prdsData, prdsPath);

		log('info', `Added version ${version} to PRD ${prdId} (${changeType})`);
		return {
			success: true,
			data: {
				prdId: prdId,
				version: version,
				changeType: changeType,
				versionEntry: versionEntry
			}
		};
	} catch (error) {
		log('error', `Error adding version entry to PRD ${prdId}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Track file changes and create version if needed
 * @param {string} prdId - PRD ID
 * @param {Object} options - Tracking options
 * @returns {Object} Result with success flag and data/error
 */
function trackFileChanges(prdId, options = {}) {
	const { author = 'system', prdsPath = 'prd/prds.json' } = options;

	try {
		const prd = findPrdById(prdId, prdsPath);
		if (!prd) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		// Check if file exists
		if (!fs.existsSync(prd.filePath)) {
			return {
				success: false,
				error: `PRD file not found: ${prd.filePath}`
			};
		}

		// Calculate current file hash
		const currentHash = calculateFileHash(prd.filePath);
		const currentSize = fs.statSync(prd.filePath).size;

		// Check if file has changed
		if (currentHash === prd.fileHash && currentSize === prd.fileSize) {
			return {
				success: true,
				data: {
					prdId: prdId,
					changed: false,
					message: 'No changes detected'
				}
			};
		}

		// File has changed, create new version
		const changeDetails = {
			previousHash: prd.fileHash,
			newHash: currentHash,
			previousSize: prd.fileSize,
			newSize: currentSize,
			sizeChange: currentSize - prd.fileSize
		};

		// Update PRD with new file information
		const updateResult = updatePrd(
			prdId,
			{
				fileHash: currentHash,
				fileSize: currentSize,
				lastModified: new Date().toISOString()
			},
			prdsPath
		);

		if (!updateResult.success) {
			return updateResult;
		}

		// Add version entry
		const versionResult = addVersionEntry(
			prdId,
			'file_modified',
			changeDetails,
			{
				author: author,
				versionType: 'patch',
				prdsPath: prdsPath
			}
		);

		if (versionResult.success) {
			return {
				success: true,
				data: {
					prdId: prdId,
					changed: true,
					version: versionResult.data.version,
					changeDetails: changeDetails
				}
			};
		} else {
			return versionResult;
		}
	} catch (error) {
		log(
			'error',
			`Error tracking file changes for PRD ${prdId}:`,
			error.message
		);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Get version history for a PRD
 * @param {string} prdId - PRD ID
 * @param {Object} options - Query options
 * @returns {Object} Version history
 */
function getVersionHistory(prdId, options = {}) {
	const {
		limit = null,
		changeType = null,
		author = null,
		prdsPath = 'prd/prds.json'
	} = options;

	try {
		const prd = findPrdById(prdId, prdsPath);
		if (!prd) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		let history = prd.versionHistory || [];

		// Apply filters
		if (changeType) {
			history = history.filter((entry) => entry.changeType === changeType);
		}
		if (author) {
			history = history.filter((entry) => entry.author === author);
		}

		// Apply limit
		if (limit && limit > 0) {
			history = history.slice(-limit);
		}

		return {
			success: true,
			data: {
				prdId: prdId,
				currentVersion: prd.currentVersion || '1.0.0',
				totalVersions: (prd.versionHistory || []).length,
				history: history
			}
		};
	} catch (error) {
		log(
			'error',
			`Error getting version history for PRD ${prdId}:`,
			error.message
		);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Compare two versions of a PRD
 * @param {string} prdId - PRD ID
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {Object} Comparison result
 */
function compareVersions(
	prdId,
	version1,
	version2,
	prdsPath = 'prd/prds.json'
) {
	try {
		const historyResult = getVersionHistory(prdId, { prdsPath });
		if (!historyResult.success) {
			return historyResult;
		}

		const history = historyResult.data.history;
		const v1Entry = history.find((entry) => entry.version === version1);
		const v2Entry = history.find((entry) => entry.version === version2);

		if (!v1Entry || !v2Entry) {
			return {
				success: false,
				error: 'One or both versions not found'
			};
		}

		const differences = {
			status: v1Entry.snapshot.status !== v2Entry.snapshot.status,
			priority: v1Entry.snapshot.priority !== v2Entry.snapshot.priority,
			complexity: v1Entry.snapshot.complexity !== v2Entry.snapshot.complexity,
			tags:
				JSON.stringify(v1Entry.snapshot.tags) !==
				JSON.stringify(v2Entry.snapshot.tags),
			linkedTasks:
				JSON.stringify(v1Entry.snapshot.linkedTaskIds) !==
				JSON.stringify(v2Entry.snapshot.linkedTaskIds),
			fileHash: v1Entry.fileHash !== v2Entry.fileHash,
			fileSize: v1Entry.fileSize !== v2Entry.fileSize
		};

		return {
			success: true,
			data: {
				prdId: prdId,
				version1: {
					version: version1,
					timestamp: v1Entry.timestamp,
					snapshot: v1Entry.snapshot,
					fileHash: v1Entry.fileHash,
					fileSize: v1Entry.fileSize
				},
				version2: {
					version: version2,
					timestamp: v2Entry.timestamp,
					snapshot: v2Entry.snapshot,
					fileHash: v2Entry.fileHash,
					fileSize: v2Entry.fileSize
				},
				differences: differences,
				hasChanges: Object.values(differences).some((changed) => changed)
			}
		};
	} catch (error) {
		log('error', `Error comparing versions for PRD ${prdId}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

export {
	createVersionEntry,
	generateVersionNumber,
	generateMajorVersion,
	generateMinorVersion,
	addVersionEntry,
	trackFileChanges,
	getVersionHistory,
	compareVersions
};
