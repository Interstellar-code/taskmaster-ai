/**
 * prd-monitor.js
 * PRD file change detection and monitoring system for TaskMaster
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { readJSON, writeJSON, log } from '../utils.js';

/**
 * Check if any PRD files referenced in tasks have been modified
 * @param {string} tasksPath - Path to tasks.json file
 * @returns {Promise<Object>} - Change detection results
 */
export async function checkPRDChanges(tasksPath) {
	try {
		// Read tasks data
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			return {
				success: false,
				error: 'No tasks found',
				changes: []
			};
		}

		// Extract unique PRD sources
		const prdSources = new Map();
		data.tasks.forEach((task) => {
			if (
				task.prdSource &&
				task.prdSource.fileName &&
				task.prdSource.filePath
			) {
				const filePath = task.prdSource.filePath;
				if (!prdSources.has(filePath)) {
					prdSources.set(filePath, {
						filePath: filePath,
						fileName: task.prdSource.fileName,
						originalHash: task.prdSource.fileHash,
						originalSize: task.prdSource.fileSize,
						parsedDate: task.prdSource.parsedDate,
						taskIds: []
					});
				}
				prdSources.get(filePath).taskIds.push(task.id);
			}
		});

		if (prdSources.size === 0) {
			return {
				success: true,
				message: 'No PRD files to monitor',
				changes: []
			};
		}

		// Check each PRD file for changes
		const changes = [];
		for (const [filePath, prdInfo] of prdSources) {
			const changeResult = await checkSinglePRDFile(filePath, prdInfo);
			if (changeResult.hasChanged) {
				changes.push(changeResult);
			}
		}

		return {
			success: true,
			totalPRDFiles: prdSources.size,
			changedFiles: changes.length,
			changes: changes
		};
	} catch (error) {
		log('error', `Error checking PRD changes: ${error.message}`);
		return {
			success: false,
			error: error.message,
			changes: []
		};
	}
}

/**
 * Check a single PRD file for changes
 * @param {string} filePath - Path to the PRD file
 * @param {Object} prdInfo - Original PRD information
 * @returns {Promise<Object>} - Change detection result for this file
 */
async function checkSinglePRDFile(filePath, prdInfo) {
	try {
		// Check if file still exists
		if (!fs.existsSync(filePath)) {
			return {
				hasChanged: true,
				changeType: 'deleted',
				filePath: filePath,
				fileName: prdInfo.fileName,
				originalHash: prdInfo.originalHash,
				currentHash: null,
				originalSize: prdInfo.originalSize,
				currentSize: null,
				taskIds: prdInfo.taskIds,
				message: 'PRD file has been deleted'
			};
		}

		// Get current file stats and content
		const stats = fs.statSync(filePath);
		const currentContent = fs.readFileSync(filePath, 'utf8');

		// Calculate current hash
		const hash = crypto.createHash('sha256');
		hash.update(currentContent, 'utf8');
		const currentHash = hash.digest('hex');

		// Compare with original
		const hasChanged = currentHash !== prdInfo.originalHash;
		const sizeChanged = stats.size !== prdInfo.originalSize;

		if (hasChanged) {
			return {
				hasChanged: true,
				changeType: 'modified',
				filePath: filePath,
				fileName: prdInfo.fileName,
				originalHash: prdInfo.originalHash,
				currentHash: currentHash,
				originalSize: prdInfo.originalSize,
				currentSize: stats.size,
				sizeChanged: sizeChanged,
				lastModified: stats.mtime.toISOString(),
				taskIds: prdInfo.taskIds,
				message: `PRD file has been modified (${sizeChanged ? 'size and content' : 'content only'} changed)`
			};
		}

		return {
			hasChanged: false,
			filePath: filePath,
			fileName: prdInfo.fileName,
			message: 'No changes detected'
		};
	} catch (error) {
		return {
			hasChanged: true,
			changeType: 'error',
			filePath: filePath,
			fileName: prdInfo.fileName,
			error: error.message,
			taskIds: prdInfo.taskIds,
			message: `Error checking file: ${error.message}`
		};
	}
}

/**
 * Display PRD change detection results
 * @param {Object} results - Results from checkPRDChanges
 * @param {string} format - Output format (table, json)
 */
export function displayPRDChanges(results, format = 'table') {
	if (!results.success) {
		console.error(chalk.red(`Error: ${results.error}`));
		return;
	}

	if (format === 'json') {
		console.log(JSON.stringify(results, null, 2));
		return;
	}

	// Display as formatted output
	console.log(chalk.blue.bold('\n🔍 PRD File Change Detection Results'));
	console.log(chalk.gray('═'.repeat(80)));

	if (results.changes.length === 0) {
		console.log(chalk.green('✓ No changes detected in PRD files'));
		if (results.totalPRDFiles > 0) {
			console.log(chalk.gray(`Monitored ${results.totalPRDFiles} PRD file(s)`));
		} else {
			console.log(chalk.yellow('No PRD files found to monitor'));
		}
		return;
	}

	console.log(
		chalk.yellow(
			`⚠️  ${results.changedFiles} of ${results.totalPRDFiles} PRD file(s) have changed`
		)
	);
	console.log('');

	results.changes.forEach((change, index) => {
		console.log(chalk.cyan.bold(`${index + 1}. ${change.fileName}`));
		console.log(chalk.gray(`   Path: ${change.filePath}`));
		console.log(chalk.gray(`   Change Type: ${change.changeType}`));
		console.log(chalk.gray(`   Message: ${change.message}`));

		if (change.changeType === 'modified') {
			console.log(
				chalk.gray(
					`   Original Hash: ${change.originalHash.substring(0, 16)}...`
				)
			);
			console.log(
				chalk.gray(
					`   Current Hash:  ${change.currentHash.substring(0, 16)}...`
				)
			);
			console.log(
				chalk.gray(
					`   Size: ${change.originalSize} → ${change.currentSize} bytes`
				)
			);
			if (change.lastModified) {
				console.log(
					chalk.gray(
						`   Last Modified: ${new Date(change.lastModified).toLocaleString()}`
					)
				);
			}
		}

		if (change.taskIds && change.taskIds.length > 0) {
			console.log(
				chalk.gray(`   Affected Tasks: ${change.taskIds.join(', ')}`)
			);
		}

		console.log('');
	});

	// Show recommendations
	console.log(chalk.blue.bold('💡 Recommendations:'));
	results.changes.forEach((change) => {
		if (change.changeType === 'modified') {
			console.log(
				chalk.yellow(
					`• Consider re-parsing ${change.fileName} to update affected tasks (${change.taskIds.join(', ')})`
				)
			);
		} else if (change.changeType === 'deleted') {
			console.log(
				chalk.red(
					`• PRD file ${change.fileName} is missing - tasks ${change.taskIds.join(', ')} may need attention`
				)
			);
		}
	});
}

/**
 * Update PRD source metadata for tasks after file changes
 * @param {string} tasksPath - Path to tasks.json file
 * @param {string} prdFilePath - Path to the changed PRD file
 * @returns {Promise<Object>} - Update result
 */
export async function updatePRDMetadata(tasksPath, prdFilePath) {
	try {
		// Read tasks data
		const data = readJSON(tasksPath);
		if (!data || !data.tasks) {
			throw new Error('No tasks found');
		}

		// Check if PRD file exists
		if (!fs.existsSync(prdFilePath)) {
			throw new Error(`PRD file not found: ${prdFilePath}`);
		}

		// Read current PRD file
		const stats = fs.statSync(prdFilePath);
		const content = fs.readFileSync(prdFilePath, 'utf8');

		// Calculate new hash
		const hash = crypto.createHash('sha256');
		hash.update(content, 'utf8');
		const newHash = hash.digest('hex');

		// Create new metadata
		const newMetadata = {
			filePath: path.resolve(prdFilePath).replace(/\\/g, '/'),
			fileName: path.basename(prdFilePath),
			parsedDate: new Date().toISOString(),
			fileHash: newHash,
			fileSize: stats.size
		};

		// Update all tasks that reference this PRD file
		let updatedCount = 0;
		data.tasks.forEach((task) => {
			if (task.prdSource && task.prdSource.filePath === newMetadata.filePath) {
				task.prdSource = newMetadata;
				updatedCount++;
			}
		});

		// Save updated tasks
		writeJSON(tasksPath, data);

		return {
			success: true,
			updatedTasks: updatedCount,
			newMetadata: newMetadata
		};
	} catch (error) {
		log('error', `Error updating PRD metadata: ${error.message}`);
		return {
			success: false,
			error: error.message
		};
	}
}
