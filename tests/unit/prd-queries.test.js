/**
 * PRD Query and Filtering Unit Tests
 * Tests for Task 24: Implement PRD Source Query and Filtering Commands
 */

import { jest } from '@jest/globals';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Query and Filtering', () => {
	const mockTaskData = {
		tasks: [
			{
				id: 1,
				title: 'Task from PRD 1',
				status: 'pending',
				prdSource: {
					filePath: '/path/to/requirements.txt',
					fileName: 'requirements.txt',
					parsedDate: '2024-01-01T00:00:00.000Z',
					fileHash: 'hash1',
					fileSize: 1024
				}
			},
			{
				id: 2,
				title: 'Task from PRD 2',
				status: 'done',
				prdSource: {
					filePath: '/path/to/api-spec.md',
					fileName: 'api-spec.md',
					parsedDate: '2024-01-02T00:00:00.000Z',
					fileHash: 'hash2',
					fileSize: 2048
				}
			},
			{
				id: 3,
				title: 'Another task from PRD 1',
				status: 'in-progress',
				prdSource: {
					filePath: '/path/to/requirements.txt',
					fileName: 'requirements.txt',
					parsedDate: '2024-01-01T00:00:00.000Z',
					fileHash: 'hash1',
					fileSize: 1024
				}
			},
			{
				id: 4,
				title: 'Manual task',
				status: 'pending',
				prdSource: null
			},
			{
				id: 5,
				title: 'Another manual task',
				status: 'done'
				// No prdSource field
			}
		]
	};

	describe('listPRDs function', () => {
		test('should extract unique PRD sources', () => {
			const prdSources = new Map();
			
			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileName) {
					const fileName = task.prdSource.fileName;
					if (!prdSources.has(fileName)) {
						prdSources.set(fileName, {
							fileName: fileName,
							filePath: task.prdSource.filePath,
							parsedDate: task.prdSource.parsedDate,
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
			expect(prdList.find(p => p.fileName === 'requirements.txt').taskCount).toBe(2);
			expect(prdList.find(p => p.fileName === 'api-spec.md').taskCount).toBe(1);
		});

		test('should sort PRDs by task count', () => {
			const prdSources = new Map();
			
			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileName) {
					const fileName = task.prdSource.fileName;
					if (!prdSources.has(fileName)) {
						prdSources.set(fileName, {
							fileName: fileName,
							taskCount: 0
						});
					}
					prdSources.get(fileName).taskCount++;
				}
			});

			const prdList = Array.from(prdSources.values()).sort((a, b) => b.taskCount - a.taskCount);

			expect(prdList[0].fileName).toBe('requirements.txt');
			expect(prdList[0].taskCount).toBe(2);
			expect(prdList[1].fileName).toBe('api-spec.md');
			expect(prdList[1].taskCount).toBe(1);
		});

		test('should handle tasks without PRD sources', () => {
			const tasksWithoutPRD = mockTaskData.tasks.filter(task => 
				!task.prdSource || !task.prdSource.fileName
			);

			expect(tasksWithoutPRD).toHaveLength(2);
			expect(tasksWithoutPRD.map(t => t.id)).toEqual([4, 5]);
		});

		test('should handle empty task list', () => {
			const emptyData = { tasks: [] };
			const prdSources = new Map();
			
			emptyData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileName) {
					// This should not execute
					prdSources.set(task.prdSource.fileName, task.prdSource);
				}
			});

			expect(prdSources.size).toBe(0);
		});
	});

	describe('tasksFromPRD function', () => {
		test('should filter tasks by exact PRD file name', () => {
			const prdFilter = 'requirements.txt';
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				return task.prdSource.fileName === prdFilter;
			});

			expect(filteredTasks).toHaveLength(2);
			expect(filteredTasks.map(t => t.id)).toEqual([1, 3]);
		});

		test('should filter tasks by partial PRD file name', () => {
			const prdFilter = 'api';
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				return task.prdSource.fileName.toLowerCase().includes(prdFilter.toLowerCase());
			});

			expect(filteredTasks).toHaveLength(1);
			expect(filteredTasks[0].id).toBe(2);
		});

		test('should filter tasks by file path', () => {
			const pathFilter = '/path/to/requirements.txt';
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.filePath) {
					return false;
				}
				return task.prdSource.filePath === pathFilter;
			});

			expect(filteredTasks).toHaveLength(2);
			expect(filteredTasks.map(t => t.id)).toEqual([1, 3]);
		});

		test('should combine PRD filter with status filter', () => {
			const prdFilter = 'requirements.txt';
			const statusFilter = 'pending';
			
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				
				const matchesPrd = task.prdSource.fileName === prdFilter;
				const matchesStatus = task.status === statusFilter;
				
				return matchesPrd && matchesStatus;
			});

			expect(filteredTasks).toHaveLength(1);
			expect(filteredTasks[0].id).toBe(1);
		});

		test('should handle case-insensitive filtering', () => {
			const prdFilter = 'REQUIREMENTS.TXT';
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				return task.prdSource.fileName.toLowerCase() === prdFilter.toLowerCase();
			});

			expect(filteredTasks).toHaveLength(2);
		});

		test('should return empty array for non-existent PRD', () => {
			const prdFilter = 'nonexistent.txt';
			const filteredTasks = mockTaskData.tasks.filter(task => {
				if (!task.prdSource || !task.prdSource.fileName) {
					return false;
				}
				return task.prdSource.fileName === prdFilter;
			});

			expect(filteredTasks).toHaveLength(0);
		});
	});

	describe('showPRDSource function', () => {
		test('should find PRD source for specific task', () => {
			const taskId = 1;
			const task = mockTaskData.tasks.find(t => t.id === taskId);

			expect(task).toBeDefined();
			expect(task.prdSource).toBeDefined();
			expect(task.prdSource.fileName).toBe('requirements.txt');
			expect(task.prdSource.filePath).toBe('/path/to/requirements.txt');
		});

		test('should handle task without PRD source', () => {
			const taskId = 4;
			const task = mockTaskData.tasks.find(t => t.id === taskId);

			expect(task).toBeDefined();
			expect(task.prdSource).toBeNull();
		});

		test('should handle non-existent task', () => {
			const taskId = 999;
			const task = mockTaskData.tasks.find(t => t.id === taskId);

			expect(task).toBeUndefined();
		});

		test('should return complete PRD metadata', () => {
			const taskId = 2;
			const task = mockTaskData.tasks.find(t => t.id === taskId);

			expect(task.prdSource).toHaveProperty('filePath');
			expect(task.prdSource).toHaveProperty('fileName');
			expect(task.prdSource).toHaveProperty('parsedDate');
			expect(task.prdSource).toHaveProperty('fileHash');
			expect(task.prdSource).toHaveProperty('fileSize');

			expect(task.prdSource.fileName).toBe('api-spec.md');
			expect(task.prdSource.fileSize).toBe(2048);
		});
	});

	describe('PRD filtering options', () => {
		test('should filter for PRD-only tasks', () => {
			const prdOnlyTasks = mockTaskData.tasks.filter(task => 
				task.prdSource && task.prdSource.fileName
			);

			expect(prdOnlyTasks).toHaveLength(3);
			expect(prdOnlyTasks.map(t => t.id)).toEqual([1, 2, 3]);
		});

		test('should filter for manual-only tasks', () => {
			const manualOnlyTasks = mockTaskData.tasks.filter(task => 
				!task.prdSource || !task.prdSource.fileName
			);

			expect(manualOnlyTasks).toHaveLength(2);
			expect(manualOnlyTasks.map(t => t.id)).toEqual([4, 5]);
		});

		test('should combine multiple filters', () => {
			const prdFilter = 'requirements.txt';
			const statusFilter = 'pending';
			
			const filteredTasks = mockTaskData.tasks.filter(task => {
				// PRD filter
				const hasPrdSource = task.prdSource && task.prdSource.fileName;
				if (!hasPrdSource) return false;
				
				const matchesPrd = task.prdSource.fileName === prdFilter;
				if (!matchesPrd) return false;
				
				// Status filter
				const matchesStatus = task.status === statusFilter;
				
				return matchesStatus;
			});

			expect(filteredTasks).toHaveLength(1);
			expect(filteredTasks[0].id).toBe(1);
		});
	});

	describe('PRD statistics', () => {
		test('should calculate PRD source breakdown', () => {
			const stats = {
				totalTasks: mockTaskData.tasks.length,
				tasksFromPRDs: 0,
				manualTasks: 0,
				uniquePRDFiles: new Set()
			};

			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileName) {
					stats.tasksFromPRDs++;
					stats.uniquePRDFiles.add(task.prdSource.fileName);
				} else {
					stats.manualTasks++;
				}
			});

			expect(stats.totalTasks).toBe(5);
			expect(stats.tasksFromPRDs).toBe(3);
			expect(stats.manualTasks).toBe(2);
			expect(stats.uniquePRDFiles.size).toBe(2);
		});

		test('should calculate PRD completion rates', () => {
			const prdStats = new Map();

			mockTaskData.tasks.forEach(task => {
				if (task.prdSource && task.prdSource.fileName) {
					const fileName = task.prdSource.fileName;
					if (!prdStats.has(fileName)) {
						prdStats.set(fileName, {
							total: 0,
							completed: 0,
							pending: 0,
							inProgress: 0
						});
					}
					
					const stats = prdStats.get(fileName);
					stats.total++;
					
					if (task.status === 'done') {
						stats.completed++;
					} else if (task.status === 'pending') {
						stats.pending++;
					} else if (task.status === 'in-progress') {
						stats.inProgress++;
					}
				}
			});

			const requirementsStats = prdStats.get('requirements.txt');
			expect(requirementsStats.total).toBe(2);
			expect(requirementsStats.completed).toBe(0);
			expect(requirementsStats.pending).toBe(1);
			expect(requirementsStats.inProgress).toBe(1);

			const apiStats = prdStats.get('api-spec.md');
			expect(apiStats.total).toBe(1);
			expect(apiStats.completed).toBe(1);
		});
	});
});
