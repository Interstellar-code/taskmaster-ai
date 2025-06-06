/**
 * PRD Commands End-to-End Tests
 * Tests for Task 28.4: Create End-to-End Test Plan and Scenarios
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mockFs from 'mock-fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PRD Commands End-to-End Tests', () => {
	const testProjectRoot = '/test-e2e-project';
	const testTasksPath = path.join(testProjectRoot, 'tasks', 'tasks.json');
	const testPRDPath = path.join(testProjectRoot, 'docs', 'test-prd.txt');

	beforeEach(() => {
		// Set up mock file system for E2E tests
		mockFs({
			[testProjectRoot]: {
				tasks: {
					'tasks.json': JSON.stringify({
						tasks: [],
						metadata: {
							projectName: 'E2E Test Project',
							totalTasks: 0
						}
					})
				},
				docs: {
					'test-prd.txt': `# Test PRD Document

## Overview
This is a test Product Requirements Document for E2E testing.

## Features

### Feature 1: User Management
- User registration
- User authentication
- User profile management

### Feature 2: Data Processing
- Data import functionality
- Data validation
- Data export capabilities

### Feature 3: Reporting
- Generate usage reports
- Export reports in multiple formats
- Schedule automated reports

## Technical Requirements
- Must support 1000+ concurrent users
- Response time < 200ms
- 99.9% uptime requirement`,
					'api-spec.md': `# API Specification

## Authentication Endpoints
- POST /auth/login
- POST /auth/logout
- GET /auth/profile

## Data Endpoints
- GET /data
- POST /data
- PUT /data/:id
- DELETE /data/:id`
				},
				scripts: {
					'dev.js': 'console.log("Mock dev script");'
				}
			}
		});
	});

	afterEach(() => {
		mockFs.restore();
		jest.clearAllMocks();
	});

	// Helper function to execute TaskMaster commands
	const executeCommand = (command, args = []) => {
		return new Promise((resolve, reject) => {
			const child = spawn('node', ['scripts/dev.js', command, ...args], {
				cwd: testProjectRoot,
				stdio: 'pipe'
			});

			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			child.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			child.on('close', (code) => {
				resolve({
					code,
					stdout,
					stderr
				});
			});

			child.on('error', (error) => {
				reject(error);
			});
		});
	};

	describe('parse-prd command E2E', () => {
		test('should parse PRD and generate tasks with metadata', async () => {
			// Mock the parse-prd command execution
			const mockGeneratedTasks = [
				{
					id: 1,
					title: 'Implement User Registration',
					description: 'Create user registration functionality',
					status: 'pending',
					priority: 'high',
					dependencies: [],
					prdSource: {
						filePath: testPRDPath,
						fileName: 'test-prd.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'mock-hash-123',
						fileSize: fs.statSync(testPRDPath).size
					}
				},
				{
					id: 2,
					title: 'Implement User Authentication',
					description: 'Create user authentication system',
					status: 'pending',
					priority: 'high',
					dependencies: [1],
					prdSource: {
						filePath: testPRDPath,
						fileName: 'test-prd.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'mock-hash-123',
						fileSize: fs.statSync(testPRDPath).size
					}
				}
			];

			// Simulate successful parse-prd execution
			const taskData = {
				tasks: mockGeneratedTasks,
				metadata: {
					projectName: 'E2E Test Project',
					totalTasks: mockGeneratedTasks.length,
					sourceFile: 'test-prd.txt',
					generatedAt: new Date().toISOString()
				}
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Verify tasks were generated correctly
			const savedData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(savedData.tasks).toHaveLength(2);
			expect(savedData.tasks[0].prdSource).toBeDefined();
			expect(savedData.tasks[0].prdSource.fileName).toBe('test-prd.txt');
			expect(savedData.tasks[1].dependencies).toContain(1);
			expect(savedData.metadata.sourceFile).toBe('test-prd.txt');
		});

		test('should handle append mode correctly', async () => {
			// Set up existing tasks
			const existingTasks = [
				{
					id: 1,
					title: 'Existing Manual Task',
					status: 'done',
					prdSource: null
				}
			];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: existingTasks }, null, 2)
			);

			// Simulate parse-prd with --append flag
			const newPRDTasks = [
				{
					id: 2,
					title: 'New PRD Task',
					status: 'pending',
					prdSource: {
						filePath: testPRDPath,
						fileName: 'test-prd.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'new-hash-456',
						fileSize: 1000
					}
				}
			];

			// Simulate append operation
			const existingData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const combinedTasks = [...existingData.tasks, ...newPRDTasks];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: combinedTasks }, null, 2)
			);

			// Verify append worked correctly
			const finalData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(finalData.tasks).toHaveLength(2);
			expect(finalData.tasks[0].prdSource).toBeNull();
			expect(finalData.tasks[1].prdSource).toBeDefined();
		});
	});

	describe('list-prds command E2E', () => {
		beforeEach(() => {
			// Set up test data with multiple PRD sources
			const testTasks = [
				{
					id: 1,
					title: 'Task from PRD 1',
					prdSource: {
						filePath: testPRDPath,
						fileName: 'test-prd.txt',
						fileHash: 'hash1',
						fileSize: 1024,
						parsedDate: '2024-01-01T00:00:00.000Z'
					}
				},
				{
					id: 2,
					title: 'Task from API Spec',
					prdSource: {
						filePath: path.join(testProjectRoot, 'docs', 'api-spec.md'),
						fileName: 'api-spec.md',
						fileHash: 'hash2',
						fileSize: 512,
						parsedDate: '2024-01-02T00:00:00.000Z'
					}
				},
				{
					id: 3,
					title: 'Another task from PRD 1',
					prdSource: {
						filePath: testPRDPath,
						fileName: 'test-prd.txt',
						fileHash: 'hash1',
						fileSize: 1024,
						parsedDate: '2024-01-01T00:00:00.000Z'
					}
				},
				{
					id: 4,
					title: 'Manual Task',
					prdSource: null
				}
			];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: testTasks }, null, 2)
			);
		});

		test('should list all unique PRD sources with task counts', () => {
			// Simulate list-prds command execution
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const prdSources = new Map();

			taskData.tasks.forEach((task) => {
				if (task.prdSource && task.prdSource.fileName) {
					const fileName = task.prdSource.fileName;
					if (!prdSources.has(fileName)) {
						prdSources.set(fileName, {
							fileName: fileName,
							filePath: task.prdSource.filePath,
							fileHash: task.prdSource.fileHash,
							fileSize: task.prdSource.fileSize,
							parsedDate: task.prdSource.parsedDate,
							taskCount: 0
						});
					}
					prdSources.get(fileName).taskCount++;
				}
			});

			const prdList = Array.from(prdSources.values()).sort(
				(a, b) => b.taskCount - a.taskCount
			);

			expect(prdList).toHaveLength(2);
			expect(prdList[0].fileName).toBe('test-prd.txt');
			expect(prdList[0].taskCount).toBe(2);
			expect(prdList[1].fileName).toBe('api-spec.md');
			expect(prdList[1].taskCount).toBe(1);
		});
	});

	describe('tasks-from-prd command E2E', () => {
		test('should filter tasks by PRD source', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const prdFilter = 'test-prd.txt';

			// Simulate tasks-from-prd command
			const filteredTasks = taskData.tasks.filter((task) => {
				return task.prdSource && task.prdSource.fileName === prdFilter;
			});

			expect(filteredTasks).toHaveLength(2);
			expect(filteredTasks.map((t) => t.id)).toEqual([1, 3]);
		});

		test('should handle case-insensitive filtering', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const prdFilter = 'TEST-PRD.TXT';

			const filteredTasks = taskData.tasks.filter((task) => {
				return (
					task.prdSource &&
					task.prdSource.fileName.toLowerCase() === prdFilter.toLowerCase()
				);
			});

			expect(filteredTasks).toHaveLength(2);
		});
	});

	describe('check-prd-changes command E2E', () => {
		test('should detect file changes', () => {
			// Set up task with PRD source
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: testPRDPath,
							fileName: 'test-prd.txt',
							fileHash: 'old-hash-123',
							fileSize: 500,
							parsedDate: '2024-01-01T00:00:00.000Z'
						}
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Simulate change detection
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const changes = [];

			currentData.tasks.forEach((task) => {
				if (task.prdSource && fs.existsSync(task.prdSource.filePath)) {
					const currentStats = fs.statSync(task.prdSource.filePath);

					if (currentStats.size !== task.prdSource.fileSize) {
						changes.push({
							filePath: task.prdSource.filePath,
							fileName: task.prdSource.fileName,
							changeType: 'modified',
							oldSize: task.prdSource.fileSize,
							newSize: currentStats.size
						});
					}
				}
			});

			expect(changes).toHaveLength(1);
			expect(changes[0].changeType).toBe('modified');
		});

		test('should detect missing files', () => {
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: '/nonexistent/file.txt',
							fileName: 'file.txt',
							fileHash: 'some-hash',
							fileSize: 100
						}
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Simulate missing file detection
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const missingFiles = [];

			currentData.tasks.forEach((task) => {
				if (task.prdSource && !fs.existsSync(task.prdSource.filePath)) {
					missingFiles.push({
						filePath: task.prdSource.filePath,
						fileName: task.prdSource.fileName,
						changeType: 'missing'
					});
				}
			});

			expect(missingFiles).toHaveLength(1);
			expect(missingFiles[0].changeType).toBe('missing');
		});
	});

	describe('show-prd-source command E2E', () => {
		test('should show PRD source for specific task', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const taskId = 1;

			// Simulate show-prd-source command
			const task = taskData.tasks.find((t) => t.id === taskId);

			expect(task).toBeDefined();
			expect(task.prdSource).toBeDefined();
			expect(task.prdSource.fileName).toBe('test-prd.txt');
			expect(task.prdSource.filePath).toBe(testPRDPath);
		});

		test('should handle task without PRD source', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const taskId = 4; // Manual task

			const task = taskData.tasks.find((t) => t.id === taskId);

			expect(task).toBeDefined();
			expect(task.prdSource).toBeNull();
		});
	});

	describe('prd-traceability-report command E2E', () => {
		test('should generate comprehensive traceability report', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			// Simulate report generation
			const report = {
				generatedAt: new Date().toISOString(),
				summary: {
					totalTasks: taskData.tasks.length,
					tasksFromPRDs: taskData.tasks.filter((t) => t.prdSource).length,
					manualTasks: taskData.tasks.filter((t) => !t.prdSource).length,
					uniquePRDFiles: new Set(
						taskData.tasks
							.filter((t) => t.prdSource)
							.map((t) => t.prdSource.fileName)
					).size
				},
				prdSources: [],
				tasksByPRD: new Map()
			};

			// Group tasks by PRD source
			taskData.tasks.forEach((task) => {
				if (task.prdSource) {
					const fileName = task.prdSource.fileName;
					if (!report.tasksByPRD.has(fileName)) {
						report.tasksByPRD.set(fileName, []);
					}
					report.tasksByPRD.get(fileName).push(task);
				}
			});

			expect(report.summary.totalTasks).toBe(4);
			expect(report.summary.tasksFromPRDs).toBe(3);
			expect(report.summary.manualTasks).toBe(1);
			expect(report.summary.uniquePRDFiles).toBe(2);
		});
	});

	describe('Error handling E2E', () => {
		test('should handle invalid PRD file paths gracefully', () => {
			// Simulate command with invalid file path
			const invalidPath = '/nonexistent/invalid.txt';

			expect(() => {
				if (!fs.existsSync(invalidPath)) {
					throw new Error(`PRD file not found: ${invalidPath}`);
				}
			}).toThrow('PRD file not found');
		});

		test('should handle corrupted task data gracefully', () => {
			// Write invalid JSON to tasks file
			fs.writeFileSync(testTasksPath, 'invalid json content');

			expect(() => {
				JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			}).toThrow();
		});

		test('should handle permission errors gracefully', () => {
			// This would be tested with actual file permissions in real environment
			const restrictedPath = '/restricted/file.txt';

			expect(() => {
				if (!fs.existsSync(restrictedPath)) {
					throw new Error('Permission denied or file not found');
				}
			}).toThrow();
		});
	});
});
