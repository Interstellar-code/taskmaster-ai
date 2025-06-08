/**
 * direct-functions/get-prds-direct.js
 * Direct function for listing PRDs with filtering
 */

import path from 'path';
import {
	getAllPrds,
	getPRDsJsonPath
} from '../../../../scripts/modules/prd-manager/prd-utils.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Get PRDs with filtering options
 * @param {Object} args - Arguments object
 * @param {string} [args.status] - Filter by status
 * @param {string} [args.priority] - Filter by priority
 * @param {string} [args.complexity] - Filter by complexity
 * @param {string} args.projectRoot - Project root directory
 * @param {Object} log - Logger object
 * @param {Object} context - Context object
 * @returns {Object} Result with success flag and data/error
 */
export async function getPrdsDirect(args, log, context = {}) {
	const { session } = context;
	const mcpLog = createLogWrapper(log);

	try {
		const { status, priority, complexity, projectRoot } = args;

		// Get PRDs path
		const prdsPath = getPRDsJsonPath(projectRoot);

		// Build filters object
		const filters = {};
		if (status) filters.status = status;
		if (priority) filters.priority = priority;
		if (complexity) filters.complexity = complexity;

		// Get PRDs with filters
		const prds = getAllPrds(filters, prdsPath);

		// Transform PRDs to match web interface expectations
		const transformedPrds = prds.map(prd => ({
			...prd,
			// Map existing fields to expected web interface fields
			analysisStatus: prd.analysisStatus || (prd.status === 'pending' ? 'not-analyzed' : 'analyzed'),
			tasksStatus: prd.tasksStatus || (
				(prd.linkedTaskIds && prd.linkedTaskIds.length > 0) || 
				(prd.linkedTasks && prd.linkedTasks.length > 0) || 
				(prd.taskStats && prd.taskStats.totalTasks > 0)
					? 'generated' 
					: 'no-tasks'
			),
			uploadDate: prd.createdDate,
			// Ensure all required fields exist
			id: prd.id,
			title: prd.title,
			status: prd.status,
			priority: prd.priority || 'medium',
			complexity: prd.complexity || 'medium',
			description: prd.description || '',
			tags: prd.tags || [],
			linkedTaskIds: prd.linkedTaskIds || prd.linkedTasks || [],
			taskStats: prd.taskStats || {
				totalTasks: 0,
				completedTasks: 0,
				pendingTasks: 0,
				inProgressTasks: 0,
				blockedTasks: 0,
				deferredTasks: 0,
				cancelledTasks: 0,
				completionPercentage: 0
			}
		}));

		mcpLog.info(`Retrieved ${transformedPrds.length} PRDs with filters: ${JSON.stringify(filters)}`);

		return {
			success: true,
			data: {
				prds: transformedPrds,
				metadata: {
					total: transformedPrds.length,
					filters: filters,
					timestamp: new Date().toISOString()
				}
			}
		};

	} catch (error) {
		mcpLog.error(`Error retrieving PRDs: ${error.message}`);
		return {
			success: false,
			error: {
				code: 'PRD_RETRIEVAL_ERROR',
				message: error.message
			}
		};
	}
} 