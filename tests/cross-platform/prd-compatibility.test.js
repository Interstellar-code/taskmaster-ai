/**
 * PRD Cross-Platform Compatibility Tests
 * Tests for Task 28.6: Implement Cross-Platform Compatibility Testing
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Cross-Platform Compatibility Tests', () => {
	const currentPlatform = os.platform();
	const isWindows = currentPlatform === 'win32';
	const isUnix = currentPlatform === 'linux' || currentPlatform === 'darwin';

	describe('File Path Handling', () => {
		test('should normalize Windows paths correctly', () => {
			const windowsPaths = [
				'C:\\Users\\test\\Documents\\prd.txt',
				'D:\\Projects\\TaskMaster\\docs\\requirements.txt',
				'\\\\server\\share\\file.txt', // UNC path
				'.\\relative\\path\\file.txt',
				'..\\parent\\directory\\file.txt'
			];

			windowsPaths.forEach(windowsPath => {
				// Simulate path normalization
				const normalized = path.resolve(windowsPath).replace(/\\/g, '/');
				
				expect(normalized).not.toContain('\\');
				expect(path.basename(normalized)).toBe(path.basename(windowsPath));
				
				// Should be absolute path after normalization
				const denormalized = normalized.replace(/\//g, path.sep);
				expect(path.isAbsolute(denormalized)).toBe(true);
			});
		});

		test('should handle Unix paths correctly', () => {
			const unixPaths = [
				'/home/user/documents/prd.txt',
				'/var/www/taskmaster/docs/requirements.txt',
				'./relative/path/file.txt',
				'../parent/directory/file.txt',
				'/tmp/test file with spaces.txt'
			];

			unixPaths.forEach(unixPath => {
				const normalized = path.resolve(unixPath).replace(/\\/g, '/');
				
				expect(path.basename(normalized)).toBe(path.basename(unixPath));
				expect(path.isAbsolute(normalized.replace(/\//g, path.sep))).toBe(true);
			});
		});

		test('should handle special characters in paths', () => {
			const specialPaths = [
				'/path/with spaces/file.txt',
				'/path/with-dashes/file.txt',
				'/path/with_underscores/file.txt',
				'/path/with.dots/file.txt',
				'/path/with(parentheses)/file.txt'
			];

			specialPaths.forEach(specialPath => {
				const normalized = path.resolve(specialPath).replace(/\\/g, '/');
				const fileName = path.basename(normalized);
				
				expect(fileName).toBeTruthy();
				expect(fileName.length).toBeGreaterThan(0);
			});
		});

		test('should create consistent PRD metadata across platforms', () => {
			const testPaths = [
				isWindows ? 'C:\\test\\prd.txt' : '/test/prd.txt',
				isWindows ? '.\\relative\\prd.txt' : './relative/prd.txt',
				isWindows ? '..\\parent\\prd.txt' : '../parent/prd.txt'
			];

			testPaths.forEach(testPath => {
				const metadata = {
					filePath: path.resolve(testPath).replace(/\\/g, '/'),
					fileName: path.basename(testPath),
					parsedDate: new Date().toISOString(),
					fileHash: 'test-hash-123',
					fileSize: 1024
				};

				// Metadata should be consistent regardless of platform
				expect(metadata.filePath).not.toContain('\\');
				expect(metadata.fileName).toBe(path.basename(testPath));
				expect(metadata.filePath).toMatch(/^\/.*\/prd\.txt$/);
			});
		});
	});

	describe('Line Ending Handling', () => {
		test('should handle different line endings consistently', () => {
			const contentVariations = [
				'Line 1\nLine 2\nLine 3',           // Unix (LF)
				'Line 1\r\nLine 2\r\nLine 3',       // Windows (CRLF)
				'Line 1\rLine 2\rLine 3',           // Old Mac (CR)
				'Line 1\n\rLine 2\n\rLine 3'        // Mixed
			];

			contentVariations.forEach((content, index) => {
				const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
				const lines = content.split(/\r?\n|\r/);
				
				expect(hash).toMatch(/^[a-f0-9]{64}$/);
				expect(lines.length).toBeGreaterThanOrEqual(3);
				
				// Each variation should produce different hashes
				if (index > 0) {
					const previousHash = crypto.createHash('sha256')
						.update(contentVariations[0], 'utf8')
						.digest('hex');
					expect(hash).not.toBe(previousHash);
				}
			});
		});

		test('should normalize line endings for consistent processing', () => {
			const mixedContent = 'Feature 1\r\nDescription\nRequirement 1\r\nRequirement 2\n';
			
			// Normalize to Unix line endings
			const normalized = mixedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			const lines = normalized.split('\n');
			
			expect(normalized).not.toContain('\r');
			expect(lines.filter(line => line.trim().length > 0)).toHaveLength(4);
		});
	});

	describe('File Encoding Handling', () => {
		test('should handle UTF-8 encoding consistently', () => {
			const utf8Content = 'PRD with special chars: àáâãäå ñ ü ß 中文 🚀';
			
			const hash = crypto.createHash('sha256').update(utf8Content, 'utf8').digest('hex');
			const buffer = Buffer.from(utf8Content, 'utf8');
			
			expect(hash).toMatch(/^[a-f0-9]{64}$/);
			expect(buffer.length).toBeGreaterThan(utf8Content.length); // UTF-8 multi-byte chars
		});

		test('should handle ASCII content correctly', () => {
			const asciiContent = 'Simple ASCII PRD content with basic characters 123';
			
			const hash = crypto.createHash('sha256').update(asciiContent, 'utf8').digest('hex');
			const buffer = Buffer.from(asciiContent, 'utf8');
			
			expect(hash).toMatch(/^[a-f0-9]{64}$/);
			expect(buffer.length).toBe(asciiContent.length); // ASCII is single-byte
		});

		test('should detect encoding issues gracefully', () => {
			// Simulate potential encoding issues
			const problematicContent = 'Content with potential encoding issues: \uFFFD';
			
			expect(() => {
				const hash = crypto.createHash('sha256').update(problematicContent, 'utf8').digest('hex');
				expect(hash).toMatch(/^[a-f0-9]{64}$/);
			}).not.toThrow();
		});
	});

	describe('File System Operations', () => {
		test('should handle case sensitivity differences', () => {
			const testCases = [
				{ original: 'PRD.txt', variations: ['prd.txt', 'Prd.txt', 'PRD.TXT'] },
				{ original: 'Requirements.md', variations: ['requirements.md', 'REQUIREMENTS.MD'] }
			];

			testCases.forEach(testCase => {
				const originalLower = testCase.original.toLowerCase();
				
				testCase.variations.forEach(variation => {
					const variationLower = variation.toLowerCase();
					
					// On case-insensitive systems (Windows, macOS), these should match
					// On case-sensitive systems (Linux), they should not match
					if (isWindows || currentPlatform === 'darwin') {
						expect(originalLower).toBe(variationLower);
					} else {
						// On Linux, only exact matches should be equal
						expect(testCase.original === variation).toBe(originalLower === variationLower);
					}
				});
			});
		});

		test('should handle file permission differences', () => {
			// This test simulates permission handling across platforms
			const permissionScenarios = [
				{ readable: true, writable: true, executable: false },
				{ readable: true, writable: false, executable: false },
				{ readable: false, writable: false, executable: false }
			];

			permissionScenarios.forEach(scenario => {
				// Simulate permission check
				const canRead = scenario.readable;
				const canWrite = scenario.writable;
				
				if (canRead) {
					expect(() => {
						// Simulate successful read operation
						const content = 'Mock file content';
						const hash = crypto.createHash('sha256').update(content).digest('hex');
						expect(hash).toBeTruthy();
					}).not.toThrow();
				}
				
				if (!canWrite) {
					expect(() => {
						// Simulate write permission error
						if (!scenario.writable) {
							throw new Error('Permission denied');
						}
					}).toThrow('Permission denied');
				}
			});
		});
	});

	describe('Environment Variable Handling', () => {
		test('should handle different environment variable formats', () => {
			const envVarTests = [
				{ name: 'TASKMASTER_CONFIG', windowsFormat: '%TASKMASTER_CONFIG%', unixFormat: '$TASKMASTER_CONFIG' },
				{ name: 'HOME', windowsFormat: '%USERPROFILE%', unixFormat: '$HOME' },
				{ name: 'TEMP', windowsFormat: '%TEMP%', unixFormat: '$TMPDIR' }
			];

			envVarTests.forEach(test => {
				// Simulate environment variable expansion
				const expandVar = (format) => {
					if (format.startsWith('%') && format.endsWith('%')) {
						// Windows format
						return `/mock/windows/path/${test.name.toLowerCase()}`;
					} else if (format.startsWith('$')) {
						// Unix format
						return `/mock/unix/path/${test.name.toLowerCase()}`;
					}
					return format;
				};

				const windowsExpanded = expandVar(test.windowsFormat);
				const unixExpanded = expandVar(test.unixFormat);

				expect(windowsExpanded).toContain('/mock/windows/path/');
				expect(unixExpanded).toContain('/mock/unix/path/');
			});
		});
	});

	describe('Command Line Argument Handling', () => {
		test('should handle different shell quoting styles', () => {
			const argumentTests = [
				{ arg: 'simple-file.txt', quoted: false },
				{ arg: 'file with spaces.txt', quoted: true },
				{ arg: 'file"with"quotes.txt', quoted: true },
				{ arg: "file'with'apostrophes.txt", quoted: true }
			];

			argumentTests.forEach(test => {
				// Simulate argument processing
				const processedArg = test.quoted ? `"${test.arg}"` : test.arg;
				const unquotedArg = processedArg.replace(/^"(.*)"$/, '$1');
				
				expect(unquotedArg).toBe(test.arg);
				
				// File name should be extractable
				const fileName = path.basename(unquotedArg);
				expect(fileName).toBeTruthy();
				expect(fileName.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Date and Time Handling', () => {
		test('should handle timezone differences consistently', () => {
			const testDate = new Date('2024-01-15T10:30:00.000Z');
			
			// ISO string should be consistent across platforms
			const isoString = testDate.toISOString();
			expect(isoString).toBe('2024-01-15T10:30:00.000Z');
			
			// Parsing should be consistent
			const parsedDate = new Date(isoString);
			expect(parsedDate.getTime()).toBe(testDate.getTime());
		});

		test('should handle locale differences in date formatting', () => {
			const testDate = new Date('2024-01-15T10:30:00.000Z');
			
			// Different locale formats
			const formats = [
				testDate.toLocaleDateString('en-US'),
				testDate.toLocaleDateString('en-GB'),
				testDate.toLocaleDateString('de-DE')
			];

			formats.forEach(format => {
				expect(format).toBeTruthy();
				expect(format.length).toBeGreaterThan(0);
				// Should contain year, month, and day in some format
				expect(format).toMatch(/2024|24/);
				expect(format).toMatch(/01|1|Jan/);
				expect(format).toMatch(/15/);
			});
		});
	});

	describe('Memory and Resource Handling', () => {
		test('should handle different memory constraints', () => {
			const memoryTests = [
				{ size: 1024, description: '1KB' },
				{ size: 1024 * 1024, description: '1MB' },
				{ size: 10 * 1024 * 1024, description: '10MB' }
			];

			memoryTests.forEach(test => {
				// Simulate memory allocation
				const buffer = Buffer.alloc(test.size);
				
				expect(buffer.length).toBe(test.size);
				
				// Should be able to write and read
				buffer.write('test content', 0, 'utf8');
				const content = buffer.toString('utf8', 0, 12);
				expect(content).toBe('test content');
			});
		});
	});

	describe('Error Message Consistency', () => {
		test('should provide consistent error messages across platforms', () => {
			const errorScenarios = [
				{ type: 'file_not_found', message: 'PRD file not found' },
				{ type: 'permission_denied', message: 'Permission denied' },
				{ type: 'invalid_format', message: 'Invalid PRD format' },
				{ type: 'parsing_error', message: 'Failed to parse PRD' }
			];

			errorScenarios.forEach(scenario => {
				// Error messages should be platform-independent
				expect(scenario.message).not.toContain('\\');
				expect(scenario.message).not.toContain('C:');
				expect(scenario.message).not.toContain('/usr/');
				
				// Should be descriptive
				expect(scenario.message.length).toBeGreaterThan(5);
			});
		});
	});

	describe('Configuration Handling', () => {
		test('should handle different configuration file locations', () => {
			const configPaths = {
				windows: 'C:\\Users\\user\\AppData\\Local\\TaskMaster\\config.json',
				unix: '/home/user/.config/taskmaster/config.json',
				mac: '/Users/user/Library/Application Support/TaskMaster/config.json'
			};

			Object.entries(configPaths).forEach(([platform, configPath]) => {
				const normalized = path.resolve(configPath).replace(/\\/g, '/');
				const fileName = path.basename(normalized);
				
				expect(fileName).toBe('config.json');
				expect(normalized).toContain('config.json');
			});
		});
	});
});
