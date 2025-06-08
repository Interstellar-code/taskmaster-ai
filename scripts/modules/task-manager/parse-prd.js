import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import boxen from 'boxen';
import { z } from 'zod';

import {
	log,
	writeJSON,
	enableSilentMode,
	disableSilentMode,
	isSilentMode,
	readJSON,
	findTaskById
} from '../utils.js';

import { generateObjectService } from '../ai-services-unified.js';
import { getDebugFlag } from '../config-manager.js';
import generateTaskFiles from './generate-task-files.js';
import { displayAiUsageSummary } from '../ui.js';
import expandTask from './expand-task.js';
import analyzeTaskComplexity from './analyze-task-complexity.js';
import { updatePrdFileOnParse } from '../prd-manager/prd-file-metadata.js';
import {
	findPrdById,
	readPrdsMetadata,
	generatePrdId,
	getPRDsJsonPath
} from '../prd-manager/prd-utils.js';
import { createPrdFromFile } from '../prd-manager/prd-write-operations.js';

// Define the Zod schema for PRD source metadata
const prdSourceSchema = z
	.object({
		filePath: z.string().describe('Full path to the PRD file'),
		fileName: z.string().describe('Name of the PRD file'),
		parsedDate: z.string().describe('ISO timestamp when the PRD was parsed'),
		fileHash: z.string().describe('SHA256 hash of the PRD file content'),
		fileSize: z
			.number()
			.int()
			.positive()
			.describe('Size of the PRD file in bytes')
	})
	.nullable()
	.optional();

// Define the Zod schema for a SINGLE task object
const prdSingleTaskSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1),
	description: z.string().min(1),
	details: z.string().optional().default(''),
	testStrategy: z.string().optional().default(''),
	priority: z.enum(['high', 'medium', 'low']).default('medium'),
	dependencies: z.array(z.number().int().positive()).optional().default([]),
	status: z.string().optional().default('pending'),
	prdSource: prdSourceSchema
});

// Define the Zod schema for the ENTIRE expected AI response object
const prdResponseSchema = z.object({
	tasks: z.array(prdSingleTaskSchema),
	metadata: z.object({
		projectName: z.string(),
		totalTasks: z.number(),
		sourceFile: z.string(),
		generatedAt: z.string()
	})
});

/**
 * Normalize file path for cross-platform compatibility
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized absolute path
 */
function normalizePrdPath(filePath) {
	try {
		// Convert to absolute path and normalize separators
		const absolutePath = path.resolve(filePath);
		// Convert backslashes to forward slashes for consistency across platforms
		return absolutePath.replace(/\\/g, '/');
	} catch (error) {
		log('warn', `Failed to normalize path ${filePath}: ${error.message}`);
		return filePath;
	}
}

/**
 * Extract metadata from a PRD file
 * @param {string} filePath - Path to the PRD file
 * @param {string} fileContent - Content of the PRD file
 * @returns {Object} PRD source metadata object
 */
function extractPrdMetadata(filePath, fileContent) {
	try {
		// Normalize the file path for cross-platform compatibility
		const normalizedPath = normalizePrdPath(filePath);

		// Get file stats
		const stats = fs.statSync(filePath);

		// Calculate file hash
		const hash = crypto.createHash('sha256');
		hash.update(fileContent, 'utf8');
		const fileHash = hash.digest('hex');

		// Extract file name from path
		const fileName = path.basename(filePath);

		// Get current timestamp
		const parsedDate = new Date().toISOString();

		return {
			filePath: normalizedPath, // Use normalized path
			fileName: fileName,
			parsedDate: parsedDate,
			fileHash: fileHash,
			fileSize: stats.size
		};
	} catch (error) {
		log('warn', `Failed to extract PRD metadata: ${error.message}`);
		// Return minimal metadata if extraction fails
		const fallbackPath = normalizePrdPath(filePath);
		return {
			filePath: fallbackPath,
			fileName: path.basename(filePath),
			parsedDate: new Date().toISOString(),
			fileHash: 'unknown',
			fileSize: fileContent.length
		};
	}
}

/**
 * Configuration for intelligent expansion criteria
 */
const EXPANSION_CONFIG = {
	// Scoring thresholds
	COMPLEXITY_THRESHOLD: 60, // Minimum score to be considered complex (0-100)

	// Weight factors for different criteria (total should be 100)
	WEIGHTS: {
		LENGTH: 25, // Weight for text length analysis
		KEYWORDS: 30, // Weight for complexity keywords
		STRUCTURE: 20, // Weight for structural complexity
		TECHNICAL: 15, // Weight for technical indicators
		SCOPE: 10 // Weight for scope indicators
	},

	// Length thresholds
	LENGTH_THRESHOLDS: {
		SHORT: 100, // < 100 chars = simple
		MEDIUM: 250, // 100-250 chars = moderate
		LONG: 500, // 250-500 chars = complex
		VERY_LONG: 1000 // > 500 chars = very complex
	},

	// Keyword categories with different weights
	KEYWORD_CATEGORIES: {
		HIGH_COMPLEXITY: {
			weight: 3,
			keywords: [
				'architecture',
				'framework',
				'infrastructure',
				'microservice',
				'distributed',
				'scalable',
				'enterprise',
				'integration',
				'authentication',
				'authorization',
				'security',
				'encryption'
			]
		},
		MEDIUM_COMPLEXITY: {
			weight: 2,
			keywords: [
				'implement',
				'develop',
				'design',
				'create',
				'build',
				'configure',
				'setup',
				'establish',
				'database',
				'api',
				'interface',
				'component',
				'module',
				'service',
				'system'
			]
		},
		LOW_COMPLEXITY: {
			weight: 1,
			keywords: [
				'update',
				'modify',
				'fix',
				'adjust',
				'change',
				'add',
				'remove',
				'delete',
				'install',
				'deploy',
				'test'
			]
		}
	},

	// Technical complexity indicators
	TECHNICAL_INDICATORS: [
		'algorithm',
		'optimization',
		'performance',
		'caching',
		'queue',
		'async',
		'concurrent',
		'parallel',
		'real-time',
		'streaming',
		'machine learning',
		'ai',
		'ml',
		'neural',
		'model'
	],

	// Scope indicators (multiple requirements/features)
	SCOPE_INDICATORS: [
		' and ',
		' or ',
		'including',
		'such as',
		'multiple',
		'various',
		'different',
		'several',
		'both',
		'either',
		'as well as'
	]
};

/**
 * Calculate complexity score for a task using intelligent criteria
 * @param {Object} task - Task object to analyze
 * @returns {Object} Analysis result with score and breakdown
 */
function calculateComplexityScore(task) {
	const description = task.description || '';
	const title = task.title || '';
	const details = task.details || '';
	const combinedText = `${title} ${description} ${details}`.toLowerCase();

	const analysis = {
		score: 0,
		breakdown: {
			length: 0,
			keywords: 0,
			structure: 0,
			technical: 0,
			scope: 0
		},
		reasons: []
	};

	// 1. Length Analysis (25% weight)
	const totalLength = combinedText.length;
	let lengthScore = 0;
	if (totalLength > EXPANSION_CONFIG.LENGTH_THRESHOLDS.VERY_LONG) {
		lengthScore = 100;
		analysis.reasons.push(`Very long description (${totalLength} chars)`);
	} else if (totalLength > EXPANSION_CONFIG.LENGTH_THRESHOLDS.LONG) {
		lengthScore = 80;
		analysis.reasons.push(`Long description (${totalLength} chars)`);
	} else if (totalLength > EXPANSION_CONFIG.LENGTH_THRESHOLDS.MEDIUM) {
		lengthScore = 60;
		analysis.reasons.push(`Medium description (${totalLength} chars)`);
	} else if (totalLength > EXPANSION_CONFIG.LENGTH_THRESHOLDS.SHORT) {
		lengthScore = 40;
	} else {
		lengthScore = 20;
	}
	analysis.breakdown.length = lengthScore;

	// 2. Keyword Analysis (30% weight)
	let keywordScore = 0;
	let foundKeywords = [];

	Object.entries(EXPANSION_CONFIG.KEYWORD_CATEGORIES).forEach(
		([category, config]) => {
			const matchedKeywords = config.keywords.filter((keyword) =>
				combinedText.includes(keyword)
			);
			if (matchedKeywords.length > 0) {
				keywordScore += matchedKeywords.length * config.weight * 10;
				foundKeywords.push(...matchedKeywords);
			}
		}
	);

	keywordScore = Math.min(keywordScore, 100); // Cap at 100
	analysis.breakdown.keywords = keywordScore;
	if (foundKeywords.length > 0) {
		analysis.reasons.push(
			`Contains complexity keywords: ${foundKeywords.slice(0, 3).join(', ')}${foundKeywords.length > 3 ? '...' : ''}`
		);
	}

	// 3. Structural Complexity (20% weight)
	let structureScore = 0;
	const sentences = description
		.split(/[.!?]+/)
		.filter((s) => s.trim().length > 0);
	const bulletPoints = (combinedText.match(/[•\-\*]\s/g) || []).length;
	const numberedLists = (combinedText.match(/\d+\.\s/g) || []).length;

	if (sentences.length > 5) {
		structureScore += 40;
		analysis.reasons.push(`Multiple sentences (${sentences.length})`);
	}
	if (bulletPoints > 0) {
		structureScore += 30;
		analysis.reasons.push(`Contains bullet points (${bulletPoints})`);
	}
	if (numberedLists > 0) {
		structureScore += 30;
		analysis.reasons.push(`Contains numbered lists (${numberedLists})`);
	}

	structureScore = Math.min(structureScore, 100);
	analysis.breakdown.structure = structureScore;

	// 4. Technical Complexity (15% weight)
	let technicalScore = 0;
	const technicalMatches = EXPANSION_CONFIG.TECHNICAL_INDICATORS.filter(
		(indicator) => combinedText.includes(indicator)
	);

	if (technicalMatches.length > 0) {
		technicalScore = Math.min(technicalMatches.length * 25, 100);
		analysis.reasons.push(
			`Technical complexity: ${technicalMatches.slice(0, 2).join(', ')}`
		);
	}
	analysis.breakdown.technical = technicalScore;

	// 5. Scope Analysis (10% weight)
	let scopeScore = 0;
	const scopeMatches = EXPANSION_CONFIG.SCOPE_INDICATORS.filter((indicator) =>
		combinedText.includes(indicator)
	);

	if (scopeMatches.length > 0) {
		scopeScore = Math.min(scopeMatches.length * 20, 100);
		analysis.reasons.push(`Multiple requirements indicated`);
	}
	analysis.breakdown.scope = scopeScore;

	// Calculate weighted final score
	analysis.score = Math.round(
		(analysis.breakdown.length * EXPANSION_CONFIG.WEIGHTS.LENGTH +
			analysis.breakdown.keywords * EXPANSION_CONFIG.WEIGHTS.KEYWORDS +
			analysis.breakdown.structure * EXPANSION_CONFIG.WEIGHTS.STRUCTURE +
			analysis.breakdown.technical * EXPANSION_CONFIG.WEIGHTS.TECHNICAL +
			analysis.breakdown.scope * EXPANSION_CONFIG.WEIGHTS.SCOPE) /
			100
	);

	return analysis;
}

/**
 * Identify complex tasks using both complexity analysis results and fallback criteria
 * @param {Array} tasks - Array of task objects
 * @param {string} complexityReportPath - Path to complexity analysis report
 * @returns {Promise<Array>} Array of complex tasks suitable for expansion with analysis
 */
async function identifyComplexTasksWithAnalysis(tasks, complexityReportPath) {
	if (!Array.isArray(tasks)) return [];

	const complexTasks = [];
	let complexityReport = null;

	// Try to read complexity analysis results
	try {
		if (fs.existsSync(complexityReportPath)) {
			complexityReport = JSON.parse(
				fs.readFileSync(complexityReportPath, 'utf8')
			);
		}
	} catch (error) {
		// Fallback to basic criteria if complexity report is unavailable
	}

	tasks.forEach((task) => {
		// Skip tasks that already have subtasks
		if (task.subtasks && task.subtasks.length > 0) return;

		let taskAnalysis = null;
		let shouldExpand = false;
		let expansionReason = '';
		let recommendedSubtasks = 3; // Default

		// First, try to use complexity analysis results
		if (complexityReport?.complexityAnalysis) {
			taskAnalysis = complexityReport.complexityAnalysis.find(
				(a) => a.taskId === task.id
			);

			if (taskAnalysis) {
				// Use complexity score threshold (5+ out of 10 = complex)
				shouldExpand = taskAnalysis.complexityScore >= 5;
				expansionReason = `Complexity analysis score: ${taskAnalysis.complexityScore}/10. ${taskAnalysis.reasoning}`;
				recommendedSubtasks = taskAnalysis.recommendedSubtasks || 3;
			}
		}

		// Fallback to intelligent criteria if no complexity analysis
		if (!taskAnalysis) {
			const fallbackAnalysis = calculateComplexityScore(task);
			shouldExpand =
				fallbackAnalysis.score >= EXPANSION_CONFIG.COMPLEXITY_THRESHOLD;
			expansionReason = `Fallback analysis score: ${fallbackAnalysis.score}/100. Reasons: ${fallbackAnalysis.reasons.join(', ')}`;

			// Convert 0-100 score to recommended subtasks
			if (fallbackAnalysis.score >= 90) recommendedSubtasks = 6;
			else if (fallbackAnalysis.score >= 80) recommendedSubtasks = 5;
			else if (fallbackAnalysis.score >= 70) recommendedSubtasks = 4;
			else recommendedSubtasks = 3;
		}

		if (shouldExpand) {
			complexTasks.push({
				...task,
				complexityAnalysis: taskAnalysis || {
					score: null,
					reasons: [expansionReason]
				},
				expansionReason,
				recommendedSubtasks
			});
		}
	});

	// Sort by complexity score or fallback score (highest first)
	return complexTasks.sort((a, b) => {
		const scoreA =
			a.complexityAnalysis?.complexityScore || a.complexityAnalysis?.score || 0;
		const scoreB =
			b.complexityAnalysis?.complexityScore || b.complexityAnalysis?.score || 0;
		return scoreB - scoreA;
	});
}

/**
 * Identify complex tasks that should be automatically expanded using intelligent criteria (legacy function)
 * @param {Array} tasks - Array of task objects
 * @param {Object} options - Configuration options
 * @returns {Array} Array of complex tasks suitable for expansion with analysis
 */
function identifyComplexTasks(tasks, options = {}) {
	if (!Array.isArray(tasks)) return [];

	const threshold = options.threshold || EXPANSION_CONFIG.COMPLEXITY_THRESHOLD;
	const complexTasks = [];

	tasks.forEach((task) => {
		// Skip tasks that already have subtasks
		if (task.subtasks && task.subtasks.length > 0) return;

		const analysis = calculateComplexityScore(task);

		if (analysis.score >= threshold) {
			complexTasks.push({
				...task,
				complexityAnalysis: analysis
			});
		}
	});

	// Sort by complexity score (highest first)
	return complexTasks.sort(
		(a, b) => b.complexityAnalysis.score - a.complexityAnalysis.score
	);
}

/**
 * Handle auto-expansion of complex tasks
 * @param {Array} newTasks - Array of newly created tasks
 * @param {string} tasksPath - Path to tasks.json file
 * @param {Object} options - Options object with logging and session info
 */
async function handleAutoExpansion(newTasks, tasksPath, options) {
	const { reportProgress, mcpLog, session, projectRoot, outputFormat } =
		options;
	const isMCP = !!mcpLog;

	const logFn = mcpLog || {
		info: (...args) => log('info', ...args),
		warn: (...args) => log('warn', ...args),
		error: (...args) => log('error', ...args),
		debug: (...args) => log('debug', ...args),
		success: (...args) => log('success', ...args)
	};

	const report = (message, level = 'info') => {
		if (logFn && typeof logFn[level] === 'function') {
			logFn[level](message);
		} else if (!isSilentMode() && outputFormat === 'text') {
			log(level, message);
		}
	};

	try {
		const startTime = Date.now();
		report(
			'🔍 Step 1: Performing comprehensive complexity analysis...',
			'info'
		);

		// First, perform complexity analysis on all new tasks
		const complexityReportPath = path.join(
			projectRoot || path.dirname(path.dirname(tasksPath)),
			'.taskmaster/reports/task-complexity-report.json'
		);

		try {
			await analyzeTaskComplexity(
				{
					file: tasksPath,
					output: complexityReportPath,
					threshold: 1, // Analyze all tasks
					research: false // Use standard analysis for speed
				},
				{ mcpLog, session, projectRoot }
			);

			report('✅ Complexity analysis completed successfully!', 'success');
		} catch (analysisError) {
			report(
				`⚠️  Complexity analysis failed: ${analysisError.message}. Using fallback criteria.`,
				'warn'
			);
		}

		report(
			'🔍 Step 2: Identifying tasks suitable for auto-expansion...',
			'info'
		);

		// Use both complexity analysis results and fallback criteria
		const complexTasks = await identifyComplexTasksWithAnalysis(
			newTasks,
			complexityReportPath
		);

		if (complexTasks.length > 0) {
			report(
				`🎯 Found ${complexTasks.length} complex task(s) suitable for expansion:`,
				'info'
			);

			// Display detailed analysis for each complex task
			complexTasks.forEach((task, index) => {
				report(`   ${index + 1}. Task ${task.id}: ${task.title}`, 'info');

				if (task.complexityAnalysis?.complexityScore) {
					// From complexity analysis
					report(
						`      Complexity Score: ${task.complexityAnalysis.complexityScore}/10`,
						'info'
					);
					report(
						`      Recommended Subtasks: ${task.recommendedSubtasks}`,
						'info'
					);
					if (task.complexityAnalysis.reasoning) {
						report(
							`      Analysis: ${task.complexityAnalysis.reasoning}`,
							'info'
						);
					}
				} else {
					// From fallback analysis
					report(`      ${task.expansionReason}`, 'info');
					report(
						`      Recommended Subtasks: ${task.recommendedSubtasks}`,
						'info'
					);
				}
			});

			report('⚡ Auto-expanding complex tasks...', 'info');
			report(
				`📊 Progress: [${' '.repeat(complexTasks.length)}] 0/${complexTasks.length}`,
				'info'
			);
			let expandedCount = 0;

			for (let i = 0; i < complexTasks.length; i++) {
				const task = complexTasks[i];
				const taskStartTime = Date.now();

				try {
					// Update progress bar
					const progressBar =
						'█'.repeat(i) + '░'.repeat(complexTasks.length - i);
					report(
						`📊 Progress: [${progressBar}] ${i}/${complexTasks.length}`,
						'info'
					);

					const scoreDisplay = task.complexityAnalysis?.complexityScore
						? `${task.complexityAnalysis.complexityScore}/10`
						: 'fallback analysis';
					report(
						`   ${i + 1}/${complexTasks.length} Expanding task ${task.id} (score: ${scoreDisplay})...`,
						'info'
					);

					// Use recommended subtasks from analysis
					const numSubtasks = task.recommendedSubtasks || 3;

					// Create enhanced context from analysis
					let complexityContext = `Auto-expanded during PRD parsing. `;
					if (task.complexityAnalysis?.complexityScore) {
						complexityContext += `Complexity analysis score: ${task.complexityAnalysis.complexityScore}/10. ${task.complexityAnalysis.reasoning || ''}`;
					} else {
						complexityContext += task.expansionReason;
					}
					complexityContext += ` Recommended ${numSubtasks} subtasks based on complexity assessment.`;

					// Call expandTask function with proper parameters
					await expandTask(
						tasksPath,
						task.id,
						numSubtasks, // Use intelligent subtask count
						false, // useResearch
						complexityContext, // Enhanced context
						{ mcpLog, session, projectRoot }, // context
						false // force
					);

					expandedCount++;
					const taskDuration = Date.now() - taskStartTime;
					report(
						`   ✅ Successfully expanded task ${task.id} into ${numSubtasks} subtasks (${taskDuration}ms)`,
						'success'
					);
				} catch (error) {
					const taskDuration = Date.now() - taskStartTime;
					report(
						`   ❌ Failed to expand task ${task.id} after ${taskDuration}ms: ${error.message}`,
						'error'
					);
				}
			}

			// Final progress update
			const finalProgressBar = '█'.repeat(complexTasks.length);
			report(
				`📊 Progress: [${finalProgressBar}] ${complexTasks.length}/${complexTasks.length} - Complete!`,
				'success'
			);

			// Calculate total duration
			const totalDuration = Date.now() - startTime;
			const avgTimePerTask =
				expandedCount > 0 ? Math.round(totalDuration / expandedCount) : 0;

			// Display enhanced summary with timing
			report(
				`✅ Intelligent auto-expansion completed in ${totalDuration}ms!`,
				'success'
			);
			report(`📊 Detailed Summary:`, 'info');
			report(
				`   • ${complexTasks.length} complex tasks identified using intelligent criteria`,
				'info'
			);
			report(`   • ${expandedCount} tasks successfully expanded`, 'info');
			report(`   • Total processing time: ${totalDuration}ms`, 'info');

			if (expandedCount > 0) {
				// Calculate average scores (handle both analysis types)
				const analysisScores = complexTasks
					.slice(0, expandedCount)
					.map((task) => task.complexityAnalysis?.complexityScore || 0)
					.filter((score) => score > 0);

				if (analysisScores.length > 0) {
					const avgScore = Math.round(
						analysisScores.reduce((sum, score) => sum + score, 0) /
							analysisScores.length
					);
					report(
						`   • Average complexity score: ${avgScore}/10 (from ${analysisScores.length} analyzed tasks)`,
						'info'
					);
				}

				report(`   • Average time per expansion: ${avgTimePerTask}ms`, 'info');

				// Calculate total subtasks created using recommended counts
				const totalSubtasks = complexTasks
					.slice(0, expandedCount)
					.reduce((sum, task) => {
						return sum + (task.recommendedSubtasks || 3);
					}, 0);
				report(`   • Total subtasks created: ${totalSubtasks}`, 'info');

				// Show analysis method breakdown
				const analysisCount = complexTasks
					.slice(0, expandedCount)
					.filter((t) => t.complexityAnalysis?.complexityScore).length;
				const fallbackCount = expandedCount - analysisCount;
				if (analysisCount > 0 && fallbackCount > 0) {
					report(
						`   • Analysis methods: ${analysisCount} AI-analyzed, ${fallbackCount} fallback criteria`,
						'info'
					);
				}
			}

			if (expandedCount < complexTasks.length) {
				report(
					`   ⚠️  ${complexTasks.length - expandedCount} tasks failed to expand`,
					'warn'
				);
			}

			// Performance insights
			if (totalDuration > 30000) {
				// > 30 seconds
				report(
					`   💡 Performance note: Expansion took ${Math.round(totalDuration / 1000)}s. Consider using smaller batches for large PRDs.`,
					'info'
				);
			}
		} else {
			report(
				'✅ No tasks met the complexity threshold for auto-expansion.',
				'info'
			);
			report(
				`   (Threshold: ${EXPANSION_CONFIG.COMPLEXITY_THRESHOLD}/100)`,
				'info'
			);
			report(
				`   💡 Tip: You can manually expand tasks using 'task-master expand --id=<id>'`,
				'info'
			);
		}
	} catch (error) {
		report(`❌ Error in auto-expansion process: ${error.message}`, 'error');
		// Don't throw - auto-expansion failure shouldn't break the main PRD parsing
	}
}

/**
 * Parse a PRD file and generate tasks
 * @param {string} prdPath - Path to the PRD file
 * @param {string} tasksPath - Path to the tasks.json file
 * @param {number} numTasks - Number of tasks to generate
 * @param {Object} options - Additional options
 * @param {boolean} [options.force=false] - Whether to overwrite existing tasks.json.
 * @param {boolean} [options.append=false] - Append to existing tasks file.
 * @param {boolean} [options.research=false] - Use research model for enhanced PRD analysis.
 * @param {boolean} [options.autoExpand=false] - Automatically expand complex tasks after parsing.
 * @param {Object} [options.reportProgress] - Function to report progress (optional, likely unused).
 * @param {Object} [options.mcpLog] - MCP logger object (optional).
 * @param {Object} [options.session] - Session object from MCP server (optional).
 * @param {string} [options.projectRoot] - Project root path (for MCP/env fallback).
 * @param {string} [outputFormat='text'] - Output format ('text' or 'json').
 */
async function parsePRD(prdPath, tasksPath, numTasks, options = {}) {
	const {
		reportProgress,
		mcpLog,
		session,
		projectRoot,
		force = false,
		append = false,
		research = false,
		autoExpand = false
	} = options;
	const isMCP = !!mcpLog;
	const outputFormat = isMCP ? 'json' : 'text';

	const logFn = mcpLog
		? mcpLog
		: {
				// Wrapper for CLI
				info: (...args) => log('info', ...args),
				warn: (...args) => log('warn', ...args),
				error: (...args) => log('error', ...args),
				debug: (...args) => log('debug', ...args),
				success: (...args) => log('success', ...args)
			};

	// Create custom reporter using logFn
	const report = (message, level = 'info') => {
		// Check logFn directly
		if (logFn && typeof logFn[level] === 'function') {
			logFn[level](message);
		} else if (!isSilentMode() && outputFormat === 'text') {
			// Fallback to original log only if necessary and in CLI text mode
			log(level, message);
		}
	};

	report(
		`Parsing PRD file: ${prdPath}, Force: ${force}, Append: ${append}, Research: ${research}, AutoExpand: ${autoExpand}`
	);

	let existingTasks = [];
	let nextId = 1;
	let aiServiceResponse = null;

	try {
		// Handle file existence and overwrite/append logic
		if (fs.existsSync(tasksPath)) {
			if (append) {
				report(
					`Append mode enabled. Reading existing tasks from ${tasksPath}`,
					'info'
				);
				const existingData = readJSON(tasksPath); // Use readJSON utility
				if (existingData && Array.isArray(existingData.tasks)) {
					existingTasks = existingData.tasks;
					if (existingTasks.length > 0) {
						nextId = Math.max(...existingTasks.map((t) => t.id || 0)) + 1;
						report(
							`Found ${existingTasks.length} existing tasks. Next ID will be ${nextId}.`,
							'info'
						);
					}
				} else {
					report(
						`Could not read existing tasks from ${tasksPath} or format is invalid. Proceeding without appending.`,
						'warn'
					);
					existingTasks = []; // Reset if read fails
				}
			} else if (!force) {
				// Not appending and not forcing overwrite
				const overwriteError = new Error(
					`Output file ${tasksPath} already exists. Use --force to overwrite or --append.`
				);
				report(overwriteError.message, 'error');
				if (outputFormat === 'text') {
					console.error(chalk.red(overwriteError.message));
					process.exit(1);
				} else {
					throw overwriteError;
				}
			} else {
				// Force overwrite is true
				report(
					`Force flag enabled. Overwriting existing file: ${tasksPath}`,
					'info'
				);
			}
		}

		report(`Reading PRD content from ${prdPath}`, 'info');
		const prdContent = fs.readFileSync(prdPath, 'utf8');
		if (!prdContent) {
			throw new Error(`Input file ${prdPath} is empty or could not be read.`);
		}

		// Extract PRD metadata for task source tracking
		report('Extracting PRD metadata for source tracking...', 'info');
		const prdMetadata = extractPrdMetadata(prdPath, prdContent);
		
		// Generate PRD ID before creating tasks so it can be used as prdSource
		const prdId = prdMetadata.prdId || generatePrdId();

		// Research-specific enhancements to the system prompt
		const researchPromptAddition = research
			? `\nBefore breaking down the PRD into tasks, you will:
1. Research and analyze the latest technologies, libraries, frameworks, and best practices that would be appropriate for this project
2. Identify any potential technical challenges, security concerns, or scalability issues not explicitly mentioned in the PRD without discarding any explicit requirements or going overboard with complexity -- always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches
3. Consider current industry standards and evolving trends relevant to this project (this step aims to solve LLM hallucinations and out of date information due to training data cutoff dates)
4. Evaluate alternative implementation approaches and recommend the most efficient path
5. Include specific library versions, helpful APIs, and concrete implementation guidance based on your research
6. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches

Your task breakdown should incorporate this research, resulting in more detailed implementation guidance, more accurate dependency mapping, and more precise technology recommendations than would be possible from the PRD text alone, while maintaining all explicit requirements and best practices and all details and nuances of the PRD.`
			: '';

		// Base system prompt for PRD parsing
		const systemPrompt = `You are an AI assistant specialized in analyzing Product Requirements Documents (PRDs) and generating a structured, logically ordered, dependency-aware and sequenced list of development tasks in JSON format.${researchPromptAddition}

Analyze the provided PRD content and generate approximately ${numTasks} top-level development tasks. If the complexity or the level of detail of the PRD is high, generate more tasks relative to the complexity of the PRD
Each task should represent a logical unit of work needed to implement the requirements and focus on the most direct and effective way to implement the requirements without unnecessary complexity or overengineering. Include pseudo-code, implementation details, and test strategy for each task. Find the most up to date information to implement each task.
Assign sequential IDs starting from ${nextId}. Infer title, description, details, and test strategy for each task based *only* on the PRD content.
Set status to 'pending', dependencies to an empty array [], and priority to 'medium' initially for all tasks.
Respond ONLY with a valid JSON object containing a single key "tasks", where the value is an array of task objects adhering to the provided Zod schema. Do not include any explanation or markdown formatting.

Each task should follow this JSON structure:
{
	"id": number,
	"title": string,
	"description": string,
	"status": "pending",
	"dependencies": number[] (IDs of tasks this depends on),
	"priority": "high" | "medium" | "low",
	"details": string (implementation details),
	"testStrategy": string (validation approach)
}

Guidelines:
1. Unless complexity warrants otherwise, create exactly ${numTasks} tasks, numbered sequentially starting from ${nextId}
2. Each task should be atomic and focused on a single responsibility following the most up to date best practices and standards
3. Order tasks logically - consider dependencies and implementation sequence
4. Early tasks should focus on setup, core functionality first, then advanced features
5. Include clear validation/testing approach for each task
6. Set appropriate dependency IDs (a task can only depend on tasks with lower IDs, potentially including existing tasks with IDs less than ${nextId} if applicable)
7. Assign priority (high/medium/low) based on criticality and dependency order
8. Include detailed implementation guidance in the "details" field${research ? ', with specific libraries and version recommendations based on your research' : ''}
9. If the PRD contains specific requirements for libraries, database schemas, frameworks, tech stacks, or any other implementation details, STRICTLY ADHERE to these requirements in your task breakdown and do not discard them under any circumstance
10. Focus on filling in any gaps left by the PRD or areas that aren't fully specified, while preserving all explicit requirements
11. Always aim to provide the most direct path to implementation, avoiding over-engineering or roundabout approaches${research ? '\n12. For each task, include specific, actionable guidance based on current industry standards and best practices discovered through research' : ''}`;

		// Build user prompt with PRD content
		const userPrompt = `Here's the Product Requirements Document (PRD) to break down into approximately ${numTasks} tasks, starting IDs from ${nextId}:${research ? '\n\nRemember to thoroughly research current best practices and technologies before task breakdown to provide specific, actionable implementation details.' : ''}\n\n${prdContent}\n\n

		Return your response in this format:
{
    "tasks": [
        {
            "id": 1,
            "title": "Setup Project Repository",
            "description": "...",
            ...
        },
        ...
    ],
    "metadata": {
        "projectName": "PRD Implementation",
        "totalTasks": ${numTasks},
        "sourceFile": "${prdPath}",
        "generatedAt": "YYYY-MM-DD"
    }
}`;

		// Call the unified AI service
		report(
			`Calling AI service to generate tasks from PRD${research ? ' with research-backed analysis' : ''}...`,
			'info'
		);

		// Call generateObjectService with the CORRECT schema and additional telemetry params
		aiServiceResponse = await generateObjectService({
			role: research ? 'research' : 'main', // Use research role if flag is set
			session: session,
			projectRoot: projectRoot,
			schema: prdResponseSchema,
			objectName: 'tasks_data',
			systemPrompt: systemPrompt,
			prompt: userPrompt,
			commandName: 'parse-prd',
			outputType: isMCP ? 'mcp' : 'cli'
		});

		// Create the directory if it doesn't exist
		const tasksDir = path.dirname(tasksPath);
		if (!fs.existsSync(tasksDir)) {
			fs.mkdirSync(tasksDir, { recursive: true });
		}
		logFn.success(
			`Successfully parsed PRD via AI service${research ? ' with research-backed analysis' : ''}.`
		);

		// Validate and Process Tasks
		// const generatedData = aiServiceResponse?.mainResult?.object;

		// Robustly get the actual AI-generated object
		let generatedData = null;
		if (aiServiceResponse?.mainResult) {
			if (
				typeof aiServiceResponse.mainResult === 'object' &&
				aiServiceResponse.mainResult !== null &&
				'tasks' in aiServiceResponse.mainResult
			) {
				// If mainResult itself is the object with a 'tasks' property
				generatedData = aiServiceResponse.mainResult;
			} else if (
				typeof aiServiceResponse.mainResult.object === 'object' &&
				aiServiceResponse.mainResult.object !== null &&
				'tasks' in aiServiceResponse.mainResult.object
			) {
				// If mainResult.object is the object with a 'tasks' property
				generatedData = aiServiceResponse.mainResult.object;
			}
		}

		if (!generatedData || !Array.isArray(generatedData.tasks)) {
			logFn.error(
				`Internal Error: generateObjectService returned unexpected data structure: ${JSON.stringify(generatedData)}`
			);
			throw new Error(
				'AI service returned unexpected data structure after validation.'
			);
		}

		let currentId = nextId;
		const taskMap = new Map();
		const processedNewTasks = generatedData.tasks.map((task) => {
			const newId = currentId++;
			taskMap.set(task.id, newId);
			return {
				...task,
				id: newId,
				status: 'pending',
				priority: task.priority || 'medium',
				dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
				subtasks: [],
				prdSource: prdId // Add PRD ID as source reference
			};
		});

		// Remap dependencies for the NEWLY processed tasks
		processedNewTasks.forEach((task) => {
			task.dependencies = task.dependencies
				.map((depId) => taskMap.get(depId)) // Map old AI ID to new sequential ID
				.filter(
					(newDepId) =>
						newDepId != null && // Must exist
						newDepId < task.id && // Must be a lower ID (could be existing or newly generated)
						(findTaskById(existingTasks, newDepId) || // Check if it exists in old tasks OR
							processedNewTasks.some((t) => t.id === newDepId)) // check if it exists in new tasks
				);
		});

		const finalTasks = append
			? [...existingTasks, ...processedNewTasks]
			: processedNewTasks;
		const outputData = { tasks: finalTasks };

		// Write the final tasks to the file
		writeJSON(tasksPath, outputData);
		report(
			`Successfully ${append ? 'appended' : 'generated'} ${processedNewTasks.length} tasks in ${tasksPath}${research ? ' with research-backed analysis' : ''}`,
			'success'
		);

		// Generate markdown task files after writing tasks.json
		await generateTaskFiles(tasksPath, path.dirname(tasksPath), { mcpLog });

		// Update PRD file metadata and register in tracking system after successful parsing
		try {
			// prdId was already generated above before task creation
			const parseInfo = {
				id: prdId,
				status: 'pending', // Default status after parsing
				totalTasks: processedNewTasks.length,
				lastParsed: new Date().toISOString()
			};

			// Update PRD file metadata
			const updateSuccess = updatePrdFileOnParse(prdPath, parseInfo);
			if (updateSuccess) {
				report('✅ Updated PRD file metadata with parsing information', 'info');
			} else {
				report('⚠️ Failed to update PRD file metadata', 'warn');
			}

			// Register PRD in tracking system if not already registered
			try {
				const existingPrd = findPrdById(prdId, getPRDsJsonPath(projectRoot));
				if (!existingPrd) {
					const registrationResult = createPrdFromFile(prdPath, {
						title:
							prdMetadata.title ||
							path.basename(prdPath, path.extname(prdPath)),
						description: `PRD parsed and registered automatically during task generation`,
						priority: 'medium',
						complexity: 'medium',
						tags: ['auto-generated', 'parsed'],
						estimatedEffort: '2-4 hours'
					});

					if (registrationResult.success) {
						report(`✅ Registered PRD ${prdId} in tracking system`, 'info');
					} else {
						report(
							`⚠️ Failed to register PRD in tracking system: ${registrationResult.error}`,
							'warn'
						);
					}
				} else {
					report(
						`ℹ️ PRD ${prdId} already registered in tracking system`,
						'info'
					);
				}
			} catch (registrationError) {
				report(
					`⚠️ Error registering PRD in tracking system: ${registrationError.message}`,
					'warn'
				);
			}

			// Link newly created tasks to the PRD
			try {
				const { addTaskToPrd } = await import(
					'../prd-manager/prd-write-operations.js'
				);
				const newTaskIds = processedNewTasks.map((task) => task.id);
				let linkedCount = 0;

				for (const taskId of newTaskIds) {
					const linkResult = addTaskToPrd(prdId, taskId, getPRDsJsonPath(projectRoot));
					if (linkResult.success) {
						linkedCount++;
					} else {
						report(
							`⚠️ Failed to link task ${taskId} to PRD ${prdId}: ${linkResult.error}`,
							'warn'
						);
					}
				}

				if (linkedCount > 0) {
					report(`✅ Linked ${linkedCount} tasks to PRD ${prdId}`, 'info');
				}
			} catch (linkingError) {
				report(
					`⚠️ Error linking tasks to PRD: ${linkingError.message}`,
					'warn'
				);
			}
		} catch (metadataError) {
			report(
				`⚠️ Error updating PRD file metadata: ${metadataError.message}`,
				'warn'
			);
		}

		// Handle auto-expansion if enabled
		if (autoExpand && append) {
			await handleAutoExpansion(processedNewTasks, tasksPath, {
				reportProgress,
				mcpLog,
				session,
				projectRoot,
				outputFormat
			});
		}

		// Handle CLI output (e.g., success message)
		if (outputFormat === 'text') {
			console.log(
				boxen(
					chalk.green(
						`Successfully generated ${processedNewTasks.length} new tasks${research ? ' with research-backed analysis' : ''}. Total tasks in ${tasksPath}: ${finalTasks.length}`
					),
					{ padding: 1, borderColor: 'green', borderStyle: 'round' }
				)
			);

			console.log(
				boxen(
					chalk.white.bold('Next Steps:') +
						'\n\n' +
						`${chalk.cyan('1.')} Run ${chalk.yellow('task-master list')} to view all tasks\n` +
						`${chalk.cyan('2.')} Run ${chalk.yellow('task-master expand --id=<id>')} to break down a task into subtasks`,
					{
						padding: 1,
						borderColor: 'cyan',
						borderStyle: 'round',
						margin: { top: 1 }
					}
				)
			);

			if (aiServiceResponse && aiServiceResponse.telemetryData) {
				displayAiUsageSummary(aiServiceResponse.telemetryData, 'cli');
			}
		}

		// Return telemetry data
		return {
			success: true,
			tasksPath,
			telemetryData: aiServiceResponse?.telemetryData
		};
	} catch (error) {
		report(`Error parsing PRD: ${error.message}`, 'error');

		// Only show error UI for text output (CLI)
		if (outputFormat === 'text') {
			console.error(chalk.red(`Error: ${error.message}`));

			if (getDebugFlag(projectRoot)) {
				// Use projectRoot for debug flag check
				console.error(error);
			}

			process.exit(1);
		} else {
			throw error; // Re-throw for JSON output
		}
	}
}

export default parsePRD;
