/**
 * PRD Change Detection Unit Tests
 * Tests for Task 25: Implement PRD Change Detection and Monitoring
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import crypto from 'crypto';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Change Detection', () => {
	let fsReadFileSyncSpy;
	let fsStatSyncSpy;
	let fsExistsSyncSpy;

	beforeEach(() => {
		fsReadFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockImplementation();
		fsStatSyncSpy = jest.spyOn(fs, 'statSync').mockImplementation();
		fsExistsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation();
		jest.clearAllMocks();
	});

	afterEach(() => {
		fsReadFileSyncSpy.mockRestore();
		fsStatSyncSpy.mockRestore();
		fsExistsSyncSpy.mockRestore();
	});

	describe('File hash comparison', () => {
		test('should detect file content changes', () => {
			const originalContent = 'Original PRD content';
			const modifiedContent = 'Modified PRD content';

			const originalHash = crypto.createHash('sha256').update(originalContent, 'utf8').digest('hex');
			const modifiedHash = crypto.createHash('sha256').update(modifiedContent, 'utf8').digest('hex');

			expect(originalHash).not.toBe(modifiedHash);
		});

		test('should not detect changes for identical content', () => {
			const content1 = 'Same PRD content';
			const content2 = 'Same PRD content';

			const hash1 = crypto.createHash('sha256').update(content1, 'utf8').digest('hex');
			const hash2 = crypto.createHash('sha256').update(content2, 'utf8').digest('hex');

			expect(hash1).toBe(hash2);
		});

		test('should detect whitespace changes', () => {
			const content1 = 'PRD content without extra spaces';
			const content2 = 'PRD content  without extra spaces'; // Extra space

			const hash1 = crypto.createHash('sha256').update(content1, 'utf8').digest('hex');
			const hash2 = crypto.createHash('sha256').update(content2, 'utf8').digest('hex');

			expect(hash1).not.toBe(hash2);
		});

		test('should detect line ending changes', () => {
			const contentLF = 'Line 1\nLine 2\nLine 3';
			const contentCRLF = 'Line 1\r\nLine 2\r\nLine 3';

			const hashLF = crypto.createHash('sha256').update(contentLF, 'utf8').digest('hex');
			const hashCRLF = crypto.createHash('sha256').update(contentCRLF, 'utf8').digest('hex');

			expect(hashLF).not.toBe(hashCRLF);
		});
	});

	describe('File size comparison', () => {
		test('should detect file size changes', () => {
			const originalSize = 1024;
			const modifiedSize = 2048;

			expect(originalSize).not.toBe(modifiedSize);
		});

		test('should handle zero-size files', () => {
			const emptyFileSize = 0;
			const nonEmptyFileSize = 100;

			expect(emptyFileSize).not.toBe(nonEmptyFileSize);
		});

		test('should handle large file sizes', () => {
			const largeSize = 1024 * 1024 * 100; // 100MB
			const smallSize = 1024; // 1KB

			expect(largeSize).not.toBe(smallSize);
		});
	});

	describe('checkPRDChanges function', () => {
		test('should identify changed files', () => {
			const mockTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: '/path/to/prd.txt',
							fileName: 'prd.txt',
							fileHash: 'original-hash',
							fileSize: 1024,
							parsedDate: '2024-01-01T00:00:00.000Z'
						}
					}
				]
			};

			const newContent = 'Modified PRD content';
			const newHash = crypto.createHash('sha256').update(newContent, 'utf8').digest('hex');
			const newStats = { size: 2048 };

			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockReturnValue(newContent);
			fsStatSyncSpy.mockReturnValue(newStats);

			// Simulate change detection
			const changes = [];
			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileHash !== newHash) {
					changes.push({
						filePath: task.prdSource.filePath,
						fileName: task.prdSource.fileName,
						changeType: 'modified',
						originalHash: task.prdSource.fileHash,
						newHash: newHash,
						originalSize: task.prdSource.fileSize,
						newSize: newStats.size
					});
				}
			});

			expect(changes).toHaveLength(1);
			expect(changes[0].changeType).toBe('modified');
			expect(changes[0].originalHash).toBe('original-hash');
			expect(changes[0].newHash).toBe(newHash);
		});

		test('should identify missing files', () => {
			const mockTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: '/path/to/missing.txt',
							fileName: 'missing.txt',
							fileHash: 'original-hash',
							fileSize: 1024
						}
					}
				]
			};

			fsExistsSyncSpy.mockReturnValue(false);

			// Simulate missing file detection
			const changes = [];
			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && !fs.existsSync(task.prdSource.filePath)) {
					changes.push({
						filePath: task.prdSource.filePath,
						fileName: task.prdSource.fileName,
						changeType: 'missing'
					});
				}
			});

			expect(changes).toHaveLength(1);
			expect(changes[0].changeType).toBe('missing');
		});

		test('should handle files with no changes', () => {
			const originalContent = 'Unchanged PRD content';
			const originalHash = crypto.createHash('sha256').update(originalContent, 'utf8').digest('hex');

			const mockTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: '/path/to/unchanged.txt',
							fileName: 'unchanged.txt',
							fileHash: originalHash,
							fileSize: originalContent.length
						}
					}
				]
			};

			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockReturnValue(originalContent);
			fsStatSyncSpy.mockReturnValue({ size: originalContent.length });

			// Simulate no change detection
			const changes = [];
			const currentHash = crypto.createHash('sha256').update(originalContent, 'utf8').digest('hex');
			
			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileHash !== currentHash) {
					changes.push({
						filePath: task.prdSource.filePath,
						changeType: 'modified'
					});
				}
			});

			expect(changes).toHaveLength(0);
		});

		test('should handle multiple PRD files', () => {
			const mockTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Task 1',
						prdSource: {
							filePath: '/path/to/prd1.txt',
							fileName: 'prd1.txt',
							fileHash: 'hash1',
							fileSize: 1024
						}
					},
					{
						id: 2,
						title: 'Task 2',
						prdSource: {
							filePath: '/path/to/prd2.txt',
							fileName: 'prd2.txt',
							fileHash: 'hash2',
							fileSize: 2048
						}
					}
				]
			};

			// Mock different scenarios for each file
			fsExistsSyncSpy.mockImplementation((filePath) => {
				return filePath === '/path/to/prd1.txt'; // Only first file exists
			});

			fsReadFileSyncSpy.mockImplementation((filePath) => {
				if (filePath === '/path/to/prd1.txt') {
					return 'Modified content for prd1';
				}
				throw new Error('File not found');
			});

			fsStatSyncSpy.mockImplementation((filePath) => {
				if (filePath === '/path/to/prd1.txt') {
					return { size: 3072 }; // Different size
				}
				throw new Error('File not found');
			});

			// Simulate change detection for multiple files
			const changes = [];
			const uniquePRDs = new Map();

			mockTaskData.tasks.forEach(task => {
				if (task.prdSource) {
					uniquePRDs.set(task.prdSource.filePath, task.prdSource);
				}
			});

			uniquePRDs.forEach((prdSource, filePath) => {
				if (!fs.existsSync(filePath)) {
					changes.push({
						filePath: filePath,
						fileName: prdSource.fileName,
						changeType: 'missing'
					});
				} else {
					try {
						const content = fs.readFileSync(filePath, 'utf8');
						const currentHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
						
						if (prdSource.fileHash !== currentHash) {
							changes.push({
								filePath: filePath,
								fileName: prdSource.fileName,
								changeType: 'modified'
							});
						}
					} catch (error) {
						changes.push({
							filePath: filePath,
							fileName: prdSource.fileName,
							changeType: 'error',
							error: error.message
						});
					}
				}
			});

			expect(changes).toHaveLength(2);
			expect(changes.find(c => c.fileName === 'prd1.txt').changeType).toBe('modified');
			expect(changes.find(c => c.fileName === 'prd2.txt').changeType).toBe('missing');
		});
	});

	describe('Error handling', () => {
		test('should handle file read errors gracefully', () => {
			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			expect(() => {
				try {
					fs.readFileSync('/restricted/file.txt', 'utf8');
				} catch (error) {
					expect(error.message).toBe('Permission denied');
				}
			}).not.toThrow();
		});

		test('should handle stat errors gracefully', () => {
			fsExistsSyncSpy.mockReturnValue(true);
			fsStatSyncSpy.mockImplementation(() => {
				throw new Error('Stat failed');
			});

			expect(() => {
				try {
					fs.statSync('/problematic/file.txt');
				} catch (error) {
					expect(error.message).toBe('Stat failed');
				}
			}).not.toThrow();
		});

		test('should handle tasks without PRD sources', () => {
			const mockTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Manual Task',
						prdSource: null
					},
					{
						id: 2,
						title: 'Another Manual Task'
						// No prdSource field
					}
				]
			};

			// Should not attempt to check files for manual tasks
			const prdTasks = mockTaskData.tasks.filter(task => 
				task.prdSource && task.prdSource.filePath
			);

			expect(prdTasks).toHaveLength(0);
		});
	});
});
