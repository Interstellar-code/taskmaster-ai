/**
 * directory-migration.js
 * Handles migration from old directory structure to new .taskmaster/ structure
 */

import fs from 'fs';
import path from 'path';
import { log } from './utils.js';

const NEW_STRUCTURE = {
	tasks: '.taskmaster/tasks',
	prd: '.taskmaster/prd',
	reports: '.taskmaster/reports',
	templates: '.taskmaster/templates',
	config: '.taskmaster/config.json'
};

const OLD_STRUCTURE = {
	tasks: 'tasks',
	prd: 'prd',
	reports: 'scripts', // complexity reports were in scripts/
	templates: 'templates',
	config: '.taskmasterconfig'
};

/**
 * Check if project uses old directory structure
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} True if old structure is detected
 */
export function needsMigration(projectRoot) {
	const oldTasksPath = path.join(projectRoot, OLD_STRUCTURE.tasks);
	const newTasksPath = path.join(projectRoot, NEW_STRUCTURE.tasks);

	// If new structure exists, no migration needed
	if (fs.existsSync(newTasksPath)) {
		return false;
	}

	// If old structure exists, migration needed
	return fs.existsSync(oldTasksPath);
}

/**
 * Create new directory structure
 * @param {string} projectRoot - Project root directory
 */
function createNewDirectories(projectRoot) {
	const directories = [
		'.taskmaster',
		'.taskmaster/tasks',
		'.taskmaster/prd',
		'.taskmaster/reports',
		'.taskmaster/templates'
	];

	for (const dir of directories) {
		const dirPath = path.join(projectRoot, dir);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
			log('info', `Created directory: ${dir}`);
		}
	}
}

/**
 * Copy files from old location to new location
 * @param {string} sourcePath - Source file/directory path
 * @param {string} targetPath - Target file/directory path
 */
function copyRecursive(sourcePath, targetPath) {
	if (!fs.existsSync(sourcePath)) {
		return;
	}

	const stats = fs.statSync(sourcePath);

	if (stats.isDirectory()) {
		if (!fs.existsSync(targetPath)) {
			fs.mkdirSync(targetPath, { recursive: true });
		}

		const files = fs.readdirSync(sourcePath);
		for (const file of files) {
			copyRecursive(path.join(sourcePath, file), path.join(targetPath, file));
		}
	} else {
		fs.copyFileSync(sourcePath, targetPath);
	}
}

/**
 * Migrate tasks directory
 * @param {string} projectRoot - Project root directory
 */
function migrateTasks(projectRoot) {
	const oldPath = path.join(projectRoot, OLD_STRUCTURE.tasks);
	const newPath = path.join(projectRoot, NEW_STRUCTURE.tasks);

	if (fs.existsSync(oldPath)) {
		log('info', 'Migrating tasks directory...');
		copyRecursive(oldPath, newPath);
		log(
			'info',
			`Tasks migrated from ${OLD_STRUCTURE.tasks} to ${NEW_STRUCTURE.tasks}`
		);
	}
}

/**
 * Migrate PRD directory (preserve existing structure)
 * @param {string} projectRoot - Project root directory
 */
function migratePRD(projectRoot) {
	const oldPath = path.join(projectRoot, OLD_STRUCTURE.prd);
	const newPath = path.join(projectRoot, NEW_STRUCTURE.prd);

	if (fs.existsSync(oldPath)) {
		log('info', 'Migrating PRD directory...');
		copyRecursive(oldPath, newPath);
		log(
			'info',
			`PRD files migrated from ${OLD_STRUCTURE.prd} to ${NEW_STRUCTURE.prd}`
		);
	}
}

/**
 * Migrate reports (complexity analysis files from scripts/)
 * @param {string} projectRoot - Project root directory
 */
function migrateReports(projectRoot) {
	const oldScriptsPath = path.join(projectRoot, OLD_STRUCTURE.reports);
	const newReportsPath = path.join(projectRoot, NEW_STRUCTURE.reports);

	if (fs.existsSync(oldScriptsPath)) {
		log('info', 'Migrating complexity reports...');

		// Look for complexity report files
		const files = fs.readdirSync(oldScriptsPath);
		const reportFiles = files.filter(
			(file) => file.includes('complexity') || file.includes('report')
		);

		for (const file of reportFiles) {
			const oldFilePath = path.join(oldScriptsPath, file);
			const newFilePath = path.join(newReportsPath, file);

			if (fs.statSync(oldFilePath).isFile()) {
				fs.copyFileSync(oldFilePath, newFilePath);
				log('info', `Migrated report: ${file}`);
			}
		}
	}
}

/**
 * Migrate templates directory
 * @param {string} projectRoot - Project root directory
 */
function migrateTemplates(projectRoot) {
	const oldPath = path.join(projectRoot, OLD_STRUCTURE.templates);
	const newPath = path.join(projectRoot, NEW_STRUCTURE.templates);

	if (fs.existsSync(oldPath)) {
		log('info', 'Migrating templates directory...');
		copyRecursive(oldPath, newPath);
		log(
			'info',
			`Templates migrated from ${OLD_STRUCTURE.templates} to ${NEW_STRUCTURE.templates}`
		);
	}
}

/**
 * Migrate configuration file
 * @param {string} projectRoot - Project root directory
 */
function migrateConfig(projectRoot) {
	const oldConfigPath = path.join(projectRoot, OLD_STRUCTURE.config);
	const newConfigPath = path.join(projectRoot, NEW_STRUCTURE.config);

	if (fs.existsSync(oldConfigPath)) {
		log('info', 'Migrating configuration file...');
		fs.copyFileSync(oldConfigPath, newConfigPath);
		log(
			'info',
			`Configuration migrated from ${OLD_STRUCTURE.config} to ${NEW_STRUCTURE.config}`
		);
	}
}

/**
 * Perform complete migration from old to new directory structure
 * @param {string} projectRoot - Project root directory
 * @param {boolean} preserveOld - Whether to keep old files after migration
 * @returns {boolean} True if migration was successful
 */
export function migrateDirectoryStructure(projectRoot, preserveOld = true) {
	try {
		log('info', 'Starting directory structure migration...');

		// Create new directory structure
		createNewDirectories(projectRoot);

		// Migrate each component
		migrateTasks(projectRoot);
		migratePRD(projectRoot);
		migrateReports(projectRoot);
		migrateTemplates(projectRoot);
		migrateConfig(projectRoot);

		log('info', 'Directory structure migration completed successfully!');

		if (!preserveOld) {
			log(
				'info',
				'Note: Old files preserved. Use --clean flag to remove them after verification.'
			);
		}

		return true;
	} catch (error) {
		log('error', `Migration failed: ${error.message}`);
		return false;
	}
}

/**
 * Get the appropriate file path based on current directory structure
 * @param {string} projectRoot - Project root directory
 * @param {string} type - Type of path ('tasks', 'prd', 'reports', 'templates', 'config')
 * @returns {string} The correct path for the current structure
 */
export function getStructurePath(projectRoot, type) {
	const newPath = path.join(projectRoot, NEW_STRUCTURE[type]);
	const oldPath = path.join(projectRoot, OLD_STRUCTURE[type]);

	// Prefer new structure if it exists
	if (fs.existsSync(newPath)) {
		return newPath;
	}

	// Fall back to old structure
	if (fs.existsSync(oldPath)) {
		return oldPath;
	}

	// Return new structure path as default (for creation)
	return newPath;
}
