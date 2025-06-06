import fs from 'fs';
import path from 'path';
import { log } from '../utils.js';

// Global lock registry for file operations
const fileLocks = new Map();

/**
 * File lock class for thread-safe operations
 */
class FileLock {
	constructor(filePath) {
		this.filePath = filePath;
		this.lockPath = `${filePath}.lock`;
		this.isLocked = false;
		this.lockTimeout = 30000; // 30 seconds timeout
		this.retryInterval = 100; // 100ms retry interval
	}

	/**
	 * Acquire lock for file operations
	 * @param {number} timeout - Timeout in milliseconds
	 * @returns {Promise<boolean>} Success flag
	 */
	async acquire(timeout = this.lockTimeout) {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			try {
				// Try to create lock file exclusively
				fs.writeFileSync(
					this.lockPath,
					JSON.stringify({
						pid: process.pid,
						timestamp: new Date().toISOString(),
						filePath: this.filePath
					}),
					{ flag: 'wx' }
				);

				this.isLocked = true;
				log('debug', `Acquired lock for ${this.filePath}`);
				return true;
			} catch (error) {
				if (error.code === 'EEXIST') {
					// Lock file exists, check if it's stale
					try {
						const lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
						const lockAge = Date.now() - new Date(lockData.timestamp).getTime();

						// If lock is older than timeout, consider it stale and remove it
						if (lockAge > this.lockTimeout) {
							log('warn', `Removing stale lock for ${this.filePath}`);
							fs.unlinkSync(this.lockPath);
							continue;
						}
					} catch (lockReadError) {
						// If we can't read the lock file, try to remove it
						try {
							fs.unlinkSync(this.lockPath);
							continue;
						} catch (unlinkError) {
							// Ignore unlink errors
						}
					}

					// Wait before retrying
					await new Promise((resolve) =>
						setTimeout(resolve, this.retryInterval)
					);
				} else {
					log(
						'error',
						`Error acquiring lock for ${this.filePath}:`,
						error.message
					);
					return false;
				}
			}
		}

		log('error', `Timeout acquiring lock for ${this.filePath}`);
		return false;
	}

	/**
	 * Release the file lock
	 */
	release() {
		if (this.isLocked) {
			try {
				fs.unlinkSync(this.lockPath);
				this.isLocked = false;
				log('debug', `Released lock for ${this.filePath}`);
			} catch (error) {
				log(
					'error',
					`Error releasing lock for ${this.filePath}:`,
					error.message
				);
			}
		}
	}

	/**
	 * Execute function with file lock
	 * @param {Function} fn - Function to execute
	 * @param {number} timeout - Lock timeout
	 * @returns {Promise<any>} Function result
	 */
	async withLock(fn, timeout = this.lockTimeout) {
		const acquired = await this.acquire(timeout);
		if (!acquired) {
			throw new Error(`Failed to acquire lock for ${this.filePath}`);
		}

		try {
			return await fn();
		} finally {
			this.release();
		}
	}
}

/**
 * Get or create file lock for given path
 * @param {string} filePath - File path to lock
 * @returns {FileLock} File lock instance
 */
function getFileLock(filePath) {
	const normalizedPath = path.resolve(filePath);

	if (!fileLocks.has(normalizedPath)) {
		fileLocks.set(normalizedPath, new FileLock(normalizedPath));
	}

	return fileLocks.get(normalizedPath);
}

/**
 * Execute function with thread-safe file access
 * @param {string} filePath - File path to protect
 * @param {Function} operation - Operation to execute
 * @param {number} timeout - Lock timeout in milliseconds
 * @returns {Promise<any>} Operation result
 */
async function withFileLock(filePath, operation, timeout = 30000) {
	const lock = getFileLock(filePath);
	return await lock.withLock(operation, timeout);
}

/**
 * Thread-safe read operation
 * @param {string} filePath - File path to read
 * @param {Function} readFn - Read function to execute
 * @param {number} timeout - Lock timeout
 * @returns {Promise<any>} Read result
 */
async function safeRead(filePath, readFn, timeout = 30000) {
	return await withFileLock(filePath, readFn, timeout);
}

/**
 * Thread-safe write operation
 * @param {string} filePath - File path to write
 * @param {Function} writeFn - Write function to execute
 * @param {number} timeout - Lock timeout
 * @returns {Promise<any>} Write result
 */
async function safeWrite(filePath, writeFn, timeout = 30000) {
	return await withFileLock(filePath, writeFn, timeout);
}

/**
 * Thread-safe atomic file operation with backup
 * @param {string} filePath - File path to operate on
 * @param {Function} operation - Operation to execute
 * @param {Object} options - Operation options
 * @returns {Promise<any>} Operation result
 */
async function atomicFileOperation(filePath, operation, options = {}) {
	const {
		createBackup = true,
		backupSuffix = '.backup',
		timeout = 30000
	} = options;

	const backupPath = createBackup ? `${filePath}${backupSuffix}` : null;

	return await withFileLock(
		filePath,
		async () => {
			let backupCreated = false;

			try {
				// Create backup if requested and file exists
				if (createBackup && fs.existsSync(filePath)) {
					fs.copyFileSync(filePath, backupPath);
					backupCreated = true;
					log('debug', `Created backup: ${backupPath}`);
				}

				// Execute the operation
				const result = await operation();

				// Remove backup on success
				if (backupCreated && fs.existsSync(backupPath)) {
					fs.unlinkSync(backupPath);
					log('debug', `Removed backup: ${backupPath}`);
				}

				return result;
			} catch (error) {
				// Restore from backup on error
				if (backupCreated && fs.existsSync(backupPath)) {
					try {
						fs.copyFileSync(backupPath, filePath);
						fs.unlinkSync(backupPath);
						log('info', `Restored from backup: ${backupPath}`);
					} catch (restoreError) {
						log(
							'error',
							`Failed to restore from backup:`,
							restoreError.message
						);
					}
				}

				throw error;
			}
		},
		timeout
	);
}

/**
 * Clean up stale lock files
 * @param {string} directory - Directory to clean
 * @param {number} maxAge - Maximum age in milliseconds
 */
function cleanupStaleLocks(directory = '.', maxAge = 300000) {
	// 5 minutes default
	try {
		const files = fs.readdirSync(directory);
		const lockFiles = files.filter((file) => file.endsWith('.lock'));

		for (const lockFile of lockFiles) {
			const lockPath = path.join(directory, lockFile);
			try {
				const stats = fs.statSync(lockPath);
				const age = Date.now() - stats.mtime.getTime();

				if (age > maxAge) {
					fs.unlinkSync(lockPath);
					log('info', `Cleaned up stale lock file: ${lockPath}`);
				}
			} catch (error) {
				// Ignore errors for individual lock files
				log('debug', `Error checking lock file ${lockPath}:`, error.message);
			}
		}
	} catch (error) {
		log(
			'error',
			`Error cleaning up stale locks in ${directory}:`,
			error.message
		);
	}
}

/**
 * Initialize thread safety cleanup
 */
function initializeThreadSafety() {
	// Clean up stale locks on startup
	cleanupStaleLocks('prd');
	cleanupStaleLocks('tasks');

	// Set up periodic cleanup
	const cleanupInterval = setInterval(() => {
		cleanupStaleLocks('prd');
		cleanupStaleLocks('tasks');
	}, 60000); // Every minute

	// Clean up on process exit
	process.on('exit', () => {
		clearInterval(cleanupInterval);

		// Release all active locks
		for (const lock of fileLocks.values()) {
			lock.release();
		}

		// Clean up any remaining lock files
		cleanupStaleLocks('prd', 0);
		cleanupStaleLocks('tasks', 0);
	});

	process.on('SIGINT', () => {
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		process.exit(0);
	});
}

export {
	FileLock,
	getFileLock,
	withFileLock,
	safeRead,
	safeWrite,
	atomicFileOperation,
	cleanupStaleLocks,
	initializeThreadSafety
};
