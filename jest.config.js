export default {
	// Use Node.js environment for testing
	testEnvironment: 'node',

	// Enable ES modules support
	preset: null,
	extensionsToTreatAsEsm: ['.js'],
	globals: {
		'ts-jest': {
			useESM: true
		}
	},

	// Automatically clear mock calls between every test
	clearMocks: true,

	// Indicates whether the coverage information should be collected while executing the test
	collectCoverage: false,

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// A list of paths to directories that Jest should use to search for files in
	roots: ['<rootDir>/tests'],

	// The glob patterns Jest uses to detect test files
	testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],

	// Transform files - empty for ES modules
	transform: {},

	// Disable transformations for node_modules
	transformIgnorePatterns: ['/node_modules/'],

	// Set moduleNameMapper for absolute paths and ES modules
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
		'^(\\.{1,2}/.*)\\.js$': '$1'
	},

	// Setup module aliases
	moduleDirectories: ['node_modules', '<rootDir>'],

	// Configure test coverage thresholds
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	},

	// Generate coverage report in these formats
	coverageReporters: ['text', 'lcov'],

	// Verbose output
	verbose: true,

	// Setup file
	setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

	// Force exit and detect open handles
	forceExit: true,
	detectOpenHandles: true,

	// Test timeout
	testTimeout: 30000
};
