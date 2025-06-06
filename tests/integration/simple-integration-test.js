#!/usr/bin/env node

/**
 * Simple Integration Test for v0.16.0 Changes
 * Tests basic functionality without external dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log(chalk.cyan('🧪 TaskMaster v0.16.0 Simple Integration Test'));
console.log(chalk.gray('Testing core integrated features...\n'));

let passed = 0;
let failed = 0;

function test(name, testFn) {
	try {
		testFn();
		console.log(chalk.green(`✅ ${name}`));
		passed++;
	} catch (error) {
		console.log(chalk.red(`❌ ${name}: ${error.message}`));
		failed++;
	}
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

// Phase 1: Infrastructure Tests
console.log(chalk.yellow('📦 Phase 1: Infrastructure Updates'));

test('Node.js version requirement updated', () => {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
	);
	assert(
		packageJson.engines.node === '>=18.0.0',
		'Node.js version should be >=18.0.0'
	);
});

test('New AI provider dependencies installed', () => {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
	);
	const deps = packageJson.dependencies;

	assert(
		'@ai-sdk/amazon-bedrock' in deps,
		'Missing @ai-sdk/amazon-bedrock dependency'
	);
	assert(
		'@ai-sdk/google-vertex' in deps,
		'Missing @ai-sdk/google-vertex dependency'
	);
	assert(
		'@aws-sdk/credential-providers' in deps,
		'Missing @aws-sdk/credential-providers dependency'
	);
});

test('Blessed dependency removed', () => {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
	);
	assert(
		!('blessed' in packageJson.dependencies),
		'Blessed dependency should be removed'
	);
});

test('Node-fetch override updated', () => {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
	);
	assert(
		packageJson.overrides['node-fetch'] === '^2.6.12',
		'Node-fetch override should be ^2.6.12'
	);
});

// Phase 2: AI Provider Tests
console.log(chalk.yellow('\n🤖 Phase 2: AI Provider Integration'));

test('BaseAIProvider class exists', async () => {
	const baseProviderPath = path.join(
		projectRoot,
		'src/ai-providers/base-provider.js'
	);
	assert(fs.existsSync(baseProviderPath), 'BaseAIProvider file should exist');
});

test('New AI provider files exist', () => {
	const providerFiles = [
		'src/ai-providers/azure.js',
		'src/ai-providers/bedrock.js',
		'src/ai-providers/google-vertex.js'
	];

	providerFiles.forEach((file) => {
		assert(fs.existsSync(path.join(projectRoot, file)), `${file} should exist`);
	});
});

test('Updated supported models', () => {
	const supportedModelsPath = path.join(
		projectRoot,
		'scripts/modules/supported-models.json'
	);
	const supportedModels = JSON.parse(
		fs.readFileSync(supportedModelsPath, 'utf8')
	);

	assert(
		'azure' in supportedModels,
		'Azure models should be in supported-models.json'
	);
	assert(
		'bedrock' in supportedModels,
		'Bedrock models should be in supported-models.json'
	);
	assert(
		'google-vertex' in supportedModels,
		'Google Vertex models should be in supported-models.json'
	);
});

test('AI providers index exports', () => {
	const indexPath = path.join(projectRoot, 'src/ai-providers/index.js');
	const indexContent = fs.readFileSync(indexPath, 'utf8');

	assert(
		indexContent.includes('BedrockAIProvider'),
		'Index should export BedrockAIProvider'
	);
	assert(
		indexContent.includes('AzureProvider'),
		'Index should export AzureProvider'
	);
	assert(
		indexContent.includes('VertexAIProvider'),
		'Index should export VertexAIProvider'
	);
});

// Phase 3: Directory Structure Tests
console.log(chalk.yellow('\n📁 Phase 3: Directory Structure Migration'));

test('New .taskmaster directory structure', () => {
	const directories = [
		'.taskmaster',
		'.taskmaster/tasks',
		'.taskmaster/prd',
		'.taskmaster/reports',
		'.taskmaster/templates'
	];

	directories.forEach((dir) => {
		assert(
			fs.existsSync(path.join(projectRoot, dir)),
			`${dir} directory should exist`
		);
	});
});

test('Configuration file migrated', () => {
	const configPath = path.join(projectRoot, '.taskmaster/config.json');
	assert(
		fs.existsSync(configPath),
		'Configuration file should be migrated to .taskmaster/config.json'
	);
});

test('Migration command available', () => {
	const commandsPath = path.join(projectRoot, 'scripts/modules/commands.js');
	const commandsContent = fs.readFileSync(commandsPath, 'utf8');
	assert(
		commandsContent.includes('migrate'),
		'Commands should include migrate command'
	);
});

test('Directory migration module exists', () => {
	const migrationPath = path.join(
		projectRoot,
		'scripts/modules/directory-migration.js'
	);
	assert(
		fs.existsSync(migrationPath),
		'Directory migration module should exist'
	);
});

// Unique Features Preservation Tests
console.log(chalk.yellow('\n🎯 Unique Features Preservation'));

test('Kanban board functionality preserved', () => {
	// Check for Kanban-related files in the menu system
	const menuPath = path.join(projectRoot, 'src/menu/index.js');
	const menuContent = fs.readFileSync(menuPath, 'utf8');
	assert(
		menuContent.includes('kanban') || menuContent.includes('Kanban'),
		'Menu should include Kanban functionality'
	);
});

test('PRD lifecycle tracking preserved', () => {
	const prdFiles = [
		'scripts/modules/task-manager/prd-queries.js',
		'scripts/modules/task-manager/prd-monitor.js'
	];

	prdFiles.forEach((file) => {
		assert(fs.existsSync(path.join(projectRoot, file)), `${file} should exist`);
	});
});

test('Interactive menu system preserved', () => {
	const menuPath = path.join(projectRoot, 'src/menu/index.js');
	assert(fs.existsSync(menuPath), 'Interactive menu system should exist');
});

// Configuration Management Tests
console.log(chalk.yellow('\n⚙️  Configuration Management'));

test('Config manager supports new structure', () => {
	const configManagerPath = path.join(
		projectRoot,
		'scripts/modules/config-manager.js'
	);
	const configContent = fs.readFileSync(configManagerPath, 'utf8');
	assert(
		configContent.includes('getStructurePath'),
		'Config manager should support new structure'
	);
});

test('Utils supports TASK_MASTER_PROJECT_ROOT', () => {
	const utilsPath = path.join(projectRoot, 'scripts/modules/utils.js');
	const utilsContent = fs.readFileSync(utilsPath, 'utf8');
	assert(
		utilsContent.includes('TASK_MASTER_PROJECT_ROOT'),
		'Utils should support TASK_MASTER_PROJECT_ROOT env var'
	);
});

// Summary
console.log(chalk.cyan('\n📊 Test Summary'));
console.log(`${chalk.green('✅ Passed:')} ${passed}`);
console.log(`${chalk.red('❌ Failed:')} ${failed}`);
console.log(`${chalk.blue('📈 Total:')} ${passed + failed}`);

if (failed === 0) {
	console.log(
		chalk.green('\n🎉 All tests passed! v0.16.0 integration successful!')
	);
	console.log(
		chalk.gray(
			'All upstream changes have been successfully integrated while preserving unique features.'
		)
	);
	process.exit(0);
} else {
	console.log(
		chalk.red('\n⚠️  Some tests failed. Please review and fix the issues.')
	);
	process.exit(1);
}
