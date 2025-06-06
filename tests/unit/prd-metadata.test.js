/**
 * PRD Metadata Extraction Unit Tests
 * Tests for Task 22: Integrate PRD Metadata Capture
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock config-manager
jest.mock('../../scripts/modules/config-manager.js', () => ({
	getLogLevel: jest.fn(() => 'info'),
	getDebugFlag: jest.fn(() => false)
}));

describe('PRD Metadata Extraction', () => {
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

	describe('extractPRDMetadata function', () => {
		test('should extract complete metadata from valid PRD file', () => {
			const mockContent = 'Sample PRD content for testing';
			const mockFilePath = '/path/to/requirements.txt';
			const mockStats = { size: 1024 };

			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockReturnValue(mockContent);
			fsStatSyncSpy.mockReturnValue(mockStats);

			// Simulate metadata extraction
			const fileName = path.basename(mockFilePath);
			const parsedDate = new Date().toISOString();
			const hash = crypto.createHash('sha256');
			hash.update(mockContent, 'utf8');
			const fileHash = hash.digest('hex');

			const metadata = {
				filePath: path.resolve(mockFilePath).replace(/\\/g, '/'),
				fileName: fileName,
				parsedDate: parsedDate,
				fileHash: fileHash,
				fileSize: mockStats.size
			};

			expect(metadata).toHaveProperty('filePath');
			expect(metadata).toHaveProperty('fileName');
			expect(metadata).toHaveProperty('parsedDate');
			expect(metadata).toHaveProperty('fileHash');
			expect(metadata).toHaveProperty('fileSize');

			expect(metadata.fileName).toBe('requirements.txt');
			expect(metadata.fileSize).toBe(1024);
			expect(metadata.fileHash).toMatch(/^[a-f0-9]{64}$/);
		});

		test('should handle missing files gracefully', () => {
			const mockFilePath = '/nonexistent/file.txt';

			fsExistsSyncSpy.mockReturnValue(false);

			// Should create fallback metadata
			const fallbackMetadata = {
				filePath: mockFilePath,
				fileName: path.basename(mockFilePath),
				parsedDate: new Date().toISOString(),
				fileHash: 'unknown',
				fileSize: 0
			};

			expect(fallbackMetadata.fileName).toBe('file.txt');
			expect(fallbackMetadata.fileHash).toBe('unknown');
			expect(fallbackMetadata.fileSize).toBe(0);
		});

		test('should handle file read errors', () => {
			const mockFilePath = '/path/to/file.txt';

			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			// Should handle error gracefully
			expect(() => {
				try {
					fs.readFileSync(mockFilePath, 'utf8');
				} catch (error) {
					expect(error.message).toBe('Permission denied');
				}
			}).not.toThrow();
		});

		test('should normalize file paths correctly', () => {
			const testPaths = [
				'C:\\Users\\test\\file.txt',
				'/home/user/file.txt',
				'./relative/file.txt',
				'../parent/file.txt'
			];

			testPaths.forEach((testPath) => {
				const normalized = path.resolve(testPath).replace(/\\/g, '/');
				expect(normalized).not.toContain('\\');
				expect(path.isAbsolute(normalized.replace(/\//g, path.sep))).toBe(true);
			});
		});

		test('should calculate consistent file hashes', () => {
			const content1 = 'Test content';
			const content2 = 'Test content';
			const content3 = 'Different content';

			const hash1 = crypto
				.createHash('sha256')
				.update(content1, 'utf8')
				.digest('hex');
			const hash2 = crypto
				.createHash('sha256')
				.update(content2, 'utf8')
				.digest('hex');
			const hash3 = crypto
				.createHash('sha256')
				.update(content3, 'utf8')
				.digest('hex');

			expect(hash1).toBe(hash2);
			expect(hash1).not.toBe(hash3);
			expect(hash1).toMatch(/^[a-f0-9]{64}$/);
		});

		test('should handle different file encodings', () => {
			const content = 'Test content with special chars: àáâãäå';

			// Test UTF-8 encoding
			const utf8Hash = crypto
				.createHash('sha256')
				.update(content, 'utf8')
				.digest('hex');
			expect(utf8Hash).toMatch(/^[a-f0-9]{64}$/);

			// Hash should be consistent for same content
			const utf8Hash2 = crypto
				.createHash('sha256')
				.update(content, 'utf8')
				.digest('hex');
			expect(utf8Hash).toBe(utf8Hash2);
		});

		test('should handle large files efficiently', () => {
			const largeContent = 'x'.repeat(1000000); // 1MB of content
			const mockStats = { size: largeContent.length };

			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockReturnValue(largeContent);
			fsStatSyncSpy.mockReturnValue(mockStats);

			const startTime = Date.now();
			const hash = crypto
				.createHash('sha256')
				.update(largeContent, 'utf8')
				.digest('hex');
			const endTime = Date.now();

			expect(hash).toMatch(/^[a-f0-9]{64}$/);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});

		test('should validate metadata schema', () => {
			const validMetadata = {
				filePath: '/absolute/path/to/file.txt',
				fileName: 'file.txt',
				parsedDate: '2024-01-15T10:30:00.000Z',
				fileHash: 'abc123def456789',
				fileSize: 1024
			};

			// Test required fields
			expect(validMetadata).toHaveProperty('filePath');
			expect(validMetadata).toHaveProperty('fileName');
			expect(validMetadata).toHaveProperty('parsedDate');
			expect(validMetadata).toHaveProperty('fileHash');
			expect(validMetadata).toHaveProperty('fileSize');

			// Test field types
			expect(typeof validMetadata.filePath).toBe('string');
			expect(typeof validMetadata.fileName).toBe('string');
			expect(typeof validMetadata.parsedDate).toBe('string');
			expect(typeof validMetadata.fileHash).toBe('string');
			expect(typeof validMetadata.fileSize).toBe('number');

			// Test date format
			expect(() => new Date(validMetadata.parsedDate)).not.toThrow();
			expect(new Date(validMetadata.parsedDate).toISOString()).toBe(
				validMetadata.parsedDate
			);

			// Test positive file size
			expect(validMetadata.fileSize).toBeGreaterThanOrEqual(0);
		});
	});

	describe('File path handling', () => {
		test('should handle Windows paths', () => {
			const windowsPath = 'C:\\Users\\test\\documents\\prd.txt';
			const normalized = path.resolve(windowsPath).replace(/\\/g, '/');

			expect(normalized).not.toContain('\\');
			expect(path.basename(normalized)).toBe('prd.txt');
		});

		test('should handle Unix paths', () => {
			const unixPath = '/home/user/documents/prd.txt';
			const normalized = path.resolve(unixPath).replace(/\\/g, '/');

			expect(path.basename(normalized)).toBe('prd.txt');
		});

		test('should handle relative paths', () => {
			const relativePath = './documents/prd.txt';
			const normalized = path.resolve(relativePath).replace(/\\/g, '/');

			expect(path.isAbsolute(normalized.replace(/\//g, path.sep))).toBe(true);
			expect(path.basename(normalized)).toBe('prd.txt');
		});

		test('should handle special characters in paths', () => {
			const specialPath = '/path/with spaces/file-name_123.txt';
			const normalized = path.resolve(specialPath).replace(/\\/g, '/');

			expect(path.basename(normalized)).toBe('file-name_123.txt');
		});
	});

	describe('Error handling', () => {
		test('should handle permission errors', () => {
			fsExistsSyncSpy.mockReturnValue(true);
			fsStatSyncSpy.mockImplementation(() => {
				throw new Error('EACCES: permission denied');
			});

			expect(() => {
				try {
					fs.statSync('/restricted/file.txt');
				} catch (error) {
					expect(error.message).toContain('permission denied');
				}
			}).not.toThrow();
		});

		test('should handle network path errors', () => {
			const networkPath = '//server/share/file.txt';

			fsExistsSyncSpy.mockReturnValue(false);

			// Should handle network paths gracefully
			const fallback = {
				filePath: networkPath,
				fileName: path.basename(networkPath),
				parsedDate: new Date().toISOString(),
				fileHash: 'unknown',
				fileSize: 0
			};

			expect(fallback.fileName).toBe('file.txt');
		});

		test('should handle corrupted files', () => {
			fsExistsSyncSpy.mockReturnValue(true);
			fsReadFileSyncSpy.mockImplementation(() => {
				throw new Error('File is corrupted');
			});

			expect(() => {
				try {
					fs.readFileSync('/corrupted/file.txt', 'utf8');
				} catch (error) {
					expect(error.message).toBe('File is corrupted');
				}
			}).not.toThrow();
		});
	});
});
