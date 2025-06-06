#!/usr/bin/env node

/**
 * Script to verify TaskMaster AI installation
 * Tests both local and global installations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying TaskMaster AI Installation...\n');

const tests = [
	{
		name: 'Check Node.js version',
		test: () => {
			const version = execSync('node --version', { encoding: 'utf8' }).trim();
			const majorVersion = parseInt(version.slice(1).split('.')[0]);
			if (majorVersion < 18) {
				throw new Error(`Node.js 18+ required, found ${version}`);
			}
			return `✅ Node.js ${version}`;
		}
	},
	{
		name: 'Check npm version',
		test: () => {
			const version = execSync('npm --version', { encoding: 'utf8' }).trim();
			return `✅ npm ${version}`;
		}
	},
	{
		name: 'Check task-master command',
		test: () => {
			try {
				const output = execSync('task-master --version', {
					encoding: 'utf8'
				}).trim();
				return `✅ task-master command available: ${output}`;
			} catch (error) {
				throw new Error('task-master command not found. Run: npm link');
			}
		}
	},
	{
		name: 'Check task-master help',
		test: () => {
			try {
				execSync('task-master --help', { encoding: 'utf8', stdio: 'pipe' });
				return '✅ task-master help command works';
			} catch (error) {
				throw new Error('task-master help command failed');
			}
		}
	},
	{
		name: 'Check MCP server',
		test: () => {
			try {
				const output = execSync('task-master-mcp --version', {
					encoding: 'utf8'
				}).trim();
				return `✅ MCP server available: ${output}`;
			} catch (error) {
				throw new Error('task-master-mcp command not found');
			}
		}
	},
	{
		name: 'Check package.json',
		test: () => {
			const packagePath = path.join(process.cwd(), 'package.json');
			if (!fs.existsSync(packagePath)) {
				throw new Error('package.json not found');
			}
			const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
			return `✅ Package: ${pkg.name}@${pkg.version}`;
		}
	},
	{
		name: 'Check binary files',
		test: () => {
			const binPath = path.join(process.cwd(), 'bin', 'task-master.js');
			const mcpPath = path.join(process.cwd(), 'mcp-server', 'server.js');

			if (!fs.existsSync(binPath)) {
				throw new Error('bin/task-master.js not found');
			}
			if (!fs.existsSync(mcpPath)) {
				throw new Error('mcp-server/server.js not found');
			}

			// Check if files are executable (Unix-like systems)
			try {
				const binStats = fs.statSync(binPath);
				const mcpStats = fs.statSync(mcpPath);
				return '✅ Binary files exist and are accessible';
			} catch (error) {
				throw new Error('Binary files not accessible');
			}
		}
	},
	{
		name: 'Check dependencies',
		test: () => {
			const nodeModulesPath = path.join(process.cwd(), 'node_modules');
			if (!fs.existsSync(nodeModulesPath)) {
				throw new Error('node_modules not found. Run: npm install');
			}

			// Check for key dependencies
			const keyDeps = ['commander', 'inquirer', 'chalk', 'boxen'];
			const missing = keyDeps.filter(
				(dep) => !fs.existsSync(path.join(nodeModulesPath, dep))
			);

			if (missing.length > 0) {
				throw new Error(`Missing dependencies: ${missing.join(', ')}`);
			}

			return '✅ All key dependencies installed';
		}
	}
];

let passed = 0;
let failed = 0;

console.log('Running installation tests...\n');

for (const test of tests) {
	try {
		const result = test.test();
		console.log(`${result}`);
		passed++;
	} catch (error) {
		console.log(`❌ ${test.name}: ${error.message}`);
		failed++;
	}
}

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
	console.log('🎉 All tests passed! TaskMaster AI is properly installed.\n');
	console.log('Quick start commands:');
	console.log('  task-master init     # Initialize new project');
	console.log('  task-master menu     # Launch interactive menu');
	console.log('  task-master --help   # Show all commands');
} else {
	console.log('⚠️  Some tests failed. Please fix the issues above.\n');
	console.log('Common solutions:');
	console.log('  npm install          # Install dependencies');
	console.log('  npm link             # Link global command');
	console.log('  npm run prepare      # Fix file permissions');
	process.exit(1);
}

// Additional checks for npm publishing readiness
console.log('\n🔍 Checking npm publishing readiness...\n');

try {
	// Check if logged into npm
	try {
		const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
		console.log(`✅ Logged into npm as: ${whoami}`);
	} catch (error) {
		console.log('⚠️  Not logged into npm. Run: npm login');
	}

	// Check package name availability (if not already published)
	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	try {
		execSync(`npm view ${pkg.name}`, { stdio: 'pipe' });
		console.log(`ℹ️  Package ${pkg.name} already exists on npm`);
	} catch (error) {
		console.log(`✅ Package name ${pkg.name} is available`);
	}

	// Test pack command
	try {
		execSync('npm pack --dry-run', { stdio: 'pipe' });
		console.log('✅ Package can be packed successfully');
	} catch (error) {
		console.log('❌ Package pack failed:', error.message);
	}
} catch (error) {
	console.log('❌ Error checking npm readiness:', error.message);
}

console.log(
	'\n📚 For more information, see: docs/installation-and-publishing.md'
);
