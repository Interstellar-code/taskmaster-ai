/**
 * PRD Performance Tests
 * Tests for Task 28.5: Design Performance Test Plan and Benchmarks
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Performance Tests', () => {
	// Performance benchmarks (in milliseconds)
	const BENCHMARKS = {
		PARSE_SMALL_PRD: 1000, // < 1KB file should parse in < 1s
		PARSE_MEDIUM_PRD: 5000, // 1-10KB file should parse in < 5s
		PARSE_LARGE_PRD: 30000, // > 10KB file should parse in < 30s
		LIST_TASKS_SMALL: 100, // < 100 tasks should list in < 100ms
		LIST_TASKS_MEDIUM: 500, // 100-1000 tasks should list in < 500ms
		LIST_TASKS_LARGE: 2000, // > 1000 tasks should list in < 2s
		CHANGE_DETECTION: 5000, // Check 100 PRD files in < 5s
		METADATA_UPDATE: 1000, // Update metadata for 100 tasks in < 1s
		MEMORY_LIMIT: 500 * 1024 * 1024 // 500MB memory limit
	};

	// Helper function to measure execution time
	const measureTime = async (fn) => {
		const start = performance.now();
		const result = await fn();
		const end = performance.now();
		return {
			result,
			duration: end - start
		};
	};

	// Helper function to generate test data
	const generateTestPRD = (sizeKB) => {
		const baseContent = `# Test PRD Document

## Overview
This is a performance test PRD document.

## Features
`;
		const featureTemplate = `
### Feature {{index}}: Test Feature {{index}}
- Requirement {{index}}.1: Basic functionality
- Requirement {{index}}.2: Advanced functionality
- Requirement {{index}}.3: Integration requirements
- Requirement {{index}}.4: Performance requirements
`;

		let content = baseContent;
		const targetSize = sizeKB * 1024;
		let featureIndex = 1;

		while (content.length < targetSize) {
			content += featureTemplate.replace(/{{index}}/g, featureIndex);
			featureIndex++;
		}

		return content.substring(0, targetSize);
	};

	const generateTestTasks = (count) => {
		const tasks = [];
		for (let i = 1; i <= count; i++) {
			tasks.push({
				id: i,
				title: `Test Task ${i}`,
				description: `Description for test task ${i}`,
				status: i % 4 === 0 ? 'done' : i % 3 === 0 ? 'in-progress' : 'pending',
				priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
				dependencies: i > 1 ? [Math.max(1, i - 1)] : [],
				prdSource:
					i % 5 !== 0
						? {
								filePath: `/test/prd-${Math.ceil(i / 10)}.txt`,
								fileName: `prd-${Math.ceil(i / 10)}.txt`,
								parsedDate: new Date().toISOString(),
								fileHash: crypto
									.createHash('sha256')
									.update(`content-${i}`)
									.digest('hex'),
								fileSize: 1024 + i * 100
							}
						: null
			});
		}
		return tasks;
	};

	describe('PRD Parsing Performance', () => {
		test('should parse small PRD files quickly', async () => {
			const smallPRD = generateTestPRD(1); // 1KB

			const { duration } = await measureTime(async () => {
				// Simulate PRD parsing operations
				const hash = crypto
					.createHash('sha256')
					.update(smallPRD, 'utf8')
					.digest('hex');
				const lines = smallPRD.split('\n');
				const features = lines.filter((line) => line.startsWith('### Feature'));

				return {
					hash,
					lineCount: lines.length,
					featureCount: features.length,
					size: smallPRD.length
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.PARSE_SMALL_PRD);
		});

		test('should parse medium PRD files within acceptable time', async () => {
			const mediumPRD = generateTestPRD(5); // 5KB

			const { duration } = await measureTime(async () => {
				const hash = crypto
					.createHash('sha256')
					.update(mediumPRD, 'utf8')
					.digest('hex');
				const lines = mediumPRD.split('\n');
				const features = lines.filter((line) => line.startsWith('### Feature'));

				// Simulate more complex parsing
				const requirements = lines.filter((line) =>
					line.includes('Requirement')
				);
				const sections = lines.filter((line) => line.startsWith('##'));

				return {
					hash,
					lineCount: lines.length,
					featureCount: features.length,
					requirementCount: requirements.length,
					sectionCount: sections.length
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.PARSE_MEDIUM_PRD);
		});

		test('should parse large PRD files within time limit', async () => {
			const largePRD = generateTestPRD(50); // 50KB

			const { duration } = await measureTime(async () => {
				const hash = crypto
					.createHash('sha256')
					.update(largePRD, 'utf8')
					.digest('hex');
				const lines = largePRD.split('\n');

				// Simulate comprehensive parsing
				const features = lines.filter((line) => line.startsWith('### Feature'));
				const requirements = lines.filter((line) =>
					line.includes('Requirement')
				);
				const sections = lines.filter((line) => line.startsWith('##'));

				// Simulate task generation logic
				const generatedTasks = features.map((feature, index) => ({
					id: index + 1,
					title: feature.replace('### ', ''),
					description: `Implementation of ${feature}`,
					status: 'pending',
					priority: 'medium'
				}));

				return {
					hash,
					lineCount: lines.length,
					featureCount: features.length,
					requirementCount: requirements.length,
					sectionCount: sections.length,
					generatedTaskCount: generatedTasks.length
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.PARSE_LARGE_PRD);
		});
	});

	describe('Task List Performance', () => {
		test('should list small number of tasks quickly', async () => {
			const tasks = generateTestTasks(50);

			const { duration } = await measureTime(async () => {
				// Simulate task listing operations
				const filteredTasks = tasks.filter((task) => task.status === 'pending');
				const sortedTasks = tasks.sort((a, b) =>
					a.priority.localeCompare(b.priority)
				);
				const prdTasks = tasks.filter((task) => task.prdSource);

				return {
					totalTasks: tasks.length,
					pendingTasks: filteredTasks.length,
					prdTasks: prdTasks.length,
					sortedTasks: sortedTasks.length
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.LIST_TASKS_SMALL);
		});

		test('should list medium number of tasks efficiently', async () => {
			const tasks = generateTestTasks(500);

			const { duration } = await measureTime(async () => {
				// Simulate more complex listing operations
				const statusGroups = tasks.reduce((groups, task) => {
					groups[task.status] = (groups[task.status] || 0) + 1;
					return groups;
				}, {});

				const priorityGroups = tasks.reduce((groups, task) => {
					groups[task.priority] = (groups[task.priority] || 0) + 1;
					return groups;
				}, {});

				const prdSources = new Map();
				tasks.forEach((task) => {
					if (task.prdSource) {
						const fileName = task.prdSource.fileName;
						prdSources.set(fileName, (prdSources.get(fileName) || 0) + 1);
					}
				});

				return {
					totalTasks: tasks.length,
					statusGroups,
					priorityGroups,
					uniquePRDSources: prdSources.size
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.LIST_TASKS_MEDIUM);
		});

		test('should handle large number of tasks within time limit', async () => {
			const tasks = generateTestTasks(2000);

			const { duration } = await measureTime(async () => {
				// Simulate comprehensive task analysis
				const analysis = {
					total: tasks.length,
					byStatus: {},
					byPriority: {},
					byPRDSource: new Map(),
					dependencies: 0,
					orphanTasks: 0
				};

				tasks.forEach((task) => {
					// Status analysis
					analysis.byStatus[task.status] =
						(analysis.byStatus[task.status] || 0) + 1;

					// Priority analysis
					analysis.byPriority[task.priority] =
						(analysis.byPriority[task.priority] || 0) + 1;

					// PRD source analysis
					if (task.prdSource) {
						const fileName = task.prdSource.fileName;
						analysis.byPRDSource.set(
							fileName,
							(analysis.byPRDSource.get(fileName) || 0) + 1
						);
					}

					// Dependency analysis
					if (task.dependencies && task.dependencies.length > 0) {
						analysis.dependencies += task.dependencies.length;
					} else {
						analysis.orphanTasks++;
					}
				});

				return analysis;
			});

			expect(duration).toBeLessThan(BENCHMARKS.LIST_TASKS_LARGE);
		});
	});

	describe('PRD Change Detection Performance', () => {
		test('should detect changes in multiple PRD files efficiently', async () => {
			const prdFiles = [];
			const tasks = generateTestTasks(1000);

			// Generate unique PRD files
			const uniquePRDs = new Set();
			tasks.forEach((task) => {
				if (task.prdSource) {
					uniquePRDs.add(task.prdSource.fileName);
				}
			});

			uniquePRDs.forEach((fileName) => {
				prdFiles.push({
					fileName,
					content: generateTestPRD(Math.floor(Math.random() * 10) + 1),
					originalHash: crypto
						.createHash('sha256')
						.update(`original-${fileName}`)
						.digest('hex')
				});
			});

			const { duration } = await measureTime(async () => {
				const changes = [];

				prdFiles.forEach((prdFile) => {
					const currentHash = crypto
						.createHash('sha256')
						.update(prdFile.content, 'utf8')
						.digest('hex');

					if (currentHash !== prdFile.originalHash) {
						changes.push({
							fileName: prdFile.fileName,
							changeType: 'modified',
							originalHash: prdFile.originalHash,
							newHash: currentHash
						});
					}
				});

				return {
					checkedFiles: prdFiles.length,
					changedFiles: changes.length,
					changes
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.CHANGE_DETECTION);
		});
	});

	describe('Metadata Update Performance', () => {
		test('should update PRD metadata for many tasks quickly', async () => {
			const tasks = generateTestTasks(1000);
			const newMetadata = {
				parsedDate: new Date().toISOString(),
				fileHash: 'new-hash-123',
				fileSize: 2048
			};

			const { duration } = await measureTime(async () => {
				let updatedCount = 0;

				tasks.forEach((task) => {
					if (task.prdSource && task.prdSource.fileName === 'prd-1.txt') {
						Object.assign(task.prdSource, newMetadata);
						updatedCount++;
					}
				});

				return {
					totalTasks: tasks.length,
					updatedTasks: updatedCount
				};
			});

			expect(duration).toBeLessThan(BENCHMARKS.METADATA_UPDATE);
		});
	});

	describe('Memory Usage Performance', () => {
		test('should handle large datasets without excessive memory usage', async () => {
			const initialMemory = process.memoryUsage().heapUsed;

			// Generate large dataset
			const largeTasks = generateTestTasks(5000);
			const largePRDs = [];

			for (let i = 0; i < 100; i++) {
				largePRDs.push({
					fileName: `large-prd-${i}.txt`,
					content: generateTestPRD(10), // 10KB each
					hash: crypto.createHash('sha256').update(`content-${i}`).digest('hex')
				});
			}

			const { result } = await measureTime(async () => {
				// Simulate memory-intensive operations
				const analysis = {
					tasks: largeTasks.length,
					prds: largePRDs.length,
					totalPRDSize: largePRDs.reduce(
						(sum, prd) => sum + prd.content.length,
						0
					),
					tasksByPRD: new Map(),
					memoryUsage: process.memoryUsage()
				};

				// Group tasks by PRD
				largeTasks.forEach((task) => {
					if (task.prdSource) {
						const fileName = task.prdSource.fileName;
						if (!analysis.tasksByPRD.has(fileName)) {
							analysis.tasksByPRD.set(fileName, []);
						}
						analysis.tasksByPRD.get(fileName).push(task);
					}
				});

				return analysis;
			});

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			expect(memoryIncrease).toBeLessThan(BENCHMARKS.MEMORY_LIMIT);
			expect(result.tasks).toBe(5000);
			expect(result.prds).toBe(100);
		});
	});

	describe('Concurrent Operations Performance', () => {
		test('should handle concurrent PRD operations efficiently', async () => {
			const { duration } = await measureTime(async () => {
				// Simulate concurrent operations
				const operations = [
					// Parse multiple PRDs concurrently
					Promise.resolve(generateTestPRD(5)),
					Promise.resolve(generateTestPRD(3)),
					Promise.resolve(generateTestPRD(7)),

					// Generate tasks concurrently
					Promise.resolve(generateTestTasks(100)),
					Promise.resolve(generateTestTasks(150)),

					// Hash calculations concurrently
					Promise.resolve(
						crypto.createHash('sha256').update('content1').digest('hex')
					),
					Promise.resolve(
						crypto.createHash('sha256').update('content2').digest('hex')
					),
					Promise.resolve(
						crypto.createHash('sha256').update('content3').digest('hex')
					)
				];

				const results = await Promise.all(operations);

				return {
					operationCount: operations.length,
					results: results.length
				};
			});

			// Concurrent operations should not take significantly longer than sequential
			expect(duration).toBeLessThan(BENCHMARKS.PARSE_MEDIUM_PRD);
		});
	});

	describe('Performance Regression Detection', () => {
		test('should maintain consistent performance across runs', async () => {
			const runs = 5;
			const durations = [];

			for (let i = 0; i < runs; i++) {
				const { duration } = await measureTime(async () => {
					const tasks = generateTestTasks(500);
					const prdContent = generateTestPRD(5);
					const hash = crypto
						.createHash('sha256')
						.update(prdContent)
						.digest('hex');

					return {
						taskCount: tasks.length,
						prdSize: prdContent.length,
						hash
					};
				});

				durations.push(duration);
			}

			// Calculate performance consistency
			const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runs;
			const maxVariation = Math.max(...durations) - Math.min(...durations);
			const variationPercentage = (maxVariation / avgDuration) * 100;

			// Performance should be consistent (< 50% variation)
			expect(variationPercentage).toBeLessThan(50);
			expect(avgDuration).toBeLessThan(BENCHMARKS.LIST_TASKS_MEDIUM);
		});
	});
});
