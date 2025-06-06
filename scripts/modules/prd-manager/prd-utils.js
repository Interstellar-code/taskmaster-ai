import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { readJSON, writeJSON, log } from '../utils.js';

/**
 * Get the correct prds.json path based on the new directory structure
 * @param {string} projectRoot - Project root directory (optional, defaults to current working directory)
 * @returns {string} - Path to prds.json file
 */
function getPRDsJsonPath(projectRoot = process.cwd()) {
	// Try new structure first
	const newPath = path.join(projectRoot, '.taskmaster', 'prd', 'prds.json');
	if (fs.existsSync(newPath)) {
		return newPath;
	}

	// Fall back to old structure
	const oldPath = path.join(projectRoot, 'prd', 'prds.json');
	return oldPath;
}

/**
 * Get the correct PRD directory path based on status and directory structure
 * @param {string} status - PRD status (pending, in-progress, done, archived)
 * @param {string} projectRoot - Project root directory (optional, defaults to current working directory)
 * @returns {string} - Path to PRD directory (simplified structure)
 */
function getPRDStatusDirectory(status, projectRoot = process.cwd()) {
	const basePath = path.join(projectRoot, '.taskmaster', 'prd');

	// For the new simplified structure, all active PRDs are in the main /prd directory
	// Only archived PRDs go to the archived subdirectory (existing folder)
	if (status === 'archived') {
		return path.join(basePath, 'archived');
	}

	// All other statuses (pending, in-progress, done) use the main prd directory
	return basePath;
}

/**
 * Get the correct tasks.json path based on the new directory structure
 * @param {string} projectRoot - Project root directory (optional, defaults to current working directory)
 * @returns {string} - Path to tasks.json file
 */
function getTasksJsonPath(projectRoot = process.cwd()) {
	// Try new structure first
	const newPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
	if (fs.existsSync(newPath)) {
		return newPath;
	}

	// Fall back to old structure
	const oldPath = path.join(projectRoot, 'tasks', 'tasks.json');
	return oldPath;
}

// Define Zod schema for task statistics
const taskStatsSchema = z.object({
	totalTasks: z.number().int().min(0).default(0),
	completedTasks: z.number().int().min(0).default(0),
	pendingTasks: z.number().int().min(0).default(0),
	inProgressTasks: z.number().int().min(0).default(0),
	blockedTasks: z.number().int().min(0).default(0),
	deferredTasks: z.number().int().min(0).default(0),
	cancelledTasks: z.number().int().min(0).default(0),
	completionPercentage: z.number().min(0).max(100).default(0)
});

// Define Zod schema for a single PRD metadata entry
const prdMetadataSchema = z.object({
	id: z.string().min(1).describe('Unique PRD identifier'),
	title: z.string().min(1).describe('Human-readable PRD title'),
	fileName: z.string().min(1).describe('Original PRD filename'),
	status: z
		.enum(['pending', 'in-progress', 'done', 'archived'])
		.default('pending'),
	complexity: z.enum(['low', 'medium', 'high']).optional(),
	createdDate: z.string().describe('ISO 8601 creation timestamp'),
	lastModified: z.string().describe('ISO 8601 last modification timestamp'),
	filePath: z.string().describe('Current file path relative to project root'),
	fileHash: z.string().describe('SHA256 hash for change detection'),
	fileSize: z.number().int().positive().describe('File size in bytes'),
	description: z.string().optional().default(''),
	tags: z.array(z.string()).optional().default([]),
	// Support both old and new structure
	linkedTaskIds: z
		.array(z.union([z.number().int(), z.string()]))
		.optional()
		.default([]),
	taskStats: taskStatsSchema.optional().default({}),
	// New structure fields
	linkedTasks: z.array(z.union([z.number().int(), z.string()])).optional(),
	totalTasks: z.number().int().min(0).optional(),
	completedTasks: z.number().int().min(0).optional(),
	completion: z.number().min(0).max(100).optional(),
	estimatedEffort: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high']).default('medium')
});

// Define Zod schema for the complete PRDs metadata structure
const prdsMetadataSchema = z.object({
	prds: z.array(prdMetadataSchema).default([]),
	metadata: z.object({
		version: z.string().default('1.0.0'),
		lastUpdated: z.string().describe('ISO 8601 timestamp'),
		totalPrds: z.number().int().min(0).default(0),
		schema: z
			.object({
				version: z.string().default('1.0.0'),
				description: z
					.string()
					.default('TaskMaster AI PRD Lifecycle Tracking Schema'),
				fields: z.record(z.string()).optional()
			})
			.optional(),
		statusDirectories: z
			.object({
				pending: z.string().default('prd'),
				'in-progress': z.string().default('prd'),
				done: z.string().default('prd'),
				archived: z.string().default('prd/archived'),
				templates: z.string().default('prd/templates')
			})
			.optional(),
		automationRules: z
			.object({
				statusTransitions: z.record(z.string()).optional()
			})
			.optional()
	})
});

/**
 * Calculate SHA256 hash of file content
 * @param {string} filePath - Path to the file
 * @returns {string} SHA256 hash
 */
function calculateFileHash(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		return crypto.createHash('sha256').update(content).digest('hex');
	} catch (error) {
		log('error', `Error calculating file hash for ${filePath}:`, error.message);
		return '';
	}
}

/**
 * Get file size in bytes
 * @param {string} filePath - Path to the file
 * @returns {number} File size in bytes
 */
function getFileSize(filePath) {
	try {
		const stats = fs.statSync(filePath);
		return stats.size;
	} catch (error) {
		log('error', `Error getting file size for ${filePath}:`, error.message);
		return 0;
	}
}

/**
 * Generate unique sequential PRD ID
 * @param {string} prdsPath - Path to prds.json (optional, will auto-resolve if not provided)
 * @returns {string} Unique sequential PRD ID (e.g., prd_001, prd_002)
 */
function generatePrdId(prdsPath = null) {
	try {
		const resolvedPath = prdsPath || getPRDsJsonPath();
		const prdsData = readPrdsMetadata(resolvedPath);

		// Find the highest existing PRD number
		let maxNumber = 0;
		for (const prd of prdsData.prds) {
			const match = prd.id.match(/^prd_(\d+)$/);
			if (match) {
				const number = parseInt(match[1], 10);
				if (number > maxNumber) {
					maxNumber = number;
				}
			}
		}

		// Generate next sequential ID
		const nextNumber = maxNumber + 1;
		return `prd_${String(nextNumber).padStart(3, '0')}`;
	} catch (error) {
		// Fallback if prds.json doesn't exist - start with prd_001
		return 'prd_001';
	}
}

/**
 * Validate PRD ID format
 * @param {string} prdId - PRD ID to validate
 * @returns {boolean} True if valid sequential format
 */
function isValidPrdId(prdId) {
	return /^prd_\d{3}$/.test(prdId);
}

/**
 * Read PRDs metadata from prds.json
 * @param {string} prdsPath - Path to prds.json file (optional, will auto-resolve if not provided)
 * @returns {Object} PRDs metadata object
 */
function readPrdsMetadata(prdsPath = null) {
	try {
		const resolvedPath = prdsPath || getPRDsJsonPath();
		const data = readJSON(resolvedPath);
		if (!data) {
			// Return default structure if file doesn't exist
			return {
				prds: [],
				metadata: {
					version: '1.0.0',
					lastUpdated: new Date().toISOString(),
					totalPrds: 0
				}
			};
		}

		// Validate with Zod schema
		const validationResult = prdsMetadataSchema.safeParse(data);
		if (!validationResult.success) {
			log(
				'error',
				'PRDs metadata validation failed:',
				validationResult.error.message
			);
			throw new Error(
				`Invalid PRDs metadata structure: ${validationResult.error.message}`
			);
		}

		return validationResult.data;
	} catch (error) {
		log(
			'error',
			`Error reading PRDs metadata from ${prdsPath}:`,
			error.message
		);
		throw error;
	}
}

/**
 * Write PRDs metadata to prds.json
 * @param {Object} prdsData - PRDs metadata object
 * @param {string} prdsPath - Path to prds.json file
 */
function writePrdsMetadata(prdsData, prdsPath = null) {
	try {
		const resolvedPath = prdsPath || getPRDsJsonPath();

		// Validate with Zod schema before writing
		const validationResult = prdsMetadataSchema.safeParse(prdsData);
		if (!validationResult.success) {
			log(
				'error',
				'PRDs metadata validation failed before write:',
				validationResult.error.message
			);
			throw new Error(
				`Invalid PRDs metadata structure: ${validationResult.error.message}`
			);
		}

		// Update metadata
		const dataToWrite = {
			...validationResult.data,
			metadata: {
				...validationResult.data.metadata,
				lastUpdated: new Date().toISOString(),
				totalPrds: validationResult.data.prds.length
			}
		};

		// Ensure directory exists
		const dir = path.dirname(resolvedPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		writeJSON(resolvedPath, dataToWrite);
		log('info', `Successfully wrote PRDs metadata to ${resolvedPath}`);
	} catch (error) {
		log(
			'error',
			`Error writing PRDs metadata to ${prdsPath || 'auto-resolved path'}:`,
			error.message
		);
		throw error;
	}
}

/**
 * Validate PRD metadata object against schema
 * @param {Object} prdData - PRD metadata object to validate
 * @returns {Object} Validation result with success flag and data/errors
 */
function validatePrdMetadata(prdData) {
	try {
		const validationResult = prdMetadataSchema.safeParse(prdData);
		return {
			success: validationResult.success,
			data: validationResult.success ? validationResult.data : null,
			errors: validationResult.success ? null : validationResult.error.errors
		};
	} catch (error) {
		return {
			success: false,
			data: null,
			errors: [{ message: error.message }]
		};
	}
}

/**
 * Validate complete PRDs metadata structure
 * @param {Object} prdsData - Complete PRDs metadata object
 * @returns {Object} Validation result with success flag and data/errors
 */
function validatePrdsMetadata(prdsData) {
	try {
		const validationResult = prdsMetadataSchema.safeParse(prdsData);
		return {
			success: validationResult.success,
			data: validationResult.success ? validationResult.data : null,
			errors: validationResult.success ? null : validationResult.error.errors
		};
	} catch (error) {
		return {
			success: false,
			data: null,
			errors: [{ message: error.message }]
		};
	}
}

/**
 * Initialize PRDs metadata file with default structure
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Default PRDs metadata structure
 */
function initializePrdsMetadata(prdsPath = null) {
	const defaultStructure = {
		prds: [],
		metadata: {
			version: '1.0.0',
			lastUpdated: new Date().toISOString(),
			totalPrds: 0,
			schema: {
				version: '1.0.0',
				description: 'TaskMaster AI PRD Lifecycle Tracking Schema',
				fields: {
					id: 'Unique PRD identifier',
					title: 'Human-readable PRD title',
					fileName: 'Original PRD filename',
					status: 'Current PRD status (pending|in-progress|done|archived)',
					complexity: 'PRD complexity level (low|medium|high)',
					createdDate: 'ISO 8601 creation timestamp',
					lastModified: 'ISO 8601 last modification timestamp',
					filePath: 'Current file path relative to project root',
					fileHash: 'SHA256 hash for change detection',
					fileSize: 'File size in bytes',
					description: 'Brief PRD description',
					tags: 'Array of categorization tags',
					linkedTaskIds: 'Array of task IDs generated from this PRD',
					taskStats: 'Task completion statistics',
					estimatedEffort: 'Estimated effort for completion',
					priority: 'PRD priority level (low|medium|high)'
				}
			},
			statusDirectories: {
				pending: 'prd',
				'in-progress': 'prd',
				done: 'prd',
				archived: 'prd/archived',
				templates: 'prd/templates'
			},
			automationRules: {
				statusTransitions: {
					pending_to_inprogress:
						"When first linked task changes to 'in-progress'",
					inprogress_to_done:
						"When ALL linked tasks reach 'done' status (100% completion)",
					manual_override:
						'Allow manual status changes with validation and audit trail',
					rollback_protection:
						'Prevent status regression without explicit user confirmation'
				}
			}
		}
	};

	try {
		writePrdsMetadata(defaultStructure, prdsPath);
		log('info', `Initialized PRDs metadata file at ${prdsPath}`);
		return defaultStructure;
	} catch (error) {
		log('error', `Error initializing PRDs metadata file:`, error.message);
		throw error;
	}
}

/**
 * Find PRD by ID
 * @param {string} prdId - PRD ID to search for
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object|null} PRD metadata object or null if not found
 */
function findPrdById(prdId, prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		const prd = prdsData.prds.find((p) => p.id === prdId);
		return prd || null;
	} catch (error) {
		log('error', `Error finding PRD by ID ${prdId}:`, error.message);
		return null;
	}
}

/**
 * Find PRDs by status
 * @param {string} status - Status to filter by
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Array} Array of PRD metadata objects
 */
function findPrdsByStatus(status, prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		return prdsData.prds.filter((p) => p.status === status);
	} catch (error) {
		log('error', `Error finding PRDs by status ${status}:`, error.message);
		return [];
	}
}

/**
 * Find PRDs by filename
 * @param {string} fileName - Filename to search for
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Array} Array of PRD metadata objects
 */
function findPrdsByFileName(fileName, prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		return prdsData.prds.filter((p) => p.fileName === fileName);
	} catch (error) {
		log('error', `Error finding PRDs by filename ${fileName}:`, error.message);
		return [];
	}
}

/**
 * Find PRDs by linked task ID
 * @param {number|string} taskId - Task ID to search for
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Array} Array of PRD metadata objects
 */
function findPrdsByTaskId(taskId, prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		return prdsData.prds.filter((p) => {
			const linkedTasks = p.linkedTasks || p.linkedTaskIds || [];
			return (
				linkedTasks.includes(taskId) ||
				linkedTasks.includes(String(taskId)) ||
				linkedTasks.includes(Number(taskId))
			);
		});
	} catch (error) {
		log('error', `Error finding PRDs by task ID ${taskId}:`, error.message);
		return [];
	}
}

/**
 * Get all PRDs with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Array} Array of PRD metadata objects
 */
function getAllPrds(filters = {}, prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		let prds = prdsData.prds;

		// Apply filters
		if (filters.status) {
			prds = prds.filter((p) => p.status === filters.status);
		}
		if (filters.priority) {
			prds = prds.filter((p) => p.priority === filters.priority);
		}
		if (filters.complexity) {
			prds = prds.filter((p) => p.complexity === filters.complexity);
		}
		if (filters.tags && filters.tags.length > 0) {
			prds = prds.filter((p) =>
				filters.tags.some((tag) => p.tags.includes(tag))
			);
		}

		return prds;
	} catch (error) {
		log('error', `Error getting all PRDs:`, error.message);
		return [];
	}
}

/**
 * Get PRD statistics
 * @param {string} prdsPath - Path to prds.json file
 * @returns {Object} Statistics object
 */
function getPrdStatistics(prdsPath = null) {
	try {
		const prdsData = readPrdsMetadata(prdsPath);
		const prds = prdsData.prds;

		const stats = {
			total: prds.length,
			byStatus: {
				pending: prds.filter((p) => p.status === 'pending').length,
				'in-progress': prds.filter((p) => p.status === 'in-progress').length,
				done: prds.filter((p) => p.status === 'done').length,
				archived: prds.filter((p) => p.status === 'archived').length
			},
			byPriority: {
				low: prds.filter((p) => p.priority === 'low').length,
				medium: prds.filter((p) => p.priority === 'medium').length,
				high: prds.filter((p) => p.priority === 'high').length
			},
			byComplexity: {
				low: prds.filter((p) => p.complexity === 'low').length,
				medium: prds.filter((p) => p.complexity === 'medium').length,
				high: prds.filter((p) => p.complexity === 'high').length
			},
			totalLinkedTasks: prds.reduce(
				(sum, p) =>
					sum +
					(p.linkedTasks
						? p.linkedTasks.length
						: p.linkedTaskIds
							? p.linkedTaskIds.length
							: 0),
				0
			),
			averageTasksPerPrd:
				prds.length > 0
					? prds.reduce(
							(sum, p) =>
								sum +
								(p.linkedTasks
									? p.linkedTasks.length
									: p.linkedTaskIds
										? p.linkedTaskIds.length
										: 0),
							0
						) / prds.length
					: 0
		};

		return stats;
	} catch (error) {
		log('error', `Error getting PRD statistics:`, error.message);
		return {
			total: 0,
			byStatus: { pending: 0, 'in-progress': 0, done: 0, archived: 0 },
			byPriority: { low: 0, medium: 0, high: 0 },
			byComplexity: { low: 0, medium: 0, high: 0 },
			totalLinkedTasks: 0,
			averageTasksPerPrd: 0
		};
	}
}

export {
	prdMetadataSchema,
	prdsMetadataSchema,
	taskStatsSchema,
	calculateFileHash,
	getFileSize,
	getPRDsJsonPath,
	getPRDStatusDirectory,
	getTasksJsonPath,
	generatePrdId,
	isValidPrdId,
	readPrdsMetadata,
	writePrdsMetadata,
	validatePrdMetadata,
	validatePrdsMetadata,
	initializePrdsMetadata,
	findPrdById,
	findPrdsByStatus,
	findPrdsByFileName,
	findPrdsByTaskId,
	getAllPrds,
	getPrdStatistics
};
