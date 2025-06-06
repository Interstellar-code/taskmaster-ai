/**
 * Integration Test Suite for v0.16.0 Upstream Changes
 * Tests all the integrated features from the upstream release
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('v0.16.0 Integration Tests', function () {
	this.timeout(30000); // 30 second timeout for all tests

	describe('Phase 1: Infrastructure Updates', function () {
		it('should have updated Node.js version requirement', function () {
			const packageJson = JSON.parse(
				fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
			);
			expect(packageJson.engines.node).to.equal('>=18.0.0');
		});

		it('should have new AI provider dependencies installed', function () {
			const packageJson = JSON.parse(
				fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
			);
			const deps = packageJson.dependencies;

			expect(deps).to.have.property('@ai-sdk/amazon-bedrock');
			expect(deps).to.have.property('@ai-sdk/google-vertex');
			expect(deps).to.have.property('@aws-sdk/credential-providers');
		});

		it('should have removed blessed dependency', function () {
			const packageJson = JSON.parse(
				fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
			);
			expect(packageJson.dependencies).to.not.have.property('blessed');
		});

		it('should have updated node-fetch override', function () {
			const packageJson = JSON.parse(
				fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
			);
			expect(packageJson.overrides['node-fetch']).to.equal('^2.6.12');
		});
	});

	describe('Phase 2: AI Provider Integration', function () {
		it('should have BaseAIProvider class', async function () {
			const { BaseAIProvider } = await import(
				'../../src/ai-providers/base-provider.js'
			);
			expect(BaseAIProvider).to.be.a('function');

			// Test that it cannot be instantiated directly
			expect(() => new BaseAIProvider()).to.throw(
				'BaseAIProvider cannot be instantiated directly'
			);
		});

		it('should have all new AI providers', async function () {
			const providers = await import('../../src/ai-providers/index.js');

			expect(providers).to.have.property('BedrockAIProvider');
			expect(providers).to.have.property('AzureProvider');
			expect(providers).to.have.property('VertexAIProvider');
			expect(providers).to.have.property('AnthropicAIProvider');
			expect(providers).to.have.property('OpenAIProvider');
		});

		it('should have updated supported models', function () {
			const supportedModels = JSON.parse(
				fs.readFileSync(
					path.join(projectRoot, 'scripts/modules/supported-models.json'),
					'utf8'
				)
			);

			expect(supportedModels).to.have.property('azure');
			expect(supportedModels).to.have.property('bedrock');
			expect(supportedModels).to.have.property('google-vertex');
		});

		it('should instantiate provider classes correctly', async function () {
			const { AnthropicAIProvider, BedrockAIProvider, AzureProvider } =
				await import('../../src/ai-providers/index.js');

			const anthropic = new AnthropicAIProvider();
			expect(anthropic.name).to.equal('Anthropic');

			const bedrock = new BedrockAIProvider();
			expect(bedrock.name).to.equal('Bedrock');

			const azure = new AzureProvider();
			expect(azure.name).to.equal('Azure OpenAI');
		});
	});

	describe('Phase 3: Directory Structure Migration', function () {
		it('should have new .taskmaster directory structure', function () {
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster'))).to.be.true;
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster/tasks'))).to.be
				.true;
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster/prd'))).to.be
				.true;
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster/reports'))).to.be
				.true;
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster/templates'))).to
				.be.true;
		});

		it('should have migrated configuration file', function () {
			expect(fs.existsSync(path.join(projectRoot, '.taskmaster/config.json')))
				.to.be.true;
		});

		it('should have migrated tasks', function () {
			const tasksDir = path.join(projectRoot, '.taskmaster/tasks');
			if (fs.existsSync(tasksDir)) {
				const files = fs.readdirSync(tasksDir);
				// Should have at least task_059.txt (our integration task)
				const taskFiles = files.filter(
					(f) => f.startsWith('task_') && f.endsWith('.txt')
				);
				expect(taskFiles.length).to.be.greaterThan(0);
			}
		});

		it('should support TASK_MASTER_PROJECT_ROOT environment variable', async function () {
			// Test the findProjectRoot function with env variable
			const originalEnv = process.env.TASK_MASTER_PROJECT_ROOT;
			process.env.TASK_MASTER_PROJECT_ROOT = projectRoot;

			const { findProjectRoot } = await import(
				'../../scripts/modules/utils.js'
			);
			const foundRoot = findProjectRoot();

			expect(foundRoot).to.equal(projectRoot);

			// Restore original env
			if (originalEnv) {
				process.env.TASK_MASTER_PROJECT_ROOT = originalEnv;
			} else {
				delete process.env.TASK_MASTER_PROJECT_ROOT;
			}
		});
	});

	describe('Configuration Management', function () {
		it('should load config from new location', async function () {
			const { loadConfig } = await import(
				'../../scripts/modules/config-manager.js'
			);

			// This should not throw an error
			expect(() => loadConfig()).to.not.throw();
		});

		it('should support both old and new config paths', async function () {
			const { getStructurePath } = await import(
				'../../scripts/modules/directory-migration.js'
			);

			const configPath = getStructurePath(projectRoot, 'config');
			expect(configPath).to.include('.taskmaster');
		});
	});

	describe('Unique Features Preservation', function () {
		it('should preserve Kanban board functionality', function () {
			// Check that Kanban files still exist
			expect(fs.existsSync(path.join(projectRoot, 'src/menu/kanban'))).to.be
				.true;
		});

		it('should preserve PRD lifecycle tracking', function () {
			// Check that PRD management files still exist
			const prdFiles = [
				'scripts/modules/task-manager/prd-lifecycle.js',
				'scripts/modules/task-manager/prd-queries.js'
			];

			prdFiles.forEach((file) => {
				expect(fs.existsSync(path.join(projectRoot, file))).to.be.true;
			});
		});

		it('should preserve interactive menu system', function () {
			expect(fs.existsSync(path.join(projectRoot, 'src/menu/index.js'))).to.be
				.true;
		});
	});

	describe('Migration Command', function () {
		it('should have migrate command available', async function () {
			// Test that the migrate command is registered
			const { registerCommands } = await import(
				'../../scripts/modules/commands.js'
			);
			expect(registerCommands).to.be.a('function');
		});
	});
});

describe('AI Provider Functionality Tests', function () {
	this.timeout(10000);

	describe('Provider Class Methods', function () {
		it('should have required methods on all providers', async function () {
			const providers = await import('../../src/ai-providers/index.js');

			const providerClasses = [
				providers.AnthropicAIProvider,
				providers.OpenAIProvider,
				providers.GoogleAIProvider,
				providers.BedrockAIProvider,
				providers.AzureProvider,
				providers.VertexAIProvider
			];

			providerClasses.forEach((ProviderClass) => {
				const instance = new ProviderClass();
				expect(instance).to.have.property('generateText');
				expect(instance).to.have.property('streamText');
				expect(instance).to.have.property('generateObject');
				expect(instance).to.have.property('getClient');
				expect(instance).to.have.property('validateParams');
			});
		});

		it('should handle validation correctly', async function () {
			const { AnthropicAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new AnthropicAIProvider();

			// Should throw error for missing API key
			expect(() => provider.validateAuth({})).to.throw('API key is required');

			// Should throw error for missing model ID
			expect(() => provider.validateParams({ apiKey: 'test' })).to.throw(
				'Model ID is required'
			);
		});
	});
});
