#!/usr/bin/env node

/**
 * Test Runner for v0.16.0 Integration Tests
 * Runs comprehensive tests for all integrated features
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log(chalk.cyan('🧪 TaskMaster v0.16.0 Integration Test Suite'));
console.log(chalk.gray('Testing all integrated upstream changes...\n'));

// Check if test dependencies are available
const packageJson = JSON.parse(
	fs.readFileSync(join(projectRoot, 'package.json'), 'utf8')
);
const hasTestDeps =
	packageJson.devDependencies &&
	packageJson.devDependencies.mocha &&
	packageJson.devDependencies.chai;

if (!hasTestDeps) {
	console.log(chalk.yellow('⚠️  Installing test dependencies...'));

	const installProcess = spawn(
		'npm',
		['install', '--save-dev', 'mocha', 'chai'],
		{
			cwd: projectRoot,
			stdio: 'inherit'
		}
	);

	installProcess.on('close', (code) => {
		if (code === 0) {
			console.log(chalk.green('✅ Test dependencies installed\n'));
			runTests();
		} else {
			console.error(chalk.red('❌ Failed to install test dependencies'));
			process.exit(1);
		}
	});
} else {
	runTests();
}

function runTests() {
	console.log(chalk.cyan('Running integration tests...\n'));

	const testProcess = spawn(
		'npx',
		['mocha', 'tests/unit/integration-test.js', '--reporter', 'spec'],
		{
			cwd: projectRoot,
			stdio: 'inherit',
			env: { ...process.env, NODE_ENV: 'test' }
		}
	);

	testProcess.on('close', (code) => {
		if (code === 0) {
			console.log(chalk.green('\n✅ All integration tests passed!'));
			console.log(chalk.cyan('\n📋 Test Summary:'));
			console.log('  ✅ Phase 1: Infrastructure Updates');
			console.log('  ✅ Phase 2: AI Provider Integration');
			console.log('  ✅ Phase 3: Directory Structure Migration');
			console.log('  ✅ Unique Features Preservation');
			console.log('  ✅ Configuration Management');

			console.log(chalk.green('\n🎉 v0.16.0 Integration Complete!'));
			console.log(
				chalk.gray(
					'All upstream changes successfully integrated while preserving unique features.'
				)
			);
		} else {
			console.error(chalk.red('\n❌ Some tests failed'));
			console.log(
				chalk.yellow('Please review the test output above and fix any issues.')
			);
			process.exit(1);
		}
	});

	testProcess.on('error', (error) => {
		console.error(chalk.red('Failed to run tests:'), error.message);
		process.exit(1);
	});
}

// Handle process termination
process.on('SIGINT', () => {
	console.log(chalk.yellow('\n⚠️  Test run interrupted'));
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log(chalk.yellow('\n⚠️  Test run terminated'));
	process.exit(0);
});
