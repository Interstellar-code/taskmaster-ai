import fs from 'fs';
import path from 'path';
import {
	readPrdsMetadata,
	writePrdsMetadata,
	validatePrdMetadata,
	generatePrdId,
	calculateFileHash,
	getFileSize
} from './prd-utils.js';
import { log } from '../utils.js';

/**
 * Add a new PRD to the metadata
 * @param {Object} prdData - PRD metadata object
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function addPrd(prdData, prdsPath = null) {
	try {
		// Validate the PRD data
		const validation = validatePrdMetadata(prdData);
		if (!validation.success) {
			return {
				success: false,
				error: 'PRD validation failed',
				details: validation.errors
			};
		}

		// Read existing PRDs metadata
		const prdsData = readPrdsMetadata(prdsPath);

		// Check if PRD with same ID already exists
		const existingPrd = prdsData.prds.find((p) => p.id === prdData.id);
		if (existingPrd) {
			return {
				success: false,
				error: `PRD with ID '${prdData.id}' already exists`
			};
		}

		// Add the new PRD
		prdsData.prds.push(validation.data);

		// Write back to file
		writePrdsMetadata(prdsData, prdsPath);

		log('info', `Successfully added PRD: ${prdData.id}`);
		return {
			success: true,
			data: validation.data
		};
	} catch (error) {
		log('error', `Error adding PRD:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Update an existing PRD in the metadata
 * @param {string} prdId - PRD ID to update
 * @param {Object} updateData - Data to update
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function updatePrd(prdId, updateData, prdsPath = null) {
	try {
		// Read existing PRDs metadata
		const prdsData = readPrdsMetadata(prdsPath);

		// Find the PRD to update
		const prdIndex = prdsData.prds.findIndex((p) => p.id === prdId);
		if (prdIndex === -1) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		// Merge the update data with existing data
		const updatedPrd = {
			...prdsData.prds[prdIndex],
			...updateData,
			lastModified: new Date().toISOString()
		};

		// Validate the updated PRD
		const validation = validatePrdMetadata(updatedPrd);
		if (!validation.success) {
			return {
				success: false,
				error: 'Updated PRD validation failed',
				details: validation.errors
			};
		}

		// Update the PRD in the array
		prdsData.prds[prdIndex] = validation.data;

		// Write back to file
		writePrdsMetadata(prdsData, prdsPath);

		log('info', `Successfully updated PRD: ${prdId}`);
		return {
			success: true,
			data: validation.data
		};
	} catch (error) {
		log('error', `Error updating PRD ${prdId}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Remove a PRD from the metadata
 * @param {string} prdId - PRD ID to remove
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function removePrd(prdId, prdsPath = null) {
	try {
		// Read existing PRDs metadata
		const prdsData = readPrdsMetadata(prdsPath);

		// Find the PRD to remove
		const prdIndex = prdsData.prds.findIndex((p) => p.id === prdId);
		if (prdIndex === -1) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		// Remove the PRD
		const removedPrd = prdsData.prds.splice(prdIndex, 1)[0];

		// Write back to file
		writePrdsMetadata(prdsData, prdsPath);

		log('info', `Successfully removed PRD: ${prdId}`);
		return {
			success: true,
			data: removedPrd
		};
	} catch (error) {
		log('error', `Error removing PRD ${prdId}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Update PRD status
 * @param {string} prdId - PRD ID to update
 * @param {string} newStatus - New status value
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function updatePrdStatus(prdId, newStatus, prdsPath = null) {
	const validStatuses = ['pending', 'in-progress', 'done', 'archived'];

	if (!validStatuses.includes(newStatus)) {
		return {
			success: false,
			error: `Invalid status '${newStatus}'. Valid statuses: ${validStatuses.join(', ')}`
		};
	}

	return updatePrd(prdId, { status: newStatus }, prdsPath);
}

/**
 * Add task ID to PRD's linked tasks
 * @param {string} prdId - PRD ID to update
 * @param {number|string} taskId - Task ID to add
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function addTaskToPrd(prdId, taskId, prdsPath = null) {
	try {
		// Read existing PRDs metadata
		const prdsData = readPrdsMetadata(prdsPath);

		// Find the PRD
		const prd = prdsData.prds.find((p) => p.id === prdId);
		if (!prd) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		// Check if task is already linked
		if (
			prd.linkedTaskIds.includes(taskId) ||
			prd.linkedTaskIds.includes(String(taskId)) ||
			prd.linkedTaskIds.includes(Number(taskId))
		) {
			return {
				success: false,
				error: `Task ${taskId} is already linked to PRD ${prdId}`
			};
		}

		// Add the task ID
		const updatedLinkedTasks = [...prd.linkedTaskIds, taskId];

		return updatePrd(prdId, { linkedTaskIds: updatedLinkedTasks }, prdsPath);
	} catch (error) {
		log('error', `Error adding task ${taskId} to PRD ${prdId}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Remove task ID from PRD's linked tasks
 * @param {string} prdId - PRD ID to update
 * @param {number|string} taskId - Task ID to remove
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function removeTaskFromPrd(prdId, taskId, prdsPath = null) {
	try {
		// Read existing PRDs metadata
		const prdsData = readPrdsMetadata(prdsPath);

		// Find the PRD
		const prd = prdsData.prds.find((p) => p.id === prdId);
		if (!prd) {
			return {
				success: false,
				error: `PRD with ID '${prdId}' not found`
			};
		}

		// Remove the task ID (handle different types)
		const updatedLinkedTasks = prd.linkedTaskIds.filter(
			(id) => id !== taskId && id !== String(taskId) && id !== Number(taskId)
		);

		return updatePrd(prdId, { linkedTaskIds: updatedLinkedTasks }, prdsPath);
	} catch (error) {
		log(
			'error',
			`Error removing task ${taskId} from PRD ${prdId}:`,
			error.message
		);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Create PRD metadata from file
 * @param {string} filePath - Path to the PRD file
 * @param {Object} additionalData - Additional metadata
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Result with success flag and data/error
 */
function createPrdFromFile(filePath, additionalData = {}, prdsPath = null) {
	try {
		if (!fs.existsSync(filePath)) {
			return {
				success: false,
				error: `PRD file not found: ${filePath}`
			};
		}

		const fileName = path.basename(filePath);
		const fileStats = fs.statSync(filePath);
		const now = new Date().toISOString();

		const prdData = {
			id: generatePrdId(prdsPath),
			title: additionalData.title || fileName.replace(/\.[^/.]+$/, ''),
			fileName: fileName,
			status: 'pending',
			createdDate: now,
			lastModified: now,
			filePath: filePath,
			fileHash: calculateFileHash(filePath),
			fileSize: getFileSize(filePath),
			description: additionalData.description || '',
			tags: additionalData.tags || [],
			linkedTaskIds: [],
			taskStats: {
				totalTasks: 0,
				completedTasks: 0,
				pendingTasks: 0,
				inProgressTasks: 0,
				blockedTasks: 0,
				deferredTasks: 0,
				cancelledTasks: 0,
				completionPercentage: 0
			},
			estimatedEffort: additionalData.estimatedEffort || '',
			priority: additionalData.priority || 'medium',
			complexity: additionalData.complexity || 'medium',
			...additionalData
		};

		return addPrd(prdData, prdsPath);
	} catch (error) {
		log('error', `Error creating PRD from file ${filePath}:`, error.message);
		return {
			success: false,
			error: error.message
		};
	}
}

export {
	addPrd,
	updatePrd,
	removePrd,
	updatePrdStatus,
	addTaskToPrd,
	removeTaskFromPrd,
	createPrdFromFile
};
