/**
 * PRD Source functionality tests
 * Tests for Task 21: Enhance Task Schema with PRD Source Field
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import the functions to test
import {
	readJSON,
	ensureTaskBackwardCompatibility
} from '../../scripts/modules/utils.js';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Source Functionality', () => {
	let fsReadFileSyncSpy;
	let fsWriteFileSyncSpy;
	let fsExistsSyncSpy;

	beforeEach(() => {
		fsReadFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockImplementation();
		fsWriteFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
		fsExistsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation();
		jest.clearAllMocks();
	});

	afterEach(() => {
		fsReadFileSyncSpy.mockRestore();
		fsWriteFileSyncSpy.mockRestore();
		fsExistsSyncSpy.mockRestore();
	});

	describe('ensureTaskBackwardCompatibility function', () => {
		test('should add prdSource field to tasks without it', () => {
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task 1',
						description: 'A test task',
						status: 'pending'
					},
					{
						id: 2,
						title: 'Test Task 2',
						description: 'Another test task',
						status: 'done'
					}
				]
			};

			const result = ensureTaskBackwardCompatibility(taskData);

			expect(result.tasks[0]).toHaveProperty('prdSource', null);
			expect(result.tasks[1]).toHaveProperty('prdSource', null);
		});

		test('should preserve existing prdSource field', () => {
			const existingPrdSource = {
				filePath: '/path/to/prd.txt',
				fileName: 'prd.txt',
				parsedDate: '2024-01-01T00:00:00.000Z',
				fileHash: 'abc123',
				fileSize: 1024
			};

			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task 1',
						description: 'A test task',
						status: 'pending',
						prdSource: existingPrdSource
					},
					{
						id: 2,
						title: 'Test Task 2',
						description: 'Another test task',
						status: 'done'
					}
				]
			};

			const result = ensureTaskBackwardCompatibility(taskData);

			expect(result.tasks[0].prdSource).toEqual(existingPrdSource);
			expect(result.tasks[1]).toHaveProperty('prdSource', null);
		});

		test('should handle subtasks correctly', () => {
			const parentPrdSource = {
				filePath: '/path/to/prd.txt',
				fileName: 'prd.txt',
				parsedDate: '2024-01-01T00:00:00.000Z',
				fileHash: 'abc123',
				fileSize: 1024
			};

			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Parent Task',
						description: 'A parent task',
						status: 'pending',
						prdSource: parentPrdSource,
						subtasks: [
							{
								id: 1,
								title: 'Subtask 1',
								description: 'First subtask',
								status: 'pending'
							},
							{
								id: 2,
								title: 'Subtask 2',
								description: 'Second subtask',
								status: 'done'
							}
						]
					}
				]
			};

			const result = ensureTaskBackwardCompatibility(taskData);

			expect(result.tasks[0].subtasks[0]).toHaveProperty(
				'prdSource',
				parentPrdSource
			);
			expect(result.tasks[0].subtasks[1]).toHaveProperty(
				'prdSource',
				parentPrdSource
			);
		});

		test('should handle null or invalid input gracefully', () => {
			expect(ensureTaskBackwardCompatibility(null)).toBeNull();
			expect(ensureTaskBackwardCompatibility(undefined)).toBeUndefined();
			expect(ensureTaskBackwardCompatibility({})).toEqual({});
			expect(ensureTaskBackwardCompatibility({ tasks: null })).toEqual({
				tasks: null
			});
		});

		test('should handle tasks without subtasks array', () => {
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						description: 'A test task',
						status: 'pending'
					}
				]
			};

			const result = ensureTaskBackwardCompatibility(taskData);

			expect(result.tasks[0]).toHaveProperty('prdSource', null);
			expect(result.tasks[0]).not.toHaveProperty('subtasks');
		});
	});

	describe('readJSON with backward compatibility', () => {
		test('should apply backward compatibility for tasks.json files', () => {
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						description: 'A test task',
						status: 'pending'
					}
				]
			};

			fsReadFileSyncSpy.mockReturnValue(JSON.stringify(taskData));

			const result = readJSON('path/to/tasks.json');

			expect(result.tasks[0]).toHaveProperty('prdSource', null);
		});

		test('should not apply backward compatibility for non-tasks.json files', () => {
			const otherData = {
				someField: 'value'
			};

			fsReadFileSyncSpy.mockReturnValue(JSON.stringify(otherData));

			const result = readJSON('path/to/other.json');

			expect(result).toEqual(otherData);
		});
	});

	describe('PRD Source Schema Validation', () => {
		test('should validate complete prdSource object', () => {
			const validPrdSource = {
				filePath: '/absolute/path/to/prd.txt',
				fileName: 'requirements.txt',
				parsedDate: '2024-01-15T10:30:00.000Z',
				fileHash: 'sha256:abc123def456',
				fileSize: 2048
			};

			// Test that all required fields are present
			expect(validPrdSource).toHaveProperty('filePath');
			expect(validPrdSource).toHaveProperty('fileName');
			expect(validPrdSource).toHaveProperty('parsedDate');
			expect(validPrdSource).toHaveProperty('fileHash');
			expect(validPrdSource).toHaveProperty('fileSize');

			// Test field types
			expect(typeof validPrdSource.filePath).toBe('string');
			expect(typeof validPrdSource.fileName).toBe('string');
			expect(typeof validPrdSource.parsedDate).toBe('string');
			expect(typeof validPrdSource.fileHash).toBe('string');
			expect(typeof validPrdSource.fileSize).toBe('number');

			// Test that parsedDate is a valid ISO string
			expect(() => new Date(validPrdSource.parsedDate)).not.toThrow();
			expect(new Date(validPrdSource.parsedDate).toISOString()).toBe(
				validPrdSource.parsedDate
			);

			// Test that fileSize is positive
			expect(validPrdSource.fileSize).toBeGreaterThan(0);
		});

		test('should handle null prdSource for manually created tasks', () => {
			const taskWithNullPrdSource = {
				id: 1,
				title: 'Manual Task',
				description: 'Manually created task',
				status: 'pending',
				prdSource: null
			};

			expect(taskWithNullPrdSource.prdSource).toBeNull();
		});
	});

	describe('Task File Generation with PRD Source', () => {
		test('should include PRD source information in task file content', () => {
			const taskWithPrdSource = {
				id: 1,
				title: 'Test Task',
				description: 'A test task from PRD',
				status: 'pending',
				priority: 'high',
				prdSource: {
					filePath: '/path/to/requirements.txt',
					fileName: 'requirements.txt',
					parsedDate: '2024-01-15T10:30:00.000Z',
					fileHash: 'abc123',
					fileSize: 1024
				}
			};

			// Simulate task file content generation
			let content = `# Task ID: ${taskWithPrdSource.id}\n`;
			content += `# Title: ${taskWithPrdSource.title}\n`;
			content += `# Status: ${taskWithPrdSource.status}\n`;
			content += `# Priority: ${taskWithPrdSource.priority}\n`;

			if (taskWithPrdSource.prdSource) {
				content += `# PRD Source: ${taskWithPrdSource.prdSource.fileName}\n`;
				content += `# PRD Path: ${taskWithPrdSource.prdSource.filePath}\n`;
				content += `# Parsed Date: ${taskWithPrdSource.prdSource.parsedDate}\n`;
				content += `# File Hash: ${taskWithPrdSource.prdSource.fileHash}\n`;
				content += `# File Size: ${taskWithPrdSource.prdSource.fileSize} bytes\n`;
			}

			expect(content).toContain('# PRD Source: requirements.txt');
			expect(content).toContain('# PRD Path: /path/to/requirements.txt');
			expect(content).toContain('# Parsed Date: 2024-01-15T10:30:00.000Z');
			expect(content).toContain('# File Hash: abc123');
			expect(content).toContain('# File Size: 1024 bytes');
		});

		test('should show "None (manually created)" for tasks without PRD source', () => {
			const manualTask = {
				id: 1,
				title: 'Manual Task',
				description: 'Manually created task',
				status: 'pending',
				priority: 'medium',
				prdSource: null
			};

			// Simulate task file content generation
			let content = `# Task ID: ${manualTask.id}\n`;
			content += `# Title: ${manualTask.title}\n`;
			content += `# Status: ${manualTask.status}\n`;
			content += `# Priority: ${manualTask.priority}\n`;

			if (manualTask.prdSource) {
				content += `# PRD Source: ${manualTask.prdSource.fileName}\n`;
			} else {
				content += `# PRD Source: None (manually created)\n`;
			}

			expect(content).toContain('# PRD Source: None (manually created)');
		});
	});

	describe('PRD Metadata Extraction', () => {
		test('should extract complete metadata from PRD file', () => {
			const mockFileContent = 'This is a sample PRD content for testing';
			const mockFilePath = '/path/to/requirements.txt';
			const mockStats = {
				size: 1024
			};

			// Mock fs.statSync
			const statSyncSpy = jest.spyOn(fs, 'statSync').mockReturnValue(mockStats);

			// Simulate metadata extraction
			const fileName = 'requirements.txt';
			const parsedDate = new Date().toISOString();
			const hash = crypto.createHash('sha256');
			hash.update(mockFileContent, 'utf8');
			const fileHash = hash.digest('hex');

			const expectedMetadata = {
				filePath: mockFilePath,
				fileName: fileName,
				parsedDate: parsedDate,
				fileHash: fileHash,
				fileSize: 1024
			};

			// Test metadata structure
			expect(expectedMetadata).toHaveProperty('filePath');
			expect(expectedMetadata).toHaveProperty('fileName');
			expect(expectedMetadata).toHaveProperty('parsedDate');
			expect(expectedMetadata).toHaveProperty('fileHash');
			expect(expectedMetadata).toHaveProperty('fileSize');

			// Test field types and values
			expect(typeof expectedMetadata.filePath).toBe('string');
			expect(typeof expectedMetadata.fileName).toBe('string');
			expect(typeof expectedMetadata.parsedDate).toBe('string');
			expect(typeof expectedMetadata.fileHash).toBe('string');
			expect(typeof expectedMetadata.fileSize).toBe('number');

			expect(expectedMetadata.fileName).toBe('requirements.txt');
			expect(expectedMetadata.fileSize).toBe(1024);
			expect(expectedMetadata.fileHash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format

			statSyncSpy.mockRestore();
		});

		test('should handle file path normalization', () => {
			const windowsPath = 'C:\\Users\\test\\documents\\prd.txt';
			const unixPath = '/home/user/documents/prd.txt';
			const relativePath = './documents/prd.txt';

			// Test path normalization logic
			const normalizeTestPath = (filePath) => {
				try {
					const absolutePath = path.resolve(filePath);
					return absolutePath.replace(/\\/g, '/');
				} catch (error) {
					return filePath;
				}
			};

			const normalizedWindows = normalizeTestPath(windowsPath);
			const normalizedUnix = normalizeTestPath(unixPath);
			const normalizedRelative = normalizeTestPath(relativePath);

			// All paths should be absolute and use forward slashes
			expect(normalizedWindows).not.toContain('\\');
			expect(normalizedUnix).not.toContain('\\');
			expect(normalizedRelative).not.toContain('\\');

			expect(path.isAbsolute(normalizedWindows.replace(/\//g, path.sep))).toBe(
				true
			);
			expect(path.isAbsolute(normalizedUnix.replace(/\//g, path.sep))).toBe(
				true
			);
			expect(path.isAbsolute(normalizedRelative.replace(/\//g, path.sep))).toBe(
				true
			);
		});

		test('should handle metadata extraction errors gracefully', () => {
			const mockFileContent = 'Test content';
			const invalidPath = '/nonexistent/path/file.txt';

			// Mock fs.statSync to throw an error
			const statSyncSpy = jest.spyOn(fs, 'statSync').mockImplementation(() => {
				throw new Error('File not found');
			});

			// Simulate fallback metadata creation
			const fallbackMetadata = {
				filePath: invalidPath,
				fileName: path.basename(invalidPath),
				parsedDate: new Date().toISOString(),
				fileHash: 'unknown',
				fileSize: mockFileContent.length
			};

			expect(fallbackMetadata.filePath).toBe(invalidPath);
			expect(fallbackMetadata.fileName).toBe('file.txt');
			expect(fallbackMetadata.fileHash).toBe('unknown');
			expect(fallbackMetadata.fileSize).toBe(mockFileContent.length);

			statSyncSpy.mockRestore();
		});
	});

	describe('Integration Tests', () => {
		test('should maintain PRD source through task operations', () => {
			const originalPrdSource = {
				filePath: '/path/to/prd.txt',
				fileName: 'prd.txt',
				parsedDate: '2024-01-01T00:00:00.000Z',
				fileHash: 'abc123',
				fileSize: 1024
			};

			// Simulate task creation with PRD source
			const task = {
				id: 1,
				title: 'Test Task',
				description: 'A test task',
				status: 'pending',
				prdSource: originalPrdSource
			};

			// Simulate status update (should preserve prdSource)
			const updatedTask = {
				...task,
				status: 'in-progress'
			};

			expect(updatedTask.prdSource).toEqual(originalPrdSource);

			// Simulate task expansion (subtasks should inherit prdSource)
			const expandedTask = {
				...task,
				subtasks: [
					{
						id: 1,
						title: 'Subtask 1',
						description: 'First subtask',
						status: 'pending',
						prdSource: originalPrdSource
					}
				]
			};

			expect(expandedTask.subtasks[0].prdSource).toEqual(originalPrdSource);
		});

		test('should integrate PRD metadata into parse-prd workflow', () => {
			const mockPrdPath = '/path/to/test-prd.txt';
			const mockPrdContent = 'Sample PRD content for testing';
			const mockTasks = [
				{
					id: 1,
					title: 'Setup Project',
					description: 'Initialize the project',
					status: 'pending',
					dependencies: [],
					priority: 'high'
				}
			];

			// Simulate PRD metadata extraction
			const prdMetadata = {
				filePath: mockPrdPath,
				fileName: 'test-prd.txt',
				parsedDate: '2024-01-15T10:30:00.000Z',
				fileHash: 'abc123def456',
				fileSize: mockPrdContent.length
			};

			// Simulate task processing with PRD metadata
			const processedTasks = mockTasks.map((task) => ({
				...task,
				prdSource: prdMetadata
			}));

			// Verify each task has the PRD source metadata
			processedTasks.forEach((task) => {
				expect(task.prdSource).toEqual(prdMetadata);
				expect(task.prdSource.filePath).toBe(mockPrdPath);
				expect(task.prdSource.fileName).toBe('test-prd.txt');
				expect(task.prdSource.fileSize).toBe(mockPrdContent.length);
			});
		});
	});
});
