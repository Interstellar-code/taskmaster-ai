/**
 * tools/get-prds.js
 * Tool to list PRDs with filtering options
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	withNormalizedProjectRoot
} from './utils.js';
import { getPrdsDirect } from '../core/task-master-core.js';

/**
 * Register the get_prds tool
 * @param {Object} server - FastMCP server instance
 */
export function registerGetPrdsTool(server) {
	server.addTool({
		name: 'get_prds',
		description:
			'List all PRDs with optional filtering by status, priority, or complexity. Returns PRDs with enhanced status fields for web interface compatibility.',
		parameters: z.object({
			status: z
				.enum(['pending', 'in-progress', 'done', 'archived'])
				.optional()
				.describe('Filter PRDs by status'),
			priority: z
				.enum(['low', 'medium', 'high'])
				.optional()
				.describe('Filter PRDs by priority level'),
			complexity: z
				.enum(['low', 'medium', 'high'])
				.optional()
				.describe('Filter PRDs by complexity level'),
			projectRoot: z
				.string()
				.describe('The directory of the project. Must be an absolute path.')
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			const toolName = 'get_prds';
			try {
				log.info(
					`Executing ${toolName} tool with args: ${JSON.stringify(args)}`
				);

				// Call Direct Function
				const result = await getPrdsDirect(
					{
						status: args.status,
						priority: args.priority,
						complexity: args.complexity,
						projectRoot: args.projectRoot
					},
					log,
					{ session }
				);

				log.info(
					`${toolName}: Direct function result: success=${result.success}`
				);
				return handleApiResult(result, log, 'Error retrieving PRDs');
			} catch (error) {
				log.error(
					`Critical error in ${toolName} tool execute: ${error.message}`
				);
				return createErrorResponse(
					`Internal tool error (${toolName}): ${error.message}`
				);
			}
		})
	});
} 