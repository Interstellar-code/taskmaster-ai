/**
 * PRD Management Commands
 * CLI commands for PRD lifecycle tracking and management
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import {
	readPrdsMetadata,
	findPrdById,
	findPrdsByStatus,
	getAllPrds,
	getPrdStatistics,
	getPRDsJsonPath,
	getPRDStatusDirectory,
	getTasksJsonPath
} from './prd-manager/prd-utils.js';
import {
	addPrd,
	updatePrd,
	removePrd,
	updatePrdStatus,
	createPrdFromFile
} from './prd-manager/prd-write-operations.js';
import {
	linkTaskToPrd,
	unlinkTaskFromPrd,
	syncTaskPrdLinks
} from './prd-manager/task-prd-linking.js';
import {
	updatePrdStatusBasedOnTasks,
	updateAllPrdStatuses
} from './prd-manager/prd-status-automation.js';
import {
	movePrdAndUpdateStatus,
	organizeAllPrdFiles
} from './prd-manager/prd-file-movement.js';
import { performIntegrityCheck } from './prd-manager/prd-integrity.js';
import {
	discoverAndMigratePrds,
	generateMigrationReport
} from './prd-manager/prd-migration.js';
import {
	archivePrd,
	interactivePrdArchive,
	readPrdArchive,
	extractPrdArchive,
	migrateAllLegacyArchives
} from './prd-manager/prd-archiving.js';
import {
	trackFileChanges,
	getVersionHistory,
	compareVersions,
	addVersionEntry
} from './prd-manager/prd-version-control.js';
import { log } from './utils.js';

/**
 * List PRDs with optional filtering
 * @param {Object} options - Command options
 */
function listPrds(options = {}) {
	try {
		const {
			status,
			priority,
			complexity,
			format = 'table',
			includeTasks = false
		} = options;

		const filters = {};
		if (status) filters.status = status;
		if (priority) filters.priority = priority;
		if (complexity) filters.complexity = complexity;

		const prds = getAllPrds(filters);

		if (format === 'json') {
			console.log(JSON.stringify(prds, null, 2));
			return;
		}

		if (prds.length === 0) {
			console.log(chalk.yellow('No PRDs found matching the criteria.'));
			return;
		}

		// Display as table
		const table = new Table({
			head: [
				chalk.cyan('ID'),
				chalk.cyan('Title'),
				chalk.cyan('Status'),
				chalk.cyan('Priority'),
				chalk.cyan('Complexity'),
				chalk.cyan('Tasks'),
				chalk.cyan('Completion'),
				chalk.cyan('Last Modified')
			],
			colWidths: [25, 30, 12, 10, 10, 8, 12, 15]
		});

		for (const prd of prds) {
			const statusColor = getStatusColor(prd.status);
			const priorityColor = getPriorityColor(prd.priority);
			const complexityColor = getComplexityColor(prd.complexity);

			// Use new structure fields if available, fallback to old structure
			const taskCount =
				prd.totalTasks !== undefined
					? prd.totalTasks
					: prd.linkedTaskIds
						? prd.linkedTaskIds.length
						: 0;
			const completion =
				prd.completion !== undefined
					? prd.completion
					: prd.taskStats
						? prd.taskStats.completionPercentage || 0
						: 0;

			table.push([
				prd.id,
				prd.title.length > 27 ? prd.title.substring(0, 24) + '...' : prd.title,
				statusColor(prd.status),
				priorityColor(prd.priority || 'medium'),
				complexityColor(prd.complexity || 'medium'),
				taskCount.toString(),
				`${completion}%`,
				new Date(prd.lastModified).toLocaleDateString()
			]);
		}

		console.log(table.toString());

		// Show statistics
		const stats = getPrdStatistics();
		console.log(chalk.gray(`\nTotal: ${stats.total} PRDs`));
		console.log(
			chalk.gray(
				`Status: ${stats.byStatus.pending} pending, ${stats.byStatus['in-progress']} in-progress, ${stats.byStatus.done} done, ${stats.byStatus.archived} archived`
			)
		);
	} catch (error) {
		console.error(chalk.red('Error listing PRDs:'), error.message);
		process.exit(1);
	}
}

/**
 * Show detailed PRD information
 * @param {string} prdId - PRD ID to show
 * @param {Object} options - Command options
 */
function showPrd(prdId, options = {}) {
	try {
		const { includeTasks = false, includeHistory = false } = options;

		const prd = findPrdById(prdId);
		if (!prd) {
			console.error(chalk.red(`PRD with ID '${prdId}' not found.`));
			process.exit(1);
		}

		console.log(chalk.cyan.bold(`\n📄 PRD: ${prd.title}`));
		console.log(chalk.gray('─'.repeat(60)));

		console.log(`${chalk.bold('ID:')} ${prd.id}`);
		console.log(`${chalk.bold('File:')} ${prd.fileName}`);
		console.log(`${chalk.bold('Path:')} ${prd.filePath}`);
		console.log(
			`${chalk.bold('Status:')} ${getStatusColor(prd.status)(prd.status)}`
		);
		console.log(
			`${chalk.bold('Priority:')} ${getPriorityColor(prd.priority)(prd.priority || 'medium')}`
		);
		console.log(
			`${chalk.bold('Complexity:')} ${getComplexityColor(prd.complexity)(prd.complexity || 'medium')}`
		);
		console.log(
			`${chalk.bold('Created:')} ${new Date(prd.createdDate).toLocaleString()}`
		);
		console.log(
			`${chalk.bold('Modified:')} ${new Date(prd.lastModified).toLocaleString()}`
		);

		if (prd.description) {
			console.log(`${chalk.bold('Description:')} ${prd.description}`);
		}

		if (prd.tags && prd.tags.length > 0) {
			console.log(`${chalk.bold('Tags:')} ${prd.tags.join(', ')}`);
		}

		if (prd.estimatedEffort) {
			console.log(`${chalk.bold('Estimated Effort:')} ${prd.estimatedEffort}`);
		}

		// Task statistics
		console.log(chalk.cyan.bold('\n📊 Task Statistics:'));
		console.log(`${chalk.bold('Total Tasks:')} ${prd.taskStats.totalTasks}`);
		console.log(`${chalk.bold('Completed:')} ${prd.taskStats.completedTasks}`);
		console.log(
			`${chalk.bold('In Progress:')} ${prd.taskStats.inProgressTasks}`
		);
		console.log(`${chalk.bold('Pending:')} ${prd.taskStats.pendingTasks}`);
		console.log(
			`${chalk.bold('Completion:')} ${prd.taskStats.completionPercentage}%`
		);

		// Linked tasks
		if (includeTasks && prd.linkedTaskIds.length > 0) {
			console.log(chalk.cyan.bold('\n🔗 Linked Tasks:'));
			console.log(prd.linkedTaskIds.join(', '));
		}

		// File information
		console.log(chalk.cyan.bold('\n📁 File Information:'));
		console.log(`${chalk.bold('Size:')} ${prd.fileSize} bytes`);
		console.log(`${chalk.bold('Hash:')} ${prd.fileHash.substring(0, 16)}...`);
	} catch (error) {
		console.error(chalk.red('Error showing PRD:'), error.message);
		process.exit(1);
	}
}

/**
 * Update PRD status
 * @param {string} prdId - PRD ID
 * @param {string} newStatus - New status
 * @param {Object} options - Command options
 */
function updatePrdStatusCommand(prdId, newStatus, options = {}) {
	try {
		const { force = false } = options;

		const validStatuses = ['pending', 'in-progress', 'done', 'archived'];
		if (!validStatuses.includes(newStatus)) {
			console.error(
				chalk.red(
					`Invalid status '${newStatus}'. Valid statuses: ${validStatuses.join(', ')}`
				)
			);
			process.exit(1);
		}

		const result = updatePrdStatus(prdId, newStatus);

		if (result.success) {
			console.log(
				chalk.green(`✓ Updated PRD ${prdId} status to '${newStatus}'`)
			);
		} else {
			console.error(chalk.red(`Error updating PRD status: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error updating PRD status:'), error.message);
		process.exit(1);
	}
}

/**
 * Sync PRD status with linked tasks
 * @param {string} prdId - PRD ID (optional, sync all if not provided)
 * @param {Object} options - Command options
 */
function syncPrdStatus(prdId, options = {}) {
	try {
		const { force = false, dryRun = false } = options;

		if (prdId) {
			// Sync specific PRD
			const result = updatePrdStatusBasedOnTasks(
				prdId,
				getTasksJsonPath(),
				getPRDsJsonPath(),
				{
					force,
					dryRun
				}
			);

			if (result.success) {
				if (result.data.changed) {
					console.log(
						chalk.green(
							`✓ Updated PRD ${prdId} status from '${result.data.previousStatus}' to '${result.data.newStatus}'`
						)
					);
				} else {
					console.log(
						chalk.blue(
							`ℹ PRD ${prdId} status is already appropriate (${result.data.currentStatus})`
						)
					);
				}
			} else {
				console.error(chalk.red(`Error syncing PRD status: ${result.error}`));
				process.exit(1);
			}
		} else {
			// Sync all PRDs
			const result = updateAllPrdStatuses(
				getTasksJsonPath(),
				getPRDsJsonPath(),
				{
					force,
					dryRun
				}
			);

			if (result.success) {
				console.log(
					chalk.green(
						`✓ Synced all PRD statuses: ${result.data.updated} updated, ${result.data.unchanged} unchanged, ${result.data.errors} errors`
					)
				);
			} else {
				console.error(chalk.red(`Error syncing PRD statuses: ${result.error}`));
				process.exit(1);
			}
		}
	} catch (error) {
		console.error(chalk.red('Error syncing PRD status:'), error.message);
		process.exit(1);
	}
}

/**
 * Organize PRD files into status directories
 * @param {Object} options - Command options
 */
function organizePrds(options = {}) {
	try {
		const { dryRun = false } = options;

		const result = organizeAllPrdFiles(getPRDsJsonPath(), { dryRun });

		if (result.success) {
			const action = dryRun ? 'Would organize' : 'Organized';
			console.log(
				chalk.green(
					`✓ ${action} PRD files: ${result.data.moved} moved, ${result.data.alreadyCorrect} already correct, ${result.data.errors} errors`
				)
			);

			if (result.data.errors > 0) {
				console.log(chalk.yellow('\nErrors encountered:'));
				result.data.details
					.filter((d) => !d.result.success)
					.forEach((d) => {
						console.log(chalk.red(`  - ${d.fileName}: ${d.result.error}`));
					});
			}
		} else {
			console.error(chalk.red(`Error organizing PRDs: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error organizing PRDs:'), error.message);
		process.exit(1);
	}
}

/**
 * Check PRD integrity
 * @param {Object} options - Command options
 * @param {boolean} options.autoFix - Whether to automatically fix issues
 */
function checkPrdIntegrity(options = {}) {
	try {
		const result = performIntegrityCheck(null, null, {
			autoFix: options.autoFix
		});

		console.log(chalk.cyan.bold('\n🔍 PRD Integrity Check Report'));
		console.log(chalk.gray('─'.repeat(50)));

		if (result.overall.valid) {
			console.log(chalk.green('✓ All integrity checks passed'));
		} else {
			console.log(
				chalk.red(
					`✗ Found ${result.overall.errorCount} errors and ${result.overall.warningCount} warnings`
				)
			);
		}

		// Show auto-fix results if performed
		if (result.autoFixResults) {
			const totalFixed = result.autoFixResults.totalFixed || 0;

			if (totalFixed > 0) {
				console.log(chalk.green(`\n🔧 Auto-Fix Results:`));

				// Show file integrity fixes
				if (
					result.autoFixResults.fileIntegrity &&
					result.autoFixResults.fileIntegrity.filesFixed > 0
				) {
					console.log(
						chalk.green(
							`  ✓ Fixed ${result.autoFixResults.fileIntegrity.filesFixed} file integrity issues`
						)
					);

					if (result.autoFixResults.fileIntegrity.details.length > 0) {
						console.log(chalk.gray('\n  File Integrity Details:'));
						result.autoFixResults.fileIntegrity.details.forEach((detail) => {
							console.log(chalk.gray(`    • ${detail}`));
						});
					}
				}

				// Show task link fixes
				if (
					result.autoFixResults.taskLinks &&
					result.autoFixResults.taskLinks.linksFixed > 0
				) {
					console.log(
						chalk.green(
							`  ✓ Fixed ${result.autoFixResults.taskLinks.linksFixed} missing task links`
						)
					);

					if (result.autoFixResults.taskLinks.details.length > 0) {
						console.log(chalk.gray('\n  Task Link Details:'));
						result.autoFixResults.taskLinks.details.forEach((detail) => {
							console.log(chalk.gray(`    • ${detail}`));
						});
					}
				}
			}

			// Show any errors
			const allErrors = [
				...(result.autoFixResults.fileIntegrity?.errors || []),
				...(result.autoFixResults.taskLinks?.errors || [])
			];

			if (allErrors.length > 0) {
				console.log(chalk.red('\n❌ Auto-Fix Errors:'));
				allErrors.forEach((error) => {
					console.log(chalk.red(`  • ${error}`));
				});
			}
		}

		// Show file integrity issues
		const fileIssues = result.fileIntegrity.filter((f) => f.issues.length > 0);
		if (fileIssues.length > 0) {
			console.log(chalk.yellow('\n⚠ File Integrity Issues:'));
			fileIssues.forEach((file) => {
				console.log(chalk.yellow(`  ${file.fileName}:`));
				file.issues.forEach((issue) => {
					const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
					console.log(color(`    - ${issue.message}`));
				});
			});
		}

		// Show linking issues
		if (result.linkingConsistency.issues.length > 0) {
			console.log(chalk.yellow('\n🔗 Task-PRD Linking Issues:'));
			result.linkingConsistency.issues.forEach((issue) => {
				const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
				console.log(color(`  - ${issue.message}`));
			});
		}

		// Show recommendations
		if (result.recommendations.length > 0) {
			console.log(chalk.cyan('\n💡 Recommendations:'));
			result.recommendations.forEach((rec) => {
				console.log(chalk.cyan(`  - ${rec}`));
			});
		}
	} catch (error) {
		console.error(chalk.red('Error checking PRD integrity:'), error.message);
		process.exit(1);
	}
}

// Helper functions for colors
function getStatusColor(status) {
	const colors = {
		pending: chalk.yellow,
		'in-progress': chalk.blue,
		done: chalk.green,
		archived: chalk.gray
	};
	return colors[status] || chalk.white;
}

function getPriorityColor(priority) {
	const colors = {
		low: chalk.green,
		medium: chalk.yellow,
		high: chalk.red
	};
	return colors[priority] || chalk.white;
}

function getComplexityColor(complexity) {
	const colors = {
		low: chalk.green,
		medium: chalk.yellow,
		high: chalk.red
	};
	return colors[complexity] || chalk.white;
}

/**
 * Migrate PRD files into tracking system
 * @param {Object} options - Command options
 */
function migratePrds(options = {}) {
	try {
		const {
			directory = '.',
			dryRun = false,
			extensions = ['.txt', '.md'],
			targetStatus = 'pending',
			moveFiles = true,
			linkTasks = true
		} = options;

		console.log(chalk.cyan.bold('\n🔄 PRD Migration System'));
		console.log(chalk.gray('─'.repeat(50)));

		const migrationOptions = {
			extensions: extensions,
			dryRun: dryRun,
			targetStatus: targetStatus,
			moveToStatusDirectory: moveFiles,
			linkExistingTasks: linkTasks
		};

		const result = discoverAndMigratePrds(directory, migrationOptions);

		if (result.success) {
			if (dryRun) {
				console.log(chalk.blue('🔍 Dry Run Results:'));
				console.log(
					chalk.gray(`Found ${result.data.discovered} potential PRD files`)
				);

				if (result.data.files && result.data.files.length > 0) {
					console.log(chalk.yellow('\n📁 Files that would be migrated:'));
					result.data.files.forEach((file) => {
						console.log(chalk.gray(`  - ${file.fileName} (${file.filePath})`));
					});
				}
			} else {
				const report = generateMigrationReport(result);
				console.log(report);

				if (result.data.migrated > 0) {
					console.log(
						chalk.green(
							`✅ Successfully migrated ${result.data.migrated} PRD files`
						)
					);
				}
				if (result.data.skipped > 0) {
					console.log(
						chalk.yellow(
							`⏭️ Skipped ${result.data.skipped} files (already exist)`
						)
					);
				}
				if (result.data.errors > 0) {
					console.log(
						chalk.red(`❌ ${result.data.errors} files failed to migrate`)
					);
				}
			}
		} else {
			console.error(chalk.red(`Error during migration: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error migrating PRDs:'), error.message);
		process.exit(1);
	}
}

/**
 * Show PRD version history
 * @param {string} prdId - PRD ID
 * @param {Object} options - Command options
 */
function showPrdHistory(prdId, options = {}) {
	try {
		const { limit = 10, changeType, author } = options;

		const result = getVersionHistory(prdId, { limit, changeType, author });

		if (result.success) {
			console.log(chalk.cyan.bold(`\n📚 Version History: ${prdId}`));
			console.log(chalk.gray('─'.repeat(60)));

			console.log(
				`${chalk.bold('Current Version:')} ${result.data.currentVersion}`
			);
			console.log(
				`${chalk.bold('Total Versions:')} ${result.data.totalVersions}`
			);

			if (result.data.history.length === 0) {
				console.log(chalk.yellow('\nNo version history found.'));
				return;
			}

			console.log(chalk.cyan.bold('\n📋 Version History:'));
			result.data.history.reverse().forEach((entry) => {
				console.log(`\n${chalk.bold('Version:')} ${entry.version}`);
				console.log(
					`${chalk.bold('Date:')} ${new Date(entry.timestamp).toLocaleString()}`
				);
				console.log(`${chalk.bold('Change:')} ${entry.changeType}`);
				console.log(`${chalk.bold('Author:')} ${entry.author}`);

				if (
					entry.changeDetails &&
					Object.keys(entry.changeDetails).length > 0
				) {
					console.log(
						`${chalk.bold('Details:')} ${JSON.stringify(entry.changeDetails, null, 2)}`
					);
				}

				if (entry.snapshot) {
					console.log(
						`${chalk.bold('Status:')} ${getStatusColor(entry.snapshot.status)(entry.snapshot.status)}`
					);
					console.log(
						`${chalk.bold('Priority:')} ${getPriorityColor(entry.snapshot.priority)(entry.snapshot.priority)}`
					);
					console.log(
						`${chalk.bold('Linked Tasks:')} ${entry.snapshot.linkedTaskIds.length}`
					);
				}
			});
		} else {
			console.error(
				chalk.red(`Error getting version history: ${result.error}`)
			);
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error showing PRD history:'), error.message);
		process.exit(1);
	}
}

/**
 * Track PRD file changes
 * @param {string} prdId - PRD ID
 * @param {Object} options - Command options
 */
function trackPrdChanges(prdId, options = {}) {
	try {
		const { author = 'user' } = options;

		const result = trackFileChanges(prdId, { author });

		if (result.success) {
			if (result.data.changed) {
				console.log(chalk.green(`✅ Tracked changes for PRD ${prdId}`));
				console.log(chalk.blue(`📝 New version: ${result.data.version}`));

				if (result.data.changeDetails) {
					const details = result.data.changeDetails;
					console.log(
						`📊 Size change: ${details.previousSize} → ${details.newSize} bytes (${details.sizeChange > 0 ? '+' : ''}${details.sizeChange})`
					);
					console.log(
						`🔍 Hash: ${details.previousHash.substring(0, 8)}... → ${details.newHash.substring(0, 8)}...`
					);
				}
			} else {
				console.log(chalk.blue(`ℹ No changes detected for PRD ${prdId}`));
			}
		} else {
			console.error(chalk.red(`Error tracking changes: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error tracking PRD changes:'), error.message);
		process.exit(1);
	}
}

/**
 * Compare PRD versions
 * @param {string} prdId - PRD ID
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @param {Object} options - Command options
 */
function comparePrdVersions(prdId, version1, version2, options = {}) {
	try {
		const result = compareVersions(prdId, version1, version2);

		if (result.success) {
			console.log(chalk.cyan.bold(`\n🔍 Version Comparison: ${prdId}`));
			console.log(chalk.gray('─'.repeat(60)));

			console.log(
				`${chalk.bold('Version 1:')} ${version1} (${new Date(result.data.version1.timestamp).toLocaleString()})`
			);
			console.log(
				`${chalk.bold('Version 2:')} ${version2} (${new Date(result.data.version2.timestamp).toLocaleString()})`
			);

			if (!result.data.hasChanges) {
				console.log(chalk.green('\n✅ No differences found between versions'));
				return;
			}

			console.log(chalk.yellow.bold('\n📋 Differences:'));
			const diffs = result.data.differences;

			if (diffs.status) {
				console.log(
					`${chalk.bold('Status:')} ${result.data.version1.snapshot.status} → ${result.data.version2.snapshot.status}`
				);
			}
			if (diffs.priority) {
				console.log(
					`${chalk.bold('Priority:')} ${result.data.version1.snapshot.priority} → ${result.data.version2.snapshot.priority}`
				);
			}
			if (diffs.complexity) {
				console.log(
					`${chalk.bold('Complexity:')} ${result.data.version1.snapshot.complexity} → ${result.data.version2.snapshot.complexity}`
				);
			}
			if (diffs.linkedTasks) {
				console.log(
					`${chalk.bold('Linked Tasks:')} ${result.data.version1.snapshot.linkedTaskIds.length} → ${result.data.version2.snapshot.linkedTaskIds.length}`
				);
			}
			if (diffs.fileSize) {
				console.log(
					`${chalk.bold('File Size:')} ${result.data.version1.fileSize} → ${result.data.version2.fileSize} bytes`
				);
			}
			if (diffs.fileHash) {
				console.log(
					`${chalk.bold('File Hash:')} ${result.data.version1.fileHash.substring(0, 16)}... → ${result.data.version2.fileHash.substring(0, 16)}...`
				);
			}
		} else {
			console.error(chalk.red(`Error comparing versions: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error comparing PRD versions:'), error.message);
		process.exit(1);
	}
}

/**
 * Sync PRD file metadata headers with prds.json data
 * @param {string} prdId - Optional specific PRD ID to sync
 * @param {Object} options - Command options
 */
async function syncPrdFileMetadataCommand(prdId, options = {}) {
	try {
		const { syncPrdFileMetadata } = await import(
			'./prd-manager/prd-file-metadata.js'
		);
		const { readPrdsMetadata, findPrdById } = await import(
			'./prd-manager/prd-utils.js'
		);

		console.log(chalk.blue('🔄 Syncing PRD file metadata headers...'));

		// Read PRDs metadata
		const prdsData = readPrdsMetadata();
		if (!prdsData || !prdsData.prds) {
			console.error(chalk.red('❌ Failed to read PRDs metadata'));
			return;
		}

		let prdsToSync = [];

		if (prdId) {
			// Sync specific PRD
			const prd = findPrdById(prdId);
			if (!prd) {
				console.error(chalk.red(`❌ PRD not found: ${prdId}`));
				return;
			}
			prdsToSync = [prd];
		} else {
			// Sync all PRDs
			prdsToSync = prdsData.prds;
		}

		let successCount = 0;
		let errorCount = 0;

		// Process each PRD
		for (const prd of prdsToSync) {
			console.log(chalk.cyan(`📄 Processing PRD ${prd.id}: ${prd.title}`));

			// Determine file path
			let filePath = prd.filePath;

			// Handle relative paths in simplified structure
			if (filePath && !path.isAbsolute(filePath)) {
				const basePrdDir = getPRDStatusDirectory('pending'); // Returns main prd directory
				filePath = path.join(basePrdDir, filePath);
			}

			if (!filePath || !fs.existsSync(filePath)) {
				// Try to find the file in the simplified structure
				const basePrdDir = getPRDStatusDirectory('pending'); // Main prd directory
				const archiveDir = getPRDStatusDirectory('archived'); // Archive directory

				let found = false;

				// First try main prd directory
				const mainPath = path.join(basePrdDir, prd.fileName);
				if (fs.existsSync(mainPath)) {
					filePath = mainPath;
					found = true;
				} else {
					// Try archive directory
					const archivePath = path.join(archiveDir, prd.fileName);
					if (fs.existsSync(archivePath)) {
						filePath = archivePath;
						found = true;
					}
				}

				if (!found) {
					console.error(
						chalk.red(`   ❌ File not found for PRD ${prd.id}: ${prd.fileName}`)
					);
					errorCount++;
					continue;
				}
			}

			try {
				// Sync the file metadata
				const success = syncPrdFileMetadata(filePath, prd);
				if (success) {
					console.log(chalk.green(`   ✅ Updated metadata for ${prd.id}`));
					successCount++;
				} else {
					console.error(
						chalk.red(`   ❌ Failed to update metadata for ${prd.id}`)
					);
					errorCount++;
				}
			} catch (error) {
				console.error(
					chalk.red(`   ❌ Error processing ${prd.id}: ${error.message}`)
				);
				errorCount++;
			}
		}

		// Summary
		console.log(chalk.blue('\n📊 Sync Summary:'));
		console.log(
			chalk.green(`   ✅ Successfully updated: ${successCount} PRDs`)
		);
		if (errorCount > 0) {
			console.log(chalk.red(`   ❌ Failed to update: ${errorCount} PRDs`));
		}
		console.log(
			chalk.cyan(`   📄 Total processed: ${successCount + errorCount} PRDs`)
		);

		if (successCount > 0) {
			console.log(chalk.green('\n🎉 PRD file metadata sync completed!'));
			console.log(
				chalk.blue(
					'📋 PRD files now have updated metadata headers similar to task files'
				)
			);
		}
	} catch (error) {
		console.error(
			chalk.red('❌ Error syncing PRD file metadata:'),
			error.message
		);
		process.exit(1);
	}
}

/**
 * Archive a completed PRD and all associated tasks
 * @param {string} prdId - PRD ID to archive (optional for interactive mode)
 * @param {Object} options - Command options
 */
async function archivePrdCommand(prdId, options = {}) {
	try {
		const { force = false, dryRun = false, interactive = true } = options;

		if (!prdId && interactive) {
			// Interactive mode - show selection interface
			const result = await interactivePrdArchive({
				prdsPath: getPRDsJsonPath(),
				tasksPath: getTasksJsonPath(),
				archiveDir: getPRDStatusDirectory('archived'),
				force,
				dryRun
			});

			if (result.cancelled) {
				console.log(chalk.yellow('📦 Archive operation cancelled.'));
				return;
			}

			if (!result.success) {
				console.error(chalk.red(`❌ Archive failed: ${result.error}`));
				process.exit(1);
			}

			return;
		}

		if (!prdId) {
			console.error(
				chalk.red('❌ PRD ID is required when not in interactive mode.')
			);
			console.log(
				chalk.gray('Remove --no-interactive flag for selection interface.')
			);
			process.exit(1);
		}

		// Direct archive mode
		console.log(chalk.blue(`📦 Archiving PRD ${prdId}...`));

		const result = await archivePrd(prdId, {
			prdsPath: getPRDsJsonPath(),
			tasksPath: getTasksJsonPath(),
			archiveDir: getPRDStatusDirectory('archived'),
			force,
			dryRun
		});

		if (result.success) {
			if (dryRun) {
				console.log(chalk.blue('🔍 Dry Run Results:'));
				console.log(
					chalk.gray(`PRD: ${result.data.prd.id} - ${result.data.prd.title}`)
				);
				console.log(chalk.gray(`Status: ${result.data.prd.status}`));
				console.log(
					chalk.gray(`Associated Tasks: ${result.data.linkedTasks.length}`)
				);

				if (!result.data.taskValidation.isValid) {
					console.log(
						chalk.yellow(
							`⚠️  ${result.data.taskValidation.incompleteTasks.length} tasks are not completed`
						)
					);
				}
			} else {
				console.log(chalk.green('✅ Archive completed successfully!'));
				console.log(chalk.blue(`📦 Archive: ${result.data.archivePath}`));
				console.log(
					chalk.blue(`📋 Tasks archived: ${result.data.archivedTaskCount}`)
				);
			}
		} else {
			console.error(chalk.red(`❌ Archive failed: ${result.error}`));

			if (result.data && result.data.incompleteTasks) {
				console.log(chalk.yellow('\n⚠️  Incomplete tasks:'));
				result.data.incompleteTasks.forEach((task) => {
					console.log(
						chalk.gray(`  • Task ${task.id}: ${task.title} (${task.status})`)
					);
				});
				console.log(chalk.gray('\nUse --force to archive anyway.'));
			}

			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('❌ Error archiving PRD:'), error.message);
		process.exit(1);
	}
}

/**
 * Extract a PRD archive command
 * @param {string} archivePath - Path to archive file
 * @param {Object} options - Extract options
 */
async function extractPrdArchiveCommand(archivePath, options = {}) {
	try {
		if (!archivePath) {
			console.error(chalk.red('❌ Archive path is required'));
			process.exit(1);
		}

		const { outputDir = './extracted' } = options;

		console.log(chalk.blue(`📦 Extracting PRD archive: ${archivePath}`));
		console.log(chalk.gray(`Output directory: ${outputDir}`));

		const result = await extractPrdArchive(archivePath, outputDir);

		if (result.success) {
			console.log(chalk.green('✅ Archive extracted successfully!'));
			console.log(chalk.cyan('\n📋 Extracted files:'));
			result.data.extractedFiles.forEach((file) => {
				console.log(chalk.gray(`  • ${file}`));
			});

			if (result.data.metadata) {
				console.log(chalk.cyan('\n📊 Archive metadata:'));
				console.log(chalk.gray(`  PRD ID: ${result.data.metadata.prdId}`));
				console.log(chalk.gray(`  Title: ${result.data.metadata.prdTitle}`));
				console.log(
					chalk.gray(`  Archived: ${result.data.metadata.archivedDate}`)
				);
				console.log(chalk.gray(`  Tasks: ${result.data.metadata.taskCount}`));
			}
		} else {
			console.error(chalk.red(`❌ Extraction failed: ${result.error}`));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('❌ Error extracting archive:'), error.message);
		process.exit(1);
	}
}

/**
 * Migrate legacy GZIP archives to proper ZIP format
 * @param {Object} options - Command options
 */
async function migrateLegacyArchivesCommand(options = {}) {
	try {
		const { archiveDir = null, dryRun = false } = options;

		console.log(
			chalk.blue('🔄 Migrating legacy archive files to proper ZIP format...')
		);

		if (dryRun) {
			console.log(
				chalk.yellow('📋 DRY RUN MODE - No files will be modified\n')
			);
		}

		const result = await migrateAllLegacyArchives(archiveDir);

		if (result.success) {
			console.log(chalk.green('\n✅ Migration completed successfully!'));

			const summaryBox = boxen(
				`${chalk.bold('Migration Summary:')}\n` +
					`Archives Migrated: ${chalk.green(result.migrated)}\n` +
					`Already Proper ZIP: ${chalk.blue(result.skipped)}\n` +
					`Errors: ${chalk.red(result.errors.length)}\n` +
					`${result.migrated > 0 ? chalk.gray('Legacy backups created with .legacy.backup extension') : ''}`,
				{
					padding: 1,
					margin: 1,
					borderStyle: 'round',
					borderColor: result.errors.length > 0 ? 'yellow' : 'green'
				}
			);

			console.log(summaryBox);

			if (result.details.length > 0) {
				console.log(chalk.cyan('\n📋 Migration Details:'));
				result.details.forEach((detail) => {
					const statusIcon = detail.status === 'migrated' ? '✅' : '⏭️';
					const reason = detail.reason ? ` (${detail.reason})` : '';
					console.log(
						`  ${statusIcon} ${detail.file}: ${detail.status}${reason}`
					);
				});
			}

			if (result.errors.length > 0) {
				console.log(chalk.red('\n❌ Errors:'));
				result.errors.forEach((error) => {
					console.log(`  ❌ ${error.file}: ${error.error}`);
				});
			}

			if (result.migrated > 0) {
				console.log(
					chalk.green(
						'\n🎉 All legacy archives have been converted to proper ZIP format!'
					)
				);
				console.log(
					chalk.gray(
						'These files can now be opened in Windows Explorer and other standard ZIP tools.'
					)
				);
			} else if (result.skipped > 0 && result.errors.length === 0) {
				console.log(
					chalk.blue('\n✨ All archives are already in proper ZIP format!')
				);
			}
		} else {
			console.log(chalk.red('\n❌ Migration failed:'), result.error);
		}
	} catch (error) {
		console.log(chalk.red('\n❌ Error during migration:'), error.message);
	}
}

export {
	listPrds,
	showPrd,
	updatePrdStatusCommand,
	syncPrdStatus,
	organizePrds,
	checkPrdIntegrity,
	migratePrds,
	showPrdHistory,
	trackPrdChanges,
	comparePrdVersions,
	syncPrdFileMetadataCommand,
	archivePrdCommand,
	extractPrdArchiveCommand,
	migrateLegacyArchivesCommand
};
