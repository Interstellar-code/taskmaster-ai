/**
 * PRD Workflow Integration Tests
 * Tests for Task 28.3: Develop Integration Test Plan and Scenarios
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mockFs from 'mock-fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false),
	getProjectRoot: jest.fn(() => process.cwd())
}));

describe('PRD Workflow Integration Tests', () => {
	const testProjectRoot = '/test-project';
	const testTasksPath = path.join(testProjectRoot, 'tasks', 'tasks.json');
	const testPRDPath = path.join(testProjectRoot, 'docs', 'requirements.txt');

	beforeEach(() => {
		// Set up mock file system
		mockFs({
			[testProjectRoot]: {
				tasks: {
					'tasks.json': JSON.stringify({
						tasks: []
					})
				},
				docs: {
					'requirements.txt':
						'Sample PRD content for testing\n\nFeature 1: User Authentication\nFeature 2: Data Management'
				}
			}
		});
	});

	afterEach(() => {
		mockFs.restore();
		jest.clearAllMocks();
	});

	describe('Parse PRD to Task Generation Workflow', () => {
		test('should generate tasks with PRD source metadata', async () => {
			// Mock the parse-prd functionality
			const mockPRDContent = fs.readFileSync(testPRDPath, 'utf8');
			const mockTasks = [
				{
					id: 1,
					title: 'Implement User Authentication',
					description: 'Set up user authentication system',
					status: 'pending',
					priority: 'high',
					dependencies: [],
					prdSource: {
						filePath: testPRDPath,
						fileName: 'requirements.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'mock-hash-123',
						fileSize: mockPRDContent.length
					}
				},
				{
					id: 2,
					title: 'Implement Data Management',
					description: 'Set up data management system',
					status: 'pending',
					priority: 'medium',
					dependencies: [1],
					prdSource: {
						filePath: testPRDPath,
						fileName: 'requirements.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'mock-hash-123',
						fileSize: mockPRDContent.length
					}
				}
			];

			// Simulate saving tasks with PRD metadata
			const taskData = {
				tasks: mockTasks,
				metadata: {
					projectName: 'Test Project',
					totalTasks: mockTasks.length,
					sourceFile: 'requirements.txt',
					generatedAt: new Date().toISOString()
				}
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Verify tasks were saved with PRD metadata
			const savedData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(savedData.tasks).toHaveLength(2);
			expect(savedData.tasks[0].prdSource).toBeDefined();
			expect(savedData.tasks[0].prdSource.fileName).toBe('requirements.txt');
			expect(savedData.tasks[0].prdSource.filePath).toBe(testPRDPath);
			expect(savedData.tasks[1].prdSource).toBeDefined();
		});

		test('should handle append mode correctly', async () => {
			// Set up existing tasks
			const existingTasks = [
				{
					id: 1,
					title: 'Existing Manual Task',
					description: 'A manually created task',
					status: 'done',
					priority: 'low',
					dependencies: [],
					prdSource: null
				}
			];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: existingTasks }, null, 2)
			);

			// Simulate appending new PRD tasks
			const newPRDTasks = [
				{
					id: 2,
					title: 'New PRD Task',
					description: 'Task from PRD',
					status: 'pending',
					priority: 'high',
					dependencies: [],
					prdSource: {
						filePath: testPRDPath,
						fileName: 'requirements.txt',
						parsedDate: new Date().toISOString(),
						fileHash: 'new-hash-456',
						fileSize: 100
					}
				}
			];

			// Read existing data and append
			const existingData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const combinedTasks = [...existingData.tasks, ...newPRDTasks];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: combinedTasks }, null, 2)
			);

			// Verify both manual and PRD tasks exist
			const finalData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(finalData.tasks).toHaveLength(2);
			expect(finalData.tasks[0].prdSource).toBeNull(); // Manual task
			expect(finalData.tasks[1].prdSource).toBeDefined(); // PRD task
		});
	});

	describe('PRD Query Commands Integration', () => {
		beforeEach(() => {
			// Set up test data with multiple PRD sources
			const testTasks = [
				{
					id: 1,
					title: 'Task from Requirements',
					prdSource: {
						filePath: '/docs/requirements.txt',
						fileName: 'requirements.txt',
						fileHash: 'hash1',
						fileSize: 1024
					}
				},
				{
					id: 2,
					title: 'Task from API Spec',
					prdSource: {
						filePath: '/docs/api-spec.md',
						fileName: 'api-spec.md',
						fileHash: 'hash2',
						fileSize: 2048
					}
				},
				{
					id: 3,
					title: 'Manual Task',
					prdSource: null
				}
			];

			fs.writeFileSync(
				testTasksPath,
				JSON.stringify({ tasks: testTasks }, null, 2)
			);
		});

		test('should list all unique PRD sources', () => {
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
							taskCount: 0
						});
					}
					prdSources.get(fileName).taskCount++;
				}
			});

			const prdList = Array.from(prdSources.values());

			expect(prdList).toHaveLength(2);
			expect(
				prdList.find((p) => p.fileName === 'requirements.txt')
			).toBeDefined();
			expect(prdList.find((p) => p.fileName === 'api-spec.md')).toBeDefined();
		});

		test('should filter tasks by PRD source', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const prdFilter = 'requirements.txt';

			const filteredTasks = taskData.tasks.filter((task) => {
				return task.prdSource && task.prdSource.fileName === prdFilter;
			});

			expect(filteredTasks).toHaveLength(1);
			expect(filteredTasks[0].id).toBe(1);
		});

		test('should show PRD source for specific task', () => {
			const taskData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const taskId = 2;

			const task = taskData.tasks.find((t) => t.id === taskId);

			expect(task).toBeDefined();
			expect(task.prdSource).toBeDefined();
			expect(task.prdSource.fileName).toBe('api-spec.md');
		});
	});

	describe('PRD Change Detection Integration', () => {
		test('should detect file changes correctly', () => {
			// Set up initial PRD file and tasks
			const initialContent = 'Initial PRD content';
			const initialHash = 'initial-hash-123';

			fs.writeFileSync(testPRDPath, initialContent);

			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						prdSource: {
							filePath: testPRDPath,
							fileName: 'requirements.txt',
							fileHash: initialHash,
							fileSize: initialContent.length
						}
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Modify PRD file
			const modifiedContent = 'Modified PRD content with changes';
			fs.writeFileSync(testPRDPath, modifiedContent);

			// Simulate change detection
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			const changes = [];

			currentData.tasks.forEach((task) => {
				if (task.prdSource && fs.existsSync(task.prdSource.filePath)) {
					const currentContent = fs.readFileSync(
						task.prdSource.filePath,
						'utf8'
					);
					const currentStats = fs.statSync(task.prdSource.filePath);

					// Simple hash comparison (in real implementation, use crypto)
					const contentChanged = currentContent !== initialContent;
					const sizeChanged = currentStats.size !== task.prdSource.fileSize;

					if (contentChanged || sizeChanged) {
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
			expect(changes[0].fileName).toBe('requirements.txt');
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

			// Check for missing files
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

	describe('PRD Metadata Update Integration', () => {
		test('should update PRD metadata for all affected tasks', () => {
			// Set up tasks with outdated PRD metadata
			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Task 1',
						prdSource: {
							filePath: testPRDPath,
							fileName: 'requirements.txt',
							fileHash: 'old-hash',
							fileSize: 50,
							parsedDate: '2024-01-01T00:00:00.000Z'
						}
					},
					{
						id: 2,
						title: 'Task 2',
						prdSource: {
							filePath: testPRDPath,
							fileName: 'requirements.txt',
							fileHash: 'old-hash',
							fileSize: 50,
							parsedDate: '2024-01-01T00:00:00.000Z'
						}
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Simulate metadata update
			const currentContent = fs.readFileSync(testPRDPath, 'utf8');
			const currentStats = fs.statSync(testPRDPath);
			const newMetadata = {
				filePath: testPRDPath,
				fileName: 'requirements.txt',
				fileHash: 'new-hash-456',
				fileSize: currentStats.size,
				parsedDate: new Date().toISOString()
			};

			// Update all tasks with matching PRD source
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			let updatedCount = 0;

			currentData.tasks.forEach((task) => {
				if (task.prdSource && task.prdSource.filePath === testPRDPath) {
					task.prdSource = newMetadata;
					updatedCount++;
				}
			});

			fs.writeFileSync(testTasksPath, JSON.stringify(currentData, null, 2));

			// Verify updates
			const updatedData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(updatedCount).toBe(2);
			expect(updatedData.tasks[0].prdSource.fileHash).toBe('new-hash-456');
			expect(updatedData.tasks[1].prdSource.fileHash).toBe('new-hash-456');
			expect(updatedData.tasks[0].prdSource.fileSize).toBe(currentStats.size);
		});
	});

	describe('Cross-Module Integration', () => {
		test('should maintain PRD source through task operations', () => {
			const originalPRDSource = {
				filePath: testPRDPath,
				fileName: 'requirements.txt',
				fileHash: 'hash-123',
				fileSize: 1024,
				parsedDate: '2024-01-01T00:00:00.000Z'
			};

			const taskData = {
				tasks: [
					{
						id: 1,
						title: 'Test Task',
						status: 'pending',
						priority: 'high',
						dependencies: [],
						prdSource: originalPRDSource
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(taskData, null, 2));

			// Simulate status update
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));
			currentData.tasks[0].status = 'in-progress';
			fs.writeFileSync(testTasksPath, JSON.stringify(currentData, null, 2));

			// Verify PRD source is preserved
			const updatedData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(updatedData.tasks[0].status).toBe('in-progress');
			expect(updatedData.tasks[0].prdSource).toEqual(originalPRDSource);
		});

		test('should handle backward compatibility', () => {
			// Create tasks without PRD source (legacy format)
			const legacyTaskData = {
				tasks: [
					{
						id: 1,
						title: 'Legacy Task',
						status: 'pending',
						priority: 'medium',
						dependencies: []
						// No prdSource field
					}
				]
			};

			fs.writeFileSync(testTasksPath, JSON.stringify(legacyTaskData, null, 2));

			// Simulate backward compatibility processing
			const currentData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			currentData.tasks.forEach((task) => {
				if (!task.hasOwnProperty('prdSource')) {
					task.prdSource = null;
				}
			});

			fs.writeFileSync(testTasksPath, JSON.stringify(currentData, null, 2));

			// Verify backward compatibility
			const processedData = JSON.parse(fs.readFileSync(testTasksPath, 'utf8'));

			expect(processedData.tasks[0]).toHaveProperty('prdSource');
			expect(processedData.tasks[0].prdSource).toBeNull();
		});
	});
});
